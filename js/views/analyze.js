import { store, uid, photos, today } from '../store.js';
import { esc, announce, toast, levelBadge, meter, downscaleDataURL, fmtDate } from '../ui.js';
import { startCamera, stopCamera, toCanvas, loadImageFile, analyzeCanvas, drawOverlay } from '../camera.js';
import { describeAnalysis } from '../analysis.js';
import { CONCERNS } from '../data/knowledge.js';
import { speak } from '../voice.js';
import { dropletIcon } from '../icon.js';
import { icon } from '../icons.js';
import { art } from '../art.js';
import { ring, animateRings, enhanceSwipe, metricTile, pillCta } from '../fx.js';
import { skinScore } from '../score.js';
import { measureFrame, coachMessage } from '../coach.js';
import { cropToJpeg, analyzeInCloud, mapYoucamScores, mergeResults } from '../youcam.js';

export default {
  title: 'Face scan',
  render(root, { navigate }) {
    const s = store.get();
    root.innerHTML = `
      <h1>Face scan</h1>
      <p class="lead">Estimate your skin tone and spot areas to focus on. Skin tone is always measured on your device. Concerns can be analysed by YouCam AI if you switch it on.</p>

      <section class="card engine-card" aria-labelledby="eng-h">
        <h2 id="eng-h">Analysis engine</h2>
        <label class="switch-row"><span><strong>Use YouCam AI</strong><small id="eng-hint"></small></span>
          <input type="checkbox" id="cloud" role="switch" aria-describedby="eng-hint" ${s.settings.cloudScan ? 'checked' : ''} /></label>
      </section>

      <section class="card howto" aria-labelledby="how-h">
        <h2 id="how-h">Before you scan</h2>
        <ol class="howto-grid" data-swipe="Scan instructions">
          <li><div class="howto-art">${art('circle')}</div><strong>1. Place your face in the circle</strong><span>Centre your face inside the dashed oval, at eye level.</span></li>
          <li><div class="howto-art">${art('light')}</div><strong>2. Face the light</strong><span>Stand facing a window or soft daylight. Avoid colored lights and shadows.</span></li>
          <li><div class="howto-art">${art('hair')}</div><strong>3. Clear your face</strong><span>Hair back, no glasses or makeup, neutral expression.</span></li>
          <li><div class="howto-art">${art('still')}</div><strong>4. Stay close, hold still</strong><span>Hold the phone at arm's length and keep still for a few seconds.</span></li>
        </ol>
        <p class="small muted">Use the same place and time of day for each scan so your results are comparable.</p>
      </section>

      <section class="card" aria-labelledby="cap-h">
        <h2 id="cap-h">Take or upload a photo</h2>
        <div class="camera-wrap" id="camera-wrap" hidden>
          <video id="video" playsinline muted aria-label="Camera preview"></video>
          <div class="guide-oval" id="guide-oval" aria-hidden="true"></div>
          <p class="coach" id="camera-hint" data-state="place" aria-hidden="true">Place your face in the circle. Stay close to the camera.</p>
          <div class="countdown" id="countdown" aria-hidden="true" hidden></div>
        </div>
        <p class="sr-only" id="coach-live" role="status" aria-live="polite"></p>
        <label class="check auto-cap" id="auto-wrap" hidden><input type="checkbox" id="auto" checked /> <span>Capture automatically when I'm in position</span></label>
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

    enhanceSwipe(root);
    const video = root.querySelector('#video');
    const wrap = root.querySelector('#camera-wrap');
    const startBtn = root.querySelector('#start-cam');
    const capBtn = root.querySelector('#capture');
    const stopBtn = root.querySelector('#stop-cam');
    const results = root.querySelector('#results');
    const cloud = root.querySelector('#cloud');
    const hint = root.querySelector('#eng-hint');
    const hintText = () =>
      (hint.textContent = cloud.checked
        ? 'On: the photo you scan is sent securely to YouCam (Perfect Corp.) for an 8-point skin analysis. DermaLogic does not store it on a server. Falls back to on-device if YouCam is unavailable.'
        : 'Off: everything is analysed on this device and nothing is uploaded.');
    hintText();
    cloud.addEventListener('change', () => {
      store.update((st) => (st.settings.cloudScan = cloud.checked));
      hintText();
    });

    const hintEl = root.querySelector('#camera-hint');
    const oval = root.querySelector('#guide-oval');
    const live = root.querySelector('#coach-live');
    const cd = root.querySelector('#countdown');
    const autoBox = root.querySelector('#auto');
    const probe = document.createElement('canvas');
    probe.width = 64;
    probe.height = 80;
    let coachTimer = null;
    let readyTicks = 0;
    let counting = null;
    let lastKey = '';
    let lastSaid = 0;

    function stopCoach() {
      clearInterval(coachTimer);
      coachTimer = null;
      clearInterval(counting);
      counting = null;
      readyTicks = 0;
      lastKey = '';
      cd.hidden = true;
    }

    function startCoach() {
      stopCoach();
      const ctx = probe.getContext('2d', { willReadFrequently: true });
      coachTimer = setInterval(() => {
        if (!video.videoWidth) return;
        ctx.drawImage(video, 0, 0, probe.width, probe.height);
        const m = coachMessage(measureFrame(ctx.getImageData(0, 0, probe.width, probe.height).data, probe.width, probe.height));
        hintEl.textContent = m.text;
        hintEl.dataset.state = m.key;
        oval.classList.toggle('is-ready', m.ready);
        if (m.key !== lastKey && Date.now() - lastSaid > 2500) {
          lastKey = m.key;
          lastSaid = Date.now();
          live.textContent = m.text;
          if (store.get().settings.speak) speak(m.text, { rate: store.get().settings.rate });
        }
        readyTicks = m.ready ? readyTicks + 1 : 0;
        if (!m.ready && counting) {
          clearInterval(counting);
          counting = null;
          cd.hidden = true;
        }
        if (m.ready && readyTicks >= 4 && !counting && autoBox.checked) {
          let n = 3;
          cd.hidden = false;
          cd.textContent = n;
          live.textContent = 'Hold still. Capturing in 3, 2, 1.';
          counting = setInterval(() => {
            n -= 1;
            if (n <= 0) {
              stopCoach();
              capBtn.click();
            } else {
              cd.textContent = n;
              cd.classList.remove('tick');
              void cd.offsetWidth;
              cd.classList.add('tick');
            }
          }, 1000);
        }
      }, 450);
    }

    const setCam = (on) => {
      if (!on) stopCoach();
      root.querySelector('#auto-wrap').hidden = !on;
      wrap.hidden = !on;
      capBtn.hidden = !on;
      stopBtn.hidden = !on;
      startBtn.hidden = on;
    };

    startBtn.addEventListener('click', async () => {
      try {
        setCam(true);
        await startCamera(video);
        announce('Camera on. Place your face in the circle and stay close to the camera. Instructions will follow.');
        startCoach();
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

    const STAGES = ['Finding your face', 'Reading skin tone', 'Checking hydration', 'Looking at redness and spots', 'Measuring pores and texture', 'Building your results'];

    function showScanning(photoData, withCloud) {
      results.innerHTML = `<div class="card scan-stage" role="status" aria-live="polite">
        <div class="scan-photo"><img src="${photoData}" alt="" /><span class="scan-line" aria-hidden="true"></span><span class="scan-grid" aria-hidden="true"></span></div>
        <div class="scan-info">
          ${dropletIcon({ size: 40, className: 'busy' })}
          <p class="scan-title">${withCloud ? 'Analysing with YouCam AI' : 'Analysing on this device'}</p>
          <ol class="scan-steps">${STAGES.map((t) => `<li>${t}</li>`).join('')}</ol>
        </div></div>`;
      const items = [...results.querySelectorAll('.scan-steps li')];
      let i = 0;
      items[0].classList.add('on');
      const timer = setInterval(() => {
        if (i < items.length - 1) {
          items[i].classList.replace('on', 'done');
          items[++i].classList.add('on');
        }
      }, withCloud ? 2200 : 700);
      return () => clearInterval(timer);
    }

    const friendly = (e) =>
      ({
        not_configured: 'YouCam is not connected on this site yet, so your device did the analysis.',
        not_available: 'Cloud analysis is not available here (it only works on the hosted site), so your device did the analysis.',
        sign_in_required: 'Please sign in again to use YouCam. Your device did the analysis instead.',
        no_face: 'YouCam could not find a clear face, so your device did the analysis. Try brighter, even light with your face centred.',
        rate_limited: 'You scanned a lot in a short time. Your device did the analysis this time.',
        timeout: 'YouCam took too long, so your device did the analysis.',
      })[e.code] || 'YouCam could not be reached, so your device did the analysis.';

    async function run(canvas) {
      const useCloud = cloud.checked;
      const photoData = downscaleDataURL(canvas);
      const stopTimer = showScanning(photoData, useCloud);
      results.scrollIntoView({ behavior: 'smooth', block: 'start' });
      try {
        const started = Date.now();
        const { result: local, face, rects, method } = await analyzeCanvas(canvas);
        let result = local;
        let notice = '';
        if (useCloud) {
          try {
            const crop = cropToJpeg(canvas, face);
            const scores = await analyzeInCloud(crop.dataUrl);
            result = mergeResults(local, mapYoucamScores(scores));
          } catch (e) {
            notice = friendly(e);
          }
        }
        // Keep the scanning animation up long enough to read.
        const wait = 1800 - (Date.now() - started);
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        stopTimer();
        drawOverlay(canvas, face, rects);
        const entry = { id: uid(), date: new Date().toISOString(), result, method };
        store.update((st) => st.analyses.push(entry));
        showResults(entry, canvas, photoData, notice);
      } catch (e) {
        stopTimer();
        results.innerHTML = `<div class="card card-warn" role="alert"><p>${esc(e.message)}</p></div>`;
      }
    }

    function showResults(entry, canvas, photoData, notice = '') {
      const r = entry.result;
      const desc = describeAnalysis(r);
      const concernRows = Object.entries(r.concerns)
        .map(
          ([k, c]) => `<li class="concern-tile">${metricTile({ label: c.label, score: c.score, level: c.level })}
            ${c.level !== 'low' && CONCERNS[k] ? `<p class="small muted">${esc(CONCERNS[k].tips[0])}</p>` : ''}
          </li>`
        )
        .join('');

      results.innerHTML = `
        <section class="card" aria-labelledby="res-h">
          <h2 id="res-h" tabindex="-1">Your results</h2>
          <p class="engine-line"><span class="engine-pill">${r.engine === 'youcam' ? `${icon('sparkle', { size: 14 })} Analysed by YouCam AI` : `${icon('lock', { size: 14 })} Analysed on this device`}</span></p>
          ${notice ? `<div class="callout" role="note">${esc(notice)}</div>` : ''}
          <p class="sr-only">${esc(desc)}</p>
          ${(() => {
            const sc = skinScore(r);
            return sc == null ? '' : `<div class="result-score">${ring({ pct: sc, label: 'Skin score', sub: '/100', size: 120, stroke: 11 })}<div><h3>Your skin score</h3><p class="small muted">Higher is better. It averages how noticeable each concern is. Use it to track change, not to judge.</p></div></div>`;
          })()}
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
          <ul class="concerns tiles-row" data-swipe="Your skin concerns">${concernRows}</ul>
          ${r.warnings.length ? `<div class="callout" role="note"><strong>Accuracy note:</strong> ${esc(r.warnings.join(' '))}</div>` : ''}
          <p class="small muted">These are camera estimates, not a diagnosis. Dryness, sensitivity and texture are better described by you in your skin profile.</p>

          <div class="btn-row">
            ${pillCta('Get my skincare plan', { id: 'to-routine' })}
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
      animateRings(results);
      enhanceSwipe(results);
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

    return () => {
      stopCoach();
      stopCamera();
    };
  },
};
