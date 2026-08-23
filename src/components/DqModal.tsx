import React, { useState, useRef, useEffect } from 'react';
import {
  parseDqContent,
  detectAutoSetCount,
  divideQuestionsIntoSets,
  formatAllSetsCombined,
  DqQuestionBlock,
  DqSetResult,
  DqSplitMode,
} from '../utils/dqDivider';
import { downloadAsDocx } from '../utils/exportDocx';
import { unicodeToBijoy, bijoyToUnicode } from '../utils/bijoy';

interface DqModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendToChat?: (text: string) => void;
}

const SAMPLE_INPUT = `১. বাংলাদেশের কোন জেলার মানুষ সবচেয়ে বেশি দারিদ্র্য সীমার নিচে বাস করে? পৃ ১৯৮
রাঙ্গামাটি
বান্দরবান
কুড়িগ্রাম*
পিরোজপুর
১. বাংলাদেশের কোন জেলায় সাক্ষরতার হার সর্বাধিক ? পৃ ১৯৮
কুড়িগ্রাম
পিরোজপুর*
জামালপুর
নারায়ণগঞ্জ
২. ইতিহাসের প্রথম আদমশুমারি হয় কত সালে ? পৃ ১৯৯
১০৮৬ সালে*
১৬৯০ সালে
১৭৯০ সালে
১৮৭২ সালে
১০৮৬ সালে ইংল্যান্ডে প্রথম আদমশুমারি অনুষ্ঠিত হয়। এর পরবর্তীতে ১৭৯০ সালে যুক্তরাষ্ট্রে প্রথম আধুনিক আদমশুমারি অনুষ্ঠিত হয়েছিল
২. ভারতীয় উপমহাদেশে প্রথম আদমশুমারি কত সালে অনুষ্ঠিত হয় ? পৃ ১৯৯
১৭১৭ সালে
১৭৯৯ সালে
১৮৭২ সালে*
১৯৭৪ সালে
১৮৭২ সালে লর্ড মেয়র শাসনামলে ভারতীয় উপমহাদেশে প্রথম আদমশুমারি অনুষ্ঠিত হয়।`;

