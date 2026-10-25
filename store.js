// On-device storage. Structured data lives in localStorage; photos live in
// IndexedDB because they are large. Nothing is sent to a server.

const KEY = 'dermalogic:v1';
const LEGACY_FLAG = 'dermalogic:legacyOwner';
let userId = null;
const userKey = () => (userId ? `${KEY}:${userId}` : KEY);
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
  settings: { speak: false, rate: 1, acceptedDisclaimer: false, highContrast: false, largeText: false, cloudScan: false, onboarded: false },
});

let state = DEFAULT_STATE();
const listeners = new Set();

function load(raw) {
  try {
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
    if (userId) localStorage.setItem(userKey(), JSON.stringify(state));
  } catch (e) {
    console.warn('Could not save', e);
  }
  listeners.forEach((fn) => fn(state));
}

// Switches to one account's data. The first account created on a device that
// already had pre-login data adopts it, so nobody loses their history.
function setUser(uid) {
  userId = uid || null;
  if (!userId) {
    state = DEFAULT_STATE();
    return;
  }
  let raw = null;
  try {
    raw = localStorage.getItem(userKey());
    if (!raw && localStorage.getItem(KEY) && !localStorage.getItem(LEGACY_FLAG)) {
      raw = localStorage.getItem(KEY);
      localStorage.setItem(userKey(), raw);
      localStorage.setItem(LEGACY_FLAG, userId);
    }
  } catch {}
  state = load(raw);
  listeners.forEach((fn) => fn(state));
}

export const store = {
  setUser,
  get userId() {
    return userId;
  },
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
    const legacy = userId && localStorage.getItem(LEGACY_FLAG) === userId;
    const req = indexedDB.open(!userId || legacy ? 'dermalogic' : `dermalogic-${userId}`, 1);
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
