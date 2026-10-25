import { store, uid } from '../store.js';
import { esc, ul, fmtDate, readForm, toast, announce } from '../ui.js';
import { COMPLAINTS } from '../data/knowledge.js';
import { followUpDate, followUpAdvice } from '../reminders.js';
import { speak } from '../voice.js';

function solutionHTML(c) {
  const kb = COMPLAINTS[c.category];
  return `
    ${kb.urgent ? '<div class="callout callout-danger" role="alert"><strong>If your lips, tongue, eyes or throat are swelling, or you have trouble breathing, call emergency services now.</strong></div>' : ''}
    <h3>What to try</h3>${ul(kb.steps)}
    <h3>See a doctor if</h3>${ul(kb.redFlags)}`;
}

export default {
  title: 'Complaints',
  render(root) {
    const draw = (focusId) => {
      const s = store.get();
      const active = s.complaints.filter((c) => !c.resolved).reverse();
      const resolved = s.complaints.filter((c) => c.resolved).reverse();
      const now = new Date();

      root.innerHTML = `
        <h1>Complaints</h1>
        <p class="lead">Log a skin problem to get self-care steps. DermaLogic will check in with you to see how it is going.</p>

        <form id="c-form" class="card form" aria-labelledby="new-h">
          <h2 id="new-h">Log a complaint</h2>
          <div class="field">
            <label for="category">What is happening?</label>
            <select id="category" name="category" required>
              ${Object.entries(COMPLAINTS).map(([k, c]) => `<option value="${k}">${esc(c.label)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="area">Where? <span class="muted">(e.g. cheeks, forehead, neck)</span></label>
            <input id="area" name="area" />
          </div>
          <div class="field">
            <label for="severity">How bad is it? <output id="sev-out" for="severity">3</output> out of 5</label>
            <input type="range" id="severity" name="severity" min="1" max="5" value="3" aria-describedby="sev-hint" />
            <p class="hint" id="sev-hint">1 is barely noticeable, 5 is severe.</p>
          </div>
          <div class="field">
            <label for="since">When did it start?</label>
            <input type="date" id="since" name="since" />
          </div>
          <div class="field">
            <label for="trigger">Anything new? <span class="muted">(product, food, detergent, stress)</span></label>
            <input id="trigger" name="trigger" />
          </div>
          <div class="field">
            <label for="notes">Notes</label>
            <textarea id="notes" name="notes" rows="2"></textarea>
          </div>
          <button class="btn btn-primary" type="submit">Get solutions</button>
        </form>

        <section aria-labelledby="active-h">
          <h2 id="active-h">Active (${active.length})</h2>
          ${active.length ? '' : '<p class="muted">Nothing logged right now.</p>'}
          ${active
            .map((c) => {
              const due = c.nextFollowUp && new Date(c.nextFollowUp) <= now;
              return `<article class="card ${due ? 'card-warn' : ''}" id="c-${c.id}" aria-labelledby="ct-${c.id}">
                <h3 id="ct-${c.id}" tabindex="-1">${esc(c.label)}${c.area ? ` · ${esc(c.area)}` : ''}</h3>
                <p class="small muted">Logged ${fmtDate(c.createdAt)} · severity ${esc(c.severity)}/5${c.trigger ? ` · possible trigger: ${esc(c.trigger)}` : ''}</p>
                ${c.lastAdvice ? `<div class="callout ${c.escalate ? 'callout-danger' : ''}" role="note">${esc(c.lastAdvice)}</div>` : ''}
                <details ${c.followUps?.length ? '' : 'open'}><summary>Solutions</summary>${solutionHTML(c)}</details>
                <fieldset class="followup">
                  <legend>${due ? '<strong>Follow-up due:</strong> ' : ''}How is it now?</legend>
                  <div class="btn-row">
                    <button type="button" class="btn btn-small" data-fu="better" data-id="${c.id}">Better</button>
                    <button type="button" class="btn btn-small" data-fu="same" data-id="${c.id}">About the same</button>
                    <button type="button" class="btn btn-small" data-fu="worse" data-id="${c.id}">Worse</button>
                    <button type="button" class="btn btn-small btn-ghost" data-fu="resolved" data-id="${c.id}">Gone</button>
                  </div>
                  ${c.nextFollowUp ? `<p class="small muted">Next check-in: ${fmtDate(c.nextFollowUp)}</p>` : ''}
                </fieldset>
                ${c.followUps?.length ? `<details><summary>History (${c.followUps.length})</summary><ul>${c.followUps.map((f) => `<li>${fmtDate(f.at)}: ${esc(f.answer)}</li>`).join('')}</ul></details>` : ''}
              </article>`;
            })
            .join('')}
        </section>

        ${
          resolved.length
            ? `<section aria-labelledby="res-h"><h2 id="res-h">Resolved</h2><ul>${resolved
                .map((c) => `<li>${esc(c.label)} · ${fmtDate(c.createdAt)} to ${fmtDate(c.resolvedAt)}</li>`)
                .join('')}</ul></section>`
            : ''
        }
      `;

      const form = root.querySelector('#c-form');
      const sev = form.querySelector('#severity');
      sev.addEventListener('input', () => (form.querySelector('#sev-out').textContent = sev.value));
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const d = readForm(form);
        const kb = COMPLAINTS[d.category];
        const now = new Date().toISOString();
        const c = {
          id: uid(),
          ...d,
          label: kb.label,
          createdAt: now,
          nextFollowUp: followUpDate(now, kb.urgent ? 1 : 3),
          followUps: [],
          resolved: false,
        };
        store.update((s) => s.complaints.push(c));
        toast('Complaint logged. We will check in with you in a few days.');
        draw(c.id);
        const st = store.get().settings;
        if (st.speak) speak(`For ${kb.label}. ${kb.steps.join(' ')}`, { rate: st.rate });
      });

      root.querySelectorAll('[data-fu]').forEach((btn) =>
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          const answer = btn.dataset.fu;
          let advice;
          store.update((s) => {
            const c = s.complaints.find((x) => x.id === id);
            advice = followUpAdvice(answer, c);
            c.followUps = [...(c.followUps || []), { at: new Date().toISOString(), answer }];
            c.lastAdvice = advice.text;
            c.escalate = !!advice.escalate;
            if (advice.resolve) {
              c.resolved = true;
              c.resolvedAt = new Date().toISOString();
            } else c.nextFollowUp = followUpDate(new Date().toISOString(), advice.nextDays);
          });
          announce(advice.text, !!advice.escalate);
          const st = store.get().settings;
          if (st.speak) speak(advice.text, { rate: st.rate });
          draw(advice.resolve ? null : id);
        })
      );

      if (focusId) root.querySelector(`#ct-${focusId}`)?.focus();
    };
    draw();
  },
};
