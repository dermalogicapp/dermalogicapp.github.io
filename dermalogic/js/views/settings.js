import { store, photos } from '../store.js';
import { toast } from '../ui.js';
import { DISCLAIMER } from '../data/knowledge.js';

export default {
  title: 'Settings & privacy',
  render(root) {
    const s = store.get().settings;
    root.innerHTML = `
      <h1>Settings &amp; privacy</h1>

      <section class="card" aria-labelledby="a11y-h">
        <h2 id="a11y-h">Accessibility</h2>
        <label class="check"><input type="checkbox" id="hc" ${s.highContrast ? 'checked' : ''} /> <span>High contrast</span></label>
        <label class="check"><input type="checkbox" id="lt" ${s.largeText ? 'checked' : ''} /> <span>Larger text</span></label>
        <label class="check"><input type="checkbox" id="sp" ${s.speak ? 'checked' : ''} /> <span>Read assistant replies and results aloud</span></label>
        <p class="small muted">Press <kbd>Alt</kbd> + <kbd>V</kbd> on any page to ask a question by voice. Voice answers are always spoken.</p>
      </section>

      <section class="card" aria-labelledby="priv-h">
        <h2 id="priv-h">Your data</h2>
        <p>Everything you enter, including photos, is stored only in this browser on this device. Face analysis runs on your device. The face-detection model is downloaded once from a public CDN; your photos are never uploaded.</p>
        <p class="small muted">Voice input uses your browser's speech recognition. In some browsers (for example Chrome), audio is sent to the browser maker's speech service to turn it into text.</p>
        <div class="btn-row">
          <button type="button" class="btn" id="export">Export my data</button>
          <label class="btn file-btn">Import data<input type="file" id="import" accept="application/json" class="sr-only" /></label>
          <button type="button" class="btn btn-danger" id="reset">Delete all my data</button>
        </div>
        <p class="small muted">Export includes your profile, logs and products. Photos are not included, to keep the file small.</p>
      </section>

      <section class="card" aria-labelledby="disc-h">
        <h2 id="disc-h">Medical disclaimer</h2>
        <p>${DISCLAIMER}</p>
      </section>
    `;
    const bind = (id, key) => root.querySelector(id).addEventListener('change', (e) => store.update((st) => (st.settings[key] = e.target.checked)));
    bind('#hc', 'highContrast');
    bind('#lt', 'largeText');
    bind('#sp', 'speak');

    root.querySelector('#export').addEventListener('click', () => {
      const blob = new Blob([store.exportJSON()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `dermalogic-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
    root.querySelector('#import').addEventListener('change', async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      try {
        store.importJSON(await f.text());
        toast('Data imported.');
      } catch {
        toast('That file could not be imported.', 'error');
      }
    });
    root.querySelector('#reset').addEventListener('click', async () => {
      if (!confirm('Delete all DermaLogic data and photos from this device? This cannot be undone.')) return;
      await store.reset();
      await photos.clear();
      toast('All data deleted.');
      location.hash = '#/home';
    });
  },
};
