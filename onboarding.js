import { store } from '../store.js';
import { esc, announce, toast } from '../ui.js';
import { CONCERNS, SKIN_TYPES, BODY_TYPES } from '../data/knowledge.js';
import { dropletIcon } from '../icon.js';
import { icon } from '../icons.js';
import { art } from '../art.js';
import { burst, reducedMotion } from '../fx.js';
import { currentSession } from '../auth.js';

const BLEACH = {
  hydroquinone: 'Hydroquinone creams',
  steroid: 'Steroid creams',
  mercury: 'Unlabelled whitening soaps or creams',
  injections: 'Glutathione pills or injections',
  natural: 'Lemon, baking soda or home remedies',
  unknown: 'Not sure what was in it',
};
const SKIN_HINTS = {
  oily: 'Shiny all over',
  dry: 'Tight or flaky',
  combination: 'Oily T-zone, drier cheeks',
  normal: 'Comfortable',
  sensitive: 'Stings or reddens easily',
};
const ART = { goals: 'routine', skin: 'profile', history: 'complaints', reminders: 'reminders', privacy: 'scan' };
const STEPS = ['welcome', 'goals', 'skin', 'history', 'reminders', 'privacy', 'done'];

export default {
  title: 'Set up your profile',
  render(root, { navigate }) {
    const s = store.get();
    const session = currentSession();
    const p = s.profile || {};
    const data = {
      name: p.name || session?.name || '',
      concerns: [...(p.concerns || [])],
      skinType: p.skinType || '',
      ageRange: p.ageRange || '',
      bodyType: p.bodyType || '',
      pregnant: !!p.pregnant,
      bleachingHistory: !!p.bleachingHistory,
      bleachingProducts: [...(p.bleachingProducts || [])],
      bleachingStopped: p.bleachingStopped || '',
      allergies: p.allergies || '',
      remind: true,
      am: s.reminders.am,
      pm: s.reminders.pm,
      cloudScan: !!s.settings.cloudScan,
      accepted: !!s.settings.acceptedDisclaimer,
    };
    let step = 0;

    root.innerHTML = `
      <div class="pub onboard">
        <header class="ob-top">
          <span class="pub-brand">${dropletIcon({ variant: 'logo', size: 32 })}<span>DermaLogic</span></span>
          <button type="button" class="btn btn-small btn-ghost-light" id="ob-skip" hidden>Skip for now</button>
        </header>
        <div class="ob-progress" role="progressbar" aria-label="Set-up progress" aria-valuemin="1" aria-valuemax="${STEPS.length - 1}" aria-valuenow="1"><span></span></div>
        <p class="ob-count small" id="ob-count" aria-live="polite"></p>
        <div class="ob-stage"><div class="ob-card" id="ob-card"></div></div>
      </div>`;
    const card = root.querySelector('#ob-card');
    const bar = root.querySelector('.ob-progress');
    const skipBtn = root.querySelector('#ob-skip');

    const nav = ({ back = true, next = 'Continue', nextDisabled = false } = {}) => `
      <div class="ob-nav">
        ${back ? `<button type="button" class="btn btn-ghost" id="ob-back">Back</button>` : '<span></span>'}
        <button type="button" class="btn btn-primary btn-lg" id="ob-next" ${nextDisabled ? 'disabled' : ''}>${next} ${icon('arrow', { size: 18 })}</button>
      </div>`;

    const tile = (type, name, value, label, hint, checked) =>
      `<label class="tile"><input type="${type}" name="${name}" value="${value}" ${checked ? 'checked' : ''} /><span class="tile-body"><strong>${esc(label)}</strong>${hint ? `<small>${esc(hint)}</small>` : ''}</span></label>`;

    const views = {
      welcome: () => `
        <div class="ob-hero">${dropletIcon({ variant: 'logo', size: 72 })}</div>
        <h1 tabindex="-1" id="ob-h">Welcome${data.name ? `, ${esc(data.name)}` : ''}!</h1>
        <p class="lead">Let's set up DermaLogic around you. It takes about two minutes and you can skip anything.</p>
        <div class="field"><label for="ob-name">What should we call you?</label>
          <input id="ob-name" autocomplete="given-name" value="${esc(data.name)}" /></div>
        ${nav({ back: false, next: "Let's go" })}`,
      goals: () => `
        <h1 tabindex="-1" id="ob-h">What would you like to improve?</h1>
        <p class="lead">Choose as many as you like.</p>
        <div class="tiles">${Object.entries(CONCERNS).map(([k, c]) => tile('checkbox', 'goal', k, c.label, '', data.concerns.includes(k))).join('')}</div>
        ${nav()}`,
      skin: () => `
        <h1 tabindex="-1" id="ob-h">How does your skin usually feel?</h1>
        <p class="lead">Think about an hour after washing, with nothing on it.</p>
        <div class="tiles">${Object.entries(SKIN_TYPES).map(([k, t]) => tile('radio', 'skinType', k, t.label, SKIN_HINTS[k], data.skinType === k)).join('')}</div>
        <p class="field-err" id="ob-err" role="alert"></p>
        ${nav()}`,
      history: () => `
        <h1 tabindex="-1" id="ob-h">A little about you</h1>
        <p class="lead">This helps keep your routine safe. It stays private.</p>
        <div class="field"><label for="ob-age">Age range</label>
          <select id="ob-age">${['', 'Under 18', '18-24', '25-34', '35-44', '45-54', '55+'].map((a) => `<option value="${a}" ${data.ageRange === a ? 'selected' : ''}>${a || 'Prefer not to say'}</option>`).join('')}</select></div>
        <label class="check"><input type="checkbox" id="ob-preg" ${data.pregnant ? 'checked' : ''} /> <span>I am pregnant, trying to conceive or breastfeeding</span></label>
        <label class="check"><input type="checkbox" id="ob-bleach" ${data.bleachingHistory ? 'checked' : ''} aria-controls="ob-bleach-more" /> <span>I have used skin bleaching or lightening products</span></label>
        <div id="ob-bleach-more" class="ob-more" ${data.bleachingHistory ? '' : 'hidden'}>
          <p class="hint">Thank you for sharing. We will build a soothing, barrier-repair plan and leave out harsh actives.</p>
          <fieldset><legend>What did you use?</legend>
            ${Object.entries(BLEACH).map(([k, l]) => `<label class="check"><input type="checkbox" name="bp" value="${k}" ${data.bleachingProducts.includes(k) ? 'checked' : ''} /> <span>${esc(l)}</span></label>`).join('')}
          </fieldset>
          <div class="field"><label for="ob-stopped">When did you last use them?</label>
            <select id="ob-stopped">${[['', 'Choose…'], ['current', 'I still use them'], ['<3m', 'Less than 3 months ago'], ['3-12m', '3 to 12 months ago'], ['>1y', 'Over a year ago']].map(([v, l]) => `<option value="${v}" ${data.bleachingStopped === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        </div>
        <div class="field"><label for="ob-allergy">Allergies or ingredients that react badly <span class="muted">(optional)</span></label>
          <input id="ob-allergy" value="${esc(data.allergies)}" /></div>
        <details class="ob-more"><summary>Body type (optional)</summary>
          <p class="hint">A face photo can't show body type, so we ask. It's only used for body-care tips.</p>
          <div class="tiles tiles-sm">${Object.entries(BODY_TYPES).map(([k, l]) => tile('radio', 'bodyType', k, l, '', data.bodyType === k)).join('')}</div>
        </details>
        ${nav()}`,
      reminders: () => `
        <h1 tabindex="-1" id="ob-h">Want a daily nudge?</h1>
        <p class="lead">Consistency matters more than any single product.</p>
        <label class="switch-row"><span><strong>Daily reminders</strong><small>Morning and evening routine</small></span>
          <input type="checkbox" id="ob-remind" role="switch" ${data.remind ? 'checked' : ''} /></label>
        <div class="time-row" id="ob-times" ${data.remind ? '' : 'hidden'}>
          <div class="field"><label for="ob-am">Morning</label><input type="time" id="ob-am" value="${data.am}" /></div>
          <div class="field"><label for="ob-pm">Evening</label><input type="time" id="ob-pm" value="${data.pm}" /></div>
        </div>
        <p class="hint">Reminders appear while DermaLogic is open or installed. You can allow notifications in Settings.</p>
        ${nav()}`,
      privacy: () => `
        <h1 tabindex="-1" id="ob-h">Your privacy, your choice</h1>
        <p class="lead">Your routine, logs and photos are stored on this device.</p>
        <label class="switch-row"><span><strong>Use YouCam AI for face scans</strong><small>Sends the photo you scan, over an encrypted connection, to YouCam (Perfect Corp.) for skin analysis. DermaLogic does not keep a copy. If off, scans are analysed on your device only.</small></span>
          <input type="checkbox" id="ob-cloud" role="switch" ${data.cloudScan ? 'checked' : ''} /></label>
        <label class="check"><input type="checkbox" id="ob-accept" ${data.accepted ? 'checked' : ''} /> <span>I understand DermaLogic is <strong>not medical advice</strong> and cannot diagnose skin conditions.</span></label>
        <p class="field-err" id="ob-err" role="alert"></p>
        ${nav({ next: 'Finish set-up' })}`,
      done: () => `
        <div class="done-wrap"><div class="done-badge" id="ob-burst"><svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24" fill="none"/><path d="m14 27 8 8 16-17" fill="none"/></svg></div></div>
        <h1 tabindex="-1" id="ob-h">You're all set${data.name ? `, ${esc(data.name)}` : ''}!</h1>
        <p class="lead">Your dashboard is ready. The best next step is a first face scan, which unlocks your personalised routine.</p>
        <div class="btn-row center">
          <button type="button" class="btn btn-primary btn-lg" id="ob-scan">Take my first scan</button>
          <button type="button" class="btn btn-lg" id="ob-dash">Go to my dashboard</button>
        </div>`,
    };

    function save(finish = false) {
      const profile = {
        ...(store.get().profile || {}),
        name: data.name,
        concerns: data.concerns,
        skinType: data.skinType || store.get().profile?.skinType || 'normal',
        ageRange: data.ageRange,
        bodyType: data.bodyType,
        pregnant: data.pregnant,
        bleachingHistory: data.bleachingHistory,
        bleachingProducts: data.bleachingHistory ? data.bleachingProducts : [],
        bleachingStopped: data.bleachingHistory ? data.bleachingStopped : '',
        allergies: data.allergies,
        updatedAt: new Date().toISOString(),
      };
      store.update((st) => {
        st.profile = profile;
        st.reminders.enabled = !!data.remind;
        st.reminders.am = data.am || st.reminders.am;
        st.reminders.pm = data.pm || st.reminders.pm;
        st.settings.cloudScan = data.cloudScan;
        if (finish) {
          st.settings.onboarded = true;
          st.settings.acceptedDisclaimer = data.accepted;
        }
      });
    }

    // Reads the controls of the current step into `data`.
    function collect() {
      const q = (sel) => card.querySelector(sel);
      switch (STEPS[step]) {
        case 'welcome': data.name = q('#ob-name').value.trim(); break;
        case 'goals': data.concerns = [...card.querySelectorAll('input[name=goal]:checked')].map((i) => i.value); break;
        case 'skin': data.skinType = card.querySelector('input[name=skinType]:checked')?.value || ''; break;
        case 'history':
          data.ageRange = q('#ob-age').value;
          data.pregnant = q('#ob-preg').checked;
          data.bleachingHistory = q('#ob-bleach').checked;
          data.bleachingProducts = [...card.querySelectorAll('input[name=bp]:checked')].map((i) => i.value);
          data.bleachingStopped = q('#ob-stopped').value;
          data.allergies = q('#ob-allergy').value.trim();
          data.bodyType = card.querySelector('input[name=bodyType]:checked')?.value || '';
          break;
        case 'reminders':
          data.remind = q('#ob-remind').checked;
          data.am = q('#ob-am').value || data.am;
          data.pm = q('#ob-pm').value || data.pm;
          break;
        case 'privacy':
          data.cloudScan = q('#ob-cloud').checked;
          data.accepted = q('#ob-accept').checked;
          break;
      }
    }

    function go(to, dir = 1) {
      step = to;
      const name = STEPS[step];
      card.className = 'ob-card';
      card.innerHTML = (ART[name] ? `<div class="ob-art">${art(ART[name])}</div>` : '') + views[name]();
      void card.offsetWidth;
      card.classList.add(dir > 0 ? 'in-right' : 'in-left');
      const pct = (Math.min(step, STEPS.length - 2) + (step === STEPS.length - 1 ? 1 : 0)) / (STEPS.length - 1);
      bar.firstElementChild.style.width = `${Math.round(pct * 100)}%`;
      bar.setAttribute('aria-valuenow', String(Math.min(step + 1, STEPS.length - 1)));
      root.querySelector('#ob-count').textContent = name === 'done' ? '' : `Step ${step + 1} of ${STEPS.length - 1}`;
      skipBtn.hidden = !['goals', 'skin', 'history', 'reminders'].includes(name);
      wireStep(name);
      const h = card.querySelector('#ob-h');
      h?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
    }

    function wireStep(name) {
      card.querySelector('#ob-back')?.addEventListener('click', () => {
        collect();
        go(step - 1, -1);
      });
      card.querySelector('#ob-next')?.addEventListener('click', () => {
        collect();
        const err = card.querySelector('#ob-err');
        if (name === 'skin' && !data.skinType) {
          err.textContent = 'Pick the closest match, or "Normal" if you are not sure.';
          card.querySelector('input[name=skinType]').focus();
          return;
        }
        if (name === 'privacy' && !data.accepted) {
          err.textContent = 'Please tick the box to continue.';
          card.querySelector('#ob-accept').focus();
          return;
        }
        if (name === 'privacy') {
          save(true);
          go(step + 1);
          return;
        }
        go(step + 1);
      });
      if (name === 'history') {
        const b = card.querySelector('#ob-bleach');
        b.addEventListener('change', () => (card.querySelector('#ob-bleach-more').hidden = !b.checked));
      }
      if (name === 'reminders') {
        const r = card.querySelector('#ob-remind');
        r.addEventListener('change', async () => {
          card.querySelector('#ob-times').hidden = !r.checked;
          if (r.checked && 'Notification' in window && Notification.permission === 'default') {
            try { await Notification.requestPermission(); } catch {}
          }
        });
      }
      if (name === 'welcome') card.querySelector('#ob-name').addEventListener('keydown', (e) => e.key === 'Enter' && card.querySelector('#ob-next').click());
      if (name === 'done') {
        burst(card.querySelector('#ob-burst'), 22);
        announce("You're all set. Your dashboard is ready.");
        card.querySelector('#ob-scan').addEventListener('click', () => navigate('analyze'));
        card.querySelector('#ob-dash').addEventListener('click', () => navigate('home'));
        skipBtn.hidden = true;
      }
    }

    skipBtn.addEventListener('click', () => {
      collect();
      go(step + 1);
    });

    go(0);
  },
};
