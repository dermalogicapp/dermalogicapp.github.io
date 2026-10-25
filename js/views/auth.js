import { signIn, signUp, requestPasswordReset, authMode, passwordStrength, validateCredentials, AuthError } from '../auth.js';
import { esc, announce } from '../ui.js';
import { icon } from '../icons.js';
import { dropletIcon } from '../icon.js';

const shell = (title, sub, body, alt) => `
  <div class="pub auth">
    <aside class="auth-side" aria-hidden="false">
      <a class="pub-brand" href="#/landing" aria-label="Back to DermaLogic home">${dropletIcon({ variant: 'logo', size: 38 })}<span>DermaLogic</span></a>
      <div class="auth-art">${dropletIcon({ variant: 'banner' })}</div>
      <p class="auth-pitch">Your skin, understood.</p>
      <ul class="auth-points">
        <li>${icon('scan', { size: 20 })} AI skin scan and personalised routine</li>
        <li>${icon('chart', { size: 20 })} Daily progress with before/after photos</li>
        <li>${icon('mic', { size: 20 })} Voice assistant for hands-free help</li>
      </ul>
    </aside>
    <div class="auth-main" id="auth-main">
      <div class="auth-card">
        <h1>${title}</h1>
        <p class="lead">${sub}</p>
        ${authMode() === 'demo' ? `<p class="demo-note" role="note">${icon('lock', { size: 16 })} <span><strong>Demo accounts</strong> are stored on this device only. Online accounts need the site owner to switch them on.</span></p>` : ''}
        ${body}
        <p class="auth-alt">${alt}</p>
      </div>
    </div>
  </div>`;

function field({ id, label, type = 'text', autocomplete, value = '', extra = '', hint = '' }) {
  return `<div class="field" data-field="${id}">
    <label for="${id}">${label}</label>
    <div class="input-wrap">
      <input id="${id}" name="${id}" type="${type}" autocomplete="${autocomplete}" value="${esc(value)}" ${hint ? `aria-describedby="${id}-hint ${id}-err"` : `aria-describedby="${id}-err"`} ${extra} />
      ${type === 'password' ? `<button type="button" class="pw-toggle" aria-label="Show password" aria-pressed="false" data-for="${id}">${icon('eye', { size: 20 })}</button>` : ''}
    </div>
    ${hint ? `<p class="hint" id="${id}-hint">${hint}</p>` : ''}
    <p class="field-err" id="${id}-err"></p>
  </div>`;
}

function wire(root, form, { onSubmit, label }) {
  const btn = form.querySelector('button[type="submit"]');
  const summary = root.querySelector('.form-error');

  const clear = () => {
    summary.textContent = '';
    form.querySelectorAll('.field-err').forEach((e) => (e.textContent = ''));
    form.querySelectorAll('input').forEach((i) => i.removeAttribute('aria-invalid'));
  };
  const showFields = (fields = {}) => {
    let first = null;
    for (const [k, msg] of Object.entries(fields)) {
      const input = form.querySelector(`#${k}`);
      const err = form.querySelector(`#${k}-err`);
      if (!input || !err) continue;
      err.textContent = msg;
      input.setAttribute('aria-invalid', 'true');
      first ||= input;
    }
    first?.focus();
  };

  form.querySelectorAll('.pw-toggle').forEach((t) =>
    t.addEventListener('click', () => {
      const input = form.querySelector('#' + t.dataset.for);
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      t.setAttribute('aria-pressed', String(show));
      t.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      t.innerHTML = icon(show ? 'eyeoff' : 'eye', { size: 20 });
    })
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clear();
    btn.disabled = true;
    btn.classList.add('loading');
    btn.firstElementChild.textContent = 'Please wait…';
    try {
      await onSubmit(Object.fromEntries(new FormData(form)));
    } catch (err) {
      if (err.fields) {
        summary.textContent = err.message;
        showFields(err.fields);
      } else {
        summary.textContent = err instanceof AuthError ? err.message : 'Something went wrong. Please try again.';
        if (!(err instanceof AuthError)) console.error(err);
      }
      announce(summary.textContent, true);
    } finally {
      btn.disabled = false;
      btn.classList.remove('loading');
      btn.firstElementChild.textContent = label;
    }
  });
}

const submitBtn = (label) => `<button class="btn btn-primary btn-block btn-lg" type="submit"><span>${label}</span></button>`;

