const store = require('../lib/store');
const { dayNameFromKey } = require('../lib/parser');

// ---- date/time helpers ----
function timeToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function addDays(dateKey, n) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function dateAtMinutes(dateKey, minutes) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d, 0, minutes, 0);
}

function buildTimeline(dateKeys, scheduleByDate, empId) {
  return dateKeys.map((date) => ({ date, entry: (scheduleByDate[date] || {})[empId] || null }));
}

// Enforces: no more than 7 consecutive working days, and at least 12h
// between the end of one shift and the start of the next.
function isTimelineValid(timeline) {
  let run = 0;
  let maxRun = 0;
  for (const { entry } of timeline) {
    const working = entry && entry.type === 'shift';
    run = working ? run + 1 : 0;
    if (run > maxRun) maxRun = run;
  }
  if (maxRun > 7) return false;

  const shifts = [];
  for (const { date, entry } of timeline) {
    if (!entry || entry.type !== 'shift') continue;
    const inMin = timeToMinutes(entry.in);
    const outMin = timeToMinutes(entry.out);
    const start = dateAtMinutes(date, inMin);
    let end = dateAtMinutes(date, outMin);
    if (outMin <= inMin) end = new Date(end.getTime() + 24 * 60 * 60 * 1000); // overnight shift
    shifts.push({ start, end });
  }
  shifts.sort((a, b) => a.start - b.start);
  for (let i = 1; i < shifts.length; i++) {
    const gapHours = (shifts[i].start - shifts[i - 1].end) / 3600000;
    if (gapHours < 12) return false;
  }
  return true;
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  res.setHeader('Cache-Control', 'no-store');

  try {
    const draft = await store.loadDraft();
    if (!draft || !draft.meta || !draft.meta.datesAffected || draft.meta.datesAffected.length === 0) {
      res.status(200).json({ draftDates: [], employees: [], pairs: [] });
      return;
    }
    const final = await store.load();

    const draftDates = [...draft.meta.datesAffected].sort();
    const priorDates = [];
    for (let i = 7; i >= 1; i--) priorDates.push(addDays(draftDates[0], -i));

    const empIds = Object.keys(draft.employees);

    // anyone with a CP day anywhere in the draft week can't swap or be swapped
    const cpSet = new Set();
    for (const date of draftDates) {
      const day = draft.schedule[date] || {};
      for (const [empId, entry] of Object.entries(day)) {
        if (entry && entry.type === 'status' && entry.code === 'CP') cpSet.add(empId);
      }
    }
    const eligible = empIds.filter((id) => !cpSet.has(id));

    const weekOf = (empId) => draftDates.map((date) => ({
      date,
      dayName: dayNameFromKey(date),
      ...((draft.schedule[date] && draft.schedule[date][empId]) || { type: 'status', code: 'OFF', label: 'No shift' }),
    }));

    const pairs = [];
    for (let i = 0; i < eligible.length; i++) {
      for (let j = i + 1; j < eligible.length; j++) {
        const a = eligible[i];
        const b = eligible[j];

        // hypothetical schedule with A's and B's entire draft weeks swapped
        const swapped = {};
        for (const date of draftDates) {
          const day = draft.schedule[date] || {};
          swapped[date] = { ...day, [a]: day[b] || null, [b]: day[a] || null };
        }

        const timelineA = [...buildTimeline(priorDates, final.schedule, a), ...buildTimeline(draftDates, swapped, a)];
        const timelineB = [...buildTimeline(priorDates, final.schedule, b), ...buildTimeline(draftDates, swapped, b)];

        if (isTimelineValid(timelineA) && isTimelineValid(timelineB)) pairs.push([a, b]);
      }
    }

    const employees = empIds.map((id) => ({
      id,
      name: draft.employees[id].name,
      skill: draft.employees[id].skill,
      excluded: cpSet.has(id),
      excludeReason: cpSet.has(id) ? 'Has paid leave (CP) this week' : null,
      week: weekOf(id),
    }));

    res.status(200).json({ draftDates, employees, pairs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to compute swap candidates' });
  }
};
