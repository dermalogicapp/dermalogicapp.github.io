import { dropletIcon } from '../icon.js';
import { icon } from '../icons.js';
import { revealOnScroll } from '../fx.js';
import { publicHeader, publicFooter, wireScrollLinks } from './shared.js';

const FEATURES = [
  ['scan', 'AI face scan', 'Eight skin checks in one scan, including hydration, redness, dark spots, pores and texture, plus your skin tone and undertone.'],
  ['drop', 'A routine that fits you', 'Morning, evening and weekly steps built from your scan, your skin type and your history, with ingredients to look for and avoid.'],
  ['chart', 'Progress you can see', 'Daily photos with a before/after slider, scan scores over time and a streak that keeps you going.'],
  ['flask', 'Ingredient detective', 'Paste a product\'s ingredients and what happened. DermaLogic explains why it likely worked or didn\'t.'],
  ['mic', 'Talk to it', 'A voice-enabled assistant and read-aloud results, designed with visually impaired users in mind.'],
  ['leaf', 'Bleaching recovery path', 'A gentle, step-by-step soothing and barrier-repair plan, with no harsh actives and clear warning signs.'],
];

const STEPS = [
  ['1', 'Create your account', 'Sign up with your email in under a minute.'],
  ['2', 'Tell us about your skin', 'A short, friendly set-up: goals, skin type and history. Skip anything you like.'],
  ['3', 'Scan and glow', 'Take a photo, get your results and your routine, then check in daily.'],
];