export const login = {
  title: 'Log in',
  render(root, { onAuth }) {
    root.innerHTML = shell(
      'Welcome back',
      'Log in to continue your skin journey.',
      `<form id="login-form" novalidate>
        ${field({ id: 'email', label: 'Email', type: 'email', autocomplete: 'email', extra: 'inputmode="email" autofocus' })}
        ${field({ id: 'password', label: 'Password', type: 'password', autocomplete: 'current-password' })}
        <p class="forgot"><a href="#/forgot">Forgot your password?</a></p>
        <p class="form-error error" role="alert"></p>
        ${submitBtn('Log in')}
      </form>`,
      'New to DermaLogic? <a href="#/signup">Create an account</a>'
    );
    wire(root, root.querySelector('#login-form'), {
      label: 'Log in',
      onSubmit: async (v) => onAuth(await signIn(v)),
    });
  },
};

export const signup = {
  title: 'Create your account',
  render(root, { onAuth, navigate }) {
    root.innerHTML = shell(
      'Create your account',
      'Free, and it takes under a minute.',
      `<form id="signup-form" novalidate>
        ${field({ id: 'name', label: 'First name', autocomplete: 'given-name' })}
        ${field({ id: 'email', label: 'Email', type: 'email', autocomplete: 'email', extra: 'inputmode="email"' })}
        ${field({ id: 'password', label: 'Password', type: 'password', autocomplete: 'new-password', hint: 'At least 8 characters, with a letter and a number.' })}
        <div class="strength" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
        <p class="strength-label small muted" id="strength-label" aria-live="polite"></p>
        <label class="check"><input type="checkbox" name="agree" id="agree" required /> <span>I understand DermaLogic is general skin-care guidance and <strong>not medical advice</strong>.</span></label>
        <p class="field-err" id="agree-err"></p>
        <p class="form-error error" role="alert"></p>
        ${submitBtn('Create account')}
      </form>`,
      'Already have an account? <a href="#/login">Log in</a>'
    );
    const form = root.querySelector('#signup-form');
    const bars = [...form.querySelectorAll('.strength span')];
    const lbl = form.querySelector('#strength-label');
    form.querySelector('#password').addEventListener('input', (e) => {
      const { level, label } = passwordStrength(e.target.value);
      bars.forEach((b, i) => b.classList.toggle('on', e.target.value && i < Math.max(1, level)));
      form.dataset.strength = e.target.value ? level : '';
      lbl.textContent = e.target.value ? `Password strength: ${label}` : '';
    });
    wire(root, form, {
      label: 'Create account',
      onSubmit: async (v) => {
        const fields = validateCredentials(v, { signup: true });
        if (Object.keys(fields).length) throw Object.assign(new AuthError('Please fix the highlighted fields.'), { fields });
        if (!form.querySelector('#agree').checked) {
          form.querySelector('#agree-err').textContent = 'Please tick this box to continue.';
          form.querySelector('#agree').focus();
          throw new AuthError('Please accept the note about medical advice.');
        }
        form.querySelector('#agree-err').textContent = '';
        const r = await signUp(v);
        if (r.needsConfirmation) {
          root.querySelector('.auth-card').innerHTML = `<div class="confirm-box">
            <div class="confirm-ic">${icon('check', { size: 34 })}</div>
            <h1>Check your email</h1>
            <p class="lead">We sent a confirmation link to <strong>${esc(v.email)}</strong>. Open it, then come back and log in.</p>
            <a class="btn btn-primary btn-lg" href="#/login">Go to log in</a></div>`;
          announce('Check your email to confirm your account.');
          return;
        }
        onAuth(r.session);
      },
    });
  },
};

export const forgot = {
  title: 'Reset your password',
  render(root) {
    root.innerHTML = shell(
      'Reset your password',
      'Enter your email and we\'ll send you a reset link.',
      `<form id="forgot-form" novalidate>
        ${field({ id: 'email', label: 'Email', type: 'email', autocomplete: 'email', extra: 'inputmode="email" autofocus' })}
        <p class="form-error error" role="alert"></p>
        <p class="ok-msg" role="status"></p>
        ${submitBtn('Send reset link')}
      </form>`,
      '<a href="#/login">Back to log in</a>'
    );
    wire(root, root.querySelector('#forgot-form'), {
      label: 'Send reset link',
      onSubmit: async (v) => {
        await requestPasswordReset(v.email);
        const ok = root.querySelector('.ok-msg');
        ok.textContent = 'If that email has an account, a reset link is on its way.';
        announce(ok.textContent);
      },
    });
  },
};
