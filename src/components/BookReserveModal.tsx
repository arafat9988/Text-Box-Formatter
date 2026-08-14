import React, { useState, useRef } from 'react';
import { ReservedBook, saveReservedBook, deleteReservedBook, toggleReservedBookActive, clearAllReservedBooks } from '../utils/bookReserveDB';

interface BookReserveModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: ReservedBook[];
  onBooksChanged: () => void;
  onSelectBookForChat?: (book: ReservedBook, customPrompt?: string) => void;
}

export const BookReserveModal: React.FC<BookReserveModalProps> = ({
  isOpen,
  onClose,
  books,
  onBooksChanged,
  onSelectBookForChat
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingBookId, setEditingBookId] = useState<string | null>(null);

  // New book form state
  const [newFile, setNewFile] = useState<{
    file: File;
    name: string;
    sizeFormatted: string;
    extractedText: string;
    dataUrl?: string;
  } | null>(null);
  const [bookTitle, setBookTitle] = useState('');
  const [bookCode, setBookCode] = useState('');
  const [bookNotes, setBookNotes] = useState('');

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleFilePicked = async (file: File) => {
    if (!file) return;
    const isPdf = file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf && !file.type.startsWith('application/')) {
      alert('অনুগ্রহ করে একটি PDF বই আপলোড করুন।');
      return;
    }

    setIsParsing(true);

    try {
      // Suggest default title and code immediately
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      setBookTitle(cleanName);
      const suggestedCode = cleanName
        .split(/[\s-_]+/)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 8) || 'BOOK';
      setBookCode(suggestedCode);

      // Upload via FormData to /api/parse-file for stream parsing
      const formData = new FormData();
      formData.append('file', file);

      const parseRes = await fetch('/api/parse-file', {
        method: 'POST',
        body: formData
      });

      let extracted = '';
      if (parseRes.ok) {
        const pData = await parseRes.json();
        extracted = pData.extractedText || '';
      }

      setNewFile({
        file,
        name: file.name,
        sizeFormatted: formatBytes(file.size),
        extractedText: extracted
      });
    } catch (err) {
      console.error('Error parsing book PDF:', err);
      // Fallback
      setNewFile({
        file,
        name: file.name,
        sizeFormatted: formatBytes(file.size),
        extractedText: ''
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleSaveNewBook = async () => {
    if (!newFile) {
      alert('অনুগ্রহ করে একটি PDF বই নির্বাচন করুন।');
      return;
    }
    if (!bookTitle.trim()) {
      alert('বইয়ের নাম প্রদান করুন।');
      return;
    }

    setIsUploading(true);
    try {
      const newBook: ReservedBook = {
        id: 'book-' + Date.now(),
        title: bookTitle.trim(),
        code: (bookCode.trim() || bookTitle.slice(0, 6)).toUpperCase(),
        fileName: newFile.name,
        fileSize: newFile.sizeFormatted,
        fileSizeBytes: newFile.file.size,
        mimeType: newFile.file.type || 'application/pdf',
        extractedText: newFile.extractedText || '',
        uploadedAt: new Date().toLocaleDateString('bn-BD', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        isActive: true,
        notes: bookNotes.trim()
      };

      await saveReservedBook(newBook);
      onBooksChanged();
      setNewFile(null);
      setBookTitle('');
      setBookCode('');
      setBookNotes('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Failed to save book to IndexedDB', err);
      alert('বই সংরক্ষণ করতে সমস্যা হয়েছে।');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteBook = async (id: string, title: string) => {
    if (window.confirm(`আপনি কি নিশ্চিত যে "${title}" বইটি রিজার্ভ তালিকা থেকে মুছে ফেলতে চান?`)) {
      try {
        await deleteReservedBook(id);
        onBooksChanged();
      } catch (err) {
        console.error('Failed to delete book', err);
      }
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await toggleReservedBookActive(id, !currentStatus);
      onBooksChanged();
    } catch (err) {
      console.error('Failed to toggle active', err);
    }
  };

  const handleStartEdit = (book: ReservedBook) => {
    setEditingBookId(book.id);
    setEditTitle(book.title);
    setEditCode(book.code);
    setEditNotes(book.notes || '');
  };

  const handleSaveEdit = async (book: ReservedBook) => {
    if (!editTitle.trim()) {
      alert('বইয়ের নাম খালি রাখা যাবে না।');
      return;
    }
    try {
      const updated: ReservedBook = {
        ...book,
        title: editTitle.trim(),
        code: (editCode.trim() || editTitle.slice(0, 6)).toUpperCase(),
        notes: editNotes.trim()
      };
      await saveReservedBook(updated);
      setEditingBookId(null);
      onBooksChanged();
    } catch (err) {
      console.error('Failed to save edited book', err);
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('সতর্কতা: আপনি কি নিশ্চিত যে Book Reserve-এর সকল বই মুছে ফেলতে চান?')) {
      try {
        await clearAllReservedBooks();
        onBooksChanged();
      } catch (err) {
        console.error('Failed to clear books', err);
      }
    }
  };

  const filteredBooks = books.filter((b) => {
    if (!searchQuery.trim()) return true;
    const term = searchQuery.toLowerCase();
    return (
      b.title.toLowerCase().includes(term) ||
      b.code.toLowerCase().includes(term) ||
      b.fileName.toLowerCase().includes(term) ||
      (b.notes && b.notes.toLowerCase().includes(term))
    );
  });

  const activeCount = books.filter((b) => b.isActive).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-red-600 via-rose-600 to-indigo-700 text-white flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl shadow-xs">
              <i className="fa-solid fa-book-bookmark"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">Book Reserve (বইয়ের রিজার্ভ লাইব্রেরি)</h2>
                <span className="bg-white/20 text-white text-[11px] font-bold px-2 py-0.5 rounded-full border border-white/30">
                  {books.length} টি বই সংরক্ষিত
                </span>
                {activeCount > 0 && (
                  <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {activeCount} টি সক্রিয়
                  </span>
                )}
              </div>
              <p className="text-xs text-rose-100 mt-0.5">
                বইয়ের PDF আপলোড করে সংরক্ষণ করুন এবং চ্যাটে রেফারেন্স অনুযায়ী প্রশ্ন কালেক্ট করুন
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition cursor-pointer"
            title="বন্ধ করুন"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 space-y-6">
          {/* Add New Book Section */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <i className="fa-solid fa-plus-circle text-rose-600"></i>
                নতুন বই যুক্ত করুন (Add New Book PDF)
              </h3>
              <span className="text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">PDF ফাইল ফরম্যাট সমর্থিত (আনলিমিটেড সাইজ)</span>
            </div>

            {isParsing ? (
              <div className="border-2 border-dashed border-rose-300 bg-rose-50/40 rounded-xl p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-xl mb-2 animate-spin">
                  <i className="fa-solid fa-spinner"></i>
                </div>
                <p className="font-bold text-sm text-rose-800">বইয়ের টেক্সট ও রেফারেন্স ইনডেক্স করা হচ্ছে...</p>
                <p className="text-xs text-rose-600 mt-1">দয়া করে একটু অপেক্ষা করুন</p>
              </div>
            ) : !newFile ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFilePicked(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
                  isDragging
                    ? 'border-rose-500 bg-rose-50/50'
                    : 'border-gray-300 hover:border-rose-400 hover:bg-rose-50/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFilePicked(e.target.files[0])}
                />
                <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-xl mb-2">
                  <i className="fa-solid fa-file-pdf"></i>
                </div>
                <p className="font-bold text-sm text-gray-700">বইয়ের PDF এখানে ড্রপ করুন অথবা নির্বাচন করুন</p>
                <p className="text-xs text-gray-400 mt-1">ক্লিক করে আপনার কম্পিউটার বা ফোন থেকে PDF ফাইল নির্বাচন করুন</p>
              </div>
            ) : (
              <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-600 text-white rounded-lg flex items-center justify-center text-lg font-bold shadow-xs">
                      <i className="fa-solid fa-file-pdf"></i>
                    </div>
                    <div>
                      <p className="font-bold text-xs text-gray-800 truncate max-w-xs sm:max-w-md">{newFile.name}</p>
                      <p className="text-[11px] text-gray-500">সাইজ: {newFile.sizeFormatted} • PDF ফাইল প্রস্তুত</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setNewFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-xs text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg font-semibold transition"
                  >
                    বদল করুন
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      বইয়ের নাম (Book Title) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={bookTitle}
                      onChange={(e) => setBookTitle(e.target.value)}
                      placeholder="যেমন: MQB 1st & 2nd Bangla 26-27"
                      className="w-full text-xs p-2.5 bg-white border border-gray-300 rounded-lg outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      সংক্ষিপ্ত রেফারেন্স কোড / ট্যাগ (Reference Code)
                    </label>
                    <input
                      type="text"
                      value={bookCode}
                      onChange={(e) => setBookCode(e.target.value.toUpperCase())}
                      placeholder="যেমন: MQB, GK-BD, BANGLA"
                      className="w-full text-xs p-2.5 bg-white border border-gray-300 rounded-lg outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 uppercase font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    বইয়ের বিবরণ / নোট (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    value={bookNotes}
                    onChange={(e) => setBookNotes(e.target.value)}
                    placeholder="যেমন: বিসিএস ও ভর্তি পরীক্ষার বাংলা প্রশ্নব্যাংক"
                    className="w-full text-xs p-2.5 bg-white border border-gray-300 rounded-lg outline-none focus:border-rose-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setNewFile(null)}
                    className="text-xs px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 font-semibold transition cursor-pointer"
                  >
                    বাতিল
                  </button>
                  <button
                    onClick={handleSaveNewBook}
                    disabled={isUploading}
                    className="text-xs px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <i className="fa-solid fa-spinner animate-spin"></i>
                        সংরক্ষণ হচ্ছে...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-cloud-arrow-up"></i>
                        বই রিজার্ভে সেভ করুন
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Reserved Books List */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                  <i className="fa-solid fa-layer-group text-indigo-600"></i>
                  সংরক্ষিত বইয়ের তালিকা (Reserved Books List)
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-semibold">
                    {filteredBooks.length} টি
                  </span>
                </h3>
                <p className="text-[11px] text-gray-500">
                  সক্রিয় (Active) করা বইগুলো থেকে চ্যাট অপশন সরাসরি রেফারেন্স অনুযায়ী প্রশ্ন খুঁজে আনবে
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-60">
                  <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="বইয়ের নাম বা কোড খুঁজুন..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-100 border border-gray-200 rounded-lg text-xs outline-none focus:border-indigo-500 focus:bg-white transition"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {books.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition"
                    title="সব বই মুছুন"
                  >
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                )}
              </div>
            </div>

            {filteredBooks.length === 0 ? (
              <div className="py-10 text-center text-gray-400 space-y-2 border border-dashed border-gray-200 rounded-xl bg-slate-50">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-xl text-gray-300">
                  <i className="fa-solid fa-book-open"></i>
                </div>
                <p className="text-xs font-semibold text-gray-600">
                  {searchQuery ? 'কোনো বই পাওয়া যায়নি' : 'এখনো কোনো বই রিজার্ভ করা হয়নি'}
                </p>
                <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
                  {searchQuery
                    ? 'ভিন্ন শব্দ বা কোড দিয়ে অনুসন্ধান করুন।'
                    : 'উপরের অপশন থেকে আপনার বইয়ের PDF আপলোড করে সেভ করুন।'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredBooks.map((book) => {
                  const isEditing = editingBookId === book.id;

                  if (isEditing) {
                    return (
                      <div key={book.id} className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-2.5 shadow-xs">
                        <div>
                          <label className="text-[10px] font-bold text-gray-600">বইয়ের নাম:</label>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full text-xs p-1.5 bg-white border border-gray-300 rounded font-semibold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-600">রেফারেন্স কোড:</label>
                          <input
                            type="text"
                            value={editCode}
                            onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                            className="w-full text-xs p-1.5 bg-white border border-gray-300 rounded font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-600">নোট:</label>
                          <input
                            type="text"
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            className="w-full text-xs p-1.5 bg-white border border-gray-300 rounded"
                          />
                        </div>
                        <div className="flex justify-end gap-1.5 pt-1">
                          <button
                            onClick={() => setEditingBookId(null)}
                            className="text-xs px-2.5 py-1 bg-gray-200 text-gray-700 rounded font-semibold"
                          >
                            বাতিল
                          </button>
                          <button
                            onClick={() => handleSaveEdit(book)}
                            className="text-xs px-3 py-1 bg-indigo-600 text-white rounded font-bold"
                          >
                            সংরক্ষণ
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={book.id}
                      className={`p-3.5 rounded-xl border transition relative flex flex-col justify-between ${
                        book.isActive
                          ? 'bg-white border-rose-200 hover:border-rose-300 shadow-xs ring-1 ring-rose-100'
                          : 'bg-slate-50/80 border-gray-200 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <div>
                        {/* Top info */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0 font-bold text-base shadow-2xs">
                              <i className="fa-solid fa-file-pdf"></i>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="bg-rose-100 text-rose-800 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border border-rose-200 shrink-0">
                                  [{book.code}]
                                </span>
                                <h4 className="font-bold text-xs text-gray-900 truncate" title={book.title}>
                                  {book.title}
                                </h4>
                              </div>
                              <p className="text-[10px] text-gray-500 truncate mt-0.5">{book.fileName}</p>
                            </div>
                          </div>

                          {/* Active Toggle Switch */}
                          <button
                            onClick={() => handleToggleActive(book.id, book.isActive)}
                            className={`shrink-0 text-[10px] font-bold px-2 py-0.8 rounded-full border transition flex items-center gap-1 cursor-pointer ${
                              book.isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                            }`}
                            title={book.isActive ? 'চ্যাটে রেফারেন্স সক্রিয় আছে (ক্লিক করে বন্ধ করুন)' : 'চ্যাটে সক্রিয় করতে ক্লিক করুন'}
                          >
                            <i className={`fa-solid ${book.isActive ? 'fa-circle-check text-emerald-600' : 'fa-circle-pause text-gray-400'}`}></i>
                            {book.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                          </button>
                        </div>

                        {book.notes && (
                          <p className="text-[11px] text-gray-600 bg-slate-50 p-1.5 rounded border border-gray-100 mb-2.5">
                            <i className="fa-solid fa-circle-info text-indigo-400 mr-1 text-[10px]"></i>
                            {book.notes}
                          </p>
                        )}
                      </div>

                      {/* Footer actions */}
                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                        <div className="flex items-center gap-2">
                          <span>{book.fileSize}</span>
                          <span>•</span>
                          <span>{book.uploadedAt}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Quick ask button */}
                          <button
                            onClick={() => {
                              if (onSelectBookForChat) {
                                onSelectBookForChat(
                                  book,
                                  `[${book.code}: "${book.title}"] বই থেকে রেফারেন্স অনুযায়ী প্রশ্ন কালেক্ট করে দাও:`
                                );
                                onClose();
                              }
                            }}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded transition flex items-center gap-1 cursor-pointer border border-indigo-200"
                            title="এই বই থেকে প্রশ্ন খুঁজুন"
                          >
                            <i className="fa-solid fa-magnifying-glass text-[9px]"></i>
                            প্রশ্ন খুঁজুন
                          </button>

                          <button
                            onClick={() => handleStartEdit(book)}
                            className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                            title="বইয়ের নাম ও কোড সম্পাদনা করুন"
                          >
                            <i className="fa-solid fa-pen text-xs"></i>
                          </button>

                          <button
                            onClick={() => handleDeleteBook(book.id, book.title)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                            title="বই মুছে ফেলুন"
                          >
                            <i className="fa-solid fa-trash text-xs"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reference How-to Guide */}
          <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 p-4 rounded-xl border border-indigo-100">
            <h4 className="font-bold text-xs text-indigo-900 mb-2 flex items-center gap-1.5">
              <i className="fa-solid fa-lightbulb text-amber-500"></i>
              চ্যাটে কীভাবে রেফারেন্স দিয়ে প্রশ্ন চাইবেন? (উদাহরণ)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-indigo-950">
              <div className="bg-white/80 p-2.5 rounded-lg border border-indigo-100/60 shadow-2xs">
                <span className="font-bold text-rose-600">১. পৃষ্ঠা ও প্রশ্ন নম্বর রেফারেন্স:</span>
                <p className="text-[11px] text-gray-700 mt-0.5">
                  &quot;MQB বইয়ের পৃষ্ঠা ৫০ থেকে সমাস ও কারক সম্পর্কিত ১০টি প্রশ্ন অপশন ও উত্তরসহ দাও&quot;
                </p>
              </div>
              <div className="bg-white/80 p-2.5 rounded-lg border border-indigo-100/60 shadow-2xs">
                <span className="font-bold text-indigo-600">২. অধ্যায় বা বিষয়ভিত্তিক রেফারেন্স:</span>
                <p className="text-[11px] text-gray-700 mt-0.5">
                  &quot;রিজার্ভের বইগুলো থেকে ধ্বনি পরিবর্তন ও সন্ধি বিষয়ক বিগত সালের প্রশ্নগুলো কালেক্ট করো&quot;
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-white flex items-center justify-between text-xs text-gray-500 shrink-0">
          <span className="text-[11px]">
            {activeCount} টি বই চ্যাট রেফারেন্সের জন্য সক্রিয় রয়েছে
          </span>
          <button
            onClick={onClose}
            className="bg-gray-800 hover:bg-black text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer shadow-xs"
          >
            সম্পন্ন (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
