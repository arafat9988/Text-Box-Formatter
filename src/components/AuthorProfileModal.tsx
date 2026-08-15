import React, { useState, useRef, useEffect } from 'react';

export type AppTabType = 'converter' | 'formatter' | 'right-formatter' | 'question-collect' | 'version' | 'chat';

interface AuthorProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab?: (tabKey: AppTabType) => void;
}

const DEFAULT_PHOTO = '/arafat_profile.jpg?v=4';

export const AuthorProfileModal: React.FC<AuthorProfileModalProps> = ({
  isOpen,
  onClose,
  onSelectTab
}) => {
  const [isImageViewerOpen, setIsImageViewerOpen] = useState<boolean>(false);
  const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState<boolean>(false);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [profilePhoto, setProfilePhoto] = useState<string>(() => {
    return localStorage.getItem('user_custom_profile_photo') || DEFAULT_PHOTO;
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Stop camera when modal unmounts or camera deactivates
  useEffect(() => {
    if (isCameraActive) {
      navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user' } })
        .then((stream) => {
          mediaStreamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.error("Camera error:", err);
          setCameraError("ক্যামেরা এক্সেস সম্ভব হয়নি। অনুগ্রহ করে ব্রাউজার পারমিশন চেক করুন।");
        });
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isCameraActive]);

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const handleUploadPhotoClick = () => {
    setIsPhotoMenuOpen(false);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setProfilePhoto(reader.result);
          localStorage.setItem('user_custom_profile_photo', reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setProfilePhoto(DEFAULT_PHOTO);
    localStorage.removeItem('user_custom_profile_photo');
    setIsPhotoMenuOpen(false);
  };

  const captureCameraPhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setProfilePhoto(dataUrl);
        localStorage.setItem('user_custom_profile_photo', dataUrl);
        setIsCameraActive(false);
      }
    }
  };

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
                Website Creator & Developer Arafat Kazi Profile • সিস্টেম ম্যানুয়াল ও বিবরণী
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
            {/* Profile Image & Camera Interactive Popover Menu */}
            <div className="relative shrink-0 flex flex-col items-center">
              {/* Hidden file input for Upload photo */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="relative group">
                <div
                  className="w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden border-4 border-indigo-200 shadow-md relative bg-slate-900 cursor-pointer transition-all hover:border-indigo-500"
                  onClick={() => setIsPhotoMenuOpen(!isPhotoMenuOpen)}
                  title="ফটো অপশনস দেখতে ক্লিক করুন"
                >
                  <img
                    src={profilePhoto}
                    alt="MD. Arafat Kazi"
                    className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80';
                    }}
                  />
                  {/* Camera Overlay Icon Badge */}
                  <div className="absolute inset-0 bg-black/35 group-hover:bg-black/50 transition-colors flex items-center justify-center text-white">
                    <div className="w-12 h-12 rounded-full bg-slate-900/80 border border-white/40 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <i className="fa-solid fa-camera text-xl text-white"></i>
                    </div>
                  </div>
                </div>

                <div className="absolute -bottom-1 -right-1 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white shadow-xs z-10">
                  Pin: 3802
                </div>
              </div>

              {/* Photo Options Popover Menu */}
              {isPhotoMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsPhotoMenuOpen(false)}
                  />
                  <div className="absolute top-full mt-3 z-50 w-52 bg-slate-900 text-slate-100 rounded-2xl p-2 shadow-2xl border border-slate-700 animate-in fade-in zoom-in-95 duration-150">
                    <button
                      type="button"
                      onClick={() => {
                        setIsPhotoMenuOpen(false);
                        setIsImageViewerOpen(true);
                      }}
                      className="w-full text-left px-3 py-2.5 hover:bg-slate-800 rounded-xl flex items-center gap-3 text-xs font-semibold transition-colors cursor-pointer text-slate-200"
                    >
                      <i className="fa-regular fa-eye text-base text-indigo-400 w-5 text-center"></i>
                      <span>View photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsPhotoMenuOpen(false);
                        setCameraError(null);
                        setIsCameraActive(true);
                      }}
                      className="w-full text-left px-3 py-2.5 hover:bg-slate-800 rounded-xl flex items-center gap-3 text-xs font-semibold transition-colors cursor-pointer text-slate-200"
                    >
                      <i className="fa-solid fa-camera text-base text-emerald-400 w-5 text-center"></i>
                      <span>Take photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleUploadPhotoClick}
                      className="w-full text-left px-3 py-2.5 hover:bg-slate-800 rounded-xl flex items-center gap-3 text-xs font-semibold transition-colors cursor-pointer text-slate-200"
                    >
                      <i className="fa-regular fa-folder-open text-base text-amber-400 w-5 text-center"></i>
                      <span>Upload photo</span>
                    </button>

                    <hr className="border-slate-800 my-1.5" />

                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="w-full text-left px-3 py-2.5 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl flex items-center gap-3 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <i className="fa-regular fa-trash-can text-base text-red-400 w-5 text-center"></i>
                      <span>Remove photo</span>
                    </button>
                  </div>
                </>
              )}
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

      {/* Live Camera Capture Modal */}
      {isCameraActive && (
        <div
          className="fixed inset-0 z-70 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsCameraActive(false)}
        >
          <div
            className="relative w-full max-w-md bg-slate-900 rounded-2xl p-5 border border-slate-700 shadow-2xl flex flex-col items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <i className="fa-solid fa-camera text-indigo-400"></i>
                <span>ক্যামেরা দিয়ে ছবি তুলুন (Take Photo)</span>
              </div>
              <button
                onClick={() => setIsCameraActive(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-red-600 text-white flex items-center justify-center transition-colors font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {cameraError ? (
              <div className="text-center py-8 text-red-400 text-xs px-4">
                <i className="fa-solid fa-triangle-exclamation text-3xl mb-3 text-red-500 block"></i>
                <p>{cameraError}</p>
              </div>
            ) : (
              <div className="relative w-full bg-black rounded-2xl overflow-hidden aspect-square border border-slate-800 flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="flex items-center gap-3 w-full pt-1">
              <button
                type="button"
                onClick={() => setIsCameraActive(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                বাতিল
              </button>
              {!cameraError && (
                <button
                  type="button"
                  onClick={captureCameraPhoto}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <i className="fa-solid fa-camera"></i>
                  <span>ছবি ক্যাপচার করুন</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Image Lightbox Viewer Modal */}
      {isImageViewerOpen && (
        <div
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsImageViewerOpen(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl p-2 border border-slate-700 shadow-2xl flex flex-col items-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Controls */}
            <div className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/90 text-white rounded-t-xl shrink-0">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-user-circle text-indigo-400 text-lg"></i>
                <span className="font-bold text-sm text-slate-100">
                  MD. Arafat Kazi (Pin: 3802) - ফটো ভিউ
                </span>
              </div>
              <button
                onClick={() => setIsImageViewerOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-700 hover:bg-red-600 text-white flex items-center justify-center transition-colors font-bold text-base"
                title="বন্ধ করুন"
              >
                ✕
              </button>
            </div>

            {/* Image display */}
            <div className="p-3 flex items-center justify-center overflow-auto max-h-[80vh]">
              <img
                src={profilePhoto}
                alt="MD. Arafat Kazi Full View"
                className="max-h-[76vh] max-w-full object-contain rounded-lg shadow-2xl border border-slate-800"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80';
                }}
              />
            </div>

            {/* Lightbox Footer */}
            <div className="w-full text-center py-2 bg-slate-950/80 text-xs text-slate-400 font-medium rounded-b-xl shrink-0">
              ক্লিক করে যেকোনো স্থানে আলতো চাপলে ছবি ভিউ বন্ধ হবে
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
