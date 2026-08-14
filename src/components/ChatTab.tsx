import React, { useState, useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import { downloadAsDocx } from '../utils/exportDocx';
import { isEnglishWord } from '../utils/bijoy';
import { BookReserveModal } from './BookReserveModal';
import { ReservedBook, getAllReservedBooks } from '../utils/bookReserveDB';

function formatTextToReactSpans(text: string): React.ReactNode[] {
  if (!text) return [];
  const tokens = text.split(/(\s+)/);
  return tokens.map((token, idx) => {
    if (!token.trim()) return token;
    if (isEnglishWord(token)) {
      return (
        <span key={idx} className="eng-text" style={{ fontFamily: "'Times New Roman', serif", fontStyle: 'normal' }}>
          {token}
        </span>
      );
    } else if (/[\u0980-\u09FF]/.test(token) && /[a-zA-Z0-9]/.test(token)) {
      const subParts = token.split(/([a-zA-Z0-9]+)/);
      return (
        <React.Fragment key={idx}>
          {subParts.map((part, pIdx) => {
            if (!part) return null;
            if (/^[a-zA-Z0-9]+$/.test(part)) {
              return (
                <span key={pIdx} className="eng-text" style={{ fontFamily: "'Times New Roman', serif", fontStyle: 'normal' }}>
                  {part}
                </span>
              );
            } else if (/[\u0980-\u09FF]/.test(part)) {
              return (
                <span key={pIdx} className="ben-text" style={{ fontFamily: "'SolaimanLipi', sans-serif", fontStyle: 'normal' }}>
                  {part}
                </span>
              );
            } else {
              return (
                <span key={pIdx} className="eng-text" style={{ fontFamily: "'Times New Roman', serif", fontStyle: 'normal' }}>
                  {part}
                </span>
              );
            }
          })}
        </React.Fragment>
      );
    } else {
      return (
        <span key={idx} className="ben-text" style={{ fontFamily: "'SolaimanLipi', sans-serif", fontStyle: 'normal' }}>
          {token}
        </span>
      );
    }
  });
}

function renderFormattedTextWithFonts(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (typeof child === 'string') {
      return formatTextToReactSpans(child);
    }
    if (React.isValidElement(child)) {
      const childProps: any = child.props || {};
      if (childProps.children) {
        return React.cloneElement(child, {
          ...childProps,
          style: { ...(childProps.style || {}), fontStyle: 'normal', fontWeight: 'normal' },
          children: renderFormattedTextWithFonts(childProps.children)
        });
      }
      return React.cloneElement(child, {
        style: { ...((child.props as any)?.style || {}), fontStyle: 'normal', fontWeight: 'normal' }
      } as any);
    }
    return child;
  });
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  title: string;
  timestamp: string;
  updatedAt: number;
  messages: ChatMessage[];
}

