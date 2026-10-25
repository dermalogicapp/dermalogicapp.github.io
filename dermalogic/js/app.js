import { store, today } from './store.js';
import { $, $$, announce, toast, esc } from './ui.js';
import { dueReminders, dueFollowUps } from './reminders.js';
import { respond } from './chatbot.js';
import { listen, speak, voiceSupport, isListening, stopListening } from './voice.js';
import { stopCamera } from './camera.js';
import { dropletIcon } from './icon.js';

import home from './views/home.js';
import analyze from './views/analyze.js';
import profile from './views/profile.js';
import routine from './views/routine.js';
import complaints from './views/complaints.js';
import progress from './views/progress.js';
import lifestyle from './views/lifestyle.js';
import ingredients from './views/ingredients.js';
import chat from './views/chat.js';
import reminders from './views/reminders.js';
import settings from './views/settings.js';

const VIEWS = { home, analyze, profile, routine, complaints, progress, lifestyle, ingredients, chat, reminders, settings };

let cleanup = null;

export function navigate(route) {
  location.hash = `#/${route}`;
}

function currentRoute() {
  const r = location.hash.replace(/^#\/?/, '').split('?')[0];
  return VIEWS[r] ? r : 'home';
}

async function render() {
  const route = currentRoute();
  const view = VIEWS[route];
  if (typeof cleanup === 'function') cleanup();
  cleanup = null;
  stopCamera();

  $$('#primary-nav a').forEach((a) => {
    if (a.dataset.route === route) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  closeMenu();

  const root = $('#view');
  root.innerHTML = '';
  document.title = `${view.title} · DermaLogic`;
  cleanup = await view.render(root, { navigate });
  renderBanners();

  // Move focus to the new page heading so screen-reader users know the page changed.
  const h1 = root.querySelector('h1');
  if (h1) {
    h1.setAttribute('tabindex', '-1');
    h1.focus({ preventScroll: false });
  }
  announce(`${view.title} page`);
}

// --- Banners for follow-ups ---
function renderBanners() {
  const host = $('#banners');
  const due = dueFollowUps(store.get().complaints);
  if (!due.length || currentRoute() === 'complaints') {
    host.innerHTML = '';
    return;
  }
  host.innerHTML = `<div class="banner" role="region" aria-label="Follow-ups due">
    <p><strong>Follow-up:</strong> How is your ${esc(due[0].label.toLowerCase())} now?${due.length > 1 ? ` (and ${due.length - 1} more)` : ''}</p>
    <a class="btn btn-small" href="#/complaints">Check in</a>
  </div>`;
}

// --- Reminders: checked every 30 seconds while the app is open ---
function checkReminders() {
  const s = store.get();
  const key = today();
  const due = dueReminders(new Date(), s.reminders, key);
  for (const r of due) {
    store.update((st) => (st.reminders.lastFired[r.id] = key));
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`DermaLogic: ${r.title}`, { body: r.body, icon: 'assets/icon.svg', tag: r.id });
      } catch {}
    }
    toast(`${r.title}: ${r.body}`);
    if (s.settings.speak) speak(`${r.title}. ${r.body}`, { rate: s.settings.rate });
  }
  const followUps = dueFollowUps(s.complaints);
  if (followUps.length) renderBanners();
}

// --- Global voice button: ask anything from any page ---
function setupVoiceFab() {
  const btn = $('#voice-fab');
  if (!voiceSupport.input) {
    btn.title = 'Voice input is not supported in this browser';
  }
  const run = () => {
    if (isListening()) {
      stopListening();
      return;
    }
    if (!voiceSupport.input) {
      toast('Voice input is not supported in this browser. Open the Assistant to type instead, and turn on "Read replies aloud" to hear answers.', 'error');
      return;
    }
    btn.classList.add('listening');
    btn.setAttribute('aria-pressed', 'true');
    announce('Listening. Speak now.');
    listen({
      onResult: (text) => handleVoiceQuery(text),
      onError: (msg) => toast(msg, 'error'),
      onEnd: () => {
        btn.classList.remove('listening');
        btn.setAttribute('aria-pressed', 'false');
      },
    });
  };
  btn.addEventListener('click', run);
  document.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 'v' || e.key === 'V')) {
      e.preventDefault();
      run();
    }
  });
}

export function handleVoiceQuery(text) {
  const s = store.get();
  const reply = respond(text, { profile: s.profile, analysis: s.analyses.at(-1)?.result, reminders: s.reminders });
  store.update((st) => {
    st.chat.push({ role: 'user', text, at: new Date().toISOString() });
    st.chat.push({ role: 'bot', text: reply.text, at: new Date().toISOString(), urgent: !!reply.urgent });
  });
  // Voice answers are always spoken: the user asked by voice.
  speak(reply.text, { rate: s.settings.rate });
  if (reply.action?.navigate) navigate(reply.action.navigate);
  else if (currentRoute() === 'chat') render();
  else toast(reply.text.split('\n')[0]);
}

function closeMenu() {
  const t = $('#menu-toggle');
  t.setAttribute('aria-expanded', 'false');
  $('#primary-nav').classList.remove('open');
}

function applySettings() {
  const { settings } = store.get();
  document.documentElement.classList.toggle('high-contrast', !!settings.highContrast);
  document.documentElement.classList.toggle('large-text', !!settings.largeText);
}

function init() {
  $('#brand-icon').innerHTML = dropletIcon({ variant: 'logo', size: 34 });
  applySettings();
  store.subscribe(applySettings);
  $('#menu-toggle').addEventListener('click', (e) => {
    const open = e.currentTarget.getAttribute('aria-expanded') !== 'true';
    e.currentTarget.setAttribute('aria-expanded', String(open));
    $('#primary-nav').classList.toggle('open', open);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });
  setupVoiceFab();
  window.addEventListener('hashchange', render);
  render();

  const dlg = $('#disclaimer');
  if (!store.get().settings.acceptedDisclaimer && dlg?.showModal) {
    dlg.showModal();
    dlg.addEventListener('close', () => store.update((s) => (s.settings.acceptedDisclaimer = true)), { once: true });
  }

  checkReminders();
  setInterval(checkReminders, 30000);

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

init();
