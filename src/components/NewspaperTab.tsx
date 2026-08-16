import React, { useState, useEffect } from 'react';

export interface Newspaper {
  id: string;
  name: string;
  engName: string;
  url: string;
  category: 'national' | 'online' | 'english' | 'tv' | 'kolkata' | 'business' | 'regional' | 'sports';
  domain: string;
  badgeBg: string;
  badgeColor: string;
  isHot?: boolean;
}

export const NEWSPAPERS: Newspaper[] = [
  // Top Hot / National
  { id: 'prothom-alo', name: 'প্রথম আলো', engName: 'Prothom Alo', url: 'https://www.prothomalo.com', category: 'national', domain: 'prothomalo.com', badgeBg: 'bg-red-600', badgeColor: 'text-white', isHot: true },
  { id: 'bd-pratidin', name: 'বাংলাদেশ প্রতিদিন', engName: 'Bangladesh Pratidin', url: 'https://www.bd-pratidin.com', category: 'national', domain: 'bd-pratidin.com', badgeBg: 'bg-red-700', badgeColor: 'text-white', isHot: true },
  { id: 'ittefaq', name: 'দৈনিক ইত্তেফাক', engName: 'Daily Ittefaq', url: 'https://www.ittefaq.com.bd', category: 'national', domain: 'ittefaq.com.bd', badgeBg: 'bg-blue-800', badgeColor: 'text-white', isHot: true },
  { id: 'kaler-kantho', name: 'কালের কণ্ঠ', engName: 'Kaler Kantho', url: 'https://www.kalerkantho.com', category: 'national', domain: 'kalerkantho.com', badgeBg: 'bg-red-800', badgeColor: 'text-white', isHot: true },
  { id: 'jugantor', name: 'দৈনিক যুগান্তর', engName: 'Daily Jugantor', url: 'https://www.jugantor.com', category: 'national', domain: 'jugantor.com', badgeBg: 'bg-amber-600', badgeColor: 'text-white', isHot: true },
  { id: 'samakal', name: 'দৈনিক সমকাল', engName: 'Daily Samakal', url: 'https://samakal.com', category: 'national', domain: 'samakal.com', badgeBg: 'bg-emerald-700', badgeColor: 'text-white', isHot: true },
  { id: 'janakantha', name: 'দৈনিক জনকণ্ঠ', engName: 'Daily Janakantha', url: 'https://www.janakantha.com', category: 'national', domain: 'janakantha.com', badgeBg: 'bg-blue-600', badgeColor: 'text-white' },
  { id: 'naya-diganta', name: 'নয়া দিগন্ত', engName: 'Daily Naya Diganta', url: 'https://www.dailynayadiganta.com', category: 'national', domain: 'dailynayadiganta.com', badgeBg: 'bg-teal-700', badgeColor: 'text-white', isHot: true },
  { id: 'manab-zamin', name: 'মানবজমিন', engName: 'Daily Manab Zamin', url: 'https://mzamin.com', category: 'national', domain: 'mzamin.com', badgeBg: 'bg-purple-700', badgeColor: 'text-white' },
  { id: 'inqilab', name: 'দৈনিক ইনকিলাব', engName: 'Daily Inqilab', url: 'https://www.dailyinqilab.com', category: 'national', domain: 'dailyinqilab.com', badgeBg: 'bg-green-700', badgeColor: 'text-white' },
  { id: 'amader-shomoy', name: 'আমাদের সময়', engName: 'Amader Shomoy', url: 'https://www.ainews24.com', category: 'national', domain: 'ainews24.com', badgeBg: 'bg-red-500', badgeColor: 'text-white' },
  { id: 'jaijaidin', name: 'যায়যায়দিন', engName: 'Jaijaidin', url: 'https://www.jaijaidinbd.com', category: 'national', domain: 'jaijaidinbd.com', badgeBg: 'bg-indigo-600', badgeColor: 'text-white' },
  { id: 'bhorer-kagoj', name: 'ভোরের কাগজ', engName: 'Bhorer Kagoj', url: 'https://www.bhorerkagoj.com', category: 'national', domain: 'bhorerkagoj.com', badgeBg: 'bg-orange-600', badgeColor: 'text-white' },
  { id: 'sangbad', name: 'দৈনিক সংবাদ', engName: 'Daily Sangbad', url: 'https://sangbad.net.bd', category: 'national', domain: 'sangbad.net.bd', badgeBg: 'bg-rose-700', badgeColor: 'text-white' },
  { id: 'sangram', name: 'দৈনিক সংগ্রাম', engName: 'Daily Sangram', url: 'https://www.dailysangram.com', category: 'national', domain: 'dailysangram.com', badgeBg: 'bg-emerald-800', badgeColor: 'text-white' },
  { id: 'desh-rupantor', name: 'দেশ রূপান্তর', engName: 'Desh Rupantor', url: 'https://www.deshrupantor.com', category: 'national', domain: 'deshrupantor.com', badgeBg: 'bg-sky-700', badgeColor: 'text-white' },

  // Online News Portals
  { id: 'bdnews24', name: 'বিডিটাইপ / বিডিনিউজ২৪', engName: 'bdnews24', url: 'https://bangla.bdnews24.com', category: 'online', domain: 'bdnews24.com', badgeBg: 'bg-red-600', badgeColor: 'text-white', isHot: true },
  { id: 'jagonews24', name: 'জাগো নিউজ ২৪', engName: 'Jago News 24', url: 'https://www.jagonews24.com', category: 'online', domain: 'jagonews24.com', badgeBg: 'bg-blue-600', badgeColor: 'text-white', isHot: true },
  { id: 'banglanews24', name: 'বাংলানিউজ২৪', engName: 'Banglanews24', url: 'https://www.banglanews24.com', category: 'online', domain: 'banglanews24.com', badgeBg: 'bg-amber-500', badgeColor: 'text-white' },
  { id: 'dhaka-post', name: 'ঢাকা পোস্ট', engName: 'Dhaka Post', url: 'https://www.dhakapost.com', category: 'online', domain: 'dhakapost.com', badgeBg: 'bg-indigo-700', badgeColor: 'text-white' },
  { id: 'risingbd', name: 'রাইজিংবিডি', engName: 'RisingBD', url: 'https://www.risingbd.com', category: 'online', domain: 'risingbd.com', badgeBg: 'bg-green-600', badgeColor: 'text-white' },
  { id: 'barta24', name: 'বার্তা২৪', engName: 'Barta24', url: 'https://barta24.com', category: 'online', domain: 'barta24.com', badgeBg: 'bg-rose-600', badgeColor: 'text-white' },
  { id: 'zoom-bangla', name: 'জুম বাংলা', engName: 'Zoom Bangla', url: 'https://zoombangla.com', category: 'online', domain: 'zoombangla.com', badgeBg: 'bg-purple-600', badgeColor: 'text-white' },
  { id: 'last-news-bd', name: 'লাস্ট নিউজ বিডি', engName: 'Last News BD', url: 'https://lastnewsbd.com', category: 'online', domain: 'lastnewsbd.com', badgeBg: 'bg-lime-700', badgeColor: 'text-white' },
  { id: 'barta-bangla', name: 'বার্তা বাংলা', engName: 'Barta Bangla', url: 'https://bartabangla.com', category: 'online', domain: 'bartabangla.com', badgeBg: 'bg-teal-600', badgeColor: 'text-white' },
  { id: 'sotta-sangbad', name: 'সত্য সংবাদ', engName: 'Sotta Sangbad', url: 'https://sottasangbad.com', category: 'online', domain: 'sottasangbad.com', badgeBg: 'bg-yellow-600', badgeColor: 'text-white' },
  { id: 'desh-news', name: 'দেশ নিউজ', engName: 'Desh News', url: 'https://deshnews.net', category: 'online', domain: 'deshnews.net', badgeBg: 'bg-cyan-700', badgeColor: 'text-white' },
  { id: 'desher-sangbad', name: 'দেশের সংবাদ', engName: 'Desher Sangbad', url: 'https://deshersangbad.com', category: 'online', domain: 'deshersangbad.com', badgeBg: 'bg-emerald-600', badgeColor: 'text-white' },
  { id: 'alert-news', name: 'অ্যালার্ট নিউজ ২৪', engName: 'Alert News 24', url: 'https://alertnews24.com', category: 'online', domain: 'alertnews24.com', badgeBg: 'bg-red-700', badgeColor: 'text-white' },
  { id: 'khobor-protidin', name: 'খবর প্রতিদিন', engName: 'Khobor Protidin', url: 'https://khoborprotidin24.com', category: 'online', domain: 'khoborprotidin24.com', badgeBg: 'bg-pink-700', badgeColor: 'text-white' },

  // TV News Portals
  { id: 'somoy-news', name: 'সময় নিউজ', engName: 'Somoy News', url: 'https://www.somoynews.tv', category: 'tv', domain: 'somoynews.tv', badgeBg: 'bg-red-600', badgeColor: 'text-white', isHot: true },
  { id: 'ntv-online', name: 'এনটিভি অনলাইন', engName: 'NTV Online', url: 'https://www.ntvbd.com', category: 'tv', domain: 'ntvbd.com', badgeBg: 'bg-emerald-600', badgeColor: 'text-white', isHot: true },
  { id: 'bbc-bangla', name: 'বিবিসি বাংলা', engName: 'BBC Bangla', url: 'https://www.bbc.com/bangla', category: 'tv', domain: 'bbc.com', badgeBg: 'bg-red-700', badgeColor: 'text-white', isHot: true },
  { id: 'channel-i', name: 'চ্যানেল আই অনলাইন', engName: 'Channel i Online', url: 'https://www.channelionline.com', category: 'tv', domain: 'channelionline.com', badgeBg: 'bg-amber-600', badgeColor: 'text-white' },
  { id: 'ekattor-tv', name: 'একাত্তর টিভি', engName: 'Ekattor TV', url: 'https://www.ekattor.tv', category: 'tv', domain: 'ekattor.tv', badgeBg: 'bg-red-800', badgeColor: 'text-white' },
  { id: 'jamuna-tv', name: 'যমুনা টিভি', engName: 'Jamuna TV', url: 'https://www.jamuna.tv', category: 'tv', domain: 'jamuna.tv', badgeBg: 'bg-blue-700', badgeColor: 'text-white' },
  { id: 'independent-tv', name: 'ইনডিপেনডেন্ট টিভি', engName: 'Independent TV', url: 'https://www.independent24.com', category: 'tv', domain: 'independent24.com', badgeBg: 'bg-purple-700', badgeColor: 'text-white' },
  { id: 'news24-tv', name: 'নিউজ ২৪ টিভি', engName: 'News24 TV', url: 'https://www.news24bd.tv', category: 'tv', domain: 'news24bd.tv', badgeBg: 'bg-rose-700', badgeColor: 'text-white' },
  { id: 'atn-news', name: 'এটিএন নিউজ', engName: 'ATN News', url: 'https://www.atnnewstv.com', category: 'tv', domain: 'atnnewstv.com', badgeBg: 'bg-amber-700', badgeColor: 'text-white' },

  // English Newspapers
  { id: 'daily-star', name: 'দ্য ডেইলি স্টার', engName: 'The Daily Star', url: 'https://www.thedailystar.net', category: 'english', domain: 'thedailystar.net', badgeBg: 'bg-red-800', badgeColor: 'text-white' },
  { id: 'dhaka-tribune', name: 'ঢাকা ট্রিবিউন', engName: 'Dhaka Tribune', url: 'https://www.dhakatribune.com', category: 'english', domain: 'dhakatribune.com', badgeBg: 'bg-blue-800', badgeColor: 'text-white' },
  { id: 'tbs-news', name: 'দ্য বিজনেস স্ট্যান্ডার্ড', engName: 'The Business Standard', url: 'https://www.tbsnews.net', category: 'english', domain: 'tbsnews.net', badgeBg: 'bg-cyan-800', badgeColor: 'text-white' },
  { id: 'financial-express', name: 'ফিন্যান্সিয়াল এক্সপ্রেস', engName: 'The Financial Express', url: 'https://thefinancialexpress.com.bd', category: 'english', domain: 'thefinancialexpress.com.bd', badgeBg: 'bg-green-800', badgeColor: 'text-white' },
  { id: 'new-age', name: 'নিউ এজ', engName: 'New Age', url: 'https://www.newagebd.net', category: 'english', domain: 'newagebd.net', badgeBg: 'bg-rose-800', badgeColor: 'text-white' },
  { id: 'daily-sun', name: 'ডেইলি সান', engName: 'Daily Sun', url: 'https://www.dailysun.com', category: 'english', domain: 'dailysun.com', badgeBg: 'bg-orange-700', badgeColor: 'text-white' },
  { id: 'daily-observer', name: 'ডেইলি অবজারভার', engName: 'Daily Observer', url: 'https://www.observerbd.com', category: 'english', domain: 'observerbd.com', badgeBg: 'bg-slate-800', badgeColor: 'text-white' },

  // Kolkata / West Bengal
  { id: 'anandabazar', name: 'আনন্দবাজার পত্রিকা', engName: 'Anandabazar Patrika', url: 'https://www.anandabazar.com', category: 'kolkata', domain: 'anandabazar.com', badgeBg: 'bg-red-600', badgeColor: 'text-white', isHot: true },
  { id: 'ei-samay', name: 'এই সময়', engName: 'Ei Samay', url: 'https://eisamay.com', category: 'kolkata', domain: 'eisamay.com', badgeBg: 'bg-amber-600', badgeColor: 'text-white' },
  { id: 'sangbad-pratidin', name: 'সংবাদ প্রতিদিন', engName: 'Sangbad Pratidin', url: 'https://www.sangbadpratidin.in', category: 'kolkata', domain: 'sangbadpratidin.in', badgeBg: 'bg-red-700', badgeColor: 'text-white' },
  { id: 'aajkaal', name: 'আজকাল', engName: 'Aajkaal', url: 'https://www.aajkaal.in', category: 'kolkata', domain: 'aajkaal.in', badgeBg: 'bg-blue-700', badgeColor: 'text-white' },
  { id: 'dw-bangla', name: 'ডিডব্লিউ বাংলা', engName: 'DW Bangla', url: 'https://www.dw.com/bn', category: 'kolkata', domain: 'dw.com', badgeBg: 'bg-cyan-700', badgeColor: 'text-white' },
  { id: 'voa-bangla', name: 'ভয়েস অব আমেরিকা', engName: 'VOA Bangla', url: 'https://www.voabangla.com', category: 'kolkata', domain: 'voabangla.com', badgeBg: 'bg-indigo-700', badgeColor: 'text-white' },

  // Business & Tech
  { id: 'orthosongbad', name: 'অর্থসংবাদ', engName: 'Orthosongbad', url: 'https://orthosongbad.com', category: 'business', domain: 'orthosongbad.com', badgeBg: 'bg-emerald-700', badgeColor: 'text-white' },
  { id: 'arthosuchak', name: 'অর্থসূচক', engName: 'Arthosuchak', url: 'https://www.arthosuchak.com', category: 'business', domain: 'arthosuchak.com', badgeBg: 'bg-green-700', badgeColor: 'text-white' },
  { id: 'bonik-barta', name: 'বণিক বার্তা', engName: 'Bonik Barta', url: 'https://bonikbarta.net', category: 'business', domain: 'bonikbarta.net', badgeBg: 'bg-amber-700', badgeColor: 'text-white' },
  { id: 'sharebiz', name: 'শেয়ার বিজ', engName: 'ShareBiz', url: 'https://sharebiz.net', category: 'business', domain: 'sharebiz.net', badgeBg: 'bg-teal-700', badgeColor: 'text-white' },
  { id: 'techshohor', name: 'টেক শহর', engName: 'Techshohor', url: 'https://techshohor.com', category: 'business', domain: 'techshohor.com', badgeBg: 'bg-sky-600', badgeColor: 'text-white' },
  { id: 'tech-zoom', name: 'টেক জুম', engName: 'Tech Zoom', url: 'https://techzoom.tv', category: 'business', domain: 'techzoom.tv', badgeBg: 'bg-purple-600', badgeColor: 'text-white' },

  // Regional / Division
  { id: 'dainik-azadi', name: 'দৈনিক আজাদী (চট্টগ্রাম)', engName: 'Dainik Azadi', url: 'https://azadi.com.bd', category: 'regional', domain: 'azadi.com.bd', badgeBg: 'bg-red-700', badgeColor: 'text-white' },
  { id: 'purbokon', name: 'দৈনিক পূর্বকোণ (চট্টগ্রাম)', engName: 'Dainik Purbokone', url: 'https://dainikpurbokone.net', category: 'regional', domain: 'dainikpurbokone.net', badgeBg: 'bg-blue-700', badgeColor: 'text-white' },
  { id: 'sylheter-dak', name: 'সিলেটের ডাক (সিলেট)', engName: 'Sylheter Dak', url: 'https://sylheterdak.com', category: 'regional', domain: 'sylheterdak.com', badgeBg: 'bg-green-700', badgeColor: 'text-white' },
  { id: 'karatoa', name: 'দৈনিক করোতোয়া (বগুড়া)', engName: 'Dainik Karatoa', url: 'https://karatoa.com.bd', category: 'regional', domain: 'karatoa.com.bd', badgeBg: 'bg-amber-700', badgeColor: 'text-white' },
  { id: 'purvanchal', name: 'দৈনিক পূর্বাঞ্চল (খুলনা)', engName: 'Dainik Purvanchal', url: 'https://purbanchal.com', category: 'regional', domain: 'purbanchal.com', badgeBg: 'bg-indigo-700', badgeColor: 'text-white' },
  { id: 'gramer-kagoj', name: 'গ্রামের কাগজ (যশোর)', engName: 'Gramer Kagoj', url: 'https://gramerkagoj.com', category: 'regional', domain: 'gramerkagoj.com', badgeBg: 'bg-teal-700', badgeColor: 'text-white' },

  // Sports
  { id: 'bdcrictime', name: 'বিডি ক্রিকটাইম', engName: 'BD Crictime', url: 'https://www.bdcrictime.com', category: 'sports', domain: 'bdcrictime.com', badgeBg: 'bg-emerald-600', badgeColor: 'text-white' },
  { id: 'khela71', name: 'খেলা ৭১', engName: 'Khela71', url: 'https://www.khela71.com', category: 'sports', domain: 'khela71.com', badgeBg: 'bg-green-600', badgeColor: 'text-white' }
];

