// Which page a hash should show, given who is signed in. Pure so it can be tested.
export const PUBLIC = new Set(['landing', 'login', 'signup', 'forgot']);
export const APP = ['home', 'analyze', 'profile', 'routine', 'complaints', 'progress', 'lifestyle', 'ingredients', 'chat', 'reminders', 'settings'];
const KNOWN = new Set([...PUBLIC, ...APP, 'welcome']);

export function resolveRoute(hash, signedIn, onboarded) {
  let r = String(hash || '').replace(/^#\/?/, '').split('?')[0];
  if (!KNOWN.has(r)) r = signedIn ? 'home' : 'landing';
  if (!signedIn) return PUBLIC.has(r) ? r : 'landing';
  if (PUBLIC.has(r)) r = 'home';
  if (!onboarded && r !== 'welcome') return 'welcome';
  return r;
}