export default {
  title: 'Skincare that understands you',
  render(root) {
    root.innerHTML = `
    <div class="pub landing">
      ${publicHeader()}

      <section class="l-hero" aria-labelledby="l-h1">
        <div class="l-hero-bg" aria-hidden="true">
          <span class="blob b1"></span><span class="blob b2"></span><span class="blob b3"></span>
        </div>
        <div class="l-hero-copy">
          <p class="eyebrow reveal">${icon('sparkle', { size: 16 })} AI skin analysis, powered by YouCam</p>
          <h1 id="l-h1" class="reveal" data-delay="80">Skincare that actually <em>understands</em> your skin.</h1>
          <p class="l-lead reveal" data-delay="160">Scan your face, get a routine made for you, track your progress with before-and-after photos, and talk to a voice assistant that helps you stay on track.</p>
          <div class="btn-row reveal" data-delay="240">
            <a class="btn btn-white btn-lg" href="#/signup">Start free ${icon('arrow', { size: 18 })}</a>
            <a class="btn btn-ghost-light btn-lg" href="#/login">I have an account</a>
          </div>
          <ul class="trust reveal" data-delay="320">
            <li>${icon('shield', { size: 18 })} Private by design</li>
            <li>${icon('mic', { size: 18 })} Voice-ready</li>
            <li>${icon('leaf', { size: 18 })} Every skin tone</li>
          </ul>
        </div>

        <div class="l-hero-art reveal" data-delay="200" aria-hidden="true">
          <div class="phone">
            <div class="phone-notch"></div>
            <div class="scan-demo">
              <svg viewBox="0 0 200 250" class="face-svg">
                <defs>
                  <linearGradient id="skin-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7c9d6"/><stop offset="1" stop-color="#e59ab3"/></linearGradient>
                </defs>
                <ellipse cx="100" cy="128" rx="68" ry="92" fill="url(#skin-g)"/>
                <path d="M40 110c0-52 28-82 60-82s60 30 60 82c-18-26-36-36-60-36s-42 10-60 36Z" fill="#4a0e22"/>
                <ellipse cx="76" cy="124" rx="9" ry="5" fill="#4a0e22" opacity=".75"/>
                <ellipse cx="124" cy="124" rx="9" ry="5" fill="#4a0e22" opacity=".75"/>
                <path d="M100 130v26m-9 0h18" stroke="#b25675" stroke-width="3" fill="none" stroke-linecap="round"/>
                <path d="M82 182c12 9 24 9 36 0" stroke="#9b2c4f" stroke-width="4" fill="none" stroke-linecap="round"/>
                <g class="scan-brackets" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round">
                  <path d="M24 56V36h20M176 56V36h-20M24 200v20h20M176 200v20h-20"/>
                </g>
              </svg>
              <span class="scan-beam"></span>
              <span class="metric m1"><b>Hydration</b> <i>Good</i></span>
              <span class="metric m2"><b>Redness</b> <i>Low</i></span>
              <span class="metric m3"><b>Tone</b> <i>Brown · warm</i></span>
              <span class="metric m4"><b>Dark spots</b> <i>Mild</i></span>
            </div>
          </div>
          <div class="float-drops">${dropletIcon({ variant: 'banner' })}</div>
        </div>
      </section>

      <section class="l-strip" aria-label="At a glance">
        <ul>
          <li class="reveal"><strong data-count="8">8</strong><span>skin checks in every scan</span></li>
          <li class="reveal" data-delay="80"><strong data-count="3">3</strong><span>daily reminders to stay consistent</span></li>
          <li class="reveal" data-delay="160"><strong data-count="11">11</strong><span>tools in one app</span></li>
          <li class="reveal" data-delay="240"><strong>Voice</strong><span>ask anything, hear the answer</span></li>
        </ul>
      </section>

      <section class="l-section" id="features" aria-labelledby="f-h">
        <div class="l-head reveal"><p class="eyebrow dark">Features</p><h2 id="f-h">Everything your skin needs, in one place</h2></div>
        <ul class="feature-grid">
          ${FEATURES.map(
            ([ic, t, d], i) => `<li class="feature reveal" data-delay="${(i % 3) * 90}">
              <span class="feature-ic">${icon(ic, { size: 26 })}</span>
              <h3>${t}</h3><p>${d}</p></li>`
          ).join('')}
        </ul>
      </section>

      <section class="l-section l-alt" id="how" aria-labelledby="h-h">
        <div class="l-head reveal"><p class="eyebrow dark">How it works</p><h2 id="h-h">From sign-up to glow in three steps</h2></div>
        <ol class="how">
          ${STEPS.map(([n, t, d], i) => `<li class="how-step reveal" data-delay="${i * 140}"><span class="how-n">${n}</span><h3>${t}</h3><p>${d}</p></li>`).join('')}
        </ol>
      </section>

      <section class="l-section l-split" aria-labelledby="b-h">
        <div class="reveal">
          <p class="eyebrow dark">Inclusive care</p>
          <h2 id="b-h">Recovering from skin bleaching? Start gently.</h2>
          <p>If you have used lightening or bleaching products, DermaLogic skips the harsh actives and gives you a three-phase soothing and barrier-repair plan, with notes on steroid creams and when to see a dermatologist.</p>
          <a class="btn btn-primary" href="#/signup">Build my gentle plan</a>
        </div>
        <ul class="phases reveal" data-delay="150">
          <li><b>Phase 1</b><span>Calm and protect</span></li>
          <li><b>Phase 2</b><span>Rebuild the barrier</span></li>
          <li><b>Phase 3</b><span>Even tone, safely</span></li>
        </ul>
      </section>

      <section class="l-section l-alt" id="privacy" aria-labelledby="p-h">
        <div class="l-head reveal"><p class="eyebrow dark">Privacy and honesty</p><h2 id="p-h">You stay in control</h2></div>
        <ul class="feature-grid cols-3">
          <li class="feature reveal"><span class="feature-ic">${icon('lock', { size: 26 })}</span><h3>Your data stays with you</h3><p>Routines, logs and photos are saved on your device, separately for each account.</p></li>
          <li class="feature reveal" data-delay="90"><span class="feature-ic">${icon('camera', { size: 26 })}</span><h3>Cloud scan is opt-in</h3><p>A face photo is sent to YouCam AI only if you switch cloud analysis on. Otherwise, analysis runs on your device.</p></li>
          <li class="feature reveal" data-delay="180"><span class="feature-ic">${icon('heart', { size: 26 })}</span><h3>Not a doctor</h3><p>DermaLogic is general guidance, not a diagnosis. We tell you when something needs a professional.</p></li>
        </ul>
      </section>

      <section class="l-cta reveal" aria-labelledby="c-h">
        <h2 id="c-h">Ready to meet your skin?</h2>
        <p>Create your free account and run your first scan today.</p>
        <a class="btn btn-white btn-lg" href="#/signup">Create my account ${icon('arrow', { size: 18 })}</a>
      </section>

      ${publicFooter()}
    </div>`;

    wireScrollLinks(root);
    const stop = revealOnScroll(root);
    return () => stop();
  },
};
