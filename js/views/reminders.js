import { store, today } from '../store.js';
import { buildPlan } from '../recommend.js';
import { icon } from '../icons.js';
import { esc, toast, readForm, fmtDate } from '../ui.js';

// Today's schedule from the reminder settings, sorted into tabs.
export function todaySchedule(s, now = new Date()) {
  const r = s.reminders;
  const log = s.routineLog[today(now)] || { am: [], pm: [] };
  const plan = s.profile ? buildPlan(s.profile, s.analyses.at(-1)?.result) : null;
  const mins = now.getHours() * 60 + now.getMinutes();
  const toMin = (t) => {
    const [h, m] = String(t || '').split(':').map(Number);
    return Number.isFinite(h) ? h * 60 + (m || 0) : 0;
  };
  const rows = [
    { id: 'am', title: 'Morning routine', time: r.am, ic: 'drop', href: '#/home', done: !!plan && (log.am?.length || 0) >= plan.am.length },
    { id: 'pm', title: 'Evening routine', time: r.pm, ic: 'moon', href: '#/home', done: !!plan && (log.pm?.length || 0) >= plan.pm.length },
    { id: 'ls', title: 'Daily check-in', time: r.lifestyle, ic: 'heart', href: '#/lifestyle', done: !!s.lifestyle[today(now)] },
  ];
  if (r.sunscreen) for (const t of ['11:00', '13:00', '15:00']) rows.push({ id: 'spf' + t, title: 'Sunscreen top-up', time: t, ic: 'sparkle', href: '#/home', done: mins > toMin(t) + 120 });
  return rows
    .map((x) => ({ ...x, state: x.done ? 'complete' : mins >= toMin(x.time) ? 'due' : 'upcoming' }))
    .sort((a, b) => toMin(a.time) - toMin(b.time));
}

export default {
  title: 'Reminders',
  render(root) {
    let activeTab = 'due';
    const draw = () => {
      const r = store.get().reminders;
      const perm = 'Notification' in window ? Notification.permission : 'unsupported';
      const followUps = store.get().complaints.filter((c) => !c.resolved && c.nextFollowUp);
      root.innerHTML = `
        <h1>Reminders</h1>
        <p class="lead">Daily nudges for your routine and check-ins. Reminders fire while DermaLogic is open in a tab or installed as an app.</p>
        ${(() => {
          const rows = todaySchedule(store.get());
          const tab = (id, label) => `<button type="button" role="tab" class="rt-tab" id="rt-${id}" aria-controls="rt-panel" aria-selected="${id === activeTab}" data-tab="${id}">${label} <span class="rt-n">${rows.filter((x) => x.state === id).length}</span></button>`;
          const list = rows.filter((x) => x.state === activeTab);
          return `<section class="card rt" aria-labelledby="rt-h"><h2 id="rt-h">Today</h2>
            <div class="rt-tabs" role="tablist" aria-label="Reminder status">${tab('upcoming', 'Upcoming')}${tab('due', 'Due')}${tab('complete', 'Complete')}</div>
            <div id="rt-panel" role="tabpanel" aria-labelledby="rt-${activeTab}"><ul class="rt-list">
              ${list.length ? list.map((x) => `<li><a class="rt-row rt-${x.state}" href="${x.href}"><span class="rt-ic">${icon(x.ic, { size: 22 })}</span><span class="rt-text"><strong>${x.title}</strong><small>${x.time} · ${x.state === 'complete' ? 'Done' : x.state === 'due' ? 'Due now' : 'Later today'}</small></span>${icon('arrow', { size: 18 })}</a></li>`).join('') : `<li class="muted rt-empty">${activeTab === 'due' ? 'Nothing due. You are on track.' : activeTab === 'complete' ? 'Nothing completed yet today.' : 'No more reminders today.'}</li>`}
            </ul></div></section>`;
        })()}
        <form id="r-form" class="card form">
          <label class="check"><input type="checkbox" name="enabled" ${r.enabled ? 'checked' : ''} /> <span><strong>Turn on daily reminders</strong></span></label>
          <div class="grid-2">
            <div class="field"><label for="am">Morning routine</label><input type="time" id="am" name="am" value="${esc(r.am)}" /></div>
            <div class="field"><label for="pm">Evening routine</label><input type="time" id="pm" name="pm" value="${esc(r.pm)}" /></div>
            <div class="field"><label for="ls">Daily check-in (lifestyle and photo)</label><input type="time" id="ls" name="lifestyle" value="${esc(r.lifestyle)}" /></div>
          </div>
          <label class="check"><input type="checkbox" name="sunscreen" ${r.sunscreen ? 'checked' : ''} /> <span>Sunscreen top-up reminders at 11:00, 13:00 and 15:00</span></label>
          <p class="small muted">System notifications: ${
            perm === 'granted' ? 'allowed.' : perm === 'denied' ? 'blocked in your browser settings. You will still see in-app alerts.' : perm === 'unsupported' ? 'not supported here. You will see in-app alerts.' : 'not yet allowed.'
          }</p>
          <div class="btn-row">
            <button class="btn btn-primary" type="submit">Save reminders</button>
            ${perm === 'default' ? '<button type="button" class="btn" id="perm">Allow notifications</button>' : ''}
            <button type="button" class="btn btn-ghost" id="test">Send a test reminder</button>
          </div>
        </form>

        <section class="card" aria-labelledby="fu-h">
          <h2 id="fu-h">Upcoming follow-ups</h2>
          ${followUps.length ? `<ul>${followUps.map((c) => `<li>${esc(c.label)}: ${fmtDate(c.nextFollowUp)}</li>`).join('')}</ul>` : '<p class="muted">No follow-ups scheduled. Log a complaint to get check-ins.</p>'}
        </section>`;

      root.querySelectorAll('.rt-tab').forEach((t) => t.addEventListener('click', () => { activeTab = t.dataset.tab; draw(); root.querySelector('.rt-tab[aria-selected=true]')?.focus(); }));
      root.querySelector('#r-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const d = readForm(e.currentTarget);
        store.update((s) => (s.reminders = { ...s.reminders, ...d }));
        if (d.enabled && 'Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
        toast(d.enabled ? 'Reminders saved and turned on.' : 'Reminders saved. They are turned off.');
        draw();
      });
      root.querySelector('#perm')?.addEventListener('click', async () => {
        await Notification.requestPermission();
        draw();
      });
      root.querySelector('#test').addEventListener('click', () => {
        if ('Notification' in window && Notification.permission === 'granted') new Notification('DermaLogic', { body: 'This is how your reminders will look.', icon: 'assets/icon.svg' });
        toast('Test reminder: this is how your reminders will look.');
      });
    };
    draw();
  },
};