export function NewspaperTab() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('newspaper_favorites');
      return saved ? JSON.parse(saved) : ['prothom-alo', 'bdnews24', 'bd-pratidin', 'somoy-news'];
    } catch {
      return ['prothom-alo', 'bdnews24', 'bd-pratidin', 'somoy-news'];
    }
  });

  // Modal view state for reading paper
  const [activeIframeUrl, setActiveIframeUrl] = useState<string | null>(null);
  const [activeIframeTitle, setActiveIframeTitle] = useState<string>('');

  useEffect(() => {
    try {
      localStorage.setItem('newspaper_favorites', JSON.stringify(favoriteIds));
    } catch (e) {
      console.error(e);
    }
  }, [favoriteIds]);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavoriteIds(prev => 
      prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
    );
  };

  const openIframeReader = (paper: Newspaper) => {
    setActiveIframeUrl(paper.url);
    setActiveIframeTitle(paper.name);
  };

  const categories = [
    { id: 'all', label: 'সব পত্রিকা (All)' },
    { id: 'favorites', label: '★ আমার প্রিয় (Favorites)' },
    { id: 'national', label: 'জাতীয় পত্রিকা (National)' },
    { id: 'online', label: 'অনলাইন নিউজ (Online)' },
    { id: 'tv', label: 'টিভি নিউজ (TV News)' },
    { id: 'english', label: 'ইংরেজি পত্রিকা (English)' },
    { id: 'kolkata', label: 'কলকাতা পত্রিকা (Kolkata)' },
    { id: 'business', label: 'অর্থনীতি ও টেক (Business & Tech)' },
    { id: 'regional', label: 'বিভাগীয় পত্রিকা (Regional)' },
    { id: 'sports', label: 'খেলাধুলা (Sports)' }
  ];

  const filteredNewspapers = NEWSPAPERS.filter(paper => {
    const matchesCategory =
      selectedCategory === 'all'
        ? true
        : selectedCategory === 'favorites'
        ? favoriteIds.includes(paper.id)
        : paper.category === selectedCategory;

    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      paper.name.toLowerCase().includes(query) ||
      paper.engName.toLowerCase().includes(query) ||
      paper.domain.toLowerCase().includes(query);

    return matchesCategory && matchesSearch;
  });

  const hotNewspapers = NEWSPAPERS.filter(p => p.isHot);

  return (
    <div className="w-full bg-slate-50 min-h-screen pb-16 pt-2 px-2 md:px-6">
      {/* Top Banner / Quick Access Strip (Matching Image 2 Header) */}
      <div className="max-w-7xl mx-auto mb-6 bg-slate-900 text-white rounded-xl shadow-lg p-3 md:p-4 overflow-hidden border border-slate-800">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
          <div className="flex items-center space-x-2">
            <i className="fa-solid fa-newspaper text-red-500 text-xl"></i>
            <h2 className="font-bold text-lg md:text-xl text-slate-100">
              শীর্ষ বাংলা পত্রিকা ও পোর্টাল (Top Headlines & Newspapers)
            </h2>
          </div>
          <a
            href="https://www.allbanglanewspaper.xyz/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs md:text-sm bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5"
          >
            <span>মূল সাইটে যান</span>
            <i className="fa-solid fa-arrow-up-right-from-square text-xs"></i>
          </a>
        </div>

        {/* Horizontal Quick Scroll Bar */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700">
          {hotNewspapers.map(paper => (
            <button
              key={paper.id}
              onClick={() => openIframeReader(paper)}
              className="flex-shrink-0 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-xs md:text-sm font-semibold transition-all flex items-center space-x-2 hover:scale-105 shadow-sm group"
            >
              <img
                src={`https://www.google.com/s2/favicons?domain=${paper.domain}&sz=64`}
                alt={paper.name}
                className="w-5 h-5 rounded-full bg-white p-0.5"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="group-hover:text-red-400 transition-colors">{paper.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header Title Bar */}
        <div className="bg-gradient-to-r from-red-700 via-red-600 to-red-800 text-white p-5 md:p-6 text-center relative">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2">
            Newspaper All (সকল বাংলা ও ইংরেজি সংবাদপত্র)
          </h1>
          <p className="text-red-100 text-sm md:text-base max-w-3xl mx-auto">
            বাংলাদেশের সকল জনপ্রিয় জাতীয় পত্রিকা, অনলাইন নিউজ পোর্টাল, টিভি নিউজ এবং আন্তর্জাতিক বাংলা খবরের সরাসরি সংকলন।
          </p>
        </div>

        {/* Filter Controls & Search */}
        <div className="p-4 md:p-6 bg-slate-100 border-b border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-lg">
              <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input
                type="text"
                placeholder="পত্রিকার নাম দিয়ে খুঁজুন (যেমন: প্রথম আলো, বিডিনিউজ...)"
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

            {/* Total Count */}
            <div className="text-xs md:text-sm font-bold text-slate-600 bg-white px-3.5 py-2 rounded-lg border border-slate-200 shadow-sm self-start md:self-auto">
              মোট পত্রিকা: <span className="text-red-600 text-base font-extrabold">{filteredNewspapers.length}টি</span>
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pt-4 pb-1 scrollbar-none">
            {categories.map(cat => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs md:text-sm font-bold transition-all whitespace-nowrap shadow-sm border ${
                    isSelected
                      ? 'bg-red-600 text-white border-red-600 shadow-red-200 shadow-md'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Newspaper Grid */}
        <div className="p-4 md:p-6 bg-slate-50 min-h-[400px]">
          {filteredNewspapers.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
              <i className="fa-solid fa-newspaper text-slate-300 text-5xl mb-3"></i>
              <p className="text-slate-600 font-bold text-base">কোনো পত্রিকা পাওয়া যায়নি!</p>
              <p className="text-slate-400 text-sm mt-1">অনুগ্রহ করে সার্চ বা ক্যাটাগরি ফিল্টার পরিবর্তন করুন।</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
              {filteredNewspapers.map((paper) => {
                const isFav = favoriteIds.includes(paper.id);
                return (
                  <div
                    key={paper.id}
                    className="group bg-white rounded-xl border border-slate-200 hover:border-red-400 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden relative"
                  >
                    {/* Favorite Star Button */}
                    <button
                      onClick={(e) => toggleFavorite(paper.id, e)}
                      title={isFav ? "প্রিয় তালিকা থেকে সরান" : "প্রিয় তালিকায় যুক্ত করুন"}
                      className={`absolute top-2 right-2 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                        isFav
                          ? 'bg-amber-100 text-amber-500 hover:bg-amber-200'
                          : 'bg-slate-100 text-slate-300 hover:text-amber-400 hover:bg-slate-200'
                      }`}
                    >
                      <i className="fa-solid fa-star text-xs"></i>
                    </button>

                    {/* Logo & Info Body */}
                    <div className="p-3 text-center flex flex-col items-center">
                      <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center p-2 mb-2 group-hover:scale-105 transition-transform relative overflow-hidden">
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${paper.domain}&sz=128`}
                          alt={paper.name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            // Fallback if favicon fails
                            (e.target as HTMLElement).style.display = 'none';
                            const parent = (e.target as HTMLElement).parentElement;
                            if (parent) {
                              parent.innerHTML = `<span class="font-extrabold text-xs text-red-600">${paper.engName.slice(0, 2).toUpperCase()}</span>`;
                            }
                          }}
                        />
                      </div>

                      <h3 className="font-extrabold text-slate-800 text-xs md:text-sm line-clamp-1 mb-0.5 group-hover:text-red-600 transition-colors">
                        {paper.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-medium line-clamp-1">
                        {paper.domain}
                      </p>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="grid grid-cols-2 border-t border-slate-100 text-xs font-bold divide-x divide-slate-100 bg-slate-50">
                      <button
                        onClick={() => openIframeReader(paper)}
                        className="py-2 text-slate-700 hover:bg-red-600 hover:text-white transition-colors flex items-center justify-center gap-1"
                        title="লাইভ ভিউয়ারে পড়ুন"
                      >
                        <i className="fa-solid fa-eye text-[10px]"></i>
                        <span>পড়ুন</span>
                      </button>

                      <a
                        href={paper.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2 text-red-600 hover:bg-red-700 hover:text-white transition-colors flex items-center justify-center gap-1"
                        title="সাইটে যান"
                      >
                        <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                        <span>লিংক</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Embedded Live Iframe Reader Modal */}
      {activeIframeUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 md:p-6">
          <div className="bg-white w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-300 animate-in fade-in zoom-in duration-200">
            {/* Modal Header Bar */}
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-3 truncate">
                <i className="fa-solid fa-newspaper text-red-500"></i>
                <span className="font-extrabold text-sm md:text-base text-slate-100 truncate">
                  {activeIframeTitle}
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline truncate">
                  ({activeIframeUrl})
                </span>
              </div>

              <div className="flex items-center space-x-2 flex-shrink-0">
                <a
                  href={activeIframeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
                >
                  <span>নতুন ট্যাবে খুলুন</span>
                  <i className="fa-solid fa-arrow-up-right-from-square"></i>
                </a>
                <button
                  onClick={() => setActiveIframeUrl(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                >
                  <i className="fa-solid fa-xmark text-lg"></i>
                </button>
              </div>
            </div>

            {/* Iframe Content Area */}
            <div className="flex-1 bg-slate-100 relative">
              <iframe
                src={activeIframeUrl}
                title={activeIframeTitle}
                className="w-full h-full border-none"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
