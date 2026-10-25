import { store } from '../store.js';
import { esc, readForm, toast } from '../ui.js';
import { CONCERNS, SKIN_TYPES, BODY_TYPES } from '../data/knowledge.js';

const BLEACH_PRODUCTS = {
  hydroquinone: 'Hydroquinone creams',
  steroid: 'Steroid creams (e.g. clobetasol, betamethasone)',
  mercury: 'Imported or unlabelled whitening soaps or creams',
  injections: 'Glutathione pills, drips or injections',
  natural: 'Lemon, baking soda or other home remedies',
  unknown: 'Not sure what was in it',
};

export default {
  title: 'Skin profile',
  render(root, { navigate }) {
    const p = store.get().profile || {};
    const radio = (name, val, label, cur) =>
      `<label class="check"><input type="radio" name="${name}" value="${val}" ${cur === val ? 'checked' : ''} /> <span>${esc(label)}</span></label>`;
    const multi = (name, val, label, cur = []) =>
      `<label class="check"><input type="checkbox" data-multi name="${name}" value="${val}" ${cur.includes(val) ? 'checked' : ''} /> <span>${esc(label)}</span></label>`;

    root.innerHTML = `
      <h1>Skin profile</h1>
      <p class="lead">Your answers personalize your routine. They are saved only on this device.</p>
      <form id="profile-form" class="card form" novalidate>
        <div class="field">
          <label for="name">First name or nickname <span class="muted">(optional)</span></label>
          <input id="name" name="name" autocomplete="given-name" value="${esc(p.name || '')}" />
        </div>

        <fieldset>
          <legend>Skin type <span class="req">(required)</span></legend>
          <p class="hint" id="st-hint">An hour after washing with no products, how does your skin feel?</p>
          <div class="options" aria-describedby="st-hint">
            ${radio('skinType', 'oily', 'Oily: shiny all over', p.skinType)}
            ${radio('skinType', 'dry', 'Dry: tight or flaky', p.skinType)}
            ${radio('skinType', 'combination', 'Combination: oily T-zone, normal or dry cheeks', p.skinType)}
            ${radio('skinType', 'normal', 'Normal: comfortable', p.skinType)}
            ${radio('skinType', 'sensitive', 'Sensitive: stings, itches or reddens easily', p.skinType)}
          </div>
        </fieldset>

        <fieldset>
          <legend>Main concerns <span class="muted">(choose any)</span></legend>
          <div class="options cols-2">${Object.entries(CONCERNS).map(([k, c]) => multi('concerns', k, c.label, p.concerns)).join('')}</div>
        </fieldset>

        <fieldset>
          <legend>Body type <span class="muted">(optional, you choose)</span></legend>
          <p class="hint" id="bt-hint">This cannot be measured from a face photo, so we ask instead. It is only used for body-care tips such as sweat and friction areas.</p>
          <div class="options" aria-describedby="bt-hint">${Object.entries(BODY_TYPES).map(([k, l]) => radio('bodyType', k, l, p.bodyType)).join('')}</div>
        </fieldset>

        <div class="field">
          <label for="ageRange">Age range</label>
          <select id="ageRange" name="ageRange">
            ${['', 'Under 18', '18-24', '25-34', '35-44', '45-54', '55+'].map((a) => `<option value="${a}" ${p.ageRange === a ? 'selected' : ''}>${a || 'Prefer not to say'}</option>`).join('')}
          </select>
        </div>

        <label class="check"><input type="checkbox" name="pregnant" ${p.pregnant ? 'checked' : ''} /> <span>I am pregnant, trying to conceive or breastfeeding</span></label>

        <fieldset class="bleach">
          <legend>Skin bleaching or lightening history</legend>
          <label class="check"><input type="checkbox" name="bleachingHistory" id="bleachingHistory" ${p.bleachingHistory ? 'checked' : ''} aria-controls="bleach-more" /> <span>I have used skin bleaching or lightening products</span></label>
          <p class="hint">This stays private. It lets DermaLogic recommend soothing and barrier-repair care and avoid ingredients that could harm your skin.</p>
          <div id="bleach-more" ${p.bleachingHistory ? '' : 'hidden'}>
            <fieldset>
              <legend>What did you use? <span class="muted">(choose any)</span></legend>
              <div class="options">${Object.entries(BLEACH_PRODUCTS).map(([k, l]) => multi('bleachingProducts', k, l, p.bleachingProducts)).join('')}</div>
            </fieldset>
            <div class="field">
              <label for="bleachingStopped">When did you last use them?</label>
              <select id="bleachingStopped" name="bleachingStopped">
                ${[['', 'Choose…'], ['current', 'I still use them'], ['<3m', 'Less than 3 months ago'], ['3-12m', '3 to 12 months ago'], ['>1y', 'Over a year ago']]
                  .map(([v, l]) => `<option value="${v}" ${p.bleachingStopped === v ? 'selected' : ''}>${l}</option>`)
                  .join('')}
              </select>
            </div>
          </div>
        </fieldset>

        <div class="field">
          <label for="allergies">Known allergies or ingredients that react badly <span class="muted">(optional)</span></label>
          <textarea id="allergies" name="allergies" rows="2">${esc(p.allergies || '')}</textarea>
        </div>

        <p id="form-error" class="error" role="alert"></p>
        <button class="btn btn-primary" type="submit">Save profile</button>
      </form>
    `;

    const form = root.querySelector('#profile-form');
    const bh = root.querySelector('#bleachingHistory');
    bh.addEventListener('change', () => (root.querySelector('#bleach-more').hidden = !bh.checked));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = readForm(form);
      if (!data.skinType || !SKIN_TYPES[data.skinType]) {
        const err = root.querySelector('#form-error');
        err.textContent = 'Please choose your skin type.';
        form.querySelector('input[name="skinType"]').focus();
        return;
      }
      if (!data.bleachingHistory) {
        data.bleachingProducts = [];
        data.bleachingStopped = '';
      }
      store.update((s) => (s.profile = { ...s.profile, ...data, updatedAt: new Date().toISOString() }));
      toast('Profile saved.');
      navigate('routine');
    });
  },
};
