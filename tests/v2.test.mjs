import { test } from 'node:test';
import assert from 'node:assert/strict';

// Minimal localStorage for the demo-account code.
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };

const { resolveRoute } = await import('../js/routes.js');
const { skinScore, scoreTrend, nextAction, greeting } = await import('../js/score.js');
const { cropRect, mapYoucamScores, mergeResults, analyzeInCloud } = await import('../js/youcam.js');
const { CONFIG } = await import('../js/config.js');
const REAL_CFG = { ...CONFIG };
const auth = await import('../js/auth.js');
const api = await import('../api/youcam.js');

test('routes: logged-out visitors only see public pages', () => {
  assert.equal(resolveRoute('', false, false), 'landing');
  assert.equal(resolveRoute('#/home', false, false), 'landing');
  assert.equal(resolveRoute('#/welcome', false, false), 'landing');
  assert.equal(resolveRoute('#/login', false, false), 'login');
  assert.equal(resolveRoute('#/nonsense', false, false), 'landing');
});

test('routes: signed-in users skip public pages and finish onboarding first', () => {
  assert.equal(resolveRoute('#/login', true, true), 'home');
  assert.equal(resolveRoute('#/landing', true, true), 'home');
  assert.equal(resolveRoute('#/analyze', true, false), 'welcome');
  assert.equal(resolveRoute('#/welcome', true, true), 'welcome');
  assert.equal(resolveRoute('#/analyze?x=1', true, true), 'analyze');
  assert.equal(resolveRoute('', true, true), 'home');
});

test('skin score inverts concern scores and trends compare two scans', () => {
  assert.equal(skinScore({ concerns: { a: { score: 20 }, b: { score: 40 } } }), 70);
  assert.equal(skinScore({ concerns: {} }), null);
  assert.equal(scoreTrend(60, 70).dir, 'up');
  assert.equal(scoreTrend(70, 60).dir, 'down');
  assert.equal(scoreTrend(70, 71).dir, 'flat');
  assert.equal(scoreTrend(null, 70).dir, 'flat');
  assert.equal(greeting(new Date(2026, 0, 1, 9)), 'Good morning');
  assert.equal(greeting(new Date(2026, 0, 1, 20)), 'Good evening');
});

test('next action follows a sensible priority', () => {
  const base = { profile: {}, analyses: [1], dueFollowUps: 0, planDone: 4, planTotal: 4, lifestyleLogged: true };
  assert.equal(nextAction({ ...base, profile: null }).route, 'profile');
  assert.equal(nextAction({ ...base, dueFollowUps: 1 }).route, 'complaints');
  assert.equal(nextAction({ ...base, analyses: [] }).route, 'analyze');
  assert.equal(nextAction({ ...base, planDone: 1 }).anchor, 'today-h');
  assert.equal(nextAction({ ...base, lifestyleLogged: false }).route, 'lifestyle');
  assert.equal(nextAction(base).route, 'progress');
});

test('YouCam scores map to concerns (healthy score becomes concern score)', () => {
  const c = mapYoucamScores({ redness: 90, age_spot: 40, oiliness: 55, acne: 100, dark_circle_v2: 70, moisture: 30, pore: 80, texture: 60 });
  assert.equal(c.redness.score, 10);
  assert.equal(c.redness.level, 'low');
  assert.equal(c.hyperpigmentation.score, 60);
  assert.equal(c.hyperpigmentation.level, 'noticeable');
  assert.equal(c.dryness.score, 70);
  assert.equal(c.texture.score, 40); // worst of pore and texture
  assert.equal(c.acne.score, 0);
  assert.ok(Object.values(c).every((x) => x.source === 'youcam'));
  assert.deepEqual(mapYoucamScores({}), {});
  const merged = mergeResults({ tone: { category: 'Brown' }, concerns: { redness: { score: 99 }, extra: { score: 1 } } }, c);
  assert.equal(merged.concerns.redness.score, 10);
  assert.equal(merged.concerns.extra.score, 1);
  assert.equal(merged.tone.category, 'Brown');
  assert.equal(merged.engine, 'youcam');
});

