// Motion helpers. Everything here degrades to the final state when the user
// prefers reduced motion or the browser lacks IntersectionObserver.

export const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Fade/slide elements in as they scroll into view. Elements get .reveal in
// markup; this adds .in. Optional data-delay (ms) staggers siblings.
export function revealOnScroll(root = document) {
  const els = [...root.querySelectorAll('.reveal')];
  if (!els.length) return () => {};
  if (reducedMotion() || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('in'));
    return () => {};
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target;
        setTimeout(() => el.classList.add('in'), Number(el.dataset.delay || 0));
        io.unobserve(el);
        el.querySelectorAll?.('[data-count]').forEach((c) => countUp(c));
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -5% 0px' }
  );
  els.forEach((el) => io.observe(el));
  return () => io.disconnect();
}

// <span data-count="72" data-suffix="%">0</span>
export function countUp(el, ms = 1100) {
  if (el.dataset.counted) return;
  el.dataset.counted = '1';
  const end = Number(el.dataset.count);
  const suffix = el.dataset.suffix || '';
  if (!Number.isFinite(end)) return;
  if (reducedMotion()) {
    el.textContent = end + suffix;
    return;
  }
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / ms);
    const eased = 1 - Math.pow(1 - k, 3);
    el.textContent = Math.round(end * eased) + suffix;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Progress ring (SVG). The stroke animates from empty to `pct` after insertion.
export function ring({ pct, label, sub = '', size = 96, stroke = 9, id = '' }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  return `<div class="ring" ${id ? `id="${id}"` : ''} data-pct="${p}" role="img" aria-label="${label}: ${p} percent">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
      <circle class="ring-track" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" fill="none"/>
      <circle class="ring-bar" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" fill="none" stroke-linecap="round"
        stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${c.toFixed(2)}" data-c="${c.toFixed(2)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
    </svg>
    <div class="ring-text"><strong data-count="${p}">${reducedMotion() ? p : 0}</strong>${sub ? `<span>${sub}</span>` : ''}</div>
  </div>`;
}

export function animateRings(root = document) {
  root.querySelectorAll('.ring').forEach((el) => {
    const bar = el.querySelector('.ring-bar');
    const c = Number(bar.dataset.c);
    const pct = Number(el.dataset.pct);
    const apply = () => (bar.style.strokeDashoffset = String(c * (1 - pct / 100)));
    if (reducedMotion()) apply();
    else requestAnimationFrame(() => requestAnimationFrame(apply));
    const n = el.querySelector('[data-count]');
    if (n) countUp(n);
  });
  root.querySelectorAll('.meter-anim span').forEach((s) => {
    const w = s.dataset.w;
    if (reducedMotion()) s.style.width = w;
    else requestAnimationFrame(() => requestAnimationFrame(() => (s.style.width = w)));
  });
}

// A burst of droplets from a point; used for the "all set" moments.
export function burst(host, n = 16) {
  if (reducedMotion()) return;
  const colors = ['#7b1e3a', '#d9557f', '#f4a6c1', '#ffffff', '#9b2c4f'];
  for (let i = 0; i < n; i++) {
    const d = document.createElement('span');
    d.className = 'burst-drop';
    const ang = (Math.PI * 2 * i) / n + Math.random() * 0.4;
    const dist = 70 + Math.random() * 90;
    d.style.setProperty('--dx', `${Math.cos(ang) * dist}px`);
    d.style.setProperty('--dy', `${Math.sin(ang) * dist - 20}px`);
    d.style.background = colors[i % colors.length];
    d.style.width = d.style.height = `${6 + Math.random() * 9}px`;
    host.appendChild(d);
    setTimeout(() => d.remove(), 1400);
  }
}
