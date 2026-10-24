import { photos, uid, today, store } from '../store.js';
import { esc, fmtDate, toast, announce, downscaleDataURL } from '../ui.js';
import { dropletIcon } from '../icon.js';
import { startCamera, stopCamera, toCanvas, loadImageFile, analyzeCanvas } from '../camera.js';

const LABELS = { redness: 'Redness', hyperpigmentation: 'Uneven tone', oiliness: 'Shine', acne: 'Blemishes', darkCircles: 'Dark circles' };

function dataUrlToImage(url) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = url;
  });
}

export default {
  title: 'Progress photos',
  async render(root) {
    let list = await photos.all();
    const draw = () => {
      const before = list[0];
      const after = list.at(-1);
      root.innerHTML = `
        <h1>Progress photos</h1>
        <p class="lead">Take a photo each day in the same light and position, then compare any two days. Photos stay on this device.</p>

        <section class="card" aria-labelledby="add-h">
          <h2 id="add-h">Add today's photo</h2>
          <div class="camera-wrap" id="pcam" hidden>
            <video id="pvideo" playsinline muted aria-label="Camera preview"></video>
            <div class="guide-oval" aria-hidden="true"></div>
          </div>
          <form id="p-form" class="form">
            <div class="grid-2">
              <div class="field">
                <label for="p-rating">How does your skin feel today?</label>
                <select id="p-rating" name="rating">
                  <option value="">Choose…</option>
                  <option value="1">1 · Very bad</option><option value="2">2 · Bad</option><option value="3">3 · Okay</option><option value="4">4 · Good</option><option value="5">5 · Great</option>
                </select>
              </div>
              <div class="field">
                <label for="p-note">Note <span class="muted">(optional)</span></label>
                <input id="p-note" name="note" placeholder="e.g. started new serum" />
              </div>
            </div>
            <div class="btn-row">
              <button type="button" class="btn btn-primary" id="p-cam">Open camera</button>
              <button type="button" class="btn" id="p-snap" hidden>Take photo</button>
              <label class="btn file-btn">Upload a photo<input type="file" id="p-upload" accept="image/*" class="sr-only" /></label>
            </div>
          </form>
        </section>

        ${
          list.length >= 2
            ? `<section class="card" aria-labelledby="cmp-h">
                <h2 id="cmp-h">Before and after</h2>
                <div class="grid-2">
                  <div class="field"><label for="before">Before</label><select id="before">${list.map((p) => `<option value="${p.id}" ${p === before ? 'selected' : ''}>${fmtDate(p.date)}${p.note ? ' · ' + esc(p.note) : ''}</option>`).join('')}</select></div>
                  <div class="field"><label for="after">After</label><select id="after">${list.map((p) => `<option value="${p.id}" ${p === after ? 'selected' : ''}>${fmtDate(p.date)}${p.note ? ' · ' + esc(p.note) : ''}</option>`).join('')}</select></div>
                </div>
                <div class="compare" id="compare">
                  <img id="cmp-before" alt="" />
                  <div class="compare-after" id="cmp-after-wrap"><img id="cmp-after" alt="" /></div>
                  <div class="compare-line" id="cmp-line" aria-hidden="true"></div>
                </div>
                <div class="field">
                  <label for="cmp-slider">Slide to compare (left shows before, right shows after)</label>
                  <input type="range" id="cmp-slider" min="0" max="100" value="50" />
                </div>
                <div class="btn-row">
                  <button type="button" class="btn" id="side">Show side by side</button>
                  <button type="button" class="btn" id="score">Compare skin scores</button>
                </div>
                <div class="side-by-side" id="sbs" hidden></div>
                <div id="score-out" aria-live="polite"></div>
              </section>`
            : `<p class="card muted">Add at least two photos to compare before and after.</p>`
        }

        <section aria-labelledby="gal-h">
          <h2 id="gal-h">All photos (${list.length})</h2>
          <ul class="gallery">
            ${list
              .slice()
              .reverse()
              .map(
                (p) => `<li>
                <figure>
                  <img src="${p.dataUrl}" alt="Progress photo from ${esc(fmtDate(p.date))}${p.note ? ': ' + esc(p.note) : ''}" loading="lazy" />
                  <figcaption>${fmtDate(p.date)}${p.rating ? ` · skin ${esc(p.rating)}/5` : ''}${p.note ? `<br />${esc(p.note)}` : ''}</figcaption>
                </figure>
                <button type="button" class="btn btn-small btn-ghost" data-del="${p.id}" aria-label="Delete photo from ${esc(fmtDate(p.date))}">Delete</button>
              </li>`
              )
              .join('')}
          </ul>
        </section>`;
      wire();
    };

    const wire = () => {
      const form = root.querySelector('#p-form');
      const video = root.querySelector('#pvideo');
      const camBtn = root.querySelector('#p-cam');
      const snap = root.querySelector('#p-snap');
      const saveCanvas = async (canvas) => {
        const rating = form.querySelector('#p-rating').value;
        const note = form.querySelector('#p-note').value;
        const p = { id: uid(), date: today(), createdAt: new Date().toISOString(), dataUrl: downscaleDataURL(canvas), rating, note };
        await photos.add(p);
        // Mirror the rating into today's lifestyle log so insights can use it.
        if (rating) store.update((s) => (s.lifestyle[p.date] = { ...(s.lifestyle[p.date] || {}), skinRating: rating }));
        list = await photos.all();
        toast('Photo saved.');
        draw();
      };
      camBtn.addEventListener('click', async () => {
        try {
          root.querySelector('#pcam').hidden = false;
          await startCamera(video);
          camBtn.hidden = true;
          snap.hidden = false;
          snap.focus();
        } catch (e) {
          root.querySelector('#pcam').hidden = true;
          toast(e.message || 'Could not open the camera.', 'error');
        }
      });
      snap.addEventListener('click', async () => {
        const c = toCanvas(video, 900, true);
        stopCamera();
        await saveCanvas(c);
      });
      root.querySelector('#p-upload').addEventListener('change', async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const img = await loadImageFile(f);
        await saveCanvas(toCanvas(img, 900));
      });

      root.querySelectorAll('[data-del]').forEach((b) =>
        b.addEventListener('click', async () => {
          if (!confirm('Delete this photo? This cannot be undone.')) return;
          await photos.remove(b.dataset.del);
          list = await photos.all();
          announce('Photo deleted.');
          draw();
        })
      );

      const bSel = root.querySelector('#before');
      if (!bSel) return;
      const aSel = root.querySelector('#after');
      const bImg = root.querySelector('#cmp-before');
      const aImg = root.querySelector('#cmp-after');
      const wrap = root.querySelector('#cmp-after-wrap');
      const line = root.querySelector('#cmp-line');
      const slider = root.querySelector('#cmp-slider');
      const byId = (id) => list.find((p) => p.id === id);
      const update = () => {
        const b = byId(bSel.value), a = byId(aSel.value);
        bImg.src = b.dataUrl;
        aImg.src = a.dataUrl;
        bImg.alt = `Before: ${fmtDate(b.date)}`;
        aImg.alt = `After: ${fmtDate(a.date)}`;
        root.querySelector('#sbs').innerHTML = `<figure><img src="${b.dataUrl}" alt="Before, ${esc(fmtDate(b.date))}" /><figcaption>Before · ${fmtDate(b.date)}</figcaption></figure><figure><img src="${a.dataUrl}" alt="After, ${esc(fmtDate(a.date))}" /><figcaption>After · ${fmtDate(a.date)}</figcaption></figure>`;
        root.querySelector('#score-out').innerHTML = '';
      };
      const slide = () => {
        const v = slider.value;
        wrap.style.clipPath = `inset(0 0 0 ${v}%)`;
        line.style.left = `${v}%`;
        slider.setAttribute('aria-valuetext', `${v}% before, ${100 - v}% after`);
      };
      bSel.addEventListener('change', update);
      aSel.addEventListener('change', update);
      slider.addEventListener('input', slide);
      root.querySelector('#side').addEventListener('click', (e) => {
        const sbs = root.querySelector('#sbs');
        sbs.hidden = !sbs.hidden;
        root.querySelector('#compare').hidden = !sbs.hidden;
        slider.parentElement.hidden = !sbs.hidden;
        e.currentTarget.textContent = sbs.hidden ? 'Show side by side' : 'Show slider';
      });
      root.querySelector('#score').addEventListener('click', async () => {
        const out = root.querySelector('#score-out');
        out.innerHTML = `<div class="loader" role="status">${dropletIcon({ size: 36, className: 'busy' })}<p>Analyzing both photos on this device…</p></div>`;
        try {
          const [b, a] = await Promise.all([bSel.value, aSel.value].map(async (id) => (await analyzeCanvas(toCanvas(await dataUrlToImage(byId(id).dataUrl), 900))).result));
          const rows = Object.keys(LABELS)
            .filter((k) => b.concerns[k] && a.concerns[k])
            .map((k) => {
              const d = a.concerns[k].score - b.concerns[k].score;
              const word = Math.abs(d) < 5 ? 'about the same' : d < 0 ? 'improved' : 'higher';
              return `<tr><th scope="row">${LABELS[k]}</th><td>${b.concerns[k].score}</td><td>${a.concerns[k].score}</td><td>${word} (${d > 0 ? '+' : ''}${d})</td></tr>`;
            })
            .join('');
          out.innerHTML = `<table class="table"><caption>Skin scores, 0 to 100 (lower is better)</caption><thead><tr><th scope="col">Area</th><th scope="col">Before</th><th scope="col">After</th><th scope="col">Change</th></tr></thead><tbody>${rows}</tbody></table>
            <p class="small muted">Differences in lighting between photos can change scores. Small changes are normal day to day.</p>`;
        } catch (e) {
          out.innerHTML = `<p class="error" role="alert">${esc(e.message)}</p>`;
        }
      });
      update();
      slide();
    };

    draw();
    return () => stopCamera();
  },
};
