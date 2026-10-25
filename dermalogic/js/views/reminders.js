import { store } from '../store.js';
import { esc, toast, readForm, fmtDate } from '../ui.js';

export default {
  title: 'Reminders',
  render(root) {
    const draw = () => {
      const r = store.get().reminders;
      const perm = 'Notification' in window ? Notification.permission : 'unsupported';
      const followUps = store.get().complaints.filter((c) => !c.resolved && c.nextFollowUp);
      root.innerHTML = `
        <h1>Reminders</h1>
        <p class="lead">Daily nudges for your routine and check-ins. Reminders fire while DermaLogic is open in a tab or installed as an app.</p>
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
