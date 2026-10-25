// Pieces shared by the public pages (landing, log in, sign up).
import { dropletIcon } from '../icon.js';
import { icon } from '../icons.js';

export const publicHeader = () => `
  <header class="pub-header">
    <a class="pub-brand" href="#/landing" aria-label="DermaLogic home">${dropletIcon({ variant: 'logo', size: 34 })}<span>DermaLogic</span></a>
    <nav class="pub-nav" aria-label="Site">
      <a class="hide-sm" href="#/landing" data-scroll="features">Features</a>
      <a class="hide-sm" href="#/landing" data-scroll="how">How it works</a>
      <a class="hide-sm" href="#/landing" data-scroll="privacy">Privacy</a>
      <a class="btn btn-small btn-ghost-light" href="#/login">Log in</a>
      <a class="btn btn-small btn-white" href="#/signup">Get started</a>
    </nav>
  </header>`;

export const publicFooter = () => `
  <footer class="pub-footer">
    <p class="pub-footer-brand">${dropletIcon({ variant: 'logo', size: 26 })} DermaLogic</p>
    <p><strong>Not medical advice.</strong> DermaLogic gives general skin-care information and AI-based estimates. It does not diagnose or treat any condition. See a doctor or dermatologist for anything painful, spreading, bleeding or changing.</p>
    <p class="small">Skin analysis powered by YouCam AI (Perfect Corp.) when you turn on cloud analysis. ${icon('lock', { size: 14 })} Your routine, logs and photos stay on your device.</p>
  </footer>`;

// Smooth-scroll for the landing page's in-page links.
export function wireScrollLinks(root) {
  root.querySelectorAll('[data-scroll]').forEach((a) =>
    a.addEventListener('click', (e) => {
      const target = root.querySelector('#' + a.dataset.scroll);
      if (!target) return; // from another page: let the hash change take us to the landing page
      e.preventDefault();
      target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    })
  );
}
