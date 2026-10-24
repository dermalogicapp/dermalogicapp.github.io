import { store, today } from '../store.js';
import { esc, fmtDate, announce } from '../ui.js';
import { buildPlan } from '../recommend.js';
import { dueFollowUps } from '../reminders.js';
import { lastNDays } from '../lifestyle.js';
import { dropletIcon } from '../icon.js';

export function streak(routineLog, plan) {
  let n = 0;
  const days = lastNDays(365).reverse();
  for (const [i, d] of days.entries()) {
    const log = routineLog[d];
    const done = log && (log.am?.length || 0) >= plan.am.length && (log.pm?.length || 0) >= plan.pm.length;
    if (done) n++;
    else if (i === 0) continue; // today may still be in progress
    else break;
  }
  return n;
}

export default {
  title: 'Today',
  render(root) {
    const s = store.get();
    const date = today();
    const name = s.profile?.name ? `, ${esc(s.profile.name)}` : '';
    const plan = s.profile ? buildPlan(s.profile, s.analyses.at(-1)?.result) : null;
    const log = s.routineLog[date] || { am: [], pm: [] };
    const due = dueFollowUps(s.complaints);
    const loggedLifestyle = !!s.lifestyle[date];
    const last = s.analyses.at(-1);

    const checklist = (key, steps, heading) => `
      <fieldset class="checklist">
        <legend>${heading}</legend>
        ${steps
          .map(
            (st, i) => `<label class="check">
              <input type="checkbox" data-part="${key}" value="${i}" ${log[key]?.includes(i) ? 'checked' : ''} />
              <span><strong>${esc(st.step)}</strong> <span class="muted">${esc(st.detail)}</span></span>
            </label>`
          )
          .join('')}
      </fieldset>`;

    root.innerHTML = `
      <section class="hero" aria-labelledby="hero-h">
        <div>
          <h1 id="hero-h">Good to see you${name}</h1>
          <p>${fmtDate(new Date().toISOString(), { dateStyle: 'full' })}</p>
          <p>Care that understands your skin.</p>
        </div>
        ${dropletIcon({ variant: 'banner' })}
      </section>

      ${
        !s.profile
          ? `<section class="card card-accent" aria-labelledby="start-h">
              <h2 id="start-h">Get started</h2>
              <ol class="steps">
                <li><a href="#/profile">Fill in your skin profile</a> (2 minutes)</li>
                <li><a href="#/analyze">Do a face scan</a>, processed privately on this device</li>
                <li><a href="#/routine">Get your personalized routine</a></li>
              </ol>
            </section>`
          : ''
      }

      ${
        due.length
          ? `<section class="card card-warn" aria-labelledby="fu-h">
              <h2 id="fu-h">Follow-ups due</h2>
              <ul>${due.map((c) => `<li>${esc(c.label)} logged ${fmtDate(c.createdAt)}</li>`).join('')}</ul>
              <a class="btn" href="#/complaints">Answer follow-ups</a>
            </section>`
          : ''
      }

      ${
        plan
          ? `<section class="card" aria-labelledby="today-h">
              <h2 id="today-h">Today's routine</h2>
              <p class="muted">Tick each step as you do it. <span id="streak">${streak(s.routineLog, plan)}</span>-day streak.</p>
              <div class="grid-2">
                ${checklist('am', plan.am, 'Morning')}
                ${checklist('pm', plan.pm, 'Evening')}
              </div>
            </section>`
          : ''
      }

      <div class="grid-2">
        <section class="card" aria-labelledby="scan-h">
          <h2 id="scan-h">Last face scan</h2>
          ${
            last
              ? `<p>${fmtDate(last.date)}: ${esc(last.result.tone.category)} tone, ${esc(last.result.tone.undertone.toLowerCase())} undertone.</p>
                 <a href="#/analyze">Scan again</a>`
              : `<p>No scan yet.</p><a class="btn" href="#/analyze">Start a scan</a>`
          }
        </section>
        <section class="card" aria-labelledby="ls-h">
          <h2 id="ls-h">Daily check-in</h2>
          ${loggedLifestyle ? '<p>You have logged today. Nice work.</p><a href="#/lifestyle">Edit today\'s log</a>' : '<p>Log your sleep, food, exercise and how your skin feels.</p><a class="btn" href="#/lifestyle">Log today</a>'}
        </section>
        <section class="card" aria-labelledby="pp-h">
          <h2 id="pp-h">Progress photo</h2>
          <p>Take a photo in the same spot and light each day to compare over time.</p>
          <a href="#/progress">Open progress photos</a>
        </section>
        <section class="card" aria-labelledby="as-h">
          <h2 id="as-h">Ask the assistant</h2>
          <p>Use the <strong>Ask by voice</strong> button at the top (or press Alt+V) from any page, or type in the <a href="#/chat">Assistant</a>.</p>
        </section>
      </div>
    `;

    root.addEventListener('change', (e) => {
      const cb = e.target.closest('input[data-part]');
      if (!cb) return;
      const part = cb.dataset.part;
      const idx = Number(cb.value);
      store.update((st) => {
        const l = (st.routineLog[date] ||= { am: [], pm: [] });
        l[part] = cb.checked ? [...new Set([...(l[part] || []), idx])] : (l[part] || []).filter((x) => x !== idx);
      });
      const el = root.querySelector('#streak');
      if (el && plan) el.textContent = streak(store.get().routineLog, plan);
      const l = store.get().routineLog[date];
      if (plan && l[part].length === plan[part].length) announce(`${part === 'am' ? 'Morning' : 'Evening'} routine complete. Well done.`);
    });
  },
};