export const DqModal: React.FC<DqModalProps> = ({ isOpen, onClose, onSendToChat }) => {
  const [inputText, setInputText] = useState('');
  const [splitMode, setSplitMode] = useState<DqSplitMode>('repeated_numbers');
  const [setCountChoice, setSetCountChoice] = useState<'auto' | '2' | '3' | '4' | 'custom'>('auto');
  const [customSetCount, setCustomSetCount] = useState<number>(4);
  const [renumberMode, setRenumberMode] = useState<'bangla' | 'english' | 'keep'>('bangla');
  const [fontMode, setFontMode] = useState<'SolaimanLipi' | 'SutonnyMJ'>('SolaimanLipi');
  
  // Results
  const [parsedBlocks, setParsedBlocks] = useState<DqQuestionBlock[]>([]);
  const [dividedSets, setDividedSets] = useState<DqSetResult[]>([]);
  const [activeSetTab, setActiveSetTab] = useState<string>('all'); // 'all' or 'set-1', 'set-2' etc.
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && !inputText) {
      // Keep state ready
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleProcessDivision = () => {
    if (!inputText.trim()) {
      alert('অনুগ্রহ করে বিভক্ত করার জন্য কিছু প্রশ্ন বা টেক্সট লিখুন বা ফাইল আপলোড করুন।');
      return;
    }

    const blocks = parseDqContent(inputText);
    if (blocks.length === 0) {
      alert('কোনো প্রশ্ন বা টেক্সট ব্লক শনাক্ত করা যায়নি। অনুগ্রহ করে প্রশ্নের গঠন সঠিক আছে কিনা দেখুন।');
      return;
    }

    setParsedBlocks(blocks);

    let targetCount = 2;
    if (setCountChoice === 'auto') {
      targetCount = detectAutoSetCount(blocks);
    } else if (setCountChoice === 'custom') {
      targetCount = Math.max(2, Math.min(customSetCount || 2, 10));
    } else {
      targetCount = parseInt(setCountChoice, 10) || 2;
    }

    const results = divideQuestionsIntoSets(blocks, targetCount, splitMode, renumberMode);
    setDividedSets(results);
    setActiveSetTab('all');
    showToast(`মোট ${blocks.length} টি প্রশ্ন সফলভাবে ${results.length} টি ভাগে বিভক্ত হয়েছে!`);
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setIsProcessingFile(true);
    try {
      if (file.name.endsWith('.txt')) {
        const text = await file.text();
        setInputText(text);
        showToast('টেক্সট ফাইল লোড সম্পন্ন হয়েছে');
      } else {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/parse-file', {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          if (data.extractedText) {
            setInputText(data.extractedText);
            showToast('ফাইল থেকে টেক্সট এক্সট্রাক্ট সম্পন্ন হয়েছে');
          } else {
            alert('ফাইল থেকে টেক্সট পাওয়া যায়নি।');
          }
        } else {
          alert('ফাইল প্রসেস করতে ব্যর্থ হয়েছে।');
        }
      }
    } catch (err) {
      console.error('File load error:', err);
      alert('ফাইল লোড করতে সমস্যা হয়েছে।');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    const textToCopy = fontMode === 'SutonnyMJ' ? unicodeToBijoy(text) : text;
    navigator.clipboard.writeText(textToCopy);
    setCopyFeedback(id);
    setTimeout(() => setCopyFeedback(null), 2000);
    showToast('ক্লিপবোর্ডে কপি করা হয়েছে');
  };

  const handleDownloadDocxSingle = async (set: DqSetResult) => {
    try {
      const content = fontMode === 'SutonnyMJ' ? set.formattedSutonny : set.formattedSolaiman;
      const title = fontMode === 'SutonnyMJ' ? unicodeToBijoy(set.setTitleBangla) : set.setTitleBangla;
      const fullDoc = `${title}\n\n${content}`;
      const filename = `DQ_${set.setId.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.docx`;
      await downloadAsDocx(fullDoc, filename);
      showToast(`${set.setTitleBangla} ডাউনলোড হয়েছে (.docx)`);
    } catch (e) {
      console.error('Download error:', e);
      showToast('ডাউনলোড করতে সমস্যা হয়েছে');
    }
  };

  const handleDownloadDocxAll = async () => {
    if (dividedSets.length === 0) return;
    try {
      const fullText = formatAllSetsCombined(dividedSets, fontMode);
      const filename = `DQ_All_Sets_${new Date().toISOString().slice(0, 10)}.docx`;
      await downloadAsDocx(fullText, filename);
      showToast('সবগুলো সেট একসাথে DOCX ফাইলে ডাউনলোড হয়েছে');
    } catch (e) {
      console.error('Download all error:', e);
      showToast('ডাউনলোড করতে সমস্যা হয়েছে');
    }
  };

  const handleSendAllToChat = () => {
    if (dividedSets.length === 0) return;
    const combined = formatAllSetsCombined(dividedSets, 'SolaimanLipi');
    if (onSendToChat) {
      onSendToChat(`নিচে DQ দ্বারা বিভক্ত প্রশ্নমালা দেওয়া হলো:\n\n${combined}`);
      onClose();
    } else {
      handleCopy(combined, 'chat');
      alert('বিভক্ত প্রশ্নসমূহ কপি হয়েছে! আপনি চ্যাট বক্সে পেস্ট করতে পারেন।');
    }
  };

  const loadSample = () => {
    setInputText(SAMPLE_INPUT);
    setSetCountChoice('2');
    setSplitMode('repeated_numbers');
    setRenumberMode('bangla');
    showToast('নমুনা ডেটা লোড হয়েছে');
  };

  const clearAll = () => {
    setInputText('');
    setParsedBlocks([]);
    setDividedSets([]);
    setActiveSetTab('all');
  };

  // Render Formatted HTML for Preview Box
  const renderPreviewLines = (text: string) => {
    if (!text || !text.trim()) return null;
    const lines = text.split('\n');

    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return <div key={idx} className="h-2"></div>;
      }

      const isTitleLine = /^(?:প্রথম|২য়|৩য়|৪র্থ|৫ম|৬ষ্ঠ|৭ম|৮ম|\d+ম|\d+th)\s*ভাগ/i.test(trimmed) || /^Part\s*\d+/i.test(trimmed);
      const isQuestionLine = /^\s*(?:[০-৯\d]{1,4}[\.\)\:\-]|Question\s*\d+)/i.test(trimmed);
      const isExplanation = /^\s*(?:ব্যাখ্যা|উত্তরের\s*ব্যাখ্যা|Explanation|উত্তর|সঠিক\s*উত্তর|Note|সমাধান)/i.test(trimmed);
      const isCorrectOption = trimmed.includes('*') || trimmed.includes('✓') || trimmed.includes('✔');

      let displayLine = fontMode === 'SutonnyMJ' ? unicodeToBijoy(trimmed) : trimmed;

      if (isTitleLine) {
        return (
          <div key={idx} className="py-1.5 px-3 my-2 bg-indigo-50 border border-indigo-200 rounded-md font-bold text-indigo-900 text-sm flex items-center justify-between">
            <span>{displayLine}</span>
            <span className="text-[11px] font-normal text-indigo-600 bg-white px-2 py-0.5 rounded border border-indigo-100">
              সেট শিরোনাম
            </span>
          </div>
        );
      }

      if (isCorrectOption) {
        return (
          <p key={idx} className="my-0.5 leading-snug">
            <span className="bg-emerald-200 text-black px-1.5 py-0.5 rounded font-medium inline-block">
              {displayLine}
            </span>
          </p>
        );
      }

      if (isQuestionLine) {
        return (
          <p key={idx} className="font-bold text-gray-900 mt-2 mb-0.5 leading-snug">
            {displayLine}
          </p>
        );
      }

      if (isExplanation) {
        return (
          <p key={idx} className="text-gray-700 bg-slate-50 border-l-2 border-indigo-400 pl-2 py-0.5 my-1 text-xs leading-relaxed">
            {displayLine}
          </p>
        );
      }

      return (
        <p key={idx} className="text-gray-800 my-0.5 leading-snug">
          {displayLine}
        </p>
      );
    });
  };

  const currentActiveSet = dividedSets.find((s) => s.setId === activeSetTab);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto animate-fadeIn">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-60 bg-gray-900/95 text-white text-xs px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 border border-gray-700 animate-fadeIn">
          <i className="fa-solid fa-circle-check text-emerald-400 text-sm"></i>
          <span className="font-medium">{toastMsg}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-scaleUp">
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-indigo-800 text-white px-5 py-3.5 flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white text-lg shadow-inner font-bold border border-white/20">
              <i className="fa-solid fa-code-branch"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-wide">DQ : প্রশ্ন বিভাজন (Divide Questions)</h2>
                <span className="bg-emerald-400/20 text-emerald-100 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-emerald-300/30">
                  Smart Splitter
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                ১, ১, ১, ১ - ২০, ২০, ২০ পুনরাবৃত্তি মিশ্রিত প্রশ্নমালাকে স্বয়ংক্রিয়ভাবে ২ বা ৪ ভাগে সমবিভক্ত করুন
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadSample}
              className="text-xs bg-white/15 hover:bg-white/25 text-white px-3 py-1.5 rounded-lg border border-white/20 transition flex items-center gap-1.5 cursor-pointer font-medium"
              title="স্ক্রিনশটের মতো ডেমো প্রশ্ন লোড করুন"
            >
              <i className="fa-solid fa-wand-magic-sparkles text-amber-300"></i>
              নমুনা ডেটা দেখুন
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-red-500 text-white flex items-center justify-center transition cursor-pointer"
              title="বন্ধ করুন"
            >
              <i className="fa-solid fa-xmark text-base"></i>
            </button>
          </div>
        </div>

        {/* Modal Body: Split Grid */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5 bg-slate-50 space-y-4">
          {/* Top Setting & Configuration Bar */}
          <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Set Count Choice */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-gray-700 flex items-center gap-1">
                  <i className="fa-solid fa-layer-group text-emerald-600"></i>
                  ভাগ সংখ্যা (Sets):
                </span>
                <div className="inline-flex rounded-lg border border-gray-300 bg-gray-50 p-0.5">
                  <button
                    type="button"
                    onClick={() => setSetCountChoice('auto')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                      setCountChoice === 'auto'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    ⚡ অটো সনাক্ত (Auto)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSetCountChoice('2')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                      setCountChoice === '2'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    ২ ভাগে (Set-A, B)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSetCountChoice('3')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                      setCountChoice === '3'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    ৩ ভাগে (Set-A, B, C)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSetCountChoice('4')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                      setCountChoice === '4'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    ৪ ভাগে (Set-A, B, C, D)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSetCountChoice('custom')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                      setCountChoice === 'custom'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    কাস্টম
                  </button>
                </div>

                {setCountChoice === 'custom' && (
                  <input
                    type="number"
                    min={2}
                    max={10}
                    value={customSetCount}
                    onChange={(e) => setCustomSetCount(parseInt(e.target.value, 10) || 2)}
                    className="w-16 px-2 py-1 border border-gray-300 rounded-md text-center font-bold text-xs"
                    title="সেট সংখ্যা দিন (২-১০)"
                  />
                )}
              </div>

              {/* Split Mode */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-gray-700 flex items-center gap-1">
                  <i className="fa-solid fa-arrows-split-up-and-left text-indigo-600"></i>
                  পদ্ধতি:
                </span>
                <select
                  value={splitMode}
                  onChange={(e) => setSplitMode(e.target.value as DqSplitMode)}
                  className="bg-white border border-gray-300 text-gray-800 rounded-lg px-2.5 py-1 text-xs font-medium outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="repeated_numbers">পুনরাবৃত্তি নম্বর (১, ১, ১... ২, ২, ২...)</option>
                  <option value="equal_chunks">ধারাবাহিক সমান ভাগ (১-১০, ১১-২০...)</option>
                  <option value="round_robin">রাউন্ড-রবিন (১ম → A, ২য় → B, ৩য় → C...)</option>
                </select>
              </div>

              {/* Renumber Mode */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-gray-700 flex items-center gap-1">
                  <i className="fa-solid fa-list-ol text-teal-600"></i>
                  ক্রমিক নম্বর:
                </span>
                <select
                  value={renumberMode}
                  onChange={(e) => setRenumberMode(e.target.value as any)}
                  className="bg-white border border-gray-300 text-gray-800 rounded-lg px-2.5 py-1 text-xs font-medium outline-none focus:border-teal-500 cursor-pointer"
                >
                  <option value="bangla">বাংলা ক্রম (১, ২, ৩...)</option>
                  <option value="english">ইংরেজি ক্রম (1, 2, 3...)</option>
                  <option value="keep">আগের নম্বর বহাল রাখুন</option>
                </select>
              </div>
            </div>
          </div>

          {/* Dual Panel Grid: Left Input, Right Output */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* LEFT: Input Area */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <label className="font-bold text-sm text-gray-800 flex items-center gap-1.5">
                  <i className="fa-solid fa-file-lines text-emerald-600"></i>
                  ইনপুট প্রশ্ন বা টেক্সট পেস্ট করুন:
                  {inputText && (
                    <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {inputText.length} অক্ষর
                    </span>
                  )}
                </label>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-1 rounded-md border border-slate-300 transition flex items-center gap-1 cursor-pointer"
                    title="Word (.docx) বা টেক্সট ফাইল আপলোড করুন"
                  >
                    <i className="fa-solid fa-cloud-arrow-up text-indigo-600"></i>
                    ফাইল আপলোড
                  </button>

                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-xs text-red-600 hover:bg-red-50 font-bold px-2 py-1 rounded border border-transparent hover:border-red-200 transition cursor-pointer"
                    title="সব মুছে ফেলুন"
                  >
                    মুছুন
                  </button>
                </div>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.txt,.pdf"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
                className="hidden"
              />

              {/* Drag Drop Overlay / Area */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                className={`relative flex-1 flex flex-col rounded-lg border-2 transition-all ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-200'
                    : 'border-gray-200 focus-within:border-emerald-500'
                }`}
              >
                {isProcessingFile && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center z-10 rounded-lg">
                    <div className="text-center space-y-2">
                      <i className="fa-solid fa-spinner fa-spin text-emerald-600 text-2xl"></i>
                      <p className="text-xs font-bold text-gray-700">ফাইল প্রসেস হচ্ছে...</p>
                    </div>
                  </div>
                )}

                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`এখানে মিশ্রিত প্রশ্নগুলো পেস্ট করুন (যেমন):\n১. প্রশ্ন ১? \nঅপশন ১\nঅপশন ২*\n১. প্রশ্ন ২?\nঅপশন ১...\n২. প্রশ্ন ৩?...`}
                  className="w-full h-80 lg:h-96 p-3 text-sm text-gray-800 border-none outline-none resize-none font-solaiman leading-relaxed"
                />
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleProcessDivision}
                className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <i className="fa-solid fa-code-branch"></i>
                প্রশ্ন বিভক্ত করুন (Divide Questions)
              </button>
            </div>

            {/* RIGHT: Divided Sets Output Area */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs flex flex-col">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <label className="font-bold text-sm text-gray-800 flex items-center gap-1.5">
                    <i className="fa-solid fa-boxes-stacked text-teal-600"></i>
                    বিভক্ত আউটপুট:
                  </label>
                  {dividedSets.length > 0 && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      মোট {parsedBlocks.length} টি প্রশ্ন • {dividedSets.length} টি সেট
                    </span>
                  )}
                </div>

                {/* Font Switcher */}
                <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg border border-gray-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setFontMode('SolaimanLipi')}
                    className={`px-2 py-0.5 rounded font-semibold transition cursor-pointer ${
                      fontMode === 'SolaimanLipi'
                        ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    SolaimanLipi
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontMode('SutonnyMJ')}
                    className={`px-2 py-0.5 rounded font-semibold transition cursor-pointer ${
                      fontMode === 'SutonnyMJ'
                        ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    SutonnyMJ (Bijoy)
                  </button>
                </div>
              </div>

              {/* Set Navigation Tabs */}
              {dividedSets.length > 0 ? (
                <>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 border-b border-gray-200 scrollbar-thin">
                    <button
                      type="button"
                      onClick={() => setActiveSetTab('all')}
                      className={`text-xs px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                        activeSetTab === 'all'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-gray-700 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      <i className="fa-solid fa-list-check text-[11px]"></i>
                      সবগুলো সেট একসাথে (All in One)
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        activeSetTab === 'all' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {parsedBlocks.length}
                      </span>
                    </button>

                    {dividedSets.map((set, sIdx) => (
                      <button
                        key={set.setId}
                        type="button"
                        onClick={() => setActiveSetTab(set.setId)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                          activeSetTab === set.setId
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 text-gray-700 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        <i className="fa-solid fa-folder-open text-[11px]"></i>
                        {set.setTitleBangla.split(':')[0] || `ভাগ ${sIdx + 1}`}
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          activeSetTab === set.setId ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                        }`}>
                          {set.questions.length}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Output Preview Display Box */}
                  <div
                    className={`flex-1 min-h-[300px] max-h-80 lg:max-h-96 overflow-y-auto p-3.5 bg-white border border-gray-200 rounded-lg text-sm select-text ${
                      fontMode === 'SutonnyMJ' ? 'font-sutonny' : 'font-solaiman'
                    }`}
                  >
                    {activeSetTab === 'all' ? (
                      dividedSets.map((set) => (
                        <div key={set.setId} className="mb-6 last:mb-0">
                          {renderPreviewLines(`${set.setTitleBangla}\n\n${set.formattedSolaiman}`)}
                          <div className="border-b-2 border-dashed border-gray-200 my-4"></div>
                        </div>
                      ))
                    ) : currentActiveSet ? (
                      <div>
                        {renderPreviewLines(`${currentActiveSet.setTitleBangla}\n\n${currentActiveSet.formattedSolaiman}`)}
                      </div>
                    ) : null}
                  </div>

                  {/* Action Buttons for Current / All Output */}
                  <div className="mt-3 pt-2 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {activeSetTab === 'all' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleCopy(formatAllSetsCombined(dividedSets, fontMode), 'all-copy')}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <i className="fa-solid fa-copy"></i>
                            {copyFeedback === 'all-copy' ? 'কপি হয়েছে!' : 'সবগুলো সেট কপি করুন'}
                          </button>

                          <button
                            type="button"
                            onClick={handleDownloadDocxAll}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                            title="A4 পেপার ও ০.৫ ইঞ্চি মার্জিন সহ DOCX ফাইল ডাউনলোড"
                          >
                            <i className="fa-solid fa-file-word"></i>
                            সব সেট Word (.docx) ডাউনলোড
                          </button>
                        </>
                      ) : currentActiveSet ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleCopy(`${currentActiveSet.setTitleBangla}\n\n${currentActiveSet.formattedSolaiman}`, currentActiveSet.setId)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <i className="fa-solid fa-copy"></i>
                            {copyFeedback === currentActiveSet.setId ? 'কপি হয়েছে!' : 'এই সেট কপি করুন'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadDocxSingle(currentActiveSet)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                            title="A4 পেপার ও ০.৫ ইঞ্চি মার্জিন সহ DOCX ফাইল ডাউনলোড"
                          >
                            <i className="fa-solid fa-file-word"></i>
                            Word (.docx) ডাউনলোড
                          </button>
                        </>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={handleSendAllToChat}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                      title="Gemini AI চ্যাটে পাঠিয়ে আরও বিশ্লেষণ করুন"
                    >
                      <i className="fa-solid fa-sparkles text-rose-600"></i>
                      Gemini চ্যাটে পাঠান
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50 rounded-lg border-2 border-dashed border-gray-200 text-gray-400 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-xl text-gray-300">
                    <i className="fa-solid fa-code-branch"></i>
                  </div>
                  <p className="text-sm font-bold text-gray-600">বামপাশে প্রশ্ন পেস্ট করে "প্রশ্ন বিভক্ত করুন" চাপুন</p>
                  <p className="text-xs text-gray-400 max-w-xs">
                    ১, ১, ১, ১ - ২০, ২০, ২০ প্রশ্নগুলো স্বয়ংক্রিয়ভাবে Set-A, Set-B, Set-C, Set-D ইত্যাদি ভাগে ভাগ হয়ে এখানে তৈরি হবে।
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-5 py-2.5 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-circle-info text-indigo-500"></i>
            <span>Word ফাইল (.docx) স্বয়ংক্রিয়ভাবে A4 সাইজ এবং 0.5 ইঞ্চি মার্জিনে তৈরি হবে।</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg font-semibold cursor-pointer transition"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
