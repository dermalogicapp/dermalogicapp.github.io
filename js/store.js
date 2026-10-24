// On-device storage. Structured data lives in localStorage; photos live in
// IndexedDB because they are large. Nothing is sent to a server.

const KEY = 'dermalogic:v1';
const DEFAULT_STATE = () => ({
  profile: null,
  analyses: [],
  complaints: [],
  products: [],
  lifestyle: {},
  routineLog: {},
  reminders: {
    enabled: false,
    am: '07:30',
    pm: '21:30',
    sunscreen: false,
    lifestyle: '20:00',
    lastFired: {},
  },
  chat: [],
  settings: { speak: false, rate: 1, acceptedDisclaimer: false, highContrast: false, largeText: false },
});

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_STATE();
    const parsed = JSON.parse(raw);
    const base = DEFAULT_STATE();
    return { ...base, ...parsed, reminders: { ...base.reminders, ...parsed.reminders }, settings: { ...base.settings, ...parsed.settings } };
  } catch {
    return DEFAULT_STATE();
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Could not save', e);
  }
  listeners.forEach((fn) => fn(state));
}

export const store = {
  get: () => state,
  update(fn) {
    fn(state);
    save();
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  exportJSON() {
    return JSON.stringify(state, null, 2);
  },
  importJSON(text) {
    const parsed = JSON.parse(text);
    state = { ...DEFAULT_STATE(), ...parsed };
    save();
  },
  async reset() {
    state = DEFAULT_STATE();
    save();
    await photos.clear();
  },
};

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const today = (d = new Date()) => {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
};

// --- Photos (IndexedDB) ---
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('dermalogic', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('photos', { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction('photos', mode);
    const s = t.objectStore('photos');
    const result = fn(s);
    t.oncomplete = () => resolve(result?.result ?? result);
    t.onerror = () => reject(t.error);
  });
}

export const photos = {
  add: (photo) => tx('readwrite', (s) => s.put(photo)),
  remove: (id) => tx('readwrite', (s) => s.delete(id)),
  clear: () => tx('readwrite', (s) => s.clear()).catch(() => {}),
  async all() {
    try {
      const list = await tx('readonly', (s) => s.getAll());
      return (list || []).sort((a, b) => (a.date < b.date ? -1 : 1));
    } catch {
      return [];
    }
  },
};
