import React, { useState } from 'react';

export interface WebLink {
  name: string;
  url: string;
  iconClass: string;
  color: string;
  bgColor: string;
  borderColor: string;
  category: 'social' | 'ai' | 'edu' | 'telecom' | 'utilities';
  description?: string;
}

export const IMPORTANT_WEB_LINKS: WebLink[] = [
  // Social & Media
  { name: 'Facebook', url: 'https://www.facebook.com', iconClass: 'fa-brands fa-facebook-f', color: 'text-blue-600', bgColor: 'bg-blue-50 hover:bg-blue-100', borderColor: 'border-blue-200', category: 'social', description: 'সোশ্যাল মিডিয়া ও কানেক্টিভিটি' },
  { name: 'YouTube', url: 'https://www.youtube.com', iconClass: 'fa-brands fa-youtube', color: 'text-red-600', bgColor: 'bg-red-50 hover:bg-red-100', borderColor: 'border-red-200', category: 'social', description: 'ভিডিও স্ট্রিমিং ও টিউটোরিয়াল' },
  { name: 'WhatsApp', url: 'https://web.whatsapp.com', iconClass: 'fa-brands fa-whatsapp', color: 'text-emerald-600', bgColor: 'bg-emerald-50 hover:bg-emerald-100', borderColor: 'border-emerald-200', category: 'social', description: 'মেসেজিং ও মেটেরিয়াল শেয়ারিং' },
  { name: 'Messenger', url: 'https://www.messenger.com', iconClass: 'fa-brands fa-facebook-messenger', color: 'text-sky-500', bgColor: 'bg-sky-50 hover:bg-sky-100', borderColor: 'border-sky-200', category: 'social', description: 'ফেসবুক মেসেঞ্জার সার্ভিস' },
  { name: 'Instagram', url: 'https://www.instagram.com', iconClass: 'fa-brands fa-instagram', color: 'text-pink-600', bgColor: 'bg-pink-50 hover:bg-pink-100', borderColor: 'border-pink-200', category: 'social', description: 'ফটো ও ভিডিও শেয়ারিং প্ল্যাটফর্ম' },
  { name: 'TikTok', url: 'https://www.tiktok.com', iconClass: 'fa-brands fa-tiktok', color: 'text-slate-900', bgColor: 'bg-slate-100 hover:bg-slate-200', borderColor: 'border-slate-300', category: 'social', description: 'শর্ট ভিডিও প্ল্যাটফর্ম' },
  { name: 'LinkedIn', url: 'https://www.linkedin.com', iconClass: 'fa-brands fa-linkedin-in', color: 'text-blue-700', bgColor: 'bg-blue-50 hover:bg-blue-100', borderColor: 'border-blue-200', category: 'social', description: 'প্রফেশনাল নেটওয়ার্কিং' },
  { name: 'Telegram', url: 'https://web.telegram.org', iconClass: 'fa-brands fa-telegram', color: 'text-sky-600', bgColor: 'bg-sky-50 hover:bg-sky-100', borderColor: 'border-sky-200', category: 'social', description: 'ক্লাউড ভিত্তিক সিকিউর মেসেজিং' },
  { name: 'Quora', url: 'https://www.quora.com', iconClass: 'fa-brands fa-quora', color: 'text-red-700', bgColor: 'bg-red-50 hover:bg-red-100', borderColor: 'border-red-200', category: 'social', description: 'প্রশ্নোত্তর ও নলেজ শেয়ারিং' },

  // AI Tools
  { name: 'ChatGPT', url: 'https://chatgpt.com', iconClass: 'fa-solid fa-robot', color: 'text-emerald-700', bgColor: 'bg-emerald-50 hover:bg-emerald-100', borderColor: 'border-emerald-200', category: 'ai', description: 'OpenAI চ্যাটজিপিটি স্মার্ট এআই' },
  { name: 'Gemini', url: 'https://gemini.google.com', iconClass: 'fa-solid fa-sparkles', color: 'text-purple-600', bgColor: 'bg-purple-50 hover:bg-purple-100', borderColor: 'border-purple-200', category: 'ai', description: 'গুগল জেমিনি এআই অ্যাসিস্ট্যান্ট' },
  { name: 'Claude', url: 'https://claude.ai', iconClass: 'fa-solid fa-brain', color: 'text-amber-700', bgColor: 'bg-amber-50 hover:bg-amber-100', borderColor: 'border-amber-200', category: 'ai', description: 'অ্যানথ্রোপিক ক্লাউড এআই মডেল' },
  { name: 'Grok', url: 'https://grok.com', iconClass: 'fa-solid fa-atom', color: 'text-slate-900', bgColor: 'bg-slate-100 hover:bg-slate-200', borderColor: 'border-slate-300', category: 'ai', description: 'xAI গ্রক এআই সার্ভিস' },
  { name: 'Suno AI', url: 'https://suno.com', iconClass: 'fa-solid fa-music', color: 'text-orange-600', bgColor: 'bg-orange-50 hover:bg-orange-100', borderColor: 'border-orange-200', category: 'ai', description: 'এআই গান ও মিউজিক জেনারেটর' },

  // Education & Educational Tools
  { name: 'Udvash', url: 'https://udvash.com', iconClass: 'fa-solid fa-graduation-cap', color: 'text-red-600', bgColor: 'bg-red-50 hover:bg-red-100', borderColor: 'border-red-200', category: 'edu', description: 'উদ্ভাস একাডেমিক ও এডমিশন কেয়ার' },
  { name: 'Banglaplus', url: 'https://banglaplus.com', iconClass: 'fa-solid fa-language', color: 'text-emerald-600', bgColor: 'bg-emerald-50 hover:bg-emerald-100', borderColor: 'border-emerald-200', category: 'edu', description: 'বাংলা প্লাস লার্নিং ও রিসোর্স' },
  { name: 'UMS Portal', url: 'https://umsbd.net/', iconClass: 'fa-solid fa-building-columns', color: 'text-indigo-600', bgColor: 'bg-indigo-50 hover:bg-indigo-100', borderColor: 'border-indigo-200', category: 'edu', description: 'ইউনিভার্সিটি ম্যানেজমেন্ট সিস্টেম' },
  { name: 'BanglaTools', url: 'https://banglatools.com', iconClass: 'fa-solid fa-screwdriver-wrench', color: 'text-teal-600', bgColor: 'bg-teal-50 hover:bg-teal-100', borderColor: 'border-teal-200', category: 'edu', description: 'অনলাইন বাংলা ইউটিলিটি টুলস' },

  // Utilities & Media
  { name: 'BajusLive', url: 'https://bajuslive.com', iconClass: 'fa-solid fa-gem', color: 'text-amber-600', bgColor: 'bg-amber-50 hover:bg-amber-100', borderColor: 'border-amber-200', category: 'utilities', description: 'গোল্ড ও সিলভার লাইভ আপডেট' },
  { name: 'Snaptube', url: 'https://www.snaptube.com', iconClass: 'fa-solid fa-circle-down', color: 'text-yellow-600', bgColor: 'bg-yellow-50 hover:bg-yellow-100', borderColor: 'border-yellow-200', category: 'utilities', description: 'মিডিয়া ডাউনলোড সার্ভিস' },
  { name: 'CamScanner', url: 'https://www.camscanner.com', iconClass: 'fa-solid fa-file-pdf', color: 'text-red-500', bgColor: 'bg-red-50 hover:bg-red-100', borderColor: 'border-red-200', category: 'utilities', description: 'ডকুমেন্ট স্ক্যান ও পিডিএফ মেকার' },

  // Mobile Banking & Telecom
  { name: 'bKash', url: 'https://www.bkash.com', iconClass: 'fa-solid fa-wallet', color: 'text-pink-600', bgColor: 'bg-pink-50 hover:bg-pink-100', borderColor: 'border-pink-200', category: 'telecom', description: 'বিকাশ মোবাইল ব্যাংকিং' },
  { name: 'Nagad', url: 'https://nagad.com.bd', iconClass: 'fa-solid fa-money-bill-wave', color: 'text-orange-600', bgColor: 'bg-orange-50 hover:bg-orange-100', borderColor: 'border-orange-200', category: 'telecom', description: 'নগদ ডিজিটাল ফিন্যান্সিয়াল সার্ভিস' },
  { name: 'MyGP', url: 'https://www.grameenphone.com/mygp', iconClass: 'fa-solid fa-mobile-screen', color: 'text-blue-600', bgColor: 'bg-blue-50 hover:bg-blue-100', borderColor: 'border-blue-200', category: 'telecom', description: 'গ্রামীণফোন মাইজিপি পোর্টাল' },
  { name: 'MyBL', url: 'https://www.banglalink.net/en/mybl', iconClass: 'fa-solid fa-sim-card', color: 'text-orange-500', bgColor: 'bg-orange-50 hover:bg-orange-100', borderColor: 'border-orange-200', category: 'telecom', description: 'বাংলালিংক মাইবিএল ওয়েব সার্ভিস' },
  { name: 'Teletalk', url: 'https://www.teletalk.com.bd', iconClass: 'fa-solid fa-tower-cell', color: 'text-green-600', bgColor: 'bg-green-50 hover:bg-green-100', borderColor: 'border-green-200', category: 'telecom', description: 'টেলিটক বাংলাদেশ লিমিটেড' },
  { name: 'Airtel BD', url: 'https://www.bd.airtel.com', iconClass: 'fa-solid fa-network-wired', color: 'text-red-600', bgColor: 'bg-red-50 hover:bg-red-100', borderColor: 'border-red-200', category: 'telecom', description: 'এয়ারটেল বাংলাদেশ সার্ভিস' },
  { name: 'Robi', url: 'https://www.robi.com.bd', iconClass: 'fa-solid fa-signal', color: 'text-red-500', bgColor: 'bg-red-50 hover:bg-red-100', borderColor: 'border-red-200', category: 'telecom', description: 'ররবি অ্যাক্সিয়াটা বাংলাদেশ' },
];

