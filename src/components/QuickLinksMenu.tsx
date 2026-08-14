import React, { useState, useRef, useEffect } from 'react';

interface LinkItem {
  name: string;
  url: string;
  iconClass: string;
  color: string;
  bgColor: string;
  category: 'social' | 'ai' | 'utilities' | 'telecom';
}

const QUICK_LINKS: LinkItem[] = [
  // Social & Chat
  { name: 'Facebook', url: 'https://www.facebook.com', iconClass: 'fa-brands fa-facebook-f', color: 'text-blue-600', bgColor: 'bg-blue-50 hover:bg-blue-100', category: 'social' },
  { name: 'TikTok', url: 'https://www.tiktok.com', iconClass: 'fa-brands fa-tiktok', color: 'text-black', bgColor: 'bg-gray-100 hover:bg-gray-200', category: 'social' },
  { name: 'Instagram', url: 'https://www.instagram.com', iconClass: 'fa-brands fa-instagram', color: 'text-pink-600', bgColor: 'bg-pink-50 hover:bg-pink-100', category: 'social' },
  { name: 'LinkedIn', url: 'https://www.linkedin.com', iconClass: 'fa-brands fa-linkedin-in', color: 'text-blue-700', bgColor: 'bg-blue-50 hover:bg-blue-100', category: 'social' },
  { name: 'Messenger', url: 'https://www.messenger.com', iconClass: 'fa-brands fa-facebook-messenger', color: 'text-sky-500', bgColor: 'bg-sky-50 hover:bg-sky-100', category: 'social' },
  { name: 'WhatsApp', url: 'https://web.whatsapp.com', iconClass: 'fa-brands fa-whatsapp', color: 'text-emerald-600', bgColor: 'bg-emerald-50 hover:bg-emerald-100', category: 'social' },
  { name: 'YouTube', url: 'https://www.youtube.com', iconClass: 'fa-brands fa-youtube', color: 'text-red-600', bgColor: 'bg-red-50 hover:bg-red-100', category: 'social' },
  { name: 'Telegram', url: 'https://web.telegram.org', iconClass: 'fa-brands fa-telegram', color: 'text-sky-600', bgColor: 'bg-sky-50 hover:bg-sky-100', category: 'social' },

  // AI Tools
  { name: 'ChatGPT', url: 'https://chatgpt.com', iconClass: 'fa-solid fa-robot', color: 'text-emerald-700', bgColor: 'bg-emerald-50 hover:bg-emerald-100', category: 'ai' },
  { name: 'Gemini', url: 'https://gemini.google.com', iconClass: 'fa-solid fa-sparkles', color: 'text-purple-600', bgColor: 'bg-purple-50 hover:bg-purple-100', category: 'ai' },
  { name: 'Claude', url: 'https://claude.ai', iconClass: 'fa-solid fa-brain', color: 'text-amber-700', bgColor: 'bg-amber-50 hover:bg-amber-100', category: 'ai' },
  { name: 'Grok', url: 'https://grok.com', iconClass: 'fa-solid fa-atom', color: 'text-slate-900', bgColor: 'bg-slate-100 hover:bg-slate-200', category: 'ai' },
  { name: 'Suno', url: 'https://suno.com', iconClass: 'fa-solid fa-music', color: 'text-orange-600', bgColor: 'bg-orange-50 hover:bg-orange-100', category: 'ai' },

  // Education & Educational Tools
  { name: 'Udvash', url: 'https://udvash.com', iconClass: 'fa-solid fa-graduation-cap', color: 'text-red-600', bgColor: 'bg-red-50 hover:bg-red-100', category: 'utilities' },
  { name: 'Quora', url: 'https://www.quora.com', iconClass: 'fa-brands fa-quora', color: 'text-red-700', bgColor: 'bg-red-50 hover:bg-red-100', category: 'social' },
  { name: 'Banglaplus', url: 'https://banglaplus.com', iconClass: 'fa-solid fa-language', color: 'text-emerald-600', bgColor: 'bg-emerald-50 hover:bg-emerald-100', category: 'utilities' },
  { name: 'UMS', url: 'https://umsbd.net/', iconClass: 'fa-solid fa-building-columns', color: 'text-indigo-600', bgColor: 'bg-indigo-50 hover:bg-indigo-100', category: 'utilities' },
  { name: 'BanglaTools', url: 'https://banglatools.com', iconClass: 'fa-solid fa-screwdriver-wrench', color: 'text-teal-600', bgColor: 'bg-teal-50 hover:bg-teal-100', category: 'utilities' },
  { name: 'BajusLive', url: 'https://bajuslive.com', iconClass: 'fa-solid fa-gem', color: 'text-amber-600', bgColor: 'bg-amber-50 hover:bg-amber-100', category: 'utilities' },

  // Utilities & Media
  { name: 'Snaptube', url: 'https://www.snaptube.com', iconClass: 'fa-solid fa-circle-down', color: 'text-yellow-600', bgColor: 'bg-yellow-50 hover:bg-yellow-100', category: 'utilities' },
  { name: 'CamScanner', url: 'https://www.camscanner.com', iconClass: 'fa-solid fa-file-pdf', color: 'text-red-500', bgColor: 'bg-red-50 hover:bg-red-100', category: 'utilities' },

  // Mobile Banking & Telecom
  { name: 'bKash', url: 'https://www.bkash.com', iconClass: 'fa-solid fa-wallet', color: 'text-pink-600', bgColor: 'bg-pink-50 hover:bg-pink-100', category: 'telecom' },
  { name: 'Nagad', url: 'https://nagad.com.bd', iconClass: 'fa-solid fa-money-bill-wave', color: 'text-orange-600', bgColor: 'bg-orange-50 hover:bg-orange-100', category: 'telecom' },
  { name: 'MyGP', url: 'https://www.grameenphone.com/mygp', iconClass: 'fa-solid fa-mobile-screen', color: 'text-blue-600', bgColor: 'bg-blue-50 hover:bg-blue-100', category: 'telecom' },
  { name: 'MyBL', url: 'https://www.banglalink.net/en/mybl', iconClass: 'fa-solid fa-sim-card', color: 'text-orange-500', bgColor: 'bg-orange-50 hover:bg-orange-100', category: 'telecom' },
  { name: 'Teletalk', url: 'https://www.teletalk.com.bd', iconClass: 'fa-solid fa-tower-cell', color: 'text-green-600', bgColor: 'bg-green-50 hover:bg-green-100', category: 'telecom' },
  { name: 'Airtel', url: 'https://www.bd.airtel.com', iconClass: 'fa-solid fa-network-wired', color: 'text-red-600', bgColor: 'bg-red-50 hover:bg-red-100', category: 'telecom' },
  { name: 'Robi', url: 'https://www.robi.com.bd', iconClass: 'fa-solid fa-signal', color: 'text-red-500', bgColor: 'bg-red-50 hover:bg-red-100', category: 'telecom' },
];

