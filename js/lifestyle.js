// Lifestyle logging helpers and simple pattern finding between habits and skin.

export const FOOD_TAGS = {
  dairy: 'Dairy (milk, cheese, ice cream)',
  sugar: 'Sugary or high-GI foods',
  fried: 'Fried or greasy food',
  vegFruit: 'Plenty of fruit and vegetables',
  omega3: 'Oily fish, nuts or seeds',
  alcohol: 'Alcohol',
  caffeine: 'Lots of caffeine',
  spicy: 'Spicy food',
};

export const EXERCISE_TYPES = ['None', 'Walking', 'Running', 'Gym / weights', 'Cycling', 'Dance', 'Yoga / stretching', 'Sports', 'Other'];

const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

function nextDay(date) {
  const d = new Date(date + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

// Pairs each day's habits with that day's and the next day's skin rating,
// since food and sleep often show on the skin a day later.
function paired(entries) {
  return Object.entries(entries)
    .map(([date, e]) => {
      const ratings = [e.skinRating, entries[nextDay(date)]?.skinRating].filter((r) => r != null && r !== '');
      return ratings.length ? { date, e, rating: avg(ratings.map(Number)) } : null;
    })
    .filter(Boolean);
}

export function lifestyleInsights(entries, { minDays = 7, minGroup = 3 } = {}) {
  const rows = paired(entries || {});
  if (rows.length < minDays) {
    return { ready: false, daysLogged: rows.length, needed: minDays, insights: [] };
  }
  const factors = [
    ...Object.entries(FOOD_TAGS).map(([k, label]) => ({ label: `days with ${label.toLowerCase()}`, test: (e) => (e.foods || []).includes(k), other: (e) => !(e.foods || []).includes(k) })),
    { label: 'nights with under 6 hours of sleep', test: (e) => Number(e.sleepHours) > 0 && Number(e.sleepHours) < 6, other: (e) => Number(e.sleepHours) >= 7 },
    { label: 'days with under 4 glasses of water', test: (e) => e.waterGlasses !== '' && e.waterGlasses != null && Number(e.waterGlasses) < 4, other: (e) => Number(e.waterGlasses) >= 6 },
    { label: 'days with 20+ minutes of exercise', test: (e) => Number(e.exerciseMin) >= 20, other: (e) => !Number(e.exerciseMin) },
    { label: 'high-stress days', test: (e) => Number(e.stress) >= 4, other: (e) => Number(e.stress) > 0 && Number(e.stress) <= 2 },
  ];
  const insights = [];
  for (const f of factors) {
    const yes = rows.filter((r) => f.test(r.e)).map((r) => r.rating);
    const no = rows.filter((r) => f.other(r.e)).map((r) => r.rating);
    if (yes.length < minGroup || no.length < minGroup) continue;
    const diff = avg(yes) - avg(no);
    if (Math.abs(diff) < 0.5) continue;
    insights.push({
      factor: f.label,
      direction: diff < 0 ? 'worse' : 'better',
      withAvg: Math.round(avg(yes) * 10) / 10,
      withoutAvg: Math.round(avg(no) * 10) / 10,
      n: yes.length + no.length,
      text: `On ${f.label}, your skin rating averaged ${(Math.round(avg(yes) * 10) / 10).toFixed(1)} out of 5, compared with ${(Math.round(avg(no) * 10) / 10).toFixed(1)} otherwise (that day and the next).`,
    });
  }
  insights.sort((a, b) => Math.abs(b.withAvg - b.withoutAvg) - Math.abs(a.withAvg - a.withoutAvg));
  return { ready: true, daysLogged: rows.length, needed: minDays, insights };
}

export function lastNDays(n, end = new Date()) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    const z = (x) => String(x).padStart(2, '0');
    out.push(`${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`);
  }
  return out;
}
