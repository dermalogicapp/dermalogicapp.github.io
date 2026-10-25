// Dashboard numbers derived from scan results. Pure functions.

// 0-100, higher is better. Average of how noticeable each concern is, inverted.
export function skinScore(result) {
  const vals = Object.values(result?.concerns || {}).map((c) => c.score).filter(Number.isFinite);
  if (!vals.length) return null;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.max(0, Math.min(100, Math.round(100 - mean)));
}

// Compares the two latest scores. Within 2 points counts as steady.
export function scoreTrend(prev, cur) {
  if (prev == null || cur == null) return { dir: 'flat', delta: 0, text: 'First score recorded' };
  const delta = cur - prev;
  if (Math.abs(delta) <= 2) return { dir: 'flat', delta, text: 'Holding steady' };
  return delta > 0 ? { dir: 'up', delta, text: `Up ${delta} since last scan` } : { dir: 'down', delta, text: `Down ${-delta} since last scan` };
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return 'Still up';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

// The single most useful thing to do next, in priority order.
export function nextAction({ profile, analyses, dueFollowUps, planDone, planTotal, lifestyleLogged }) {
  if (!profile) return { route: 'profile', label: 'Set up your skin profile', why: 'It takes two minutes and personalises everything.' };
  if (dueFollowUps > 0) return { route: 'complaints', label: 'Answer your follow-up', why: 'A quick check-in keeps the advice accurate.' };
  if (!analyses.length) return { route: 'analyze', label: 'Take your first face scan', why: 'It unlocks your tone, concerns and routine.' };
  if (planTotal && planDone < planTotal) return { route: 'home', label: 'Finish today\'s routine', why: `${planTotal - planDone} step${planTotal - planDone === 1 ? '' : 's'} left today.`, anchor: 'today-h' };
  if (!lifestyleLogged) return { route: 'lifestyle', label: 'Log sleep, food and exercise', why: 'Habits show up on your skin within days.' };
  return { route: 'progress', label: 'Add a progress photo', why: 'Same spot, same light, to see change over time.' };
}
