import React from 'react';

export type AppTabType = 'converter' | 'formatter' | 'right-formatter' | 'question-collect' | 'version' | 'chat';

interface AuthorProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab?: (tabKey: AppTabType) => void;
}

export const AuthorProfileModal: React.FC<AuthorProfileModalProps> = ({
  isOpen,
  onClose,
  onSelectTab
}) => {
  if (!isOpen) return null;

  const featuresList: {
    tabKey: AppTabType;
    buttonName: string;
    icon: string;
    badgeColor: string;
    description: string;
  }[] = [
    {
      tabKey: 'converter',
      buttonName: 'কনভার্টার',
      icon: 'fa-right-left',
      badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      description: 'বিজয় (Bijoy 52) এবং ইউনিকোড (Unicode) ফন্টের মধ্যে টেক্সট রূপান্তর (Convert) করার জন্য।'
    },
    {
      tabKey: 'formatter',
      buttonName: 'Text Box Formatter',
      icon: 'fa-vector-square',
      badgeColor: 'bg-sky-100 text-sky-700 border-sky-200',
      description: 'প্রশ্নপত্র বা পেজের ভেতরের বিভিন্ন টেক্সট বক্সগুলোর সাইজ, মার্জিন বা ফরম্যাটিং সঠিকভাবে সাজানোর জন্য।'
    },
    {
      tabKey: 'right-formatter',
      buttonName: 'Text Right Formatter',
      icon: 'fa-align-right',
      badgeColor: 'bg-teal-100 text-teal-700 border-teal-200',
      description: 'ডানপাশের টেক্সট (যেমন: ডানদিকের মার্জিন, নম্বর বা হেডার) সুন্দরভাবে অ্যালাইন বা ফরম্যাট করার জন্য।'
    },
    {
      tabKey: 'question-collect',
      buttonName: 'Question Collect',
      icon: 'fa-book-bookmark',
      badgeColor: 'bg-red-100 text-red-700 border-red-200',
      description: 'বিভিন্ন বই থেকে প্রশ্নগুলো সংগ্রহ করে আলাদা একটি তালিকা বা ফরম্যাটে একত্রিত করার জন্য।'
    },
    {
      tabKey: 'version',
      buttonName: 'version',
      icon: 'fa-code-branch',
      badgeColor: 'bg-purple-100 text-purple-700 border-purple-200',
      description: 'বাংলা ভাষাকে ইংরেজি ভাষায় কনভার্ট টেক্সট ও বক্স অনুযায়ী।'
    },
    {
      tabKey: 'chat',
      buttonName: 'Chat',
      icon: 'fa-comments',
      badgeColor: 'bg-amber-100 text-amber-700 border-amber-200',
      description: 'Gemini AI সহকারী চ্যাট ইন্টারফেসটি (যেখানে এআই-এর সাথে সরাসরি কথা ও সকল কাজ আরও সহজে করা যায়)।'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl max-h-[92vh] rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-lg shadow-inner">
              <i className="fa-solid fa-circle-info"></i>
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                Bangla English Fixer - সিস্টেম পরিচিতি ও টিম প্রোফাইল
              </h2>
              <p className="text-xs text-indigo-200 font-medium">
                arafat-3802-bangla-english-fixer • সিস্টেম ম্যানুয়াল ও বিবরণী
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-slate-50/60">
          
          {/* Author Profile Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Profile Image */}
            <div className="relative shrink-0">
              <img
                src="/arafat_profile.jpg"
                alt="MD. Arafat Kazi"
                className="w-28 h-32 sm:w-32 sm:h-36 rounded-xl object-cover border-2 border-indigo-200 shadow-md"
                onError={(e) => {
                  // Fallback avatar if image fails
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white shadow-xs">
                Pin: 3802
              </div>
            </div>

            {/* Profile Info Details */}
            <div className="flex-1 text-center sm:text-left space-y-2">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  Developer & Lead
                </span>
                <h3 className="text-xl font-bold text-gray-900 mt-1">
                  MD. Arafat Kazi <span className="text-sm font-semibold text-gray-500">(Pin: 3802)</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-700 pt-1">
                <div className="flex items-center gap-2 justify-center sm:justify-start bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <i className="fa-solid fa-phone text-emerald-600 text-sm"></i>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-semibold">Contact Call</span>
                    <a href="tel:01988499287" className="font-bold text-gray-800 hover:text-emerald-600">
                      01988-499287
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-center sm:justify-start bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <i className="fa-solid fa-briefcase text-blue-600 text-sm"></i>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-semibold">Work Station</span>
                    <span className="font-bold text-gray-800">Udvash Academic & Admission Care</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-center sm:justify-start bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <i className="fa-solid fa-users text-purple-600 text-sm"></i>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-semibold">Team</span>
                    <span className="font-bold text-gray-800">Green Road VAP KHA Question Team</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-center sm:justify-start bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <i className="fa-solid fa-user-tie text-amber-600 text-sm"></i>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-semibold">Mentor</span>
                    <span className="font-bold text-gray-800">Nazmul Huqe Sagor <span className="text-gray-500">(Pin: 150)</span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Functions Table / Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <i className="fa-solid fa-table-list text-indigo-600"></i>
                বাটন এবং মূল কাজের বিবরণী (Functionality Guide)
              </h4>
              <span className="text-[11px] text-gray-500">মোট ৬টি মূল ফিচার</span>
            </div>

            {/* Desktop Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xs hidden md:block">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-gray-700 font-bold border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4 w-48">বাটন (Button)</th>
                    <th className="py-3 px-4">মূল কাজ (Function)</th>
                    <th className="py-3 px-4 w-24 text-center">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {featuresList.map((item) => (
                    <tr key={item.tabKey} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-gray-800">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold ${item.badgeColor}`}>
                          <i className={`fa-solid ${item.icon}`}></i>
                          {item.buttonName}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-700 leading-relaxed font-medium">
                        {item.description}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {onSelectTab && (
                          <button
                            onClick={() => {
                              onSelectTab(item.tabKey);
                              onClose();
                            }}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded text-[11px] font-bold border border-indigo-200 transition-colors"
                            title="এই ট্যাবে যান"
                          >
                            যান <i className="fa-solid fa-arrow-right text-[9px]"></i>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View Cards */}
            <div className="grid grid-cols-1 gap-2.5 md:hidden">
              {featuresList.map((item) => (
                <div key={item.tabKey} className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-bold ${item.badgeColor}`}>
                      <i className={`fa-solid ${item.icon}`}></i>
                      {item.buttonName}
                    </span>
                    {onSelectTab && (
                      <button
                        onClick={() => {
                          onSelectTab(item.tabKey);
                          onClose();
                        }}
                        className="bg-indigo-600 text-white px-2.5 py-1 rounded text-xs font-bold transition-colors"
                      >
                        ট্যাবে যান
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-100 border-t border-gray-200 flex items-center justify-between flex-wrap gap-2 text-xs text-gray-600 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-700">Bangla English Fixer</span>
            <span>•</span>
            <span className="text-gray-500">Green Road VAP KHA Question Team</span>
          </div>
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-1.5 rounded-lg text-xs transition-colors"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>
    </div>
  );
};
