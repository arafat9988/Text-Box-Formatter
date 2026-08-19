import React, { useState, useRef } from 'react';
import Markdown from 'react-markdown';
import { downloadAsDocx } from '../utils/exportDocx';

export const ErrorCheckerTab: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');
  const [files, setFiles] = useState<{ name: string; type: string; dataUrl?: string; sizeFormatted: string }[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [resultText, setResultText] = useState<string>('');
  const [actionMsg, setActionMsg] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setStatusMsg('ফাইল প্রসেস করা হচ্ছে...');
    const newFiles: { name: string; type: string; dataUrl?: string; sizeFormatted: string }[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      try {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const dataUrl = await base64Promise;
        const sizeMb = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
        newFiles.push({
          name: file.name,
          type: file.type || 'application/octet-stream',
          dataUrl,
          sizeFormatted: sizeMb
        });
      } catch (err) {
        console.error("File read error:", err);
      }
    }

    setFiles(prev => [...prev, ...newFiles]);
    setStatusMsg(`✓ ${newFiles.length}টি ফাইল সফলভাবে যুক্ত হয়েছে!`);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCheckErrors = async () => {
    if (!inputText.trim() && files.length === 0) {
      alert('দয়া করে কিছু টেক্সট পেস্ট করুন অথবা ফাইল (ইমেজ, PDF বা Word) আপলোড করুন।');
      return;
    }

    setIsLoading(true);
    setStatusMsg('AI বিশ্লেষণ করছে: ভুল উত্তর, ডাবল প্রশ্ন, ডাবল অপশন ও অন্যান্য ত্রুটি খোঁজা হচ্ছে...');
    setResultText('');

    try {
      const prompt = `আপনি একজন অত্যন্ত দক্ষ প্রশ্নপত্র ও পরীক্ষা বিশেষজ্ঞ (Question Paper Auditor & Quiz Expert)। 
নিচে প্রদত্ত টেক্সট বা ফাইলসমূহ খুব ভালোভাবে বিশ্লেষণ করুন। 

দয়া করে নিম্নলিখিত বিষয়গুলো পুঙ্খানুপুঙ্খভাবে চেক করুন:
1. **ভুল উত্তর (Wrong Answers):** প্রশ্নের সাপেক্ষে সঠিক উত্তরটি ভুল দেওয়া আছে কিনা যাচাই করুন এবং সঠিক উত্তর প্রদান করুন।
2. **ডাবল প্রশ্ন (Duplicate Questions):** একই প্রশ্ন বা কাছাকাছি প্রশ্ন একাধিকবার আছে কিনা শনাক্ত করুন।
3. **ডাবল অপশন (Duplicate Options):** একই অপশন একাধিকবার বা একই রকম অপশন একাধিক বক্সে আছে কিনা দেখুন।
4. **অন্যান্য ত্রুটি (Other Issues):** বানান ভুল, ব্যাকরণগত সমস্যা বা প্রশ্নপত্রের যেকোনো ত্রুটি থাকলে তা চিহ্নিত করুন।

### ফরম্যাট ও নির্দেশনা:
প্রত্যেকটি প্রশ্ন বা ত্রুটির জন্য নিচের কাঠামোগত ফরম্যাটে আলাদা আলাদাভাবে নিচে বিস্তারিত আউটপুট দিন:
- **প্রশ্ন নম্বর:** (যেমন: ১, ২, ইত্যাদি)
- **সমস্যা / ত্রুটি:** (ভুল উত্তর, ডাবল প্রশ্ন, ডাবল অপশন বা অন্যান্য সমস্যা থাকলে তা সুনির্দিষ্টভাবে বর্ণনা করুন)
- **সঠিক সমাধান ও উত্তর:** (সঠিক উত্তর এবং সংশোধিত প্রশ্নসহ সম্পূর্ণ নির্ভুল রূপটি প্রদান করুন)

নিচে প্রদত্ত ইনপুট ও ফাইলসমূহ বিশ্লেষণ করুন:
${inputText.trim() ? `টেক্সট ইনপুট:\n${inputText}` : ''}`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          files: files.map(f => ({
            name: f.name,
            type: f.type,
            sizeFormatted: f.sizeFormatted,
            dataUrl: f.dataUrl
          }))
        })
      });

      const responseText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error('সার্ভার থেকে সঠিক রেসপন্স পাওয়া যায়নি।');
      }

      if (!res.ok) {
        throw new Error(data.error || 'এরর চেকিং সম্পন্ন করা যায়নি।');
      }

      const reply = data.reply || data.text || 'কোনো ফলাফল পাওয়া যায়নি।';
      setResultText(reply);
      setStatusMsg('✓ প্রশ্নপত্র ত্রুটি ও ভুল উত্তর এনালাইসিস সফলভাবে সম্পন্ন হয়েছে!');
    } catch (err: any) {
      console.error(err);
      setStatusMsg(`ত্রুটি: ${err.message || 'সার্ভারে সমস্যা হয়েছে।'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyResult = () => {
    if (!resultText) return;
    navigator.clipboard.writeText(resultText);
    setActionMsg('কপি করা হয়েছে!');
    setTimeout(() => setActionMsg(''), 2000);
  };

  const handleDownloadDocx = async () => {
    if (!resultText) return;
    try {
      await downloadAsDocx(resultText, 'error-checker-report.docx');
      setActionMsg('ডাউনলোড সফল হয়েছে!');
      setTimeout(() => setActionMsg(''), 2000);
    } catch (e) {
      setActionMsg('ডাউনলোড করতে সমস্যা হয়েছে!');
      setTimeout(() => setActionMsg(''), 2000);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <i className="fa-solid fa-triangle-exclamation text-red-600"></i>
            Error Checker & Question Auditor
          </h2>
          <p className="text-xs text-gray-600 mt-1">
            প্রশ্নপত্রে ভুল উত্তর, ডাবল প্রশ্ন, ডাবল অপশন কিংবা যেকোনো ত্রুটি স্বয়ংক্রিয়ভাবে শনাক্ত করে প্রতিটি প্রশ্নের নম্বর ও সঠিক উত্তর আলাদাভাবে নিচে প্রদান করা হবে।
          </p>
        </div>
        {actionMsg && (
          <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full animate-bounce">
            {actionMsg}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input & Upload */}
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-bold text-sm text-gray-800 flex items-center justify-between">
              <span>১. প্রশ্নপত্র বা টেক্সট পেস্ট করুন:</span>
              <button
                type="button"
                onClick={() => setInputText('')}
                className="text-xs text-red-600 hover:text-red-800 underline cursor-pointer"
              >
                সব মুছুন
              </button>
            </label>
            <textarea
              rows={10}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="এখানে প্রশ্নপত্র পেস্ট করুন (যেমন: MCQ প্রশ্ন, অপশন ও উত্তরসহ)..."
              className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:border-red-600 focus:ring-1 focus:ring-red-200 outline-none font-sans"
            />
          </div>

          <div className="space-y-2">
            <label className="font-bold text-sm text-gray-800 block">
              ২. ফাইল, ইমেজ বা PDF আপলোড করুন (ঐচ্ছিক):
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 hover:border-red-500 rounded-xl p-4 text-center cursor-pointer bg-gray-50 hover:bg-red-50/30 transition"
            >
              <i className="fa-solid fa-cloud-arrow-up text-2xl text-red-600 mb-1"></i>
              <p className="text-xs text-gray-700 font-medium">ফাইল বা ইমেজ সিলেক্ট করতে এখানে ক্লিক করুন</p>
              <p className="text-[11px] text-gray-500 mt-0.5">(ছবি, PDF, Word Document সমর্থন করে)</p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                accept="image/*,.pdf,.docx"
                className="hidden"
              />
            </div>

            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {files.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-100 border border-gray-300 px-3 py-1.5 rounded-lg text-xs">
                    <i className="fa-solid fa-file-lines text-red-600"></i>
                    <span className="max-w-[150px] truncate font-medium">{file.name}</span>
                    <span className="text-gray-500 text-[10px]">({file.sizeFormatted})</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      className="text-gray-500 hover:text-red-600 font-bold ml-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={handleCheckErrors}
            className="w-full py-3 bg-red-700 hover:bg-red-800 disabled:bg-gray-400 text-white font-bold rounded-lg shadow-md transition flex items-center justify-center gap-2 cursor-pointer text-sm md:text-base"
          >
            {isLoading ? (
              <>
                <i className="fa-solid fa-spinner animate-spin"></i>
                <span>ত্রুটি ও ভুল উত্তর এনালাইসিস করা হচ্ছে...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-magnifying-glass-chart"></i>
                <span>ভুল ও ত্রুটি চেক করুন (Check Errors)</span>
              </>
            )}
          </button>

          {statusMsg && (
            <div className={`p-3 rounded-lg text-xs font-medium ${isLoading ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
              {statusMsg}
            </div>
          )}
        </div>

        {/* Right: Output Result */}
        <div className="space-y-3 flex flex-col">
          <div className="flex items-center justify-between">
            <label className="font-bold text-sm text-gray-800">
              ৩. ত্রুটি এনালাইসিস রিপোর্ট ও সঠিক সমাধান:
            </label>
            {resultText && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyResult}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded border border-gray-300 flex items-center gap-1.5 cursor-pointer transition"
                  title="রিপোর্ট কপি করুন"
                >
                  <i className="fa-solid fa-copy text-indigo-600"></i> কপি
                </button>
                <button
                  type="button"
                  onClick={handleDownloadDocx}
                  className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded border border-red-300 flex items-center gap-1.5 cursor-pointer transition"
                  title="Word (.docx) ডাউনলোড করুন"
                >
                  <i className="fa-solid fa-file-word text-red-600"></i> ডাউনলোড (.docx)
                </button>
              </div>
            )}
          </div>

          <div
            id="errorCheckerResultDiv"
            className="flex-1 min-h-[400px] max-h-[600px] overflow-y-auto p-4 bg-slate-50 border border-gray-300 rounded-xl text-sm leading-relaxed font-sans"
          >
            {resultText ? (
              <div className="markdown-body">
                <Markdown>{resultText}</Markdown>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 py-16">
                <i className="fa-solid fa-file-circle-check text-4xl mb-2 text-gray-300"></i>
                <p className="text-sm font-medium">এখনো কোনো এনালাইসিস করা হয়নি।</p>
                <p className="text-xs text-gray-400 mt-1">বামপাশে টেক্সট পেস্ট বা ফাইল আপলোড করে "ভুল ও ত্রুটি চেক করুন" বাটনে ক্লিক করুন।</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
