import React, { useState, useEffect, useRef } from 'react';
import {
  HistoryBook,
  getAllHistoryBooks,
  deleteHistoryBook,
  updateHistoryBookTag,
  clearAllHistoryBooks,
  saveHistoryBook
} from '../utils/bookHistoryDB';
import { QcBook } from '../App';

interface BookHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeBooks: QcBook[];
  onRestoreBook: (historyBook: HistoryBook) => Promise<void>;
  onRestoreAll: (historyBooks: HistoryBook[]) => Promise<void>;
  onHistoryUpdated?: () => void;
}

export const BookHistoryModal: React.FC<BookHistoryModalProps> = ({
  isOpen,
  onClose,
  activeBooks,
  onRestoreBook,
  onRestoreAll,
  onHistoryUpdated
}) => {
  const [historyBooks, setHistoryBooks] = useState<HistoryBook[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagVal, setEditingTagVal] = useState<string>('');
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [isRestoringAll, setIsRestoringAll] = useState<boolean>(false);
  const [statusToast, setStatusToast] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadBooks = async () => {
    setLoading(true);
    const books = await getAllHistoryBooks();
    setHistoryBooks(books);
    setLoading(false);
    if (onHistoryUpdated) onHistoryUpdated();
  };

  useEffect(() => {
    if (isOpen) {
      loadBooks();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => {
      setStatusToast('');
    }, 3000);
  };

  const isBookActiveInList = (hBook: HistoryBook) => {
    return activeBooks.some(
      ab => ab.id === hBook.id || ab.name.toLowerCase() === hBook.name.toLowerCase()
    );
  };

  const filteredBooks = historyBooks.filter(b => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      b.shortTag.toLowerCase().includes(q)
    );
  });

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`আপনি কি "${name}" বইটি ইতিহাস থেকে স্থায়ীভাবে মুছে ফেলতে চান?`)) {
      return;
    }
    await deleteHistoryBook(id);
    showToast(`"${name}" ইতিহাস থেকে মুছে ফেলা হয়েছে`);
    await loadBooks();
  };

  const handleClearAll = async () => {
    if (historyBooks.length === 0) return;
    if (!window.confirm('আপনি কি নিশ্চিত যে সকল ইতিহাস স্থায়ীভাবে মুছে ফেলতে চান?')) {
      return;
    }
    await clearAllHistoryBooks();
    showToast('সকল বইয়ের ইতিহাস মুছে ফেলা হয়েছে');
    await loadBooks();
  };

  const handleStartEditTag = (b: HistoryBook) => {
    setEditingTagId(b.id);
    setEditingTagVal(b.shortTag);
  };

  const handleSaveTag = async (id: string) => {
    if (editingTagVal.trim()) {
      await updateHistoryBookTag(id, editingTagVal.trim());
      showToast('ট্যাগ আপডেট করা হয়েছে');
      await loadBooks();
    }
    setEditingTagId(null);
  };

  const handleRestoreOne = async (b: HistoryBook) => {
    setRestoringId(b.id);
    try {
      await onRestoreBook(b);
      showToast(`"${b.name}" সক্রিয় তালিকায় যোগ করা হয়েছে!`);
    } catch (err) {
      console.error(err);
      alert('বইটি সক্রিয় তালিকায় যুক্ত করতে সমস্যা হয়েছে!');
    } finally {
      setRestoringId(null);
    }
  };

  const handleRestoreAllUnloaded = async () => {
    if (filteredBooks.length === 0) return;
    setIsRestoringAll(true);
    try {
      await onRestoreAll(filteredBooks);
      showToast('সকল ইতিহাস বই সক্রিয় তালিকায় সফলভাবে যুক্ত করা হয়েছে!');
    } catch (err) {
      console.error(err);
      alert('বইসমূহ সক্রিয় তালিকায় যুক্ত করতে সমস্যা হয়েছে!');
    } finally {
      setIsRestoringAll(false);
    }
  };

  const handleDownload = (b: HistoryBook) => {
    const blob = new Blob([b.arrayBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = b.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDirectUploadToHistory = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    let count = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.name.toLowerCase().endsWith('.pdf')) continue;
      try {
        const arrayBuffer = await file.arrayBuffer();
        let totalPages = 1;
        if (window.pdfjsLib) {
          try {
            const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
            totalPages = pdf.numPages;
          } catch (e) {
            console.warn("PDF page count reading error", e);
          }
        }
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        let shortTag = 'Book';
        const upper = baseName.toUpperCase();
        if (upper.includes('MQB')) shortTag = 'MQB';
        else if (upper.includes('GK')) shortTag = 'GK';
        else if (upper.includes('BANGLA') || upper.includes('BAN')) shortTag = 'Bangla';
        else if (upper.includes('ENGLISH') || upper.includes('ENG')) shortTag = 'English';
        else if (upper.includes('MATH')) shortTag = 'Math';
        else if (upper.includes('BCS')) shortTag = 'BCS';
        else {
          const parts = baseName.split(/[\s_\-\.]+/).filter(Boolean);
          shortTag = parts.length > 0 ? parts[0] : 'Book';
        }

        const newHistoryBook: HistoryBook = {
          id: 'book_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          name: file.name,
          shortTag,
          totalPages,
          fileSizeBytes: file.size,
          uploadedAt: new Date().toISOString(),
          arrayBuffer
        };

        await saveHistoryBook(newHistoryBook);
        count++;
      } catch (err) {
        console.error("Upload to history failed:", err);
      }
    }

    if (count > 0) {
      showToast(`${count}টি নতুন PDF ইতিহাসেও যোগ করা হয়েছে!`);
      await loadBooks();
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    setLoading(false);
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('bn-BD', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-800 via-indigo-800 to-purple-900 text-white px-5 py-4 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center border border-white/20 text-purple-200 text-xl shadow-inner">
              <i className="fa-solid fa-clock-rotate-left"></i>
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                Book History (আপলোড ও সংরক্ষিত বইয়ের ইতিহাস)
              </h2>
              <p className="text-xs text-purple-200/90 font-medium">
                পূর্বের সমস্ত আপলোডকৃত বই এখানে সংগৃহীত থাকে। মুছে ফেলা বইও পরবর্তীতে যেকোনো সময় ফিরিয়ে আনতে পারবেন।
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors text-lg"
            title="বন্ধ করুন"
          >
            ✕
          </button>
        </div>

        {/* Status Toast */}
        {statusToast && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2 shrink-0 animate-in slide-in-from-top duration-150">
            <i className="fa-solid fa-circle-check"></i> {statusToast}
          </div>
        )}

        {/* Toolbar */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3 shrink-0">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="বইয়ের নাম বা ট্যাগ (যেমন: MQB, Bangla) লিখে খুঁজুন..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs px-1"
              >
                ✕
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              multiple
              className="hidden"
              onChange={handleDirectUploadToHistory}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 shadow-xs transition-colors"
              title="নতুন PDF সরাসরি ইতিহাসেও আপলোড করুন"
            >
              <i className="fa-solid fa-file-arrow-up"></i> PDF যোগ করুন
            </button>

            {filteredBooks.length > 0 && (
              <button
                onClick={handleRestoreAllUnloaded}
                disabled={isRestoringAll}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                title="ইতিহাসের সব বই বর্তমান কাজের তালিকায় যোগ করুন"
              >
                <i className={`fa-solid ${isRestoringAll ? 'fa-spinner fa-spin' : 'fa-list-check'}`}></i>
                {isRestoringAll ? 'যুক্ত হচ্ছে...' : 'সবগুলো তালিকায় আনুন'}
              </button>
            )}

            {historyBooks.length > 0 && (
              <button
                onClick={handleClearAll}
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-colors"
                title="ইতিহাস সম্পূর্ণ মুছে ফেলুন"
              >
                <i className="fa-solid fa-trash-can"></i> ইতিহাস পরিষ্কার
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
          {loading ? (
            <div className="py-12 text-center text-gray-500">
              <i className="fa-solid fa-spinner fa-spin text-2xl text-purple-600 mb-2"></i>
              <p className="text-xs font-bold">ইতিহাসের বইসমূহ লোড হচ্ছে...</p>
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="py-12 px-4 text-center border-2 border-dashed border-gray-300 rounded-xl bg-white">
              <div className="w-16 h-16 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-3 text-2xl border border-purple-200 shadow-xs">
                <i className="fa-solid fa-book-open"></i>
              </div>
              <h3 className="text-sm font-bold text-gray-800 mb-1">
                {searchQuery ? 'খোঁজকৃত নামের কোনো বই পাওয়া যায়নি' : 'এখনো কোনো বই ইতিহাসেও যুক্ত করা হয়নি'}
              </h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto mb-4">
                আপনি যখনই Question Collect ট্যাবে বা এখানে PDF যোগ করবেন, সবগুলো বই ব্রাউজারে স্থায়ীভাবে সংরক্ষিত থাকবে। মুছে ফেলা বইও এখানে এসে উদ্ধার করতে পারবেন!
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-4 py-2 rounded-lg font-bold inline-flex items-center gap-2 shadow-sm"
              >
                <i className="fa-solid fa-cloud-arrow-up"></i> প্রথম PDF যোগ করুন
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {filteredBooks.map((b) => {
                const isActive = isBookActiveInList(b);
                const isRestoringThis = restoringId === b.id;

                return (
                  <div
                    key={b.id}
                    className={`bg-white border rounded-xl p-3.5 transition-all flex items-center justify-between flex-wrap gap-3 shadow-2xs hover:shadow-xs ${
                      isActive ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-gray-200'
                    }`}
                  >
                    {/* Left Details */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 border border-red-200 flex items-center justify-center font-bold text-xl shrink-0 shadow-2xs">
                        <i className="fa-solid fa-file-pdf"></i>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="font-bold text-xs sm:text-sm text-gray-900 truncate max-w-md" title={b.name}>
                            {b.name}
                          </h4>

                          {/* Tag & Tag Editor */}
                          {editingTagId === b.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={editingTagVal}
                                onChange={(e) => setEditingTagVal(e.target.value)}
                                className="px-1.5 py-0.5 text-[11px] font-mono border border-purple-400 rounded focus:outline-none bg-purple-50"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveTag(b.id)}
                              />
                              <button
                                onClick={() => handleSaveTag(b.id)}
                                className="text-emerald-700 hover:text-emerald-900 text-xs px-1"
                                title="সেভ"
                              >
                                <i className="fa-solid fa-check"></i>
                              </button>
                            </div>
                          ) : (
                            <span
                              onClick={() => handleStartEditTag(b)}
                              className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 cursor-pointer transition-colors"
                              title="ট্যাগ এডিট করতে ক্লিক করুন"
                            >
                              Tag: {b.shortTag} <i className="fa-solid fa-pen text-[9px] ml-0.5"></i>
                            </span>
                          )}

                          {/* Status Badge */}
                          {isActive ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                              <i className="fa-solid fa-circle-check"></i> তালিকায় সক্রিয়
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1">
                              <i className="fa-solid fa-box-archive"></i> হিস্টোরিতে সংরক্ষিত
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-gray-500 flex-wrap">
                          <span><i className="fa-solid fa-file-lines text-purple-400"></i> {b.totalPages} পৃষ্ঠা</span>
                          <span><i className="fa-solid fa-hard-drive text-blue-400"></i> {formatFileSize(b.fileSizeBytes)}</span>
                          <span><i className="fa-solid fa-clock text-emerald-500"></i> {formatDate(b.uploadedAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
                      {/* Restore / Add to Active List Button */}
                      <button
                        onClick={() => handleRestoreOne(b)}
                        disabled={isRestoringThis}
                        className={`text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors shadow-2xs ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                        title={isActive ? 'আবারও লোড করুন বা সক্রিয় করুন' : 'বর্তমান সিলেক্টেড বইয়ের তালিকায় যুক্ত করুন'}
                      >
                        <i className={`fa-solid ${isRestoringThis ? 'fa-spinner fa-spin' : isActive ? 'fa-arrows-rotate' : 'fa-plus'}`}></i>
                        {isRestoringThis ? 'যুক্ত হচ্ছে...' : isActive ? 'পুনরায় আনুন' : '+ তালিকায় আনুন'}
                      </button>

                      {/* Download PDF */}
                      <button
                        onClick={() => handleDownload(b)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 text-xs px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-colors"
                        title="PDF ডাউনলোড করুন"
                      >
                        <i className="fa-solid fa-download"></i>
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(b.id, b.name)}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-colors"
                        title="ইতিহাস থেকে স্থায়ীভাবে মুছুন"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-100 border-t border-gray-200 flex items-center justify-between flex-wrap gap-2 text-xs text-gray-600 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-800">
              মোট {historyBooks.length}টি বই ইতিহাস সংরক্ষণে রয়েছে
            </span>
          </div>
          <button
            onClick={onClose}
            className="bg-gray-800 hover:bg-gray-900 text-white font-bold px-4 py-1.5 rounded-lg text-xs transition-colors"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>
    </div>
  );
};