interface SelectedFile {
  name: string;
  type: string;
  size: number;
  sizeFormatted: string;
  dataUrl?: string;
  extractedText?: string;
  isImage: boolean;
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const createDefaultWelcomeMsg = (): ChatMessage => ({
  id: 'welcome-msg-' + Date.now(),
  role: 'model',
  text: 'হ্যালো! আমি Gemini AI। আমি আপনাকে প্রশ্নপত্র ফরম্যাটিং, অনুবাদ, বিজয় ও ইউনিকোড ফন্ট কনভার্সন, নতুন প্রশ্ন তৈরি এবং যেকোনো সাধারণ বা শিক্ষামূলক বিষয়ের উত্তর দিয়ে সাহায্য করতে পারি। আজ আপনাকে কীভাবে সাহায্য করতে পারি?',
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
});

export const ChatTab: React.FC = () => {
  // Load initial sessions from localStorage
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem('gemini_chat_sessions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load saved chat sessions', e);
    }
    return [];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem('gemini_active_session_id');
      if (savedId) return savedId;
    } catch (e) {
      console.error('Failed to load active session id', e);
    }
    return 'session-' + Date.now();
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const savedId = localStorage.getItem('gemini_active_session_id');
      const savedSessions = localStorage.getItem('gemini_chat_sessions');
      if (savedSessions) {
        const parsed: ChatSession[] = JSON.parse(savedSessions);
        if (savedId) {
          const found = parsed.find((s) => s.id === savedId);
          if (found && found.messages && found.messages.length > 0) {
            return found.messages;
          }
        }
        if (parsed.length > 0 && parsed[0].messages) {
          return parsed[0].messages;
        }
      }
      const legacyMsgs = localStorage.getItem('gemini_chat_messages');
      if (legacyMsgs) {
        return JSON.parse(legacyMsgs);
      }
    } catch (e) {
      console.error('Failed to load initial messages', e);
    }
    return [createDefaultWelcomeMsg()];
  });

  const [input, setInput] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [isReadingFile, setIsReadingFile] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [historySearch, setHistorySearch] = useState<string>('');

  // Book Reserve State
  const [reservedBooks, setReservedBooks] = useState<ReservedBook[]>([]);
  const [isBookReserveOpen, setIsBookReserveOpen] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load reserved books from IndexedDB
  const refreshReservedBooks = async () => {
    try {
      const books = await getAllReservedBooks();
      setReservedBooks(books);
    } catch (e) {
      console.error('Failed to load reserved books:', e);
    }
  };

  useEffect(() => {
    refreshReservedBooks();
  }, []);

  // Sync active messages into sessions array & persist to localStorage
  useEffect(() => {
    try {
      const safeMessages = messages.map((m) => {
        if (m.image && m.image.length > 2000) {
          const { image, ...rest } = m;
          return {
            ...rest,
            fileName: m.fileName || 'সংযুক্ত ফাইল'
          };
        }
        return m;
      });

      // Derive title from first user message
      const firstUserMsg = safeMessages.find((m) => m.role === 'user');
      const title = firstUserMsg
        ? firstUserMsg.text.slice(0, 45).replace(/\n/g, ' ') + (firstUserMsg.text.length > 45 ? '...' : '')
        : 'নতুন কথোপকথন';

      const currentTimestamp = new Date().toLocaleDateString('bn-BD', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      setSessions((prev) => {
        const existingIdx = prev.findIndex((s) => s.id === activeSessionId);
        let updated: ChatSession[];
        if (existingIdx >= 0) {
          updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            title: title !== 'নতুন কথোপকথন' ? title : updated[existingIdx].title,
            updatedAt: Date.now(),
            messages: safeMessages
          };
        } else {
          updated = [
            {
              id: activeSessionId,
              title: title,
              timestamp: currentTimestamp,
              updatedAt: Date.now(),
              messages: safeMessages
            },
            ...prev
          ];
        }

        try {
          localStorage.setItem('gemini_chat_sessions', JSON.stringify(updated.slice(0, 50)));
        } catch (err) {
          console.warn('LocalStorage quota limit reached for sessions:', err);
        }
        return updated;
      });

      localStorage.setItem('gemini_active_session_id', activeSessionId);
      localStorage.setItem('gemini_chat_messages', JSON.stringify(safeMessages));
    } catch (e) {
      console.warn('LocalStorage warning:', e);
    }

    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeSessionId]);

  const handleStartNewChat = () => {
    const newId = 'session-' + Date.now();
    const defaultMsg = createDefaultWelcomeMsg();
    setActiveSessionId(newId);
    setMessages([defaultMsg]);
    setInput('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowHistory(false);
  };

  const handleLoadSession = (session: ChatSession) => {
    setActiveSessionId(session.id);
    setMessages(session.messages && session.messages.length > 0 ? session.messages : [createDefaultWelcomeMsg()]);
    setInput('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowHistory(false);
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter((s) => s.id !== sessionId);
    setSessions(updated);
    try {
      localStorage.setItem('gemini_chat_sessions', JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to update sessions after deletion', err);
    }

    if (sessionId === activeSessionId) {
      if (updated.length > 0) {
        handleLoadSession(updated[0]);
      } else {
        handleStartNewChat();
      }
    }
  };

  const handleClearAllHistory = () => {
    if (window.confirm('আপনি কি নিশ্চিত যে সমস্ত চ্যাট হিস্ট্রি মুছে ফেলতে চান?')) {
      setSessions([]);
      try {
        localStorage.removeItem('gemini_chat_sessions');
      } catch (err) {
        console.error('Failed to clear sessions', err);
      }
      handleStartNewChat();
    }
  };

  const handleDownloadSessionDocx = async (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const fullText = session.messages
        .map((m) => `${m.role === 'user' ? '👤 User:' : '✨ Gemini AI:'}\n${m.text}\n`)
        .join('\n---\n\n');
      const safeTitle = session.title.replace(/[^a-zA-Z0-9\u0980-\u09FF]/g, '_').slice(0, 30);
      const filename = `${safeTitle || 'Gemini_Chat'}_${new Date().toISOString().slice(0, 10)}.docx`;
      await downloadAsDocx(fullText, filename);
    } catch (error) {
      console.error('Docx download error:', error);
      alert('DOCX ফাইল তৈরি করতে সমস্যা হয়েছে।');
    }
  };

  const compressImage = (file: File, maxWidth = 1920, maxHeight = 1920, quality = 0.82): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width / height > maxWidth / maxHeight) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const processFile = async (file: File) => {
    if (!file) return;

    let mime = file.type || 'application/octet-stream';
    if (file.name.toLowerCase().endsWith('.pdf')) {
      mime = 'application/pdf';
    }

    const isImg = mime.startsWith('image/');
    const isDoc = mime.includes('pdf') || 
                  mime.includes('word') || 
                  mime.startsWith('text/') || 
                  file.name.toLowerCase().match(/\.(pdf|docx|txt|csv|json|xml|html|md|log)$/i);

    setIsReadingFile(true);

    try {
      if (isImg) {
        const compressedDataUrl = await compressImage(file);
        setSelectedFile({
          name: file.name,
          type: 'image/jpeg',
          size: file.size,
          sizeFormatted: formatBytes(file.size),
          dataUrl: compressedDataUrl || '',
          isImage: true
        });
      } else if (isDoc) {
        // Stream parse documents using multipart /api/parse-file
        const formData = new FormData();
        formData.append('file', file);

        let parsedText = '';
        try {
          const parseRes = await fetch('/api/parse-file', {
            method: 'POST',
            body: formData
          });
          if (parseRes.ok) {
            const pData = await parseRes.json();
            parsedText = pData.extractedText || '';
          }
        } catch (e) {
          console.warn('Document stream parse note:', e);
        }

        setSelectedFile({
          name: file.name,
          type: mime,
          size: file.size,
          sizeFormatted: formatBytes(file.size),
          extractedText: parsedText,
          isImage: false
        });
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          setSelectedFile({
            name: file.name,
            type: mime,
            size: file.size,
            sizeFormatted: formatBytes(file.size),
            dataUrl: event.target?.result as string,
            isImage: false
          });
          setIsReadingFile(false);
        };
        reader.onerror = (err) => {
          console.error('File read error:', err);
          alert('ফাইলটি পড়তে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
          setIsReadingFile(false);
        };
        reader.readAsDataURL(file);
        return;
      }
    } catch (err) {
      console.error('File process error:', err);
      alert('ফাইলটি প্রস্তুত করতে ত্রুটি হয়েছে।');
    } finally {
      setIsReadingFile(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await processFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectBookForChat = (book: ReservedBook, customPrompt?: string) => {
    const text = customPrompt || `[${book.code}: "${book.title}"] বইয়ের রেফারেন্স অনুযায়ী প্রশ্ন কালেক্ট করে দাও: `;
    setInput(text);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleSend = async (textToSend?: string) => {
    const queryText = textToSend !== undefined ? textToSend : input;
    const activeBooks = reservedBooks.filter((b) => b.isActive);
    if ((!queryText || !queryText.trim()) && !selectedFile && activeBooks.length === 0) return;

    const currentFile = selectedFile;
    const isFileAttached = !!currentFile;
    const isPdf = currentFile?.type?.includes('pdf') || currentFile?.name?.toLowerCase().endsWith('.pdf');

    const defaultPromptText = isPdf
      ? `সংযুক্ত PDF ফাইলটি বিশ্লেষণ করুন: "${currentFile?.name}"`
      : currentFile
      ? `সংযুক্ত ফাইলটি বিশ্লেষণ করুন: "${currentFile?.name}"`
      : activeBooks.length > 0
      ? `সংরক্ষিত ${activeBooks.length} টি বই থেকে রেফারেন্স অনুযায়ী প্রশ্ন কালেক্ট করুন।`
      : '';

    const actualDisplayText = queryText.trim() || defaultPromptText;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: actualDisplayText,
      image: currentFile?.dataUrl || undefined,
      fileName: currentFile?.name,
      fileType: currentFile?.type,
      fileSize: currentFile?.sizeFormatted,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== 'welcome-msg' && !m.id.startsWith('welcome-msg-'))
        .map((m) => ({ role: m.role, text: m.text }));

      // Target matching reserved books if prompt specifically mentions code/title, else send active books
      let targetBooks = activeBooks;
      const lowerQuery = (queryText.trim() || defaultPromptText).toLowerCase();
      const matchedBooks = activeBooks.filter((b) =>
        lowerQuery.includes(b.code.toLowerCase()) ||
        lowerQuery.includes(b.title.toLowerCase())
      );
      if (matchedBooks.length > 0) {
        targetBooks = matchedBooks;
      } else if (targetBooks.length > 3) {
        targetBooks = targetBooks.slice(0, 3);
      }

      const booksPayload = targetBooks.map((b) => ({
        id: b.id,
        title: b.title,
        code: b.code,
        fileName: b.fileName,
        mimeType: b.mimeType,
        extractedText: b.extractedText || '',
        fileBase64: !b.extractedText && b.dataUrl && b.dataUrl.length < 2000000 ? b.dataUrl : undefined
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          prompt: queryText.trim() || defaultPromptText,
          fileBase64: currentFile?.isImage ? currentFile?.dataUrl : undefined,
          fileText: currentFile?.extractedText,
          fileName: currentFile?.name,
          mimeType: currentFile?.type,
          reservedBooks: booksPayload
        })
      });

      const responseText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        if (res.status === 413) {
          throw new Error('ফাইল বা মেসেজের আকার খুব বড় হওয়ার কারণে সার্ভার এটি গ্রহণ করতে পারছে না (413 Payload Too Large)। অনুগ্রহ করে ছোট আকারের ফাইল ব্যবহার করুন।');
        }
        throw new Error(`সার্ভার থেকে সংকেত পাওয়া যায়নি (${res.status})। ফাইল বা মেসেজের আকার ছোট করে চেষ্টা করুন।`);
      }

      if (!res.ok) {
        if (res.status === 413) {
          throw new Error('ফাইল বা মেসেজের আকার খুব বড় (413 Payload Too Large)। অনুগ্রহ করে ছোট আকারের ফাইল আপলোড করুন।');
        }
        throw new Error(data.error || 'রেসপন্স পেতে ব্যর্থ হয়েছে।');
      }

      const modelReply: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: data.reply || 'কোনো রেসপন্স পাওয়া যায়নি।',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, modelReply]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: `⚠️ **ত্রুটি:** ${err.message || 'নেটওয়ার্ক বা সার্ভারে সমস্যা হয়েছে।'}\n\nঅনুগ্রহ করে আবার চেষ্টা করুন।`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    const resetMsgs: ChatMessage[] = [
      {
        id: 'welcome-msg-' + Date.now(),
        role: 'model',
        text: 'হ্যালো! আমি Gemini AI। আমি আপনাকে প্রশ্নপত্র ফরম্যাটিং, অনুবাদ, বিজয় ও ইউনিকোড ফন্ট কনভার্সন, নতুন প্রশ্ন তৈরি এবং যেকোনো সাধারণ বা শিক্ষামূলক বিষয়ের উত্তর দিয়ে সাহায্য করতে পারি। আজ আপনাকে কীভাবে সাহায্য করতে পারি?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
    setMessages(resetMsgs);
    setInput('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    try {
      localStorage.removeItem('gemini_chat_messages');
    } catch (e) {
      console.error('Failed to clear stored chat messages:', e);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(id);
    setTimeout(() => setCopyStatus(null), 2000);
  };

  const handleDownloadDocx = async (text: string) => {
    try {
      const filename = `Gemini_Chat_${new Date().toISOString().slice(0, 10)}.docx`;
      await downloadAsDocx(text, filename);
    } catch (error) {
      console.error('Docx download error:', error);
      alert('DOCX ফাইল তৈরি করতে সমস্যা হয়েছে।');
    }
  };

  const presetQuestions = [
    'বাংলা প্রশ্নপত্র সুন্দর করে ফরম্যাট করার নিয়ম কী?',
    'বিজয় ৫২ ফন্ট ও ইউনিকোড ফন্টের মূল পার্থক্য বুঝিয়ে বলুন',
    '১০টি উচ্চমাধ্যমিক বাংলা ব্যাকরণের MCQ প্রশ্ন তৈরি করে দিন',
    'একটি বাংলা অনুচ্ছেদ ইংরেজিতে ভাবানুবাদ করুন',
    'এমসিকিউ প্রশ্নের সঠিক উত্তর কীভাবে সহজে চিহ্নি করা যায়?'
  ];

  const filteredSessions = sessions.filter((s) => {
    if (!historySearch.trim()) return true;
    const term = historySearch.toLowerCase();
    const titleMatch = s.title.toLowerCase().includes(term);
    const msgMatch = s.messages?.some((m) => m.text.toLowerCase().includes(term));
    return titleMatch || msgMatch;
  });

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative flex flex-col h-[650px] bg-slate-50 rounded-xl border border-gray-200 overflow-hidden shadow-sm"
    >
      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-40 bg-indigo-900/80 backdrop-blur-xs flex flex-col items-center justify-center text-white border-4 border-dashed border-indigo-300 m-2 rounded-xl transition animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-3xl mb-3 animate-bounce">
            <i className="fa-solid fa-file-arrow-up text-indigo-200"></i>
          </div>
          <p className="text-lg font-bold">এখানে আপনার PDF বা যেকোনো ফাইল ড্রপ করুন</p>
          <p className="text-xs text-indigo-200 mt-1">PDF, Word, ছবি বা টেক্সট ফাইল আপলোড করতে ছেড়ে দিন</p>
        </div>
      )}

      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex justify-between items-center shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md">
            <i className="fa-solid fa-sparkles text-lg"></i>
          </div>
          <div>
            <h2 className="font-bold text-gray-800 text-base leading-tight flex items-center gap-2">
              Gemini AI Chat
              <span className="text-[11px] font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                Live AI
              </span>
            </h2>
            <p className="text-xs text-gray-500">https://gemini.google.com/ দ্বারা চালিত বুদ্ধিমান এআই সহকারী</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Book Reserve Button */}
          <button
            onClick={() => setIsBookReserveOpen(true)}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
              reservedBooks.length > 0
                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300 ring-1 ring-rose-200'
                : 'bg-white hover:bg-rose-50 hover:text-rose-700 text-gray-700 border-gray-300'
            }`}
            title="বইয়ের রিজার্ভ লাইব্রেরি ও রেফারেন্স প্রশ্ন ব্যবস্থাপনা"
          >
            <i className="fa-solid fa-book-bookmark text-xs text-rose-600"></i>
            Book Reserve
            {reservedBooks.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5 bg-rose-600 text-white">
                {reservedBooks.length}
              </span>
            )}
          </button>

          {/* History Box Toggle Button */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
              showHistory
                ? 'bg-indigo-600 text-white border-indigo-700 shadow-indigo-100'
                : 'bg-white hover:bg-indigo-50 hover:text-indigo-700 text-gray-700 border-gray-300'
            }`}
            title="চ্যাট হিস্ট্রি দেখুন ও পরিচালনা করুন"
          >
            <i className={`fa-solid fa-clock-rotate-left text-xs ${showHistory ? 'text-white' : 'text-indigo-600'}`}></i>
            History
            {sessions.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5 ${
                showHistory ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
              }`}>
                {sessions.length}
              </span>
            )}
          </button>

          {/* New Chat Button */}
          <button
            onClick={handleStartNewChat}
            className="bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="নতুন চ্যাট শুরু করুন"
          >
            <i className="fa-solid fa-plus text-xs"></i>
            নতুন চ্যাট
          </button>
        </div>
      </div>

      {/* History Drawer / Box Overlay */}
      {showHistory && (
        <div className="absolute inset-0 z-30 bg-black/40 backdrop-blur-[2px] flex justify-end animate-fadeIn">
          <div className="w-full sm:w-[420px] bg-white h-full shadow-2xl flex flex-col border-l border-gray-200 animate-slideInRight">
            {/* Drawer Header */}
            <div className="p-4 border-b border-gray-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                  <i className="fa-solid fa-clock-rotate-left"></i>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
                    চ্যাট হিস্ট্রি (History)
                    <span className="text-[11px] font-semibold bg-gray-200 text-gray-700 px-2 py-0.2 rounded-full">
                      {sessions.length}
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-500">পূর্ববর্তী সকল সংরক্ষিত কথোপকথন</p>
                </div>
              </div>

              <button
                onClick={() => setShowHistory(false)}
                className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 flex items-center justify-center transition cursor-pointer"
                title="বন্ধ করুন"
              >
                <i className="fa-solid fa-xmark text-base"></i>
              </button>
            </div>

            {/* Search and Action Bar */}
            <div className="p-3 border-b border-gray-200 bg-white space-y-2">
              <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="হিস্ট্রি খুঁজুন (বিষয়বস্তু বা টেক্সট)..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-100 border border-gray-200 rounded-lg text-xs outline-none focus:border-indigo-500 focus:bg-white transition"
                />
                {historySearch && (
                  <button
                    onClick={() => setHistorySearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={handleStartNewChat}
                  className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold px-2.5 py-1 rounded-md transition flex items-center gap-1 cursor-pointer border border-indigo-200"
                >
                  <i className="fa-solid fa-plus text-[10px]"></i>
                  নতুন কথোপকথন শুরু
                </button>

                {sessions.length > 0 && (
                  <button
                    onClick={handleClearAllHistory}
                    className="text-[11px] text-red-600 hover:text-red-700 hover:underline transition flex items-center gap-1 cursor-pointer"
                  >
                    <i className="fa-solid fa-trash text-[10px]"></i>
                    সব হিস্ট্রি মুছুন
                  </button>
                )}
              </div>
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50">
              {filteredSessions.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-300 text-xl">
                    <i className="fa-solid fa-comments"></i>
                  </div>
                  <p className="text-xs font-medium text-gray-600">
                    {historySearch ? 'কোনো মিল পাওয়া যায়নি' : 'কোনো সংরক্ষিত চ্যাট ইতিহাস নেই'}
                  </p>
                  <p className="text-[11px] text-gray-400 max-w-[220px]">
                    {historySearch
                      ? 'ভিন্ন শব্দ দিয়ে আবার চেষ্টা করুন।'
                      : 'চ্যাট শুরু করলে স্বয়ংক্রিয়ভাবে এখানে তালিকা তৈরি হবে।'}
                  </p>
                </div>
              ) : (
                filteredSessions.map((session) => {
                  const isActive = session.id === activeSessionId;
                  const messageCount = session.messages ? session.messages.length : 0;
                  const firstModelOrUserMsg = session.messages?.find((m) => m.role === 'user') || session.messages?.[0];
                  const previewSnippet = firstModelOrUserMsg?.text?.slice(0, 95) || 'কথোপকথন শুরু হয়েছে';

                  return (
                    <div
                      key={session.id}
                      onClick={() => handleLoadSession(session)}
                      className={`p-3 rounded-xl border transition cursor-pointer group text-left relative ${
                        isActive
                          ? 'bg-indigo-50/80 border-indigo-400 shadow-xs ring-1 ring-indigo-200'
                          : 'bg-white hover:bg-slate-100/90 border-gray-200 hover:border-gray-300 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className={`text-xs font-bold truncate flex-1 ${isActive ? 'text-indigo-900' : 'text-gray-800 group-hover:text-indigo-600'}`}>
                          {session.title || 'নামবিহীন কথোপকথন'}
                        </h4>
                        {isActive && (
                          <span className="shrink-0 bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                            সক্রিয়
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed mb-2 font-normal">
                        {previewSnippet}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <i className="fa-regular fa-clock text-[9px]"></i>
                            {session.timestamp}
                          </span>
                          <span className="bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded font-medium">
                            {messageCount} টি বার্তা
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => handleDownloadSessionDocx(session, e)}
                            className="p-1 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition cursor-pointer"
                            title="সম্পূর্ণ কথোপকথন DOCX হিসেবে ডাউনলোড করুন"
                          >
                            <i className="fa-solid fa-download text-xs"></i>
                          </button>
                          <button
                            onClick={(e) => handleDeleteSession(session.id, e)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                            title="এই হিস্ট্রি মুছে ফেলুন"
                          >
                            <i className="fa-solid fa-trash-can text-xs"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-gray-200 bg-white flex justify-between items-center text-xs text-gray-500">
              <span className="text-[11px]">
                {sessions.length > 0 ? `${sessions.length} টি সেশন সংরক্ষিত` : 'হিস্ট্রি খালি'}
              </span>
              <button
                onClick={() => setShowHistory(false)}
                className="bg-slate-100 hover:bg-slate-200 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 bg-gradient-to-b from-slate-50 to-gray-100">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-[88%] md:max-w-[80%] ${
              msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-xs text-xs font-bold ${
                msg.role === 'user'
                  ? 'bg-slate-800 text-white'
                  : 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white'
              }`}
            >
              {msg.role === 'user' ? (
                <i className="fa-solid fa-user"></i>
              ) : (
                <i className="fa-solid fa-sparkles"></i>
              )}
            </div>

            {/* Bubble */}
            <div
              className={`rounded-2xl p-4 shadow-sm text-sm leading-relaxed relative group ${
                msg.role === 'user'
                  ? 'bg-red-700 text-white rounded-tr-none'
                  : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
              }`}
            >
              {(msg.fileName || msg.image) && (
                <div className="mb-3">
                  {msg.fileType?.startsWith('image/') || (msg.image && msg.image.startsWith('data:image/')) ? (
                    <div className="rounded-lg overflow-hidden border border-white/20 max-w-xs shadow-xs">
                      <img src={msg.image} alt={msg.fileName || "User attachment"} className="w-full h-auto object-cover max-h-56" />
                      {msg.fileName && (
                        <div className="bg-black/50 text-white text-[11px] px-2.5 py-1 flex items-center justify-between">
                          <span className="truncate max-w-[180px]">{msg.fileName}</span>
                          {msg.fileSize && <span>{msg.fileSize}</span>}
                        </div>
                      )}
                    </div>
                  ) : msg.fileType?.includes('pdf') || msg.fileName?.toLowerCase().endsWith('.pdf') ? (
                    <div className="flex items-center gap-3 bg-red-950/40 text-white p-2.5 rounded-xl border border-red-300/30 shadow-xs max-w-sm">
                      <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center text-white shrink-0 shadow-xs text-lg">
                        <i className="fa-solid fa-file-pdf"></i>
                      </div>
                      <div className="overflow-hidden flex-1 min-w-0">
                        <p className="font-bold text-xs truncate text-white">{msg.fileName || 'PDF ডকুমেন্ট'}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-red-200">
                          <span className="bg-red-500/50 px-1.5 py-0.2 rounded font-semibold uppercase">PDF</span>
                          {msg.fileSize && <span>{msg.fileSize}</span>}
                          <span>• সফলভাবে সংযুক্ত</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 bg-indigo-950/40 text-white p-2.5 rounded-xl border border-indigo-300/30 shadow-xs max-w-sm">
                      <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-xs text-lg">
                        <i className="fa-solid fa-file-lines"></i>
                      </div>
                      <div className="overflow-hidden flex-1 min-w-0">
                        <p className="font-bold text-xs truncate text-white">{msg.fileName || 'সংযুক্ত ফাইল'}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-indigo-200">
                          <span className="bg-indigo-500/50 px-1.5 py-0.2 rounded font-semibold">FILE</span>
                          {msg.fileSize && <span>{msg.fileSize}</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {msg.role === 'user' ? (
                <div className="whitespace-pre-wrap font-sans chat-no-italics chat-no-bold font-normal" style={{ fontStyle: 'normal', fontWeight: 'normal' }}>
                  {renderFormattedTextWithFonts(msg.text)}
                </div>
              ) : (
                <div className="markdown-body text-gray-800 prose prose-sm max-w-none chat-no-italics chat-no-bold font-normal" style={{ fontStyle: 'normal', fontWeight: 'normal' }}>
                  <Markdown
                    components={{
                      p: ({ children }) => <p className="mb-2 leading-relaxed font-normal" style={{ fontStyle: 'normal', fontWeight: 'normal' }}>{renderFormattedTextWithFonts(children)}</p>,
                      li: ({ children }) => <li className="font-normal" style={{ fontStyle: 'normal', fontWeight: 'normal' }}>{renderFormattedTextWithFonts(children)}</li>,
                      h1: ({ children }) => <h1 className="font-normal text-base mb-2" style={{ fontStyle: 'normal', fontWeight: 'normal' }}>{renderFormattedTextWithFonts(children)}</h1>,
                      h2: ({ children }) => <h2 className="font-normal text-base mb-2" style={{ fontStyle: 'normal', fontWeight: 'normal' }}>{renderFormattedTextWithFonts(children)}</h2>,
                      h3: ({ children }) => <h3 className="font-normal text-sm mb-1" style={{ fontStyle: 'normal', fontWeight: 'normal' }}>{renderFormattedTextWithFonts(children)}</h3>,
                      strong: ({ children }) => <span className="font-normal" style={{ fontStyle: 'normal', fontWeight: 'normal' }}>{renderFormattedTextWithFonts(children)}</span>,
                      b: ({ children }) => <span className="font-normal" style={{ fontStyle: 'normal', fontWeight: 'normal' }}>{renderFormattedTextWithFonts(children)}</span>,
                      em: ({ children }) => <span style={{ fontStyle: 'normal', fontWeight: 'normal' }}>{renderFormattedTextWithFonts(children)}</span>,
                      i: ({ children }) => <span style={{ fontStyle: 'normal', fontWeight: 'normal' }}>{renderFormattedTextWithFonts(children)}</span>,
                      code: ({ children, ...props }: any) => (
                        <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-normal" style={{ fontStyle: 'normal', fontWeight: 'normal', fontFamily: "'Times New Roman', serif" }}>
                          {children}
                        </code>
                      ),
                    }}
                  >
                    {msg.text}
                  </Markdown>
                </div>
              )}

              {/* Timestamp & Actions */}
              <div
                className={`flex items-center justify-between gap-2 mt-2 pt-1 text-[11px] border-t ${
                  msg.role === 'user' ? 'border-white/20 text-red-100' : 'border-gray-100 text-gray-400'
                }`}
              >
                <span>{msg.timestamp}</span>

                {msg.role === 'model' && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleCopyText(msg.text, msg.id)}
                      className="hover:text-indigo-600 transition flex items-center gap-1 cursor-pointer font-medium"
                      title="কপি করুন"
                    >
                      <i className="fa-regular fa-copy"></i>
                      {copyStatus === msg.id ? 'কপি হয়েছে!' : 'কপি'}
                    </button>

                    <button
                      onClick={() => handleDownloadDocx(msg.text)}
                      className="hover:text-emerald-600 transition flex items-center gap-1 cursor-pointer font-medium text-gray-500"
                      title="Word (.docx) ফাইল হিসেবে ডাউনলোড করুন"
                    >
                      <i className="fa-solid fa-file-word text-blue-600"></i>
                      ডাউনলোড (.docx)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Loading typing indicator */}
        {isLoading && (
          <div className="flex gap-3 mr-auto max-w-[80%]">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs text-xs animate-pulse">
              <i className="fa-solid fa-sparkles"></i>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none p-4 shadow-sm text-sm text-gray-600 flex items-center gap-2">
              <div className="flex space-x-1.5 items-center">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce"></div>
              </div>
              <span className="text-xs font-medium text-gray-500 ml-1">Gemini উত্তর তৈরি করছে...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Preset suggestions when message history is short */}
      {messages.length <= 2 && !isLoading && (
        <div className="px-4 py-2 bg-white border-t border-gray-200">
          <div className="text-[11px] font-bold text-gray-400 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <i className="fa-solid fa-lightbulb text-amber-500"></i> দ্রুত প্রশ্ন সাজেস্টসমূহ:
            </span>
            {reservedBooks.length > 0 && (
              <span className="text-[10px] text-rose-600 font-semibold flex items-center gap-1">
                <i className="fa-solid fa-book text-[9px]"></i>
                {reservedBooks.filter((b) => b.isActive).length} টি বই সক্রিয়
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {/* If reserved books exist, add a quick reference suggestion */}
            {reservedBooks.filter((b) => b.isActive).slice(0, 2).map((book) => (
              <button
                key={`reserve-${book.id}`}
                onClick={() => handleSend(`[${book.code}: "${book.title}"] বই থেকে গুরুত্বপূর্ণ ৫টি বহুনির্বাচনী প্রশ্ন ও উত্তর দাও`)}
                className="text-xs bg-rose-50 hover:bg-rose-100 hover:text-rose-800 hover:border-rose-300 text-rose-700 px-2.5 py-1 rounded-full border border-rose-200 transition text-left cursor-pointer font-medium flex items-center gap-1"
              >
                <i className="fa-solid fa-book-bookmark text-[10px]"></i>
                {book.code} বই থেকে প্রশ্ন চান?
              </button>
            ))}

            {presetQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                className="text-xs bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 text-gray-700 px-2.5 py-1 rounded-full border border-gray-200 transition text-left cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="bg-white border-t border-gray-200 p-3 md:p-4">
        {/* Active Book Reserve Notification Bar */}
        {reservedBooks.some((b) => b.isActive) && !selectedFile && (
          <div className="mb-2.5 flex items-center justify-between bg-rose-50/90 border border-rose-200 rounded-xl px-3 py-2 text-xs text-rose-950 shadow-2xs">
            <div className="flex items-center gap-2 overflow-hidden min-w-0">
              <div className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center text-xs shrink-0 shadow-2xs font-bold">
                <i className="fa-solid fa-book-bookmark text-[10px]"></i>
              </div>
              <div className="flex items-center gap-1.5 overflow-hidden truncate">
                <span className="font-bold text-rose-900 text-xs shrink-0">Book Reserve সক্রিয়:</span>
                <div className="flex items-center gap-1 overflow-hidden truncate">
                  {reservedBooks
                    .filter((b) => b.isActive)
                    .map((b) => (
                      <span
                        key={b.id}
                        className="bg-white text-rose-700 font-mono font-bold text-[10px] px-1.5 py-0.5 rounded border border-rose-200 shrink-0"
                        title={b.title}
                      >
                        {b.code}
                      </span>
                    ))}
                  <span className="text-[11px] text-gray-600 truncate ml-0.5">
                    (রেফারেন্স দিলে স্বয়ংক্রিয়ভাবে প্রশ্ন কালেক্ট হবে)
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsBookReserveOpen(true)}
              className="text-[11px] font-bold text-rose-700 hover:text-rose-900 bg-white hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition shrink-0 cursor-pointer shadow-2xs ml-2"
            >
              ম্যানেজ করুন
            </button>
          </div>
        )}

        {isReadingFile && (
          <div className="mb-2.5 flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800 text-xs shadow-xs animate-pulse">
            <i className="fa-solid fa-spinner animate-spin text-amber-600 text-sm"></i>
            <span className="font-semibold">ফাইল প্রসেস করা হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...</span>
          </div>
        )}

        {selectedFile && !isReadingFile && (
          <div
            className={`mb-2.5 relative flex items-center justify-between gap-3 p-3 rounded-xl border shadow-xs transition ${
              selectedFile.type?.includes('pdf') || selectedFile.name.toLowerCase().endsWith('.pdf')
                ? 'bg-red-50/90 border-red-200 text-red-950'
                : selectedFile.isImage
                ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                : 'bg-indigo-50/90 border-indigo-200 text-indigo-950'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0 overflow-hidden">
              {selectedFile.isImage ? (
                <img
                  src={selectedFile.dataUrl}
                  alt={selectedFile.name}
                  className="w-11 h-11 object-cover rounded-lg border border-emerald-300 shrink-0 shadow-xs"
                />
              ) : selectedFile.type?.includes('pdf') || selectedFile.name.toLowerCase().endsWith('.pdf') ? (
                <div className="w-11 h-11 bg-red-600 text-white rounded-lg flex items-center justify-center shrink-0 font-bold text-xl shadow-xs">
                  <i className="fa-solid fa-file-pdf"></i>
                </div>
              ) : (
                <div className="w-11 h-11 bg-indigo-600 text-white rounded-lg flex items-center justify-center shrink-0 font-bold text-xl shadow-xs">
                  <i className="fa-solid fa-file-lines"></i>
                </div>
              )}
              <div className="overflow-hidden min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                      selectedFile.type?.includes('pdf') || selectedFile.name.toLowerCase().endsWith('.pdf')
                        ? 'bg-red-600 text-white'
                        : selectedFile.isImage
                        ? 'bg-emerald-600 text-white'
                        : 'bg-indigo-600 text-white'
                    }`}
                  >
                    {selectedFile.type?.includes('pdf') || selectedFile.name.toLowerCase().endsWith('.pdf')
                      ? 'PDF ফাইল'
                      : selectedFile.isImage
                      ? 'ছবি'
                      : 'ডকুমেন্ট'}
                  </span>
                  <p className="font-bold text-xs truncate max-w-[240px] sm:max-w-md">{selectedFile.name}</p>
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500">
                  <span>সাইজ: {selectedFile.sizeFormatted}</span>
                  <span>•</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <i className="fa-solid fa-circle-check text-[10px]"></i>
                    সংযুক্ত হয়েছে (পাঠানোর জন্য প্রস্তুত)
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleRemoveFile}
              className="bg-white/80 hover:bg-red-600 hover:text-white text-gray-600 border border-gray-200 rounded-full w-7 h-7 flex items-center justify-center text-xs shadow-xs cursor-pointer transition shrink-0"
              title="ফাইল বাদ দিন"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex items-end gap-2 bg-slate-100 border border-gray-300 rounded-xl p-2 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition">
          {/* File input button */}
          <label
            className={`p-2 cursor-pointer transition rounded-lg shrink-0 flex items-center justify-center relative ${
              selectedFile
                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                : 'text-gray-500 hover:text-indigo-600 hover:bg-gray-200'
            }`}
            title="PDF, ছবি বা যেকোনো ডকুমেন্ট আপলোড করুন"
          >
            <i className="fa-solid fa-paperclip text-lg"></i>
            {selectedFile && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center text-[8px] text-white font-bold">
                ✓
              </span>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf,.doc,.docx,.txt,.csv,.json,.xls,.xlsx,image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              selectedFile
                ? `"${selectedFile.name}" সম্পর্কিত প্রশ্ন লিখুন (বা সরাসরি পাঠান)...`
                : reservedBooks.some((b) => b.isActive)
                ? 'Gemini-কে জিজ্ঞাসা করুন বা বইয়ের রেফারেন্স দিয়ে প্রশ্ন চান (যেমন: MQB পৃষ্ঠা ৫০)...'
                : "Gemini-কে যেকোনো কিছু জিজ্ঞাসা করুন বা PDF ড্রপ করুন... (Enter চেপে পাঠান)"
            }
            className="w-full bg-transparent border-none outline-none resize-none text-sm text-gray-800 placeholder-gray-400 max-h-32 min-h-[38px] py-1 leading-relaxed font-sans"
            rows={1}
          />

          {/* Send Button */}
          <button
            onClick={() => handleSend()}
            disabled={isLoading || ((!input || !input.trim()) && !selectedFile && !reservedBooks.some((b) => b.isActive))}
            className={`p-2.5 rounded-lg text-white font-bold transition shrink-0 flex items-center justify-center cursor-pointer ${
              isLoading || ((!input || !input.trim()) && !selectedFile && !reservedBooks.some((b) => b.isActive))
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm'
            }`}
            title="পাঠান"
          >
            {isLoading ? (
              <i className="fa-solid fa-spinner animate-spin text-sm"></i>
            ) : (
              <i className="fa-solid fa-paper-plane text-sm"></i>
            )}
          </button>
        </div>

        <div className="text-[11px] text-gray-400 text-center mt-2 flex items-center justify-center gap-1">
          <span>Gemini তথ্য সম্পর্কিত ভুল করতে পারে। সংবেদনশীল বা গুরুত্বপূর্ণ তথ্য যাচাই করে নিন।</span>
        </div>
      </div>

      {/* Book Reserve Modal / Drawer */}
      <BookReserveModal
        isOpen={isBookReserveOpen}
        onClose={() => setIsBookReserveOpen(false)}
        books={reservedBooks}
        onBooksChanged={refreshReservedBooks}
        onSelectBookForChat={handleSelectBookForChat}
      />
    </div>
  );
};
