import { store, today } from '../store.js';
import { esc, fmtDate, announce, levelBadge } from '../ui.js';
import { buildPlan } from '../recommend.js';
import { dueFollowUps } from '../reminders.js';
import { lastNDays } from '../lifestyle.js';
import { dropletIcon } from '../icon.js';
import { icon } from '../icons.js';
import { ring, animateRings, revealOnScroll } from '../fx.js';
import { skinScore, scoreTrend, greeting, nextAction } from '../score.js';

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

const CONCERN_ORDER = ['redness', 'hyperpigmentation', 'oiliness', 'acne', 'darkCircles', 'dryness', 'texture'];

export default {
  title: 'Dashboard',
  render(root) {
    const s = store.get();
    const date = today();
    const name = s.profile?.name ? `, ${esc(s.profile.name)}` : '';
    const plan = s.profile ? buildPlan(s.profile, s.analyses.at(-1)?.result) : null;
    const log = s.routineLog[date] || { am: [], pm: [] };
    const due = dueFollowUps(s.complaints);
    const loggedLifestyle = !!s.lifestyle[date];
    const last = s.analyses.at(-1);
    const prev = s.analyses.at(-2);

    const planTotal = plan ? plan.am.length + plan.pm.length : 0;
    const planDone = plan ? Math.min(plan.am.length, log.am?.length || 0) + Math.min(plan.pm.length, log.pm?.length || 0) : 0;
    const routinePct = planTotal ? Math.round((planDone / planTotal) * 100) : 0;
    const days = plan ? streak(s.routineLog, plan) : 0;
    const score = last ? skinScore(last.result) : null;
    const trend = scoreTrend(prev ? skinScore(prev.result) : null, score);
    const next = nextAction({ profile: s.profile, analyses: s.analyses, dueFollowUps: due.length, planDone, planTotal, lifestyleLogged: loggedLifestyle });

    // Last 7 days of routine completion for the activity strip.
    const week = lastNDays(7).map((d) => {
      const l = s.routineLog[d];
      const done = !!(plan && l && (l.am?.length || 0) >= plan.am.length && (l.pm?.length || 0) >= plan.pm.length);
      const some = !!(l && ((l.am?.length || 0) + (l.pm?.length || 0)) > 0);
      return { d, done, some, label: new Date(d + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short' }) };
    });

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

    const concerns = last
      ? CONCERN_ORDER.filter((k) => last.result.concerns[k])
          .map((k) => last.result.concerns[k])
          .map(
            (c) => `<li><span class="sn-label">${esc(c.label)}</span>
              <span class="meter meter-anim" role="img" aria-label="${esc(c.label)}: ${c.score} out of 100, ${c.level}"><span data-w="${Math.max(3, c.score)}%" class="lvl-${c.level}"></span></span>
              ${levelBadge(c.level)}</li>`
          )
          .join('')
      : '';

    root.innerHTML = `
      <section class="hero dash-hero" aria-labelledby="hero-h">
        <div>
          <h1 id="hero-h">${greeting()}${name}</h1>
          <p>${fmtDate(new Date().toISOString(), { dateStyle: 'full' })}</p>
          <a class="hero-next" href="#/${next.route}" ${next.anchor ? `data-anchor="${next.anchor}"` : ''}>
            <span class="hero-next-ic">${icon('sparkle', { size: 20 })}</span>
            <span><strong>${esc(next.label)}</strong><small>${esc(next.why)}</small></span>
            ${icon('arrow', { size: 20 })}
          </a>
        </div>
        ${dropletIcon({ variant: 'banner' })}
      </section>

      ${
        due.length
          ? `<section class="card card-warn reveal" aria-labelledby="fu-h">
              <h2 id="fu-h">Follow-ups due</h2>
              <ul>${due.map((c) => `<li>${esc(c.label)} logged ${fmtDate(c.createdAt)}</li>`).join('')}</ul>
              <a class="btn" href="#/complaints">Answer follow-ups</a>
            </section>`
          : ''
      }

      <section class="stat-grid" aria-label="Your numbers">
        <div class="stat-card reveal">
          ${ring({ pct: routinePct, label: "Today's routine", sub: '%' })}
          <div><h2 class="stat-h">Today's routine</h2><p class="muted small">${planTotal ? `${planDone} of ${planTotal} steps done` : 'Set up a profile to get one'}</p></div>
        </div>
        <div class="stat-card reveal" data-delay="80">
          ${ring({ pct: score ?? 0, label: 'Skin score', sub: score == null ? 'no scan' : '/100' })}
          <div><h2 class="stat-h">Skin score</h2>
            <p class="muted small trend trend-${trend.dir}">${score == null ? 'Scan to get yours' : `${icon(trend.dir === 'flat' ? 'flat' : trend.dir, { size: 14 })} ${esc(trend.text)}`}</p></div>
        </div>
        <div class="stat-card reveal" data-delay="160">
          <div class="streak-badge">${icon('flame', { size: 30 })}<strong>${days}</strong></div>
          <div><h2 class="stat-h">Day streak</h2><p class="muted small">${days ? 'Keep it going' : 'Finish a full day to start one'}</p></div>
        </div>
        <div class="stat-card reveal" data-delay="240">
          <div class="streak-badge ${loggedLifestyle ? 'ok' : ''}">${icon(loggedLifestyle ? 'check' : 'moon', { size: 30 })}</div>
          <div><h2 class="stat-h">Daily check-in</h2><p class="muted small">${loggedLifestyle ? 'Logged today' : 'Not logged yet'}</p></div>
        </div>
      </section>

      <section class="card reveal" aria-labelledby="wk-h">
        <h2 id="wk-h">Your week</h2>
        <ul class="week">
          ${week.map((w) => `<li class="${w.done ? 'done' : w.some ? 'some' : ''}"><span class="dot">${w.done ? icon('check', { size: 16 }) : ''}</span><span>${w.label}</span><span class="sr-only">${w.done ? 'routine complete' : w.some ? 'partly done' : 'nothing logged'}</span></li>`).join('')}
        </ul>
      </section>

      ${
        plan
          ? `<section class="card reveal" aria-labelledby="today-h">
              <h2 id="today-h" tabindex="-1">Today's routine</h2>
              <p class="muted">Tick each step as you do it. <span id="streak">${days}</span>-day streak.</p>
              <div class="grid-2">
                ${checklist('am', plan.am, 'Morning')}
                ${checklist('pm', plan.pm, 'Evening')}
              </div>
            </section>`
          : `<section class="card card-accent reveal" aria-labelledby="start-h">
              <h2 id="start-h">Get started</h2>
              <ol class="steps">
                <li><a href="#/profile">Fill in your skin profile</a> (2 minutes)</li>
                <li><a href="#/analyze">Do a face scan</a></li>
                <li><a href="#/routine">Get your personalized routine</a></li>
              </ol>
            </section>`
      }

      <div class="grid-2">
        <section class="card reveal" aria-labelledby="scan-h">
          <h2 id="scan-h">Skin snapshot</h2>
          ${
            last
              ? `<p class="small muted">${fmtDate(last.date)} · ${esc(last.result.tone.category)} tone, ${esc(last.result.tone.undertone.toLowerCase())} undertone ·
                  <span class="engine-pill">${last.result.engine === 'youcam' ? 'YouCam AI' : 'On device'}</span></p>
                 <ul class="snapshot">${concerns}</ul>
                 <a class="btn btn-small" href="#/analyze">Scan again</a>`
              : `<div class="empty">${dropletIcon({ size: 56 })}<p>No scan yet. Your results will appear here.</p><a class="btn btn-primary" href="#/analyze">Start a scan</a></div>`
          }
        </section>
        <section class="card reveal" data-delay="100" aria-labelledby="qa-h">
          <h2 id="qa-h">Quick actions</h2>
          <ul class="quick">
            <li><a href="#/analyze">${icon('scan')}<span>Face scan</span></a></li>
            <li><a href="#/progress">${icon('camera')}<span>Progress photo</span></a></li>
            <li><a href="#/complaints">${icon('heart')}<span>Log a complaint</span></a></li>
            <li><a href="#/ingredients">${icon('flask')}<span>Check a product</span></a></li>
            <li><a href="#/lifestyle">${icon('moon')}<span>Daily check-in</span></a></li>
            <li><a href="#/chat">${icon('chat')}<span>Ask the assistant</span></a></li>
          </ul>
          <p class="small muted">Tip: press <kbd>Alt</kbd>+<kbd>V</kbd> anywhere to ask by voice.</p>
        </section>
      </div>
    `;

    animateRings(root);
    const stopReveal = revealOnScroll(root);

    root.querySelector('.hero-next')?.addEventListener('click', (e) => {
      const a = e.currentTarget.dataset.anchor;
      if (a && next.route === 'home') {
        e.preventDefault();
        const t = root.querySelector('#' + a);
        t?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        t?.focus({ preventScroll: true });
      }
    });

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
      // Refresh the progress ring in place.
      const done = Math.min(plan.am.length, l.am?.length || 0) + Math.min(plan.pm.length, l.pm?.length || 0);
      const pct = Math.round((done / planTotal) * 100);
      const r = root.querySelector('.stat-card .ring');
      if (r) {
        const bar = r.querySelector('.ring-bar');
        bar.style.strokeDashoffset = String(Number(bar.dataset.c) * (1 - pct / 100));
        r.querySelector('strong').textContent = pct;
        r.setAttribute('aria-label', `Today's routine: ${pct} percent`);
        r.nextElementSibling.querySelector('p').textContent = `${done} of ${planTotal} steps done`;
      }
    });
    return () => stopReveal();
  },
};
