import { store, today } from '../store.js';
import { esc, readForm, toast, fmtDate } from '../ui.js';
import { FOOD_TAGS, EXERCISE_TYPES, lifestyleInsights, lastNDays } from '../lifestyle.js';

function barChart(days, entries, key, max, label, unit) {
  const w = 28, gap = 8, h = 120;
  const width = days.length * (w + gap);
  const bars = days
    .map((d, i) => {
      const v = Number(entries[d]?.[key]) || 0;
      const bh = Math.round((Math.min(v, max) / max) * h);
      return `<g><rect x="${i * (w + gap)}" y="${h - bh}" width="${w}" height="${bh}" rx="4" class="bar"></rect>
        <text x="${i * (w + gap) + w / 2}" y="${h + 14}" text-anchor="middle" class="axis">${d.slice(8)}</text>
        ${v ? `<text x="${i * (w + gap) + w / 2}" y="${h - bh - 4}" text-anchor="middle" class="val">${v}</text>` : ''}</g>`;
    })
    .join('');
  return `<figure class="chart"><svg viewBox="0 -14 ${width} ${h + 32}" role="img" aria-label="${esc(label)} over the last ${days.length} days. Details in the table below." preserveAspectRatio="xMinYMid meet">${bars}</svg><figcaption>${esc(label)} (${esc(unit)}) by day of month</figcaption></figure>`;
}

export default {
  title: 'Lifestyle',
  render(root) {
    const draw = (date = today()) => {
      const s = store.get();
      const e = s.lifestyle[date] || {};
      const days = lastNDays(14);
      const ins = lifestyleInsights(s.lifestyle);
      const num = (name, label, attrs, hint = '') =>
        `<div class="field"><label for="${name}">${label}</label><input type="number" inputmode="decimal" id="${name}" name="${name}" value="${esc(e[name] ?? '')}" ${attrs} ${hint ? `aria-describedby="${name}-hint"` : ''} />${hint ? `<p class="hint" id="${name}-hint">${hint}</p>` : ''}</div>`;
      const scale = (name, label, low, high) => `<fieldset class="scale"><legend>${label}</legend><div class="options inline">${[1, 2, 3, 4, 5]
        .map((n) => `<label class="check"><input type="radio" name="${name}" value="${n}" ${String(e[name]) === String(n) ? 'checked' : ''} /> <span>${n}${n === 1 ? ` · ${low}` : n === 5 ? ` · ${high}` : ''}</span></label>`)
        .join('')}</div></fieldset>`;

      root.innerHTML = `
        <h1>Lifestyle</h1>
        <p class="lead">Log food, exercise, sleep and how your skin feels. After a week, DermaLogic looks for patterns in your own data.</p>

        <form id="l-form" class="card form" aria-labelledby="log-h">
          <h2 id="log-h">Daily log</h2>
          <div class="field"><label for="date">Date</label><input type="date" id="date" name="date" value="${date}" max="${today()}" /></div>
          <h3>Sleep</h3>
          <div class="grid-2">
            ${num('sleepHours', 'Hours slept', 'min="0" max="24" step="0.5"')}
            ${scale('sleepQuality', 'Sleep quality', 'poor', 'great')}
          </div>
          <h3>Food and drink</h3>
          ${num('waterGlasses', 'Glasses of water', 'min="0" max="30" step="1"')}
          <fieldset><legend>What did you have today? <span class="muted">(choose any)</span></legend>
            <div class="options cols-2">${Object.entries(FOOD_TAGS).map(([k, l]) => `<label class="check"><input type="checkbox" data-multi name="foods" value="${k}" ${(e.foods || []).includes(k) ? 'checked' : ''} /> <span>${esc(l)}</span></label>`).join('')}</div>
          </fieldset>
          <div class="field"><label for="meals">Meals <span class="muted">(optional)</span></label><textarea id="meals" name="meals" rows="2">${esc(e.meals || '')}</textarea></div>
          <h3>Exercise</h3>
          <div class="grid-2">
            ${num('exerciseMin', 'Minutes of exercise', 'min="0" max="600" step="5"')}
            <div class="field"><label for="exerciseType">Type</label><select id="exerciseType" name="exerciseType">${EXERCISE_TYPES.map((t) => `<option ${e.exerciseType === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
          </div>
          <h3>Wellbeing and skin</h3>
          ${scale('stress', 'Stress level', 'calm', 'very stressed')}
          ${scale('skinRating', 'How does your skin look and feel today?', 'very bad', 'great')}
          <div class="field"><label for="lnotes">Notes</label><textarea id="lnotes" name="notes" rows="2">${esc(e.notes || '')}</textarea></div>
          <button class="btn btn-primary" type="submit">Save log</button>
        </form>

        <section class="card" aria-labelledby="ins-h">
          <h2 id="ins-h">Your patterns</h2>
          ${
            !ins.ready
              ? `<p>Log at least ${ins.needed} days that include a skin rating to see patterns. You have ${ins.daysLogged} so far.</p>`
              : ins.insights.length
                ? `<ul>${ins.insights.map((i) => `<li>${esc(i.text)}</li>`).join('')}</ul><p class="small muted">These are patterns in your own logs, not proof of cause. Try changing one thing for two weeks and see if it holds.</p>`
                : '<p>No strong patterns yet. Keep logging; patterns become clearer over a few weeks.</p>'
          }
        </section>

        <section class="card" aria-labelledby="chart-h">
          <h2 id="chart-h">Last 14 days</h2>
          <div class="grid-2">
            ${barChart(days, s.lifestyle, 'sleepHours', 10, 'Sleep', 'hours')}
            ${barChart(days, s.lifestyle, 'skinRating', 5, 'Skin rating', '1 to 5')}
            ${barChart(days, s.lifestyle, 'waterGlasses', 12, 'Water', 'glasses')}
            ${barChart(days, s.lifestyle, 'exerciseMin', 90, 'Exercise', 'minutes')}
          </div>
          <details><summary>Show as a table</summary>
            <table class="table"><caption class="sr-only">Lifestyle logs for the last 14 days</caption>
              <thead><tr><th scope="col">Date</th><th scope="col">Sleep (h)</th><th scope="col">Water</th><th scope="col">Exercise (min)</th><th scope="col">Stress</th><th scope="col">Skin</th></tr></thead>
              <tbody>${days
                .map((d) => {
                  const x = s.lifestyle[d] || {};
                  return `<tr><th scope="row">${fmtDate(d)}</th><td>${esc(x.sleepHours ?? '–')}</td><td>${esc(x.waterGlasses ?? '–')}</td><td>${esc(x.exerciseMin ?? '–')}</td><td>${esc(x.stress ?? '–')}</td><td>${esc(x.skinRating ?? '–')}</td></tr>`;
                })
                .join('')}</tbody>
            </table>
          </details>
        </section>`;

      const form = root.querySelector('#l-form');
      form.querySelector('#date').addEventListener('change', (ev) => draw(ev.target.value || today()));
      form.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const d = readForm(form);
        const key = d.date || today();
        delete d.date;
        store.update((st) => (st.lifestyle[key] = { ...(st.lifestyle[key] || {}), ...d, savedAt: new Date().toISOString() }));
        toast(`Saved your log for ${fmtDate(key)}.`);
        draw(key);
        root.querySelector('#ins-h').focus?.();
      });
    };
    draw();
  },
};