export function ImportantWebTab() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = [
    { id: 'all', label: 'সব লিংক (All)' },
    { id: 'social', label: 'সোশ্যাল ও চ্যাট (Social & Chat)' },
    { id: 'ai', label: 'এআই টুলস (AI Tools)' },
    { id: 'edu', label: 'শিক্ষা ও লার্নিং (Education)' },
    { id: 'utilities', label: 'টুলস ও ইউটিলিটি (Utilities)' },
    { id: 'telecom', label: 'মোবাইল ব্যাংকিং ও টেলিকম (Banking & Telecom)' }
  ];

  const filteredLinks = IMPORTANT_WEB_LINKS.filter((item) => {
    const matchesCategory =
      selectedCategory === 'all' ? true : item.category === selectedCategory;

    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      item.name.toLowerCase().includes(query) ||
      (item.description && item.description.toLowerCase().includes(query));

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="w-full bg-slate-50 rounded-2xl shadow-xl border border-slate-200 overflow-hidden mb-8">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-red-700 via-rose-700 to-red-800 text-white p-5 md:p-6 text-center relative">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md mb-3 border border-white/20 shadow-inner">
          <i className="fa-solid fa-globe text-2xl text-amber-300"></i>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2">
          Important Web (প্রয়োজনীয় ওয়েবসাইট ও গুরুত্বপূর্ণ লিংক)
        </h1>
        <p className="text-red-100 text-sm md:text-base max-w-2xl mx-auto">
          নিয়মিত ব্যবহৃত সকল সোশ্যাল মিডিয়া, কৃত্রিম বুদ্ধিমত্তা (AI) টুলস, শিক্ষামূলক পোর্টাল ও মোবাইল ব্যাংকিং সার্ভিসের দ্রুত প্রবেশদ্বার।
        </p>
      </div>

      {/* Search & Category Filter Section */}
      <div className="p-4 md:p-6 bg-slate-100 border-b border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-lg">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input
              type="text"
              placeholder="ওয়েবসাইট বা সার্ভিস দিয়ে খুঁজুন (যেমন: ChatGPT, bKash, Facebook)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm shadow-sm font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm"
              >
                <i className="fa-solid fa-circle-xmark"></i>
              </button>
            )}
          </div>

          <div className="text-xs md:text-sm font-bold text-slate-600 bg-white px-3.5 py-2 rounded-lg border border-slate-200 shadow-sm self-start md:self-auto">
            মোট লিংক: <span className="text-red-600 text-base font-extrabold">{filteredLinks.length}টি</span>
          </div>
        </div>

        {/* Category Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-1 scrollbar-none">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs md:text-sm font-bold transition-all whitespace-nowrap shadow-sm border ${
                  isSelected
                    ? 'bg-red-700 text-white border-red-700 shadow-red-200 shadow-md'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Links Grid */}
      <div className="p-4 md:p-6 bg-slate-50 min-h-[380px]">
        {filteredLinks.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
            <i className="fa-solid fa-globe text-slate-300 text-5xl mb-3"></i>
            <p className="text-slate-600 font-bold text-base">কোনো ওয়েবসাইট পাওয়া যায়নি!</p>
            <p className="text-slate-400 text-sm mt-1">অনুগ্রহ করে আপনার সার্চ বা ফিল্টার চেক করুন।</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {filteredLinks.map((link) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`group bg-white rounded-2xl border ${link.borderColor} p-4 hover:shadow-lg transition-all duration-200 flex flex-col items-center text-center relative overflow-hidden ${link.bgColor}`}
              >
                {/* Icon Container */}
                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-center text-2xl md:text-3xl mb-3 group-hover:scale-110 transition-transform ${link.color}`}>
                  <i className={link.iconClass}></i>
                </div>

                {/* Name */}
                <h3 className="font-extrabold text-slate-800 text-sm md:text-base group-hover:text-red-700 transition-colors mb-1 line-clamp-1">
                  {link.name}
                </h3>

                {/* Description */}
                {link.description && (
                  <p className="text-[11px] text-slate-500 font-medium line-clamp-2 mb-3 leading-tight">
                    {link.description}
                  </p>
                )}

                {/* Action Link Footer */}
                <div className="mt-auto pt-2 border-t border-slate-200/60 w-full flex items-center justify-center text-xs font-bold text-red-600 group-hover:text-red-700 gap-1.5">
                  <span>ওপেন করুন</span>
                  <i className="fa-solid fa-arrow-up-right-from-square text-[10px] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"></i>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
