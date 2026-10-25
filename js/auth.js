// Email + password accounts.
//  - Cloud mode: Supabase Auth over REST (real accounts, email reset) when
//    js/config.js has SUPABASE_URL and SUPABASE_ANON_KEY.
//  - Demo mode: accounts live in this browser only (passwords are salted and
//    hashed with PBKDF2). Good for trying the app; not shared across devices.
// Either way, skincare data and photos stay on the device, namespaced per user.
import { CONFIG } from './config.js';

const SESSION_KEY = 'dermalogic:session';
const ACCOUNTS_KEY = 'dermalogic:accounts';
const PBKDF2_ROUNDS = 150000;

export const cloudEnabled = () => !!(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);
export const authMode = () => (cloudEnabled() ? 'cloud' : 'demo');

export class AuthError extends Error {}

const readJSON = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
const writeJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value));

export function validateCredentials({ email, password, name }, { signup = false } = {}) {
  const errors = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((email || '').trim())) errors.email = 'Enter a valid email address.';
  if (signup) {
    if (!password || password.length < 8) errors.password = 'Use at least 8 characters.';
    else if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) errors.password = 'Include at least one letter and one number.';
    if (name && name.length > 60) errors.name = 'Keep your name under 60 characters.';
  } else if (!password) errors.password = 'Enter your password.';
  return errors;
}

export function passwordStrength(pw = '') {
  let n = 0;
  if (pw.length >= 8) n++;
  if (pw.length >= 12) n++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) n++;
  if (/[0-9]/.test(pw)) n++;
  if (/[^a-zA-Z0-9]/.test(pw)) n++;
  const level = Math.min(4, n);
  return { level, label: ['Too short', 'Weak', 'Fair', 'Good', 'Strong'][level] };
}

// --- session ---
export const currentSession = () => readJSON(SESSION_KEY, null);
function setSession(s) {
  writeJSON(SESSION_KEY, s);
  return s;
}
export function signOut() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {}
}

// --- demo mode ---
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function hashPassword(password, saltB64) {
  const salt = saltB64 ? unb64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: PBKDF2_ROUNDS, hash: 'SHA-256' }, key, 256);
  return { salt: b64(salt), hash: b64(bits) };
}

async function demoSignUp({ name, email, password }) {
  const accounts = readJSON(ACCOUNTS_KEY, {});
  if (accounts[email]) throw new AuthError('An account with this email already exists. Try signing in instead.');
  const { salt, hash } = await hashPassword(password);
  const id = 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  accounts[email] = { id, name, email, salt, hash, createdAt: new Date().toISOString() };
  writeJSON(ACCOUNTS_KEY, accounts);
  return setSession({ uid: id, email, name, mode: 'demo' });
}

async function demoSignIn({ email, password }) {
  const acct = readJSON(ACCOUNTS_KEY, {})[email];
  const bad = new AuthError('Incorrect email or password.');
  if (!acct) throw bad;
  const { hash } = await hashPassword(password, acct.salt);
  if (hash !== acct.hash) throw bad;
  return setSession({ uid: acct.id, email, name: acct.name, mode: 'demo' });
}

// --- cloud mode (Supabase GoTrue REST) ---
async function sb(path, { method = 'POST', body, token } = {}) {
  let res;
  try {
    res = await fetch(`${CONFIG.SUPABASE_URL.replace(/\/$/, '')}/auth/v1${path}`, {
      method,
      headers: { apikey: CONFIG.SUPABASE_ANON_KEY, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new AuthError('Could not reach the sign-in service. Check your connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error_description || data.msg || data.message || '';
    if (/invalid login/i.test(msg)) throw new AuthError('Incorrect email or password.');
    if (/already registered|already exists/i.test(msg)) throw new AuthError('An account with this email already exists. Try signing in instead.');
    if (/email not confirmed/i.test(msg)) throw new AuthError('Please confirm your email first. Check your inbox for the link.');
    if (res.status === 429) throw new AuthError('Too many attempts. Please wait a minute and try again.');
    throw new AuthError(msg || 'Something went wrong. Please try again.');
  }
  return data;
}

const fromSupabase = (d, fallbackName = '') =>
  setSession({
    uid: d.user.id,
    email: d.user.email,
    name: d.user.user_metadata?.name || fallbackName,
    mode: 'cloud',
    accessToken: d.access_token,
    refreshToken: d.refresh_token,
    expiresAt: Date.now() + (d.expires_in || 3600) * 1000,
  });

// --- public API ---
export async function signUp({ name = '', email, password }) {
  email = email.trim().toLowerCase();
  name = name.trim();
  const errors = validateCredentials({ email, password, name }, { signup: true });
  if (Object.keys(errors).length) throw Object.assign(new AuthError('Please fix the highlighted fields.'), { fields: errors });
  if (!cloudEnabled()) return { session: await demoSignUp({ name, email, password }) };
  const d = await sb('/signup', { body: { email, password, data: { name } } });
  if (!d.access_token) return { needsConfirmation: true };
  return { session: fromSupabase(d, name) };
}

export async function signIn({ email, password }) {
  email = email.trim().toLowerCase();
  const errors = validateCredentials({ email, password });
  if (Object.keys(errors).length) throw Object.assign(new AuthError('Please fix the highlighted fields.'), { fields: errors });
  if (!cloudEnabled()) return demoSignIn({ email, password });
  return fromSupabase(await sb('/token?grant_type=password', { body: { email, password } }));
}

export async function requestPasswordReset(email) {
  email = email.trim().toLowerCase();
  const errors = validateCredentials({ email, password: 'x' });
  if (errors.email) throw Object.assign(new AuthError(errors.email), { fields: errors });
  if (!cloudEnabled()) {
    throw new AuthError('Password reset by email needs real accounts, which are not switched on for this copy of DermaLogic. Demo accounts only exist on this device.');
  }
  await sb('/recover', { body: { email } });
  return true;
}

// On startup: keep the session if it is still valid; refresh it if it expired.
// Offline is not a reason to sign someone out.
export async function restoreSession() {
  const s = currentSession();
  if (!s) return null;
  if (s.mode !== 'cloud') return s;
  if (!cloudEnabled()) return null;
  if (s.expiresAt && s.expiresAt - Date.now() > 60000) return s;
  try {
    const d = await sb('/token?grant_type=refresh_token', { body: { refresh_token: s.refreshToken } });
    return fromSupabase(d, s.name);
  } catch (e) {
    if (e.message.startsWith('Could not reach')) return s;
    signOut();
    return null;
  }
}
