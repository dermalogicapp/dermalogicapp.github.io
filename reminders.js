// Works out which reminders and follow-ups are due. Pure logic; the UI layer
// shows them as notifications and in-app banners.

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm || '').split(':').map(Number);
  return Number.isFinite(h) ? h * 60 + (m || 0) : null;
};

// Returns reminders whose time has passed today and that have not fired yet.
export function dueReminders(now, reminders, dateKey) {
  if (!reminders?.enabled) return [];
  const mins = now.getHours() * 60 + now.getMinutes();
  const fired = reminders.lastFired || {};
  const items = [
    { id: 'am', time: reminders.am, title: 'Morning routine', body: 'Time for your morning skincare: cleanse, treat, moisturize and sunscreen.' },
    { id: 'pm', time: reminders.pm, title: 'Evening routine', body: 'Time for your evening skincare routine.' },
    { id: 'lifestyle', time: reminders.lifestyle, title: 'Daily check-in', body: 'Log today\'s sleep, food, exercise and how your skin feels.' },
  ];
  if (reminders.sunscreen) {
    for (const t of ['11:00', '13:00', '15:00']) items.push({ id: `spf-${t}`, time: t, title: 'Sunscreen top-up', body: 'If you are outdoors, reapply your sunscreen.' });
  }
  return items.filter((r) => {
    const t = toMinutes(r.time);
    // Only fire within 2 hours of the scheduled time, so opening the app at
    // night does not replay the morning reminder.
    return t !== null && mins >= t && mins - t <= 120 && fired[r.id] !== dateKey;
  });
}

export function followUpDate(fromISO, days) {
  const d = new Date(fromISO);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// Complaints with a follow-up due on or before now and not yet answered.
export function dueFollowUps(complaints, now = new Date()) {
  return (complaints || []).filter((c) => !c.resolved && c.nextFollowUp && new Date(c.nextFollowUp) <= now);
}

// What to do after a follow-up answer.
export function followUpAdvice(answer, complaint) {
  if (answer === 'better') {
    return { text: 'Good news. Keep doing what is working. We will check in again in a week.', nextDays: 7 };
  }
  if (answer === 'resolved') return { text: 'Glad it has cleared up. This complaint is now marked as resolved.', nextDays: null, resolve: true };
  if (answer === 'same') {
    const n = (complaint.followUps || []).filter((f) => f.answer === 'same').length;
    if (n >= 1) {
      return { text: 'It has not changed over two check-ins. If it has lasted more than 2 to 3 weeks, it is worth showing a pharmacist or doctor.', nextDays: 5 };
    }
    return { text: 'Thanks for the update. Give the steps a few more days; we will check again soon.', nextDays: 4 };
  }
  return {
    text: 'Sorry it is getting worse. Stop any new or active products, keep to gentle basics, and please see a doctor or dermatologist, especially if it is spreading, painful or blistering.',
    nextDays: 2,
    escalate: true,
  };
}