test('crop keeps the face about 70% of the width and stays inside the image', () => {
  const size = { width: 900, height: 1200 };
  const r = cropRect({ x: 300, y: 300, width: 300, height: 380 }, size);
  assert.ok(Math.abs(300 / r.width - 0.7) < 0.02);
  assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.width <= 900 && r.y + r.height <= 1200);
  const edge = cropRect({ x: 0, y: 0, width: 800, height: 900 }, size);
  assert.ok(edge.x === 0 && edge.width <= 900 && edge.height <= 1200);
});

test('analyzeInCloud reports server errors with a code', async () => {
  const mk = (status, body) => async () => ({ ok: status < 400, status, headers: { get: () => 'application/json' }, json: async () => body });
  await assert.rejects(analyzeInCloud('data:x', { fetchImpl: mk(503, { error: 'not_configured', message: 'nope' }) }), (e) => e.code === 'not_configured');
  await assert.rejects(analyzeInCloud('data:x', { fetchImpl: async () => { throw new Error('offline'); } }), (e) => e.code === 'network');
  assert.deepEqual(await analyzeInCloud('data:x', { fetchImpl: mk(200, { scores: { acne: 90 } }) }), { acne: 90 });
});

test('validation and password strength', () => {
  assert.ok(auth.validateCredentials({ email: 'bad', password: 'x' }).email);
  assert.deepEqual(auth.validateCredentials({ email: 'a@b.co', password: 'secret123' }, { signup: true }), {});
  assert.ok(auth.validateCredentials({ email: 'a@b.co', password: 'short1' }, { signup: true }).password);
  assert.ok(auth.validateCredentials({ email: 'a@b.co', password: 'onlyletters' }, { signup: true }).password);
  assert.ok(auth.passwordStrength('Abcdef12345!').level >= 3);
  assert.equal(auth.passwordStrength('abc').level, 0);
});

test('demo accounts: sign up, sign in, wrong password, duplicates, hashing', async (t) => {
  Object.assign(CONFIG, { SUPABASE_URL: '', SUPABASE_ANON_KEY: '' });
  t.after(() => Object.assign(CONFIG, REAL_CFG));
  const up = await auth.signUp({ name: 'Ada', email: ' Ada@Example.com ', password: 'secret123' });
  assert.equal(up.session.email, 'ada@example.com');
  assert.equal(up.session.mode, 'demo');
  assert.equal(auth.currentSession().uid, up.session.uid);
  const stored = JSON.parse(mem.get('dermalogic:accounts'))['ada@example.com'];
  assert.ok(stored.hash && stored.salt);
  assert.ok(!JSON.stringify(stored).includes('secret123'));

  await assert.rejects(auth.signUp({ name: 'Ada', email: 'ada@example.com', password: 'secret123' }), /already exists/);
  await assert.rejects(auth.signIn({ email: 'ada@example.com', password: 'wrong-pass1' }), /Incorrect email or password/);
  await assert.rejects(auth.signIn({ email: 'nobody@example.com', password: 'secret123' }), /Incorrect email or password/);
  const again = await auth.signIn({ email: 'ADA@example.com', password: 'secret123' });
  assert.equal(again.uid, up.session.uid);
  auth.signOut();
  assert.equal(auth.currentSession(), null);
  await assert.rejects(auth.requestPasswordReset('ada@example.com'), /not switched on/);
});

// --- serverless function ---
const res = () => {
  const r = { headers: {}, setHeader(k, v) { r.headers[k] = v; }, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; } };
  return r;
};
const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(2000, 1)]);

function fakeYoucam({ status = 'success', taskFields = {} } = {}) {
  const calls = [];
  const fetchImpl = async (url, opts = {}) => {
    calls.push([opts.method || 'GET', url, opts]);
    const json = (code, body) => ({ ok: code < 400, status: code, json: async () => body });
    if (url.endsWith('/s2s/v2.0/file/skin-analysis')) return json(200, { status: 200, data: { files: [{ file_id: 'f1', requests: [{ url: 'https://upload.test/put', method: 'PUT', headers: { 'Content-Type': 'image/jpeg' } }] }] } });
    if (url === 'https://upload.test/put') return { ok: true, status: 200 };
    if (url.endsWith('/s2s/v2.0/task/skin-analysis')) return json(200, { status: 200, data: { task_id: 't1' } });
    if (url.includes('/task/skin-analysis/t1')) {
      return json(200, { status: 200, data: { task_status: status, ...taskFields, results: { output: [{ type: 'acne', ui_score: 88 }, { type: 'moisture', ui_score: 41.4 }, { type: 'all', ui_score: 'x' }] } } });
    }
    return json(404, {});
  };
  return { fetchImpl, calls };
}

