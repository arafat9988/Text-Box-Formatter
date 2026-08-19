import React, { useState, useEffect, useRef } from 'react';
import {
  HistoryBook,
  BookPlaylist,
  getAllHistoryBooks,
  deleteHistoryBook,
  updateHistoryBookTag,
  updateHistoryBookPlaylists,
  clearAllHistoryBooks,
  saveHistoryBook,
  getAllPlaylists,
  savePlaylist,
  deletePlaylist
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

const PLAYLIST_COLORS: { id: string; name: string; bg: string; text: string; border: string; activeBg: string }[] = [
  { id: 'purple', name: 'Purple', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', activeBg: 'bg-purple-600 text-white border-purple-600' },
  { id: 'indigo', name: 'Indigo', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', activeBg: 'bg-indigo-600 text-white border-indigo-600' },
  { id: 'emerald', name: 'Emerald', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', activeBg: 'bg-emerald-600 text-white border-emerald-600' },
  { id: 'rose', name: 'Rose', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', activeBg: 'bg-rose-600 text-white border-rose-600' },
  { id: 'amber', name: 'Amber', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', activeBg: 'bg-amber-600 text-white border-amber-600' },
  { id: 'blue', name: 'Blue', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', activeBg: 'bg-blue-600 text-white border-blue-600' },
  { id: 'cyan', name: 'Cyan', bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', activeBg: 'bg-cyan-600 text-white border-cyan-600' }
];

export const BookHistoryModal: React.FC<BookHistoryModalProps> = ({
  isOpen,
  onClose,
  activeBooks,
  onRestoreBook,
  onRestoreAll,
  onHistoryUpdated
}) => {
  const [historyBooks, setHistoryBooks] = useState<HistoryBook[]>([]);
  const [playlists, setPlaylists] = useState<BookPlaylist[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Tag editing
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagVal, setEditingTagVal] = useState<string>('');
  
  // Playlist Management
  const [managingBookId, setManagingBookId] = useState<string | null>(null);
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState<boolean>(false);
  const [newPlName, setNewPlName] = useState<string>('');
  const [newPlColor, setNewPlColor] = useState<string>('purple');
  const [newPlDesc, setNewPlDesc] = useState<string>('');

  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [isRestoringAll, setIsRestoringAll] = useState<boolean>(false);
  const [statusToast, setStatusToast] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [books, pls] = await Promise.all([
      getAllHistoryBooks(),
      getAllPlaylists()
    ]);
    setHistoryBooks(books);
    setPlaylists(pls);
    setLoading(false);
    if (onHistoryUpdated) onHistoryUpdated();
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
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

  // Helper to check if a book belongs to a playlist
  const isBookInPlaylist = (book: HistoryBook, playlistId: string): boolean => {
    if (playlistId === 'ALL') return true;
    if (book.playlists && book.playlists.includes(playlistId)) return true;

    // Smart auto-matching fallback if book hasn't been explicitly assigned yet
    const lowerName = book.name.toLowerCase();
    const lowerTag = book.shortTag.toLowerCase();
    if (playlistId === 'pl_2nd_time' && (lowerName.includes('2nd time') || lowerTag.includes('2nd time'))) return true;
    if (playlistId === 'pl_gk' && (lowerName.includes('gk') || lowerTag.includes('gk'))) return true;
    if (playlistId === 'pl_bangla' && (lowerName.includes('bangla') || lowerTag.includes('bangla') || lowerName.includes('mqb'))) return true;
    if (playlistId === 'pl_english' && (lowerName.includes('english') || lowerTag.includes('english') || lowerName.includes('eng'))) return true;

    return false;
  };

  const filteredBooks = historyBooks.filter(b => {
    // Playlist filter
    if (!isBookInPlaylist(b, selectedPlaylistId)) return false;

    // Search query filter
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      b.shortTag.toLowerCase().includes(q)
    );
  });

  const getPlaylistBookCount = (playlistId: string): number => {
    return historyBooks.filter(b => isBookInPlaylist(b, playlistId)).length;
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`আপনি কি "${name}" বইটি ইতিহাস থেকে স্থায়ীভাবে মুছে ফেলতে চান?`)) {
      return;
    }
    await deleteHistoryBook(id);
    showToast(`"${name}" ইতিহাস থেকে মুছে ফেলা হয়েছে`);
    await loadData();
  };

  const handleClearAll = async () => {
    if (historyBooks.length === 0) return;
    if (!window.confirm('আপনি কি নিশ্চিত যে সকল ইতিহাস স্থায়ীভাবে মুছে ফেলতে চান?')) {
      return;
    }
    await clearAllHistoryBooks();
    showToast('সকল বইয়ের ইতিহাস মুছে ফেলা হয়েছে');
    await loadData();
  };

  const handleStartEditTag = (b: HistoryBook) => {
    setEditingTagId(b.id);
    setEditingTagVal(b.shortTag);
  };

  const handleSaveTag = async (id: string) => {
    if (editingTagVal.trim()) {
      await updateHistoryBookTag(id, editingTagVal.trim());
      showToast('ট্যাগ আপডেট করা হয়েছে');
      await loadData();
    }
    setEditingTagId(null);
  };

  const handleToggleBookPlaylist = async (book: HistoryBook, playlistId: string) => {
    const currentPlaylists = book.playlists || [];
    let updated: string[];
    
    // Check if implicitly or explicitly included
    const currentlyIn = isBookInPlaylist(book, playlistId);
    if (currentlyIn && currentPlaylists.includes(playlistId)) {
      updated = currentPlaylists.filter(id => id !== playlistId);
    } else if (!currentlyIn) {
      updated = [...currentPlaylists, playlistId];
    } else {
      // If implicitly in, toggle removes it
      updated = currentPlaylists.filter(id => id !== playlistId);
    }

    await updateHistoryBookPlaylists(book.id, updated);
    showToast('প্লেলিস্ট আপডেট করা হয়েছে');
    await loadData();
  };

  const handleCreatePlaylist = async () => {
    if (!newPlName.trim()) {
      alert('অনুগ্রহ করে প্লেলিস্টের নাম দিন');
      return;
    }

    const newPl: BookPlaylist = {
      id: 'pl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: newPlName.trim(),
      color: newPlColor,
      description: newPlDesc.trim(),
      createdAt: new Date().toISOString()
    };

    await savePlaylist(newPl);
    showToast(`"${newPl.name}" প্লেলিস্ট তৈরি করা হয়েছে!`);
    setNewPlName('');
    setNewPlDesc('');
    setIsCreatePlaylistOpen(false);
    setSelectedPlaylistId(newPl.id);
    await loadData();
  };

  const handleDeletePlaylist = async (plId: string, plName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`আপনি কি "${plName}" প্লেলিস্টটি মুছে ফেলতে চান?`)) return;

    await deletePlaylist(plId);
    if (selectedPlaylistId === plId) setSelectedPlaylistId('ALL');
    showToast(`"${plName}" প্লেলিস্টটি মুছে ফেলা হয়েছে`);
    await loadData();
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
      showToast('নির্বাচিত প্লেলিস্টের সব বই সক্রিয় তালিকায় সফলভাবে যুক্ত করা হয়েছে!');
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

        // Auto assign to current active playlist if specific playlist is selected
        const initialPlaylists: string[] = [];
        if (selectedPlaylistId !== 'ALL') {
          initialPlaylists.push(selectedPlaylistId);
        }

        const newHistoryBook: HistoryBook = {
          id: 'book_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          name: file.name,
          shortTag,
          totalPages,
          fileSizeBytes: file.size,
          uploadedAt: new Date().toISOString(),
          arrayBuffer,
          playlists: initialPlaylists
        };

        await saveHistoryBook(newHistoryBook);
        count++;
      } catch (err) {
        console.error("Upload to history failed:", err);
      }
    }

    if (count > 0) {
      showToast(`${count}টি নতুন PDF ইতিহাসেও যোগ করা হয়েছে!`);
      await loadData();
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

  const getPlaylistBadgeStyle = (colorId?: string) => {
    const colorObj = PLAYLIST_COLORS.find(c => c.id === colorId) || PLAYLIST_COLORS[0];
    return colorObj;
  };

  const selectedPlObj = playlists.find(p => p.id === selectedPlaylistId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-800 via-indigo-800 to-purple-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center border border-white/20 text-purple-200 text-xl shadow-inner">
              <i className="fa-solid fa-clock-rotate-left"></i>
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                Book History (আপলোড ও সংরক্ষিত বইয়ের ইতিহাস)
              </h2>
              <p className="text-xs text-purple-200/90 font-medium">
                পূর্বের সমস্ত আপলোডকৃত বই এখানে প্লেলিস্ট অনুযায়ী সাজানো থাকবে। যেকোন সময় প্লেলিস্ট তৈরি করে বই গ্রুপ করতে পারবেন।
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
          <div className="bg-emerald-600 text-white px-4 py-1.5 text-xs font-bold text-center flex items-center justify-center gap-2 shrink-0 animate-in slide-in-from-top duration-150">
            <i className="fa-solid fa-circle-check"></i> {statusToast}
          </div>
        )}

        {/* Toolbar Top Row: Search & Action Buttons */}
        <div className="px-4 pt-3 pb-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3 shrink-0">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="বইয়ের নাম বা ট্যাগ (যেমন: MQB, Bangla) লিখে খুঁজুন..."
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-2xs"
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
                title="প্লেলিস্টের সব বই বর্তমান কাজের তালিকায় যোগ করুন"
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

        {/* PLAYLIST BAR (Highlighted right below Search Bar as requested!) */}
        <div className="bg-slate-100/80 border-b border-gray-200 px-4 py-2 shrink-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <i className="fa-solid fa-folder-open text-purple-600"></i> বইয়ের প্লেলিস্ট (Book Playlists):
            </span>
            <button
              onClick={() => setIsCreatePlaylistOpen(!isCreatePlaylistOpen)}
              className="text-[11px] bg-purple-100 hover:bg-purple-200 text-purple-800 border border-purple-300 px-2.5 py-1 rounded-md font-bold flex items-center gap-1 transition-all shadow-2xs"
            >
              <i className="fa-solid fa-plus text-purple-600"></i> + নতুন প্লেলিস্ট তৈরি করুন
            </button>
          </div>

          {/* New Playlist Form Dropdown */}
          {isCreatePlaylistOpen && (
            <div className="bg-white border border-purple-300 rounded-xl p-3 mb-2.5 shadow-md animate-in slide-in-from-top duration-150">
              <h4 className="text-xs font-bold text-purple-900 mb-2 flex items-center gap-1.5">
                <i className="fa-solid fa-folder-plus text-purple-600"></i> নতুন প্লেলিস্ট ফর্ম
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-2.5">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-gray-600 block mb-0.5">প্লেলিস্টের নাম:</label>
                  <input
                    type="text"
                    value={newPlName}
                    onChange={(e) => setNewPlName(e.target.value)}
                    placeholder="যেমন: Varsity Kha 2nd Time 2026, BCS Special..."
                    className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-600 block mb-0.5">রঙ (Color):</label>
                  <select
                    value={newPlColor}
                    onChange={(e) => setNewPlColor(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white font-medium"
                  >
                    {PLAYLIST_COLORS.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mb-2.5">
                <label className="text-[10px] font-bold text-gray-600 block mb-0.5">বিবরণ (ঐচ্ছিক):</label>
                <input
                  type="text"
                  value={newPlDesc}
                  onChange={(e) => setNewPlDesc(e.target.value)}
                  placeholder="যেমন: খ ইউনিটের সকল ২য় বারের জন্য সংরক্ষিত প্রশ্নব্যাংক"
                  className="w-full text-xs px-2.5 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setIsCreatePlaylistOpen(false)}
                  className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800 font-bold"
                >
                  বাতিল
                </button>
                <button
                  onClick={handleCreatePlaylist}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3.5 py-1 rounded-lg font-bold flex items-center gap-1 shadow-xs"
                >
                  <i className="fa-solid fa-check"></i> সেভ করুন
                </button>
              </div>
            </div>
          )}

          {/* Playlist Filter Pills / Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
            {/* All Books Pill */}
            <button
              onClick={() => setSelectedPlaylistId('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 border shadow-2xs ${
                selectedPlaylistId === 'ALL'
                  ? 'bg-purple-700 text-white border-purple-800 shadow-xs ring-2 ring-purple-300'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
              }`}
            >
              <i className="fa-solid fa-layer-group"></i>
              সবগুলো বই
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                selectedPlaylistId === 'ALL' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-800'
              }`}>
                {historyBooks.length}
              </span>
            </button>

            {/* Custom Playlist Pills */}
            {playlists.map((pl) => {
              const count = getPlaylistBookCount(pl.id);
              const colorObj = getPlaylistBadgeStyle(pl.color);
              const isSelected = selectedPlaylistId === pl.id;

              return (
                <div key={pl.id} className="relative group shrink-0">
                  <button
                    onClick={() => setSelectedPlaylistId(pl.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border shadow-2xs ${
                      isSelected
                        ? `${colorObj.activeBg} shadow-xs ring-2 ring-purple-300`
                        : `${colorObj.bg} ${colorObj.text} ${colorObj.border} hover:brightness-95`
                    }`}
                    title={pl.description || pl.name}
                  >
                    <i className="fa-solid fa-book-bookmark text-[11px]"></i>
                    <span className="truncate max-w-[170px]">{pl.name}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-white/80 text-gray-800 border border-black/10'
                    }`}>
                      {count}
                    </span>
                  </button>

                  {/* Delete button on hover for custom created playlists */}
                  {!pl.id.startsWith('pl_default') && (
                    <button
                      onClick={(e) => handleDeletePlaylist(pl.id, pl.name, e)}
                      className="hidden group-hover:flex absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-600 text-white rounded-full items-center justify-center text-[9px] shadow-md hover:bg-rose-700 transition-colors"
                      title="প্লেলিস্ট মুছুন"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {selectedPlObj && selectedPlaylistId !== 'ALL' && (
            <div className="mt-1.5 pt-1.5 border-t border-gray-200/60 flex items-center justify-between text-[11px] text-gray-600 flex-wrap gap-2">
              <span className="font-medium text-purple-900">
                <i className="fa-solid fa-circle-info text-purple-600 mr-1"></i>
                <strong>{selectedPlObj.name}:</strong> {selectedPlObj.description || 'এই প্লেলিস্টে সিলেক্টেড বইগুলো নিচে ফিল্টার করা হয়েছে।'}
              </span>
              <span className="text-gray-500 font-bold">
                ফিল্টারকৃত: {filteredBooks.length}টি বই
              </span>
            </div>
          )}
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
                {selectedPlaylistId !== 'ALL'
                  ? `"${selectedPlObj?.name}" প্লেলিস্টে কোনো বই পাওয়া যায়নি`
                  : searchQuery
                  ? 'খোঁজকৃত নামের কোনো বই পাওয়া যায়নি'
                  : 'এখনো কোনো বই ইতিহাসেও যুক্ত করা হয়নি'}
              </h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto mb-4">
                আপনি বই সমূহে 'প্লেলিস্ট' বাটনে ক্লিক করে সহজেই এই প্লেলিস্টে যেকোনো বই যোগ করতে পারেন অথবা নতুন PDF আপলোড করতে পারেন।
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-4 py-2 rounded-lg font-bold inline-flex items-center gap-2 shadow-sm"
              >
                <i className="fa-solid fa-cloud-arrow-up"></i> এই প্লেলিস্টে PDF যোগ করুন
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {filteredBooks.map((b) => {
                const isActive = isBookActiveInList(b);
                const isRestoringThis = restoringId === b.id;
                const isManagingThis = managingBookId === b.id;

                return (
                  <div
                    key={b.id}
                    className={`bg-white border rounded-xl p-3.5 transition-all flex items-center justify-between flex-wrap gap-3 shadow-2xs hover:shadow-xs relative ${
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

                        {/* Playlists Assigned to this book */}
                        <div className="flex items-center gap-1.5 flex-wrap my-1">
                          <span className="text-[10px] text-gray-600 font-bold flex items-center gap-1">
                            <i className="fa-solid fa-folder text-amber-500"></i> প্লেলিস্ট:
                          </span>
                          {playlists.filter(pl => isBookInPlaylist(b, pl.id)).map(pl => {
                            const cObj = getPlaylistBadgeStyle(pl.color);
                            return (
                              <span
                                key={pl.id}
                                className={`text-[10px] px-2 py-0.3 rounded-md font-bold border ${cObj.bg} ${cObj.text} ${cObj.border}`}
                              >
                                {pl.name.split('(')[0].trim()}
                              </span>
                            );
                          })}

                          {/* Manage Playlist Toggle Button */}
                          <button
                            onClick={() => setManagingBookId(isManagingThis ? null : b.id)}
                            className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-gray-100 hover:bg-purple-50 text-gray-700 hover:text-purple-700 border border-gray-300 hover:border-purple-300 transition-colors flex items-center gap-1 ml-1"
                            title="বইটিকে নির্দিষ্ট প্লেলিস্টে সাজান"
                          >
                            <i className="fa-solid fa-sliders text-purple-600"></i> প্লেলিস্ট পরিবর্তন
                          </button>
                        </div>

                        {/* Playlist Selection Popover */}
                        {isManagingThis && (
                          <div className="bg-white border border-purple-300 rounded-xl p-3 my-2 shadow-lg z-20 animate-in fade-in duration-100">
                            <div className="flex items-center justify-between border-b pb-1.5 mb-2">
                              <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                                <i className="fa-solid fa-list-check text-purple-600"></i> প্লেলিস্ট নির্বাচন করুন:
                              </span>
                              <button
                                onClick={() => setManagingBookId(null)}
                                className="text-xs text-gray-400 hover:text-gray-600"
                              >
                                ✕
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {playlists.map(pl => {
                                const inPl = isBookInPlaylist(b, pl.id);
                                return (
                                  <label
                                    key={pl.id}
                                    className={`flex items-center gap-2 p-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                                      inPl ? 'bg-purple-50 border-purple-300 text-purple-900' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={inPl}
                                      onChange={() => handleToggleBookPlaylist(b, pl.id)}
                                      className="rounded text-purple-600 focus:ring-purple-500"
                                    />
                                    <span className="truncate">{pl.name}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-3 text-[11px] text-gray-500 flex-wrap mt-1">
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
        <div className="p-3.5 bg-gray-100 border-t border-gray-200 flex items-center justify-between flex-wrap gap-2 text-xs text-gray-600 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-800">
              মোট {historyBooks.length}টি বই ইতিহাস সংরক্ষণে রয়েছে ({playlists.length}টি প্লেলিস্ট)
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
