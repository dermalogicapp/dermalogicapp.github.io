// Caches the app shell so DermaLogic opens offline after the first visit.
const CACHE = 'dermalogic-v3';
const SHELL = [
  './', 'index.html', 'css/styles.css', 'css/v2.css', 'manifest.webmanifest', 'assets/icon.svg',
  'js/app.js', 'js/store.js', 'js/ui.js', 'js/analysis.js', 'js/camera.js', 'js/voice.js', 'js/chatbot.js',
  'js/ingredients.js', 'js/recommend.js', 'js/reminders.js', 'js/lifestyle.js', 'js/icon.js', 'js/icons.js', 'js/fx.js', 'js/auth.js', 'js/config.js', 'js/youcam.js', 'js/score.js', 'js/routes.js',
  'js/data/ingredients-db.js', 'js/data/knowledge.js',
  'js/views/home.js', 'js/views/analyze.js', 'js/views/profile.js', 'js/views/routine.js', 'js/views/complaints.js',
  'js/views/progress.js', 'js/views/lifestyle.js', 'js/views/ingredients.js', 'js/views/chat.js', 'js/views/reminders.js', 'js/views/settings.js', 'js/views/landing.js', 'js/views/auth.js', 'js/views/onboarding.js', 'js/views/shared.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// Network first for same-origin files so updates show up, cache as fallback.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
