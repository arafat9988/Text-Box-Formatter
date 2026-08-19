export interface HistoryBook {
  id: string;
  name: string;
  shortTag: string;
  totalPages: number;
  fileSizeBytes: number;
  uploadedAt: string;
  arrayBuffer: ArrayBuffer;
  playlists?: string[]; // Array of playlist IDs or names
}

export interface BookPlaylist {
  id: string;
  name: string;
  color: string; // 'purple' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'blue' | 'cyan'
  description?: string;
  createdAt: string;
}

const DB_NAME = 'BanglaEnglishFixer_QcBookHistory_DB';
const DB_VERSION = 2;
const STORE_NAME = 'qc_history_books';
const PLAYLIST_STORE_NAME = 'qc_history_playlists';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this browser'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('shortTag', 'shortTag', { unique: false });
        store.createIndex('uploadedAt', 'uploadedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(PLAYLIST_STORE_NAME)) {
        const plStore = db.createObjectStore(PLAYLIST_STORE_NAME, { keyPath: 'id' });
        plStore.createIndex('name', 'name', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

export async function getAllHistoryBooks(): Promise<HistoryBook[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const books = (request.result || []) as HistoryBook[];
        // Sort newest first
        books.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        // Ensure playlists array is initialized
        const normalized = books.map(b => ({
          ...b,
          playlists: Array.isArray(b.playlists) ? b.playlists : []
        }));
        resolve(normalized);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Failed to get history books from IndexedDB:', error);
    return [];
  }
}

export async function saveHistoryBook(book: HistoryBook): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const bookToSave = {
        ...book,
        playlists: Array.isArray(book.playlists) ? book.playlists : []
      };
      const request = store.put(bookToSave);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to save history book to IndexedDB:', error);
  }
}

export async function deleteHistoryBook(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to delete history book:', error);
  }
}

export async function updateHistoryBookTag(id: string, newTag: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const item = getReq.result as HistoryBook;
        if (item) {
          item.shortTag = newTag;
          const putReq = store.put(item);
          putReq.onsuccess = () => resolve();
          putReq.onerror = () => reject(putReq.error);
        } else {
          resolve();
        }
      };
      getReq.onerror = () => reject(getReq.error);
    });
  } catch (error) {
    console.error('Failed to update history book tag:', error);
  }
}

export async function updateHistoryBookPlaylists(id: string, playlists: string[]): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const item = getReq.result as HistoryBook;
        if (item) {
          item.playlists = playlists;
          const putReq = store.put(item);
          putReq.onsuccess = () => resolve();
          putReq.onerror = () => reject(putReq.error);
        } else {
          resolve();
        }
      };
      getReq.onerror = () => reject(getReq.error);
    });
  } catch (error) {
    console.error('Failed to update history book playlists:', error);
  }
}

export async function clearAllHistoryBooks(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to clear history books:', error);
  }
}

// ================= PLAYLIST FUNCTIONS =================

const DEFAULT_PLAYLISTS: BookPlaylist[] = [
  {
    id: 'pl_2nd_time',
    name: 'Varsity 2nd Time (সেকেন্ড টাইম প্লেলিস্ট)',
    color: 'purple',
    description: 'ভার্সিটি ২য় বার পরীক্ষার্থীদের জন্য প্রয়োজনীয় সমস্ত প্রশ্নব্যাংক ও নোট',
    createdAt: new Date().toISOString()
  },
  {
    id: 'pl_gk',
    name: 'GK Master (সাধারণ জ্ঞান)',
    color: 'indigo',
    description: 'বাংলাদেশ ও আন্তর্জাতিক বিষয়াবলী প্রশ্নব্যাংক',
    createdAt: new Date().toISOString()
  },
  {
    id: 'pl_bangla',
    name: 'Bangla Collection (বাংলা)',
    color: 'emerald',
    description: 'বাংলা ১ম ও ২য় পত্র মাস্টার কোশ্চেন ব্যাংক',
    createdAt: new Date().toISOString()
  },
  {
    id: 'pl_english',
    name: 'English Master (ইংরেজি)',
    color: 'rose',
    description: 'ভার্সিটি খ ইউনিট ও অন্যান্য ইউনিটের ইংরেজি বই',
    createdAt: new Date().toISOString()
  }
];

export async function getAllPlaylists(): Promise<BookPlaylist[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PLAYLIST_STORE_NAME, 'readonly');
      const store = transaction.objectStore(PLAYLIST_STORE_NAME);
      const request = store.getAll();

      request.onsuccess = async () => {
        let playlists = (request.result || []) as BookPlaylist[];
        if (playlists.length === 0) {
          // Initialize defaults
          for (const pl of DEFAULT_PLAYLISTS) {
            await savePlaylist(pl);
          }
          playlists = DEFAULT_PLAYLISTS;
        }
        resolve(playlists);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Failed to get playlists from IndexedDB:', error);
    return DEFAULT_PLAYLISTS;
  }
}

export async function savePlaylist(playlist: BookPlaylist): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PLAYLIST_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(PLAYLIST_STORE_NAME);
      const request = store.put(playlist);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to save playlist:', error);
  }
}

export async function deletePlaylist(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PLAYLIST_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(PLAYLIST_STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to delete playlist:', error);
  }
}

