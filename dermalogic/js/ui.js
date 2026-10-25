// Small DOM helpers shared by all views.

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// Screen-reader announcements. Polite for status, assertive for problems.
export function announce(msg, assertive = false) {
  const el = document.getElementById(assertive ? 'sr-alert' : 'sr-status');
  if (!el) return;
  el.textContent = '';
  setTimeout(() => (el.textContent = msg), 50);
}

export function toast(msg, kind = 'info') {
  const host = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = `toast toast-${kind}`;
  t.textContent = msg;
  host.appendChild(t);
  while (host.children.length > 3) host.firstElementChild.remove();
  announce(msg, kind === 'error');
  setTimeout(() => t.remove(), 6000);
}

export const fmtDate = (iso, opts = { dateStyle: 'medium' }) => {
  try {
    return new Intl.DateTimeFormat(undefined, opts).format(new Date(iso.length === 10 ? iso + 'T12:00:00' : iso));
  } catch {
    return iso;
  }
};

export const ul = (items, cls = '') => (items?.length ? `<ul class="${cls}">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : '');

export function levelBadge(level) {
  const label = { low: 'Low', moderate: 'Moderate', noticeable: 'Noticeable' }[level] || level;
  return `<span class="badge badge-${esc(level)}">${esc(label)}</span>`;
}

// Accessible meter: visible bar plus text for screen readers.
export function meter(score, label) {
  return `<div class="meter" role="img" aria-label="${esc(label)}: ${score} out of 100"><span style="width:${Math.max(2, score)}%"></span></div>`;
}

export function readForm(form) {
  const data = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === 'checkbox') {
      if (el.dataset.multi !== undefined) {
        data[el.name] = data[el.name] || [];
        if (el.checked) data[el.name].push(el.value);
      } else data[el.name] = el.checked;
    } else if (el.type === 'radio') {
      if (el.checked) data[el.name] = el.value;
      else if (!(el.name in data)) data[el.name] = '';
    } else data[el.name] = el.value;
  }
  return data;
}

export function downscaleDataURL(canvas, maxSide = 720, quality = 0.82) {
  const scale = Math.min(1, maxSide / Math.max(canvas.width, canvas.height));
  if (scale === 1) return canvas.toDataURL('image/jpeg', quality);
  const c = document.createElement('canvas');
  c.width = Math.round(canvas.width * scale);
  c.height = Math.round(canvas.height * scale);
  c.getContext('2d').drawImage(canvas, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', quality);
}
