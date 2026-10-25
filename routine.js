import { store } from '../store.js';
import { esc, ul } from '../ui.js';
import { buildPlan } from '../recommend.js';
import { speak } from '../voice.js';

export default {
  title: 'My routine',
  render(root) {
    const s = store.get();
    if (!s.profile) {
      root.innerHTML = `<h1>My routine</h1><div class="card"><p>Fill in your skin profile first so we can personalize your routine.</p><a class="btn btn-primary" href="#/profile">Open skin profile</a></div>`;
      return;
    }
    const plan = buildPlan(s.profile, s.analyses.at(-1)?.result);
    const steps = (list) => `<ol class="routine">${list.map((x) => `<li><strong>${esc(x.step)}</strong><span>${esc(x.detail)}</span></li>`).join('')}</ol>`;
    const bp = plan.bleachingPlan;

    root.innerHTML = `
      <h1>My routine</h1>
      <p class="lead">Built for <strong>${esc(plan.skinType.toLowerCase())}</strong> skin${plan.concerns.length ? `, focusing on ${esc(plan.concerns.slice(0, 3).map((c) => c.label.toLowerCase()).join(', '))}` : ''}.</p>
      <div class="btn-row"><button type="button" class="btn btn-ghost" id="read">Read routine aloud</button><a class="btn btn-ghost" href="#/profile">Edit profile</a></div>

      ${plan.notes.length ? `<div class="callout" role="note">${ul(plan.notes)}</div>` : ''}

      <div class="grid-2">
        <section class="card" aria-labelledby="am-h"><h2 id="am-h">Morning</h2>${steps(plan.am)}</section>
        <section class="card" aria-labelledby="pm-h"><h2 id="pm-h">Evening</h2>${steps(plan.pm)}</section>
      </div>

      ${plan.weekly.length ? `<section class="card" aria-labelledby="wk-h"><h2 id="wk-h">Weekly</h2>${ul(plan.weekly)}</section>` : ''}

      ${
        bp
          ? `<section class="card card-accent" aria-labelledby="bp-h">
              <h2 id="bp-h">Soothing and barrier-repair plan</h2>
              <p>${esc(bp.intro)}</p>
              ${bp.personal.length ? `<div class="callout" role="note">${ul(bp.personal)}</div>` : ''}
              ${bp.phases.map((ph) => `<h3>${esc(ph.name)}</h3>${ul(ph.steps)}`).join('')}
              <div class="grid-2">
                <div><h3>Soothing ingredients</h3>${ul(bp.soothing, 'chips')}</div>
                <div><h3>Barrier-repair ingredients</h3>${ul(bp.barrier, 'chips')}</div>
              </div>
              <h3>See a dermatologist if you notice</h3>${ul(bp.warningSigns)}
            </section>`
          : ''
      }

      <section class="card" aria-labelledby="ki-h">
        <h2 id="ki-h">Key ingredients for you</h2>
        ${
          plan.keyIngredients.length
            ? `<ul class="ing-list">${plan.keyIngredients.map((k) => `<li><strong>${esc(k.name)}</strong> <span class="muted">for ${esc(k.reason.toLowerCase())}</span><br />${esc(k.benefit)}</li>`).join('')}</ul>`
            : '<p>Keep it simple: a gentle cleanser, moisturizer and daily sunscreen.</p>'
        }
        ${plan.avoid.length ? `<h3>Avoid for now</h3>${ul(plan.avoid, 'chips chips-warn')}` : ''}
      </section>

      ${
        plan.concerns.length
          ? `<section class="card" aria-labelledby="tips-h"><h2 id="tips-h">Tips for your concerns</h2>
              ${plan.concerns.map((c) => `<h3>${esc(c.label)}</h3>${ul(c.tips)}`).join('')}</section>`
          : ''
      }

      ${plan.body.length ? `<section class="card" aria-labelledby="body-h"><h2 id="body-h">Body care</h2>${ul(plan.body)}</section>` : ''}

      <p class="small muted">Patch-test new products on your inner arm or behind the ear for 2 to 3 days. Introduce one new product at a time, about two weeks apart.</p>
    `;

    root.querySelector('#read').addEventListener('click', () => {
      const t = `Morning. ${plan.am.map((x) => `${x.step}: ${x.detail}`).join('. ')}. Evening. ${plan.pm.map((x) => `${x.step}: ${x.detail}`).join('. ')}.`;
      speak(t, { rate: s.settings.rate });
    });
  },
};