test('API: runs the four YouCam steps with the key and returns scores', async () => {
  process.env.YOUCAM_API_KEY = 'test-key';
  delete process.env.SUPABASE_URL;
  const { fetchImpl, calls } = fakeYoucam();
  const r = res();
  await api.default({ method: 'POST', headers: { 'x-forwarded-for': '1.1.1.1' }, body: { image: 'data:image/jpeg;base64,' + jpeg.toString('base64') } }, r, { fetchImpl, sleep: async () => {} });
  assert.equal(r.code, 200);
  assert.deepEqual(r.body.scores, { acne: 88, moisture: 41 });
  assert.equal(calls.length, 4);
  assert.equal(calls[0][2].headers.Authorization, 'Bearer test-key');
  assert.deepEqual(JSON.parse(calls[2][2].body).dst_actions, api.ACTIONS);
  assert.equal(calls[1][1], 'https://upload.test/put');
  assert.equal(r.headers['Cache-Control'], 'no-store');
});

test('API: rejects bad method, missing key, bad image, and maps YouCam errors', async () => {
  const run = async (req, deps) => { const r = res(); await api.default({ headers: {}, ...req }, r, deps); return r; };
  assert.equal((await run({ method: 'GET' })).code, 405);

  delete process.env.YOUCAM_API_KEY;
  assert.equal((await run({ method: 'POST', body: {} })).body.error, 'not_configured');

  process.env.YOUCAM_API_KEY = 'k';
  assert.equal((await run({ method: 'POST', headers: { 'x-forwarded-for': '2.2.2.2' }, body: { image: 'AAAA' } })).code, 400);
  const notJpeg = Buffer.alloc(3000, 7).toString('base64');
  assert.equal((await run({ method: 'POST', headers: { 'x-forwarded-for': '2.2.2.2' }, body: { image: notJpeg } })).body.error, 'bad_image');

  const good = { method: 'POST', body: { image: jpeg.toString('base64') } };
  const failed = fakeYoucam({ status: 'error', taskFields: { error: 'error_no_face_detected' } });
  const r1 = await run({ ...good, headers: { 'x-forwarded-for': '3.3.3.3' } }, { fetchImpl: failed.fetchImpl, sleep: async () => {} });
  assert.equal(r1.body.error, 'no_face');
  assert.equal(r1.code, 422);

  const badKey = async () => ({ ok: false, status: 401, json: async () => ({}) });
  const r2 = await run({ ...good, headers: { 'x-forwarded-for': '4.4.4.4' } }, { fetchImpl: badKey, sleep: async () => {} });
  assert.equal(r2.body.error, 'bad_key');
  assert.ok(!JSON.stringify(r2.body).includes('Bearer'));
});

test('API: requires a signed-in user when Supabase is configured, and rate limits', async () => {
  process.env.YOUCAM_API_KEY = 'k';
  process.env.SUPABASE_URL = 'https://x.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'anon';
  const yc = fakeYoucam();
  const fetchImpl = async (url, o) => (url.includes('supabase.co') ? { ok: o.headers.Authorization === 'Bearer good' } : yc.fetchImpl(url, o));
  const body = { image: jpeg.toString('base64') };
  const call = async (token, ip) => { const r = res(); await api.default({ method: 'POST', headers: { authorization: token ? `Bearer ${token}` : '', 'x-forwarded-for': ip }, body }, r, { fetchImpl, sleep: async () => {} }); return r; };
  assert.equal((await call('', '5.5.5.5')).code, 401);
  assert.equal((await call('bad', '5.5.5.5')).code, 401);
  assert.equal((await call('good', '5.5.5.5')).code, 200);
  let last;
  for (let i = 0; i < 8; i++) last = await call('good', '6.6.6.6');
  assert.equal(last.code, 429);
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
});

