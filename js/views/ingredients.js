import { store, uid } from '../store.js';
import { esc, ul, readForm, toast, fmtDate } from '../ui.js';
import { OUTCOMES, explainProduct, crossProductInsights, lookupIngredient } from '../ingredients.js';
import { ingredientText } from '../chatbot.js';
import { speak } from '../voice.js';

const PRODUCT_TYPES = ['Cleanser', 'Toner', 'Serum', 'Moisturizer', 'Sunscreen', 'Treatment / spot', 'Mask', 'Body lotion', 'Lightening cream', 'Other'];
const BAND = { high: 'high amount', medium: 'medium amount', low: 'small amount' };

function explanationHTML(p, ex) {
  const verdictTitle = p.outcome === 'worked' ? 'Why it probably worked' : 'Why it may not have worked';
  return `
    <h4>${verdictTitle}</h4>
    ${p.outcome === 'worked' ? ul(ex.good) : ul(ex.reasons)}
    ${ex.watch.length ? `<div class="callout callout-danger" role="note"><strong>Watch out:</strong>${ul(ex.watch)}</div>` : ''}
    <details><summary>Ingredients we recognized (${ex.matched.length})</summary>
      <ul class="chips">${ex.matched.map((m) => `<li title="${esc(BAND[m.band])}">${esc(m.name)} <span class="sr-only">(${esc(BAND[m.band])})</span></li>`).join('')}</ul>
      ${ex.unknown.length ? `<p class="small muted">Not in our database: ${esc(ex.unknown.join(', '))}</p>` : ''}
    </details>`;
}

export default {
  title: 'Ingredient checker',
  render(root) {
    const draw = (openId) => {
      const s = store.get();
      const profile = s.profile || {};
      const cross = crossProductInsights(s.products);

      root.innerHTML = `
        <h1>Ingredient checker</h1>
        <p class="lead">Add products you have used and what happened. DermaLogic explains which ingredients likely made it work or not, and spots patterns across products.</p>

        <form id="i-form" class="card form" aria-labelledby="add-h">
          <h2 id="add-h">Add a product</h2>
          <div class="grid-2">
            <div class="field"><label for="pname">Product name</label><input id="pname" name="name" required /></div>
            <div class="field"><label for="ptype">Type</label><select id="ptype" name="type">${PRODUCT_TYPES.map((t) => `<option>${t}</option>`).join('')}</select></div>
          </div>
          <div class="field">
            <label for="pingredients">Ingredient list</label>
            <textarea id="pingredients" name="ingredients" rows="5" required aria-describedby="ping-hint" placeholder="Aqua, Glycerin, Niacinamide, Cetearyl Alcohol, …"></textarea>
            <p class="hint" id="ping-hint">Copy it from the packaging or the brand's website, separated by commas.</p>
          </div>
          <fieldset><legend>What happened?</legend>
            <div class="options">${Object.entries(OUTCOMES).map(([k, l], i) => `<label class="check"><input type="radio" name="outcome" value="${k}" ${i === 0 ? 'checked' : ''} /> <span>${esc(l)}</span></label>`).join('')}</div>
          </fieldset>
          <div class="field"><label for="weeks">How many weeks did you use it?</label><input type="number" id="weeks" name="weeksUsed" min="0" max="520" step="1" /></div>
          <p class="error" id="i-error" role="alert"></p>
          <button class="btn btn-primary" type="submit">Explain the result</button>
        </form>

        ${
          cross.suspects.length || cross.friends.length
            ? `<section class="card card-accent" aria-labelledby="pat-h"><h2 id="pat-h">Patterns across your products</h2>
                ${cross.suspects.length ? `<h3>Possible triggers</h3><p class="small">These appear in 2 or more products that gave you a bad result, and in none that worked.</p><ul>${cross.suspects.map((c) => `<li><strong>${esc(c.name)}</strong> in ${esc([...new Set(c.products)].join(', '))}</li>`).join('')}</ul>` : ''}
                ${cross.friends.length ? `<h3>Ingredients that seem to suit you</h3><ul>${cross.friends.map((c) => `<li><strong>${esc(c.name)}</strong> in ${esc([...new Set(c.products)].join(', '))}</li>`).join('')}</ul>` : ''}
              </section>`
            : ''
        }

        <section aria-labelledby="list-h">
          <h2 id="list-h">Your products (${s.products.length})</h2>
          ${s.products
            .slice()
            .reverse()
            .map((p) => {
              const ex = explainProduct(p, profile);
              return `<article class="card" aria-labelledby="p-${p.id}">
                <h3 id="p-${p.id}" tabindex="-1">${esc(p.name)} <span class="muted small">· ${esc(p.type)}</span></h3>
                <p><span class="badge ${p.outcome === 'worked' ? 'badge-low' : p.outcome === 'no-change' ? 'badge-moderate' : 'badge-noticeable'}">${esc(OUTCOMES[p.outcome])}</span> <span class="small muted">added ${fmtDate(p.createdAt)}${p.weeksUsed ? ` · used ${esc(p.weeksUsed)} weeks` : ''}</span></p>
                ${explanationHTML(p, ex)}
                <div class="btn-row">
                  <button type="button" class="btn btn-small btn-ghost" data-read="${p.id}">Read aloud</button>
                  <button type="button" class="btn btn-small btn-ghost" data-del="${p.id}" aria-label="Delete ${esc(p.name)}">Delete</button>
                </div>
              </article>`;
            })
            .join('')}
        </section>

        <section class="card" aria-labelledby="look-h">
          <h2 id="look-h">Look up one ingredient</h2>
          <form id="lookup" class="inline-form">
            <label for="lq" class="sr-only">Ingredient name</label>
            <input id="lq" placeholder="e.g. niacinamide" />
            <button class="btn" type="submit">Look up</button>
          </form>
          <p id="lookup-out" aria-live="polite"></p>
        </section>`;

      root.querySelector('#i-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const d = readForm(e.currentTarget);
        if (!d.name.trim() || !d.ingredients.trim()) {
          root.querySelector('#i-error').textContent = 'Please add the product name and its ingredient list.';
          return;
        }
        const p = { id: uid(), ...d, createdAt: new Date().toISOString() };
        store.update((st) => st.products.push(p));
        toast('Product added. Here is what we found.');
        draw(p.id);
      });
      root.querySelectorAll('[data-del]').forEach((b) =>
        b.addEventListener('click', () => {
          if (!confirm('Delete this product?')) return;
          store.update((st) => (st.products = st.products.filter((p) => p.id !== b.dataset.del)));
          draw();
        })
      );
      root.querySelectorAll('[data-read]').forEach((b) =>
        b.addEventListener('click', () => {
          const p = store.get().products.find((x) => x.id === b.dataset.read);
          const ex = explainProduct(p, profile);
          speak(`${p.name}. ${(p.outcome === 'worked' ? ex.good : ex.reasons).join(' ')} ${ex.watch.join(' ')}`, { rate: store.get().settings.rate });
        })
      );
      root.querySelector('#lookup').addEventListener('submit', (e) => {
        e.preventDefault();
        const q = root.querySelector('#lq').value;
        const ing = lookupIngredient(q);
        root.querySelector('#lookup-out').textContent = ing ? ingredientText(ing) : `"${q}" is not in our database yet.`;
      });
      if (openId) root.querySelector(`#p-${openId}`)?.focus();
    };
    draw();
  },
};
