import { store, uid, photos, today } from '../store.js';
import { esc, announce, toast, levelBadge, meter, downscaleDataURL, fmtDate } from '../ui.js';
import { startCamera, stopCamera, toCanvas, loadImageFile, analyzeCanvas, drawOverlay } from '../camera.js';
import { describeAnalysis } from '../analysis.js';
import { CONCERNS } from '../data/knowledge.js';
import { speak } from '../voice.js';
import { dropletIcon } from '../icon.js';

export default {
  title: 'Face scan',
  render(root, { navigate }) {
    const s = store.get();
    root.innerHTML = `
      <h1>Face scan</h1>
      <p class="lead">Estimate your skin tone and spot areas to focus on. The photo is analyzed <strong>on this device</strong> and is not uploaded.</p>

      <details class="card tips">
        <summary>Tips for an accurate scan</summary>
        <ul>
          <li>Face a window or soft daylight. Avoid colored lights and strong shadows.</li>
          <li>Remove makeup, glasses and hair from your face.</li>
          <li>Hold the camera at eye level and keep a neutral expression.</li>
          <li>Use the same place and time of day each scan so results are comparable.</li>
        </ul>
      </details>

      <section class="card" aria-labelledby="cap-h">
        <h2 id="cap-h">Take or upload a photo</h2>
        <div class="camera-wrap" id="camera-wrap" hidden>
          <video id="video" playsinline muted aria-label="Camera preview"></video>
          <div class="guide-oval" aria-hidden="true"></div>
          <p class="camera-hint" id="camera-hint">Line your face up inside the oval.</p>
        </div>
        <div class="btn-row">
          <button type="button" class="btn btn-primary" id="start-cam">Open camera</button>
          <button type="button" class="btn" id="capture" hidden>Capture and analyze</button>
          <button type="button" class="btn btn-ghost" id="stop-cam" hidden>Close camera</button>
          <label class="btn file-btn">
            Upload a photo
            <input type="file" id="upload" accept="image/*" class="sr-only" />
          </label>
        </div>
        <p class="muted small">Face detection uses an on-device model when available. If it cannot load, DermaLogic samples the area inside the guide oval.</p>
      </section>

      <div id="results" aria-live="polite"></div>

      ${
        s.analyses.length > 1
          ? `<section class="card" aria-labelledby="hist-h"><h2 id="hist-h">Scan history</h2>
              <table class="table"><caption class="sr-only">Previous scan results</caption>
              <thead><tr><th scope="col">Date</th><th scope="col">Tone</th><th scope="col">Redness</th><th scope="col">Uneven tone</th><th scope="col">Shine</th><th scope="col">Blemishes</th></tr></thead>
              <tbody>${s.analyses
                .slice(-10)
                .reverse()
                .map(
                  (a) => `<tr><td>${fmtDate(a.date)}</td><td>${esc(a.result.tone.category)}</td><td>${a.result.concerns.redness.score}</td><td>${a.result.concerns.hyperpigmentation.score}</td><td>${a.result.concerns.oiliness.score}</td><td>${a.result.concerns.acne.score}</td></tr>`
                )
                .join('')}</tbody></table></section>`
          : ''
      }
    `;

    const video = root.querySelector('#video');
    const wrap = root.querySelector('#camera-wrap');
    const startBtn = root.querySelector('#start-cam');
    const capBtn = root.querySelector('#capture');
    const stopBtn = root.querySelector('#stop-cam');
    const results = root.querySelector('#results');

    const setCam = (on) => {
      wrap.hidden = !on;
      capBtn.hidden = !on;
      stopBtn.hidden = !on;
      startBtn.hidden = on;
    };

    startBtn.addEventListener('click', async () => {
      try {
        setCam(true);
        await startCamera(video);
        announce('Camera on. Line your face up inside the oval, then press Capture and analyze.');
        capBtn.focus();
      } catch (e) {
        setCam(false);
        toast(e.message || 'Could not open the camera. Check camera permissions, or upload a photo.', 'error');
      }
    });
    stopBtn.addEventListener('click', () => {
      stopCamera();
      setCam(false);
      startBtn.focus();
    });
    capBtn.addEventListener('click', async () => {
      const canvas = toCanvas(video, 900, true);
      stopCamera();
      setCam(false);
      await run(canvas);
    });
    root.querySelector('#upload').addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const img = await loadImageFile(file);
        await run(toCanvas(img, 900));
      } catch (err) {
        toast(err.message, 'error');
      }
    });

    async function run(canvas) {
      results.innerHTML = `<div class="card loader" role="status">${dropletIcon({ size: 40, className: 'busy' })}<p>Analyzing your photo on this device…</p></div>`;
      try {
        const photoData = downscaleDataURL(canvas);
        const { result, face, rects, method } = await analyzeCanvas(canvas);
        drawOverlay(canvas, face, rects);
        const entry = { id: uid(), date: new Date().toISOString(), result, method };
        store.update((st) => st.analyses.push(entry));
        showResults(entry, canvas, photoData);
      } catch (e) {
        results.innerHTML = `<div class="card card-warn" role="alert"><p>${esc(e.message)}</p></div>`;
      }
    }

    function showResults(entry, canvas, photoData) {
      const r = entry.result;
      const desc = describeAnalysis(r);
      const concernRows = Object.entries(r.concerns)
        .map(
          ([k, c]) => `<li class="concern-row">
            <div class="concern-head"><span>${esc(c.label)}</span> ${levelBadge(c.level)}</div>
            ${meter(c.score, c.label)}
            ${c.level !== 'low' && CONCERNS[k] ? `<p class="small muted">Tip: ${esc(CONCERNS[k].tips[0])}</p>` : ''}
          </li>`
        )
        .join('');

      results.innerHTML = `
        <section class="card" aria-labelledby="res-h">
          <h2 id="res-h" tabindex="-1">Your results</h2>
          <p class="sr-only">${esc(desc)}</p>
          <div class="result-grid">
            <figure class="result-photo">
              <div id="canvas-host"></div>
              <figcaption class="small muted">Outlined boxes show the areas sampled. Method: ${esc(entry.method)}.</figcaption>
            </figure>
            <div>
              <h3>Skin tone (estimate)</h3>
              <div class="tone">
                <span class="swatch" style="background:${r.tone.hex}" role="img" aria-label="Color swatch of your measured skin tone"></span>
                <dl class="kv">
                  <dt>Tone</dt><dd>${esc(r.tone.category)}</dd>
                  <dt>Approx. Fitzpatrick type</dt><dd>${esc(r.tone.fitzpatrickApprox)}</dd>
                  <dt>Undertone</dt><dd>${esc(r.tone.undertone)}</dd>
                  <dt>ITA°</dt><dd>${r.tone.ita}</dd>
                </dl>
              </div>
              <p class="small muted">Fitzpatrick type normally describes how skin reacts to sun; a photo can only approximate it.</p>

              <h3>Body type</h3>
              <p class="small">A face photo cannot reliably tell body type, so we do not guess. ${
                s.profile?.bodyType && s.profile.bodyType !== 'skip'
                  ? `Your profile says: <strong>${esc(s.profile.bodyType)}</strong>.`
                  : 'You can <a href="#/profile">add it in your profile</a> for body-care tips.'
              }</p>
            </div>
          </div>

          <h3>Areas to look at</h3>
          <ul class="concerns">${concernRows}</ul>
          ${r.warnings.length ? `<div class="callout" role="note"><strong>Accuracy note:</strong> ${esc(r.warnings.join(' '))}</div>` : ''}
          <p class="small muted">These are camera estimates, not a diagnosis. Dryness, sensitivity and texture are better described by you in your skin profile.</p>

          <div class="btn-row">
            <button type="button" class="btn btn-primary" id="to-routine">See my routine</button>
            <button type="button" class="btn" id="save-photo">Save as today's progress photo</button>
            <button type="button" class="btn btn-ghost" id="read-aloud">Read results aloud</button>
          </div>
        </section>`;
      const host = results.querySelector('#canvas-host');
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', 'Your photo with the sampled skin areas outlined');
      canvas.className = 'result-canvas';
      host.appendChild(canvas);
      results.querySelector('#res-h').focus();
      announce('Analysis complete. ' + desc);
      if (store.get().settings.speak) speak(desc, { rate: store.get().settings.rate });

      results.querySelector('#to-routine').addEventListener('click', () => navigate(store.get().profile ? 'routine' : 'profile'));
      results.querySelector('#read-aloud').addEventListener('click', () => speak(desc, { rate: store.get().settings.rate }));
      results.querySelector('#save-photo').addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        await photos.add({ id: uid(), date: today(), createdAt: new Date().toISOString(), dataUrl: photoData, analysisId: entry.id, note: '', rating: '' });
        btn.disabled = true;
        toast('Saved to progress photos.');
      });
    }

    return () => stopCamera();
  },
};
