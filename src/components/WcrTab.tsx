import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import { unicodeToBijoy, isEnglishWord } from '../utils/bijoy';
import { parseQuestions, generateFormattedTableHtml } from '../utils/parser';

interface WcrTabProps {
  customDict?: string;
}

export function WcrTab({ customDict = '' }: WcrTabProps) {
  // Card 1: Word File State
  const [wordFile, setWordFile] = useState<File | null>(null);
  const [isDraggingWord, setIsDraggingWord] = useState<boolean>(false);
  const wordInputRef = useRef<HTMLInputElement | null>(null);

  // Card 2: Reference Files State
  const [refFiles, setRefFiles] = useState<File[]>([]);
  const [isDraggingRef, setIsDraggingRef] = useState<boolean>(false);
  const refInputRef = useRef<HTMLInputElement | null>(null);

  // Control & Processing State
  const [targetFont, setTargetFont] = useState<'SolaimanLipi' | 'SutonnyMJ'>('SolaimanLipi');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [errMsg, setErrMsg] = useState<string>('');

  // Results State
  const [correctedText, setCorrectedText] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [activePreviewTab, setActivePreviewTab] = useState<'rich' | 'plain'>('rich');

  // Clear Handlers
  const handleClearWordFile = () => {
    setWordFile(null);
    if (wordInputRef.current) wordInputRef.current.value = '';
  };

  const handleClearRefFiles = () => {
    setRefFiles([]);
    if (refInputRef.current) refInputRef.current.value = '';
  };

  const handleRemoveRefFile = (index: number) => {
    setRefFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleResetAll = () => {
    handleClearWordFile();
    handleClearRefFiles();
    setCorrectedText('');
    setStatusMsg('');
    setErrMsg('');
    setCopySuccess(false);
  };

  // Add Ref Files
  const handleAddRefFiles = (newFiles: FileList | File[]) => {
    const validFiles: File[] = [];
    for (let i = 0; i < newFiles.length; i++) {
      const f = newFiles[i];
      if (
        f.type.startsWith('image/') ||
        f.type.includes('pdf') ||
        f.name.toLowerCase().endsWith('.pdf') ||
        f.name.toLowerCase().endsWith('.docx') ||
        f.name.toLowerCase().endsWith('.txt')
      ) {
        validFiles.push(f);
      }
    }
    if (validFiles.length > 0) {
      setRefFiles((prev) => [...prev, ...validFiles]);
    }
  };

  // Trigger WCR AI Correction API
  const handleStartCorrection = async () => {
    if (!wordFile) {
      setErrMsg('অনুগ্রহ করে প্রথমে একটি মূল Word (.docx) ফাইল আপলোড করুন।');
      return;
    }

    setIsProcessing(true);
    setErrMsg('');
    setStatusMsg('ফাইলসমূহ বিশ্লেষণ ও প্রসেসিং হচ্ছে...');
    setCorrectedText('');

    try {
      const formData = new FormData();
      formData.append('wordFile', wordFile);
      refFiles.forEach((file) => {
        formData.append('refFiles', file);
      });

      setStatusMsg('Gemini AI-এর মাধ্যমে রেফারেন্স ফাইল ও Word ফাইল মিলিয়ে কারেকশন করা হচ্ছে...');

      const res = await fetch('/api/wcr-correct', {
        method: 'POST',
        credentials: 'same-origin',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'কারেকশন সম্পূর্ণ করা যায়নি।');
      }

      setCorrectedText(data.correctedText || '');
      setStatusMsg('✓ কারেকশন সফলভাবে সম্পন্ন হয়েছে!');
    } catch (err: any) {
      console.error('WCR Correction Error:', err);
      let message = err.message || 'একটি ত্রুটি ঘটেছে। অনুগ্রহ করে আবার চেষ্টা করুন।';
      if (message.includes("central directory") || message.includes("zip") || message.includes("JSZip") || message.includes("end of central")) {
        message = "আপলোডকৃত ফাইলটি একটি বৈধ .docx (Word Document) ফাইল নয় বা ফাইলটি ক্ষতিগ্রস্ত (Corrupted)। অনুগ্রহ করে সঠিক .docx ফাইল আপলোড করুন।";
      }
      setErrMsg(message);
      setStatusMsg('');
    } finally {
      setIsProcessing(false);
    }
  };

  // Copy Corrected Text
  const handleCopyText = async () => {
    if (!correctedText) return;
    try {
      await navigator.clipboard.writeText(correctedText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  // Download Corrected Word File (.docx)
  const handleDownloadDocx = async () => {
    if (!correctedText.trim()) return;

    try {
      const questions = parseQuestions(correctedText);
      let formattedHtml = '';

      if (questions.length > 0) {
        formattedHtml = generateFormattedTableHtml(correctedText, targetFont, 'Ban', customDict);
      } else {
        // Fallback standard text HTML formatting
        const lines = correctedText.split('\n');
        const paragraphs = lines.map((line) => {
          let lineHtml = line;
          if (targetFont === 'SutonnyMJ') {
            lineHtml = line.split(/([\u0980-\u09FF]+)/g).map(part => {
              if (/[\u0980-\u09FF]/.test(part)) {
                return `<span class="bijoy-text" style="font-family: 'SutonnyMJ';">${unicodeToBijoy(part)}</span>`;
              }
              return `<span class="eng-text" style="font-family: 'Times New Roman';">${part}</span>`;
            }).join('');
          } else {
            lineHtml = line.split(/([\u0980-\u09FF]+)/g).map(part => {
              if (/[\u0980-\u09FF]/.test(part)) {
                return `<span class="ben-text" style="font-family: 'SolaimanLipi';">${part}</span>`;
              }
              return `<span class="eng-text" style="font-family: 'Times New Roman';">${part}</span>`;
            }).join('');
          }
          return `<p style="margin-bottom: 6px;">${lineHtml}</p>`;
        }).join('');
        formattedHtml = paragraphs;
      }

      const primaryFont = targetFont;
      const htmlContent = `<!DOCTYPE html><html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><style>body { font-family: 'Times New Roman', '${primaryFont}', 'SolaimanLipi', sans-serif; font-size: 10pt; line-height: 1.15; } p { margin: 0; padding: 0; margin-bottom: 4px; } table { border-collapse: collapse; width: 100%; } td { border: 1px solid #000; padding: 4px; }</style></head><body><div class="Section1">${formattedHtml}</div></body></html>`;

      let blob: Blob;
      if (window.htmlDocx) {
        blob = window.htmlDocx.asBlob(htmlContent, {
          orientation: 'portrait',
          margins: { top: 720, bottom: 720, left: 720, right: 720 }
        });

        // Patch DOCX zip using JSZip for accurate font tags
        try {
          const zip = await JSZip.loadAsync(blob);
          let docXml = await zip.file("word/document.xml")?.async("string");
          if (docXml) {
            docXml = docXml.replace(/<w:pgSz\b[^>]*\/>/g, '<w:pgSz w:w="11906" w:h="16838" w:orient="portrait"/>');
            if (targetFont === 'SutonnyMJ') {
              docXml = docXml.replace(/<w:rFonts\b[^>]*\/>/gi, `<w:rFonts w:ascii="SutonnyMJ" w:hAnsi="SutonnyMJ" w:cs="SutonnyMJ" w:eastAsia="SutonnyMJ"/>`);
            } else {
              docXml = docXml.replace(/<w:rFonts\b[^>]*\/>/gi, `<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="SolaimanLipi" w:eastAsia="Times New Roman"/>`);
            }
            zip.file("word/document.xml", docXml);
            blob = await zip.generateAsync({ type: 'blob' });
          }
        } catch (zipErr) {
          console.warn("Docx zip patch note:", zipErr);
        }
      } else {
        blob = new Blob([htmlContent], { type: 'application/msword' });
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const baseName = wordFile ? wordFile.name.replace(/\.[^/.]+$/, '') : 'Corrected_Document';
      a.download = `${baseName}_WCR_Corrected.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error('Word export error:', e);
      alert('Word ফাইল ডাউনলোড করতে সমস্যা হয়েছে: ' + (e.message || e));
    }
  };

  // Render Rich HTML Preview
  const renderRichPreview = () => {
    if (!correctedText) return null;
    const questions = parseQuestions(correctedText);
    if (questions.length > 0) {
      const tableHtml = generateFormattedTableHtml(correctedText, targetFont, 'Ban', customDict);
      return (
        <div
          className="prose max-w-none text-left leading-relaxed font-sans bg-white p-4 border rounded shadow-xs"
          dangerouslySetInnerHTML={{ __html: tableHtml }}
        />
      );
    }

    // Default formatted lines
    return (
      <div className="bg-white p-4 border rounded text-left leading-relaxed text-sm whitespace-pre-wrap font-sans">
        {correctedText.split('\n').map((line, idx) => {
          const hasUnderline = /<u>[\s\S]*?<\/u>/i.test(line);
          const containsBengali = /[\u0980-\u09FF]/.test(line);

          return (
            <p
              key={idx}
              className={`mb-1.5 ${
                containsBengali && targetFont === 'SutonnyMJ' ? 'font-bijoy' : ''
              }`}
            >
              {hasUnderline ? (
                <span dangerouslySetInnerHTML={{ __html: line }} />
              ) : (
                line
              )}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 bg-gradient-to-r from-red-800 via-red-700 to-rose-800 text-white rounded-lg shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <h1 className="text-xl md:text-2xl font-black tracking-wide flex items-center gap-2">
            <i className="fa-solid fa-[#fa2] fa-spell-check text-amber-300"></i>
            WCR — ওয়ার্ড ফাইল কারেকশন ও রিভিশন (Word Correction & Revision)
          </h1>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-400 text-red-950 shadow-sm">
            <i className="fa-solid fa-wand-magic-sparkles text-red-800"></i>
            AI Powered Proofreader
          </span>
        </div>
        <p className="text-xs md:text-sm text-red-100 font-medium leading-relaxed">
          আপনার আসল Word (.docx) ফাইলের সাথে রেফারেন্স ইমেজ বা PDF ফাইল মিলিয়ে যেকোনো ভুল বানান, অনুপস্থিত অপশন, আন্ডারলাইন (<u>...</u>) ও যুক্তবর্ণের ত্রুটি স্বয়ংক্রিয়ভাবে কারেকশন করুন এবং সম্পূর্ণ সঠিক Word ফাইল ডাউনলোড করে নিন।
        </p>
      </div>

      {/* Grid: Card 1 & Card 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* CARD 1: Word File Upload */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDraggingWord(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDraggingWord(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDraggingWord(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              const file = e.dataTransfer.files[0];
              if (file.name.toLowerCase().endsWith('.docx')) {
                setWordFile(file);
              } else {
                alert('অনুগ্রহ করে একটি .docx ওয়ার্ড ফাইল আপলোড করুন।');
              }
            }
          }}
          className={`p-5 bg-white border-2 rounded-xl shadow-sm transition-all duration-200 flex flex-col justify-between ${
            isDraggingWord
              ? 'border-red-500 bg-red-50/70 ring-2 ring-red-200 scale-[1.01]'
              : 'border-red-200 hover:border-red-400'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center">
                  ১
                </span>
                <h2 className="text-sm md:text-base font-bold text-gray-800">
                  মূল Word (.docx) ফাইল নির্বাচন করুন
                </h2>
              </div>
              {wordFile && (
                <button
                  onClick={handleClearWordFile}
                  className="px-2.5 py-1 border border-red-600 text-red-600 text-xs font-bold rounded hover:bg-red-50 transition flex items-center gap-1"
                >
                  <i className="fa-regular fa-trash-can"></i>
                  মুছে ফেলুন
                </button>
              )}
            </div>

            <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-red-300 rounded-lg bg-red-50/20 cursor-pointer hover:bg-red-50/60 transition text-center group">
              <i className="fa-solid fa-file-word text-3xl text-red-600 mb-2 group-hover:scale-110 transition-transform"></i>
              <span className="text-xs md:text-sm font-bold text-gray-800 mb-1">
                {isDraggingWord
                  ? 'ওয়ার্ড ফাইলটি এখানে ছেড়ে দিন...'
                  : 'ওয়ার্ড ফাইল ড্রাগ ও ড্রপ করুন অথবা সিলেক্ট করুন'}
              </span>
              <span className="text-[11px] text-gray-500 font-medium">
                (.docx ফাইল সাপোর্টেড)
              </span>
              <input
                ref={wordInputRef}
                type="file"
                accept=".docx"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setWordFile(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
            </label>
          </div>

          {wordFile && (
            <div className="mt-3 p-2.5 bg-red-50/80 border border-red-200 rounded-md text-xs text-slate-700 font-medium flex items-center justify-between">
              <div className="truncate pr-2">
                📄 <span className="font-bold text-slate-900">{wordFile.name}</span>{' '}
                <span className="text-gray-500">
                  ({(wordFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <span className="text-emerald-700 font-bold text-[11px] shrink-0">
                ✓ সংযুক্ত
              </span>
            </div>
          )}
        </div>

        {/* CARD 2: Reference Files Upload */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDraggingRef(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDraggingRef(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDraggingRef(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              handleAddRefFiles(e.dataTransfer.files);
            }
          }}
          className={`p-5 bg-white border-2 rounded-xl shadow-sm transition-all duration-200 flex flex-col justify-between ${
            isDraggingRef
              ? 'border-sky-500 bg-sky-50/70 ring-2 ring-sky-200 scale-[1.01]'
              : 'border-sky-200 hover:border-sky-400'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-sky-100 text-sky-800 font-bold text-xs flex items-center justify-center">
                  ২
                </span>
                <h2 className="text-sm md:text-base font-bold text-gray-800">
                  রেফারেন্স (ইমেজ / PDF / Docx) আপলোড
                </h2>
              </div>
              {refFiles.length > 0 && (
                <button
                  onClick={handleClearRefFiles}
                  className="px-2.5 py-1 border border-red-600 text-red-600 text-xs font-bold rounded hover:bg-red-50 transition flex items-center gap-1"
                >
                  <i className="fa-regular fa-trash-can"></i>
                  সব মুছে ফেলুন
                </button>
              )}
            </div>

            <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-sky-300 rounded-lg bg-sky-50/20 cursor-pointer hover:bg-sky-50/60 transition text-center group">
              <div className="flex items-center gap-2 text-sky-600 mb-2">
                <i className="fa-solid fa-file-image text-2xl group-hover:scale-110 transition-transform"></i>
                <i className="fa-solid fa-file-pdf text-2xl group-hover:scale-110 transition-transform"></i>
              </div>
              <span className="text-xs md:text-sm font-bold text-gray-800 mb-1">
                {isDraggingRef
                  ? 'রেফারেন্স ফাইলগুলো এখানে ছেড়ে দিন...'
                  : 'ছবি বা PDF ড্রাগ ও ড্রপ করুন অথবা সিলেক্ট করুন'}
              </span>
              <span className="text-[11px] text-gray-500 font-medium">
                (ছবি, PDF বা অন্য কোনো ওয়ার্ড ফাইল - একাধিক সিলেক্ট করা সম্ভব)
              </span>
              <input
                ref={refInputRef}
                type="file"
                multiple
                accept="image/*, .pdf, .docx, .txt"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleAddRefFiles(e.target.files);
                  }
                }}
                className="hidden"
              />
            </label>
          </div>

          {/* Reference Files List */}
          {refFiles.length > 0 && (
            <div className="mt-3 space-y-1.5 max-h-32 overflow-y-auto pr-1">
              {refFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-sky-50/80 border border-sky-200 rounded text-xs text-slate-700 font-medium flex items-center justify-between gap-2"
                >
                  <div className="truncate">
                    {file.type.startsWith('image/') ? '🖼️' : '📄'}{' '}
                    <span className="font-bold text-slate-900">{file.name}</span>{' '}
                    <span className="text-gray-500">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveRefFile(idx)}
                    className="text-red-600 hover:text-red-800 font-bold text-xs p-0.5 shrink-0"
                    title="মুছে ফেলুন"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Control Action Section */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-700">
            আউটপুট ফন্ট চয়েস:
          </label>
          <select
            value={targetFont}
            onChange={(e) => setTargetFont(e.target.value as any)}
            className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded bg-white text-slate-800 shadow-xs focus:ring-2 focus:ring-red-500"
          >
            <option value="SolaimanLipi">SolaimanLipi (ইউনিকোড ফন্ট)</option>
            <option value="SutonnyMJ">SutonnyMJ (বিজয় ৪৫ ফন্ট)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetAll}
            className="px-4 py-2 border border-slate-400 text-slate-700 text-xs font-bold rounded hover:bg-slate-200 transition"
          >
            রিসেট করুন
          </button>
          <button
            onClick={handleStartCorrection}
            disabled={isProcessing || !wordFile}
            className={`px-6 py-2.5 text-xs md:text-sm font-bold text-white rounded-lg transition shadow-md flex items-center gap-2 ${
              isProcessing || !wordFile
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-red-700 hover:bg-red-800 active:scale-95'
            }`}
          >
            {isProcessing ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i>
                কারেকশন হচ্ছে...
              </>
            ) : (
              <>
                <i className="fa-solid fa-spell-check"></i>
                কারেকশন করুন (Correct Word File)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {statusMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-xs md:text-sm font-bold text-center flex items-center justify-center gap-2 animate-pulse">
          <i className="fa-solid fa-circle-notch fa-spin"></i>
          {statusMsg}
        </div>
      )}

      {errMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs md:text-sm font-bold text-center">
          ⚠️ {errMsg}
        </div>
      )}

      {/* Results & Download Section */}
      {correctedText && (
        <div className="p-5 bg-white border border-gray-200 rounded-xl shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-bold text-xs">
                ✓ কারেকশন সম্পন্ন
              </span>
              <span className="text-xs text-slate-500 font-medium">
                ফন্ট: <strong className="text-slate-800">{targetFont}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyText}
                className="px-3 py-1.5 border border-sky-600 text-sky-700 text-xs font-bold rounded hover:bg-sky-50 transition flex items-center gap-1.5"
              >
                <i className="fa-regular fa-copy"></i>
                {copySuccess ? '✓ কপি হয়েছে!' : 'টেক্সট কপি করুন'}
              </button>

              <button
                onClick={handleDownloadDocx}
                className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white text-xs md:text-sm font-bold rounded-lg transition shadow flex items-center gap-2"
              >
                <i className="fa-solid fa-download"></i>
                ডাউনলোড কারেক্টকৃত Word ফাইল (.docx)
              </button>
            </div>
          </div>

          {/* Preview Tabs */}
          <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
            <button
              onClick={() => setActivePreviewTab('rich')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition ${
                activePreviewTab === 'rich'
                  ? 'bg-red-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              এইচটিএমএল রিচ প্রিভিউ
            </button>
            <button
              onClick={() => setActivePreviewTab('plain')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition ${
                activePreviewTab === 'plain'
                  ? 'bg-red-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              প্লেইন টেক্সট মোড
            </button>
          </div>

          {/* Preview Content */}
          {activePreviewTab === 'rich' ? (
            renderRichPreview()
          ) : (
            <textarea
              readOnly
              value={correctedText}
              rows={14}
              className="w-full p-4 border border-gray-300 rounded-lg text-xs md:text-sm leading-relaxed text-slate-800 bg-slate-50 font-mono text-left focus:outline-none"
            />
          )}
        </div>
      )}
    </div>
  );
}
