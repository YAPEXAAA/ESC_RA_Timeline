const { put, get } = require('@vercel/blob');

// The whole schedule lives in one JSON blob. No random suffix, so the pathname
// (and therefore the URL) never changes — every upload overwrites it in place.
const BLOB_PATH = 'schedules.json';

function emptyState() {
  return {
    employees: {},
    schedule: {}, // dateKey -> employeeId -> entry
    meta: { lastUpload: null, uploads: [] },
  };
}

async function load() {
  try {
    const result = await get(BLOB_PATH, { access: 'private' });
    if (!result) return emptyState();
    const text = await new Response(result.stream).text();
    const parsed = JSON.parse(text);
    return { ...emptyState(), ...parsed };
  } catch (err) {
    console.error('Failed to read schedules blob, starting fresh:', err.message);
    return emptyState();
  }
}

async function save(state) {
  await put(BLOB_PATH, JSON.stringify(state), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true, // same pathname every time - this IS how re-uploads work
  });
}

// Merges a freshly parsed workbook into the persisted state.
// Rule: for every date present in the new upload, the OLD data for that exact
// date is discarded entirely first, then replaced with what's in the new file.
// This is what avoids stale/conflicting entries when a corrected schedule is re-uploaded.
async function mergeUpload({ employees, scheduleByDate, datesFound, sheetsParsed }, filename) {
  const state = await load();

  // Employees: upsert (latest upload wins on name/skill/mat for a given id)
  for (const [id, emp] of Object.entries(employees)) {
    state.employees[id] = emp;
  }

  // Dates: wipe then replace
  for (const dateKey of datesFound) {
    state.schedule[dateKey] = scheduleByDate[dateKey] || {};
  }

  state.meta.lastUpload = new Date().toISOString();
  state.meta.uploads.unshift({
    filename,
    uploadedAt: state.meta.lastUpload,
    datesAffected: datesFound,
    sheetsParsed,
  });
  state.meta.uploads = state.meta.uploads.slice(0, 20); // keep last 20 for history

  await save(state);
  return state;
}

module.exports = { load, save, mergeUpload };