export const QuickLinksMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredLinks = QUICK_LINKS.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* 3-Dots Vertical Menu Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 border-2 border-gray-300 text-gray-700 transition flex items-center justify-center cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-red-500"
        title="মেনু এবং দ্রুত লিংকসমূহ (⋮)"
        aria-label="Quick Links Menu"
      >
        <i className="fa-solid fa-ellipsis-vertical text-xl text-gray-800"></i>
      </button>

      {/* Menu Popup Modal/Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-700 to-rose-800 p-3.5 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-grid-2 text-lg"></i>
              <h3 className="font-bold text-sm">প্রয়োজনীয় ওয়েবসাইট ও অ্যাপস (⋮)</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 w-7 h-7 rounded-full flex items-center justify-center text-xs transition cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Search Box */}
          <div className="p-2.5 bg-gray-50 border-b border-gray-200">
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-gray-400 text-xs"></i>
              <input
                type="text"
                placeholder="সাইট বা অ্যাপ খুঁজুন (যেমন: bKash, ChatGPT)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 text-gray-800"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Grid Content */}
          <div className="max-h-[380px] overflow-y-auto p-3">
            {filteredLinks.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-xs">
                কোনো ফলাফল পাওয়া যায়নি!
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {filteredLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsOpen(false)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border border-gray-200/80 transition-all transform hover:-translate-y-0.5 hover:shadow-md ${link.bgColor}`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center bg-white shadow-xs text-lg mb-1.5 ${link.color}`}>
                      <i className={link.iconClass}></i>
                    </div>
                    <span className="text-[11px] font-semibold text-gray-800 text-center truncate w-full leading-tight">
                      {link.name}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-3 py-2 border-t border-gray-200 text-center text-[10px] text-gray-500 font-medium">
            ক্লিক করলে নতুন ট্যাবে মূল ওয়েবসাইটটি খুলে যাবে
          </div>
        </div>
      )}
    </div>
  );
};