test('coach: measures a frame and gives the right advice', async () => {
  const { measureFrame, coachMessage, COACH } = await import('../js/coach.js');
  const W = 40, H = 50;
  const frame = (fn) => { const d = new Uint8ClampedArray(W * H * 4); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const [r, g, b] = fn(x / W, y / H); const i = (y * W + x) * 4; d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255; } return d; };
  const skin = [200, 150, 125], wall = [60, 70, 120], black = [5, 5, 5], white = [250, 250, 250];
  const inOval = (x, y) => ((x - 0.5) / 0.2) ** 2 + ((y - 0.48) / 0.34) ** 2 <= 1;
  assert.equal(coachMessage(measureFrame(frame(() => black), W, H)).key, 'dark');
  assert.equal(coachMessage(measureFrame(frame(() => white), W, H)).key, 'bright');
  assert.equal(coachMessage(measureFrame(frame(() => wall), W, H)).key, 'place');
  const good = coachMessage(measureFrame(frame((x, y) => (inOval(x, y) ? skin : wall)), W, H));
  assert.equal(good.key, 'ready'); assert.ok(good.ready);
  const close = coachMessage(measureFrame(frame(() => skin), W, H));
  assert.equal(close.key, 'back');
  const partial = coachMessage(measureFrame(frame((x, y) => (inOval(x, y) && x < 0.5 ? skin : wall)), W, H));
  assert.equal(partial.key, 'closer');
  assert.ok(COACH.ready);
});

test('reminders schedule sorts today into upcoming, due and complete', async () => {
  const { todaySchedule } = await import('../js/views/reminders.js');
  const s = { reminders: { am: '07:30', pm: '21:30', lifestyle: '20:00', sunscreen: false }, routineLog: {}, lifestyle: {}, profile: null, analyses: [] };
  const noon = new Date(2026, 9, 25, 12, 0);
  const rows = todaySchedule(s, noon);
  assert.deepEqual(rows.map((r) => [r.id, r.state]), [['am', 'due'], ['ls', 'upcoming'], ['pm', 'upcoming']]);
  const done = todaySchedule({ ...s, lifestyle: { '2026-10-25': { sleepHours: 7 } } }, noon);
  assert.equal(done.find((r) => r.id === 'ls').state, 'complete');
  assert.equal(todaySchedule({ ...s, reminders: { ...s.reminders, sunscreen: true } }, noon).length, 6);
});

test('voice: long replies are split into short sentences for phones', async () => {
  const { chunkText } = await import('../js/voice.js');
  const long = 'Morning:\n1. Cleanse. 2. Treat with niacinamide for oiliness, which helps balance shine and keep pores looking small over time. 3. ' + 'Moisturize with a light gel that does not clog pores and keeps skin comfortable all day long, even in dry air, '.repeat(3) + 'Finish with sunscreen.';
  const chunks = chunkText(long);
  assert.ok(chunks.length > 2);
  assert.ok(chunks.every((c) => c.length <= 260), 'no chunk is huge');
  assert.equal(chunks.join(' ').replace(/[\s.,]+/g, ''), long.replace(/\n+/g, ' ').replace(/[\s.,]+/g, ''));
  assert.deepEqual(chunkText('Hello there.'), ['Hello there.']);
});

test('chat follow-ups depend on the reply', async () => {
  const { followUps } = await import('../js/views/chat.js');
  assert.ok(followUps({ text: 'Your morning routine: cleanse' }).includes('Read my evening routine'));
  assert.deepEqual(followUps({ text: 'call emergency', urgent: true }), []);
  assert.ok(followUps({ text: 'something unrelated' }).length > 0);
});

test('password reset: parses the emailed link and updates the password', async (t) => {
  assert.deepEqual(auth.parseRecoveryHash('#access_token=abc&refresh_token=r&type=recovery'), { token: 'abc' });
  assert.match(auth.parseRecoveryHash('#error=access_denied&error_code=otp_expired&error_description=x').error, /expired/);
  assert.equal(auth.parseRecoveryHash('#/login'), null);
  assert.equal(resolveRoute('#/reset', false, false), 'reset');
  const realFetch = globalThis.fetch;
  let call;
  globalThis.fetch = async (url, o) => { call = { url, o }; return { ok: true, json: async () => ({}) }; };
  t.after(() => { globalThis.fetch = realFetch; });
  await auth.updatePassword('tok', 'newpass123');
  assert.match(call.url, /\/auth\/v1\/user$/);
  assert.equal(call.o.method, 'PUT');
  assert.equal(call.o.headers.Authorization, 'Bearer tok');
  await assert.rejects(() => auth.updatePassword('tok', 'short'));
});
