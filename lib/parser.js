const XLSX = require('xlsx');

// Known non-time status codes and how to label them.
// Anything not in this list still works fine — it just gets displayed as-is.
const STATUS_LABELS = {
  R: 'Day off',
  CP: 'Paid leave',
};

function pad2(n) {
  return String(n).padStart(2, '0');
}

// Turn a raw cell value (Date/time object, Excel time fraction, or string like "R"/"CP")
// into either a "HH:MM" string or a status code string. Returns null for empty cells.
function normalizeCell(value) {
  if (value === null || value === undefined || value === '') return null;

  if (value instanceof Date) {
    return `${pad2(value.getHours())}:${pad2(value.getMinutes())}`;
  }
  if (typeof value === 'number') {
    // Excel stores time-only values as a fraction of a day
    const totalMinutes = Math.round(value * 24 * 60);
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    return `${pad2(h)}:${pad2(m)}`;
  }
  const str = String(value).trim();
  return str === '' ? null : str;
}

function isTime(str) {
  return /^\d{2}:\d{2}$/.test(str);
}

function toDateKey(value) {
  let d;
  if (value instanceof Date) {
    d = value;
  } else if (typeof value === 'number') {
    d = XLSX.SSF.parse_date_code(value);
    d = new Date(d.y, d.m - 1, d.d);
  } else {
    return null;
  }
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function dayNameFromKey(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return DAY_NAMES[new Date(y, m - 1, d).getDay()];
}

// Builds a lowercase header-text -> column-index map from the header row.
// Skips the repeating "I"/"O" day columns (those are located separately by
// position in dateCols) so only the identity columns (Nom & Prenom, Mat,
// TWW ID, Skill, Team, ...) are captured. Keeps the first occurrence of a
// given label if it somehow appears twice.
function buildColMap(headerRow) {
  const map = {};
  (headerRow || []).forEach((cell, i) => {
    if (cell === null || cell === undefined) return;
    const key = String(cell).trim().toLowerCase();
    if (!key || key === 'i' || key === 'o') return;
    if (!(key in map)) map[key] = i;
  });
  return map;
}

// Resolves a column index by trying several possible header spellings, in
// order, falling back to a fixed position if none of the header labels match
// (keeps old files with slightly different/missing headers working).
function resolveCol(colMap, aliases, fallback) {
  for (const alias of aliases) {
    const idx = colMap[alias];
    if (idx !== undefined) return idx;
  }
  return fallback;
}

// Scans one worksheet. Returns null if it doesn't look like a schedule sheet.
function parseSheet(ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });

  // Find the header row: the one containing something like "Nom" / "Name" in col A/B
  // and "Mat" nearby. We search the first 10 rows.
  let headerRowIdx = -1;
  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const row = rows[r] || [];
    const joined = row.slice(0, 4).map((c) => (c ? String(c).toLowerCase() : '')).join('|');
    if (joined.includes('nom') || joined.includes('name')) {
      headerRowIdx = r;
      break;
    }
  }
  if (headerRowIdx === -1 || headerRowIdx < 2) return null;

  const dateRow = rows[headerRowIdx - 2] || [];
  const headerRow = rows[headerRowIdx] || [];

  // Find date columns by walking the header row for "I" (time-in) markers, pairing
  // each with the "O" column right after it, then reading the date two rows up.
  // Some schedule files compute days 2-7 as "=prevDate+1" formulas — if a formula's
  // cached value is ever missing, fall back to inferring it from the previous day
  // rather than dropping that day entirely.
  const dateCols = [];
  let lastDateKey = null;
  for (let c = 0; c < headerRow.length; c++) {
    const label = headerRow[c] ? String(headerRow[c]).trim().toLowerCase() : '';
    if (label !== 'i') continue;

    let key = toDateKey(dateRow[c]);
    if (!key && lastDateKey) {
      const [y, m, d] = lastDateKey.split('-').map(Number);
      const next = new Date(y, m - 1, d + 1);
      key = `${next.getFullYear()}-${pad2(next.getMonth() + 1)}-${pad2(next.getDate())}`;
    }
    if (!key) continue;

    dateCols.push({ dateKey: key, inCol: c, outCol: c + 1 });
    lastDateKey = key;
  }
  if (dateCols.length === 0) return null;

  // Identity columns (Nom & Prenom, Mat, TWW ID, Skill, ...) aren't always in
  // the same order between weekly files, so resolve them by header text
  // rather than trusting a fixed position. Falls back to the W36-style
  // position (0,1,2,3) if a header label isn't recognized.
  const colMap = buildColMap(headerRow);
  const nameCol = resolveCol(colMap, ['nom & prenom', 'nom et prenom', 'name'], 0);
  const matCol = resolveCol(colMap, ['mat'], 1);
  const twwIdCol = resolveCol(colMap, ['tww id', 'twwid', 'tww_id'], 2);
  const skillCol = resolveCol(colMap, ['skill'], 3);

  const employees = {};
  const scheduleByDate = {};

  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const name = row[nameCol] ? String(row[nameCol]).trim() : '';
    if (!name) continue;

    const mat = row[matCol] !== null && row[matCol] !== undefined ? String(row[matCol]).trim() : '';
    const twwId = row[twwIdCol] !== null && row[twwIdCol] !== undefined ? String(row[twwIdCol]).trim() : '';
    const skill = row[skillCol] ? String(row[skillCol]).trim() : '';

    const id = twwId || mat || name.toLowerCase().replace(/\s+/g, '-');

    employees[id] = { id, name, mat, twwId, skill };

    for (const { dateKey, inCol, outCol } of dateCols) {
      const inRaw = normalizeCell(row[inCol]);
      const outRaw = normalizeCell(row[outCol]);
      if (inRaw === null && outRaw === null) continue;

      let entry;
      if (isTime(inRaw) && isTime(outRaw)) {
        entry = { type: 'shift', in: inRaw, out: outRaw };
      } else if (inRaw && inRaw === outRaw) {
        entry = {
          type: 'status',
          code: inRaw,
          label: STATUS_LABELS[inRaw] || inRaw,
        };
      } else {
        entry = { type: 'other', in: inRaw, out: outRaw };
      }

      if (!scheduleByDate[dateKey]) scheduleByDate[dateKey] = {};
      scheduleByDate[dateKey][id] = entry;
    }
  }

  if (Object.keys(employees).length === 0) return null;

  return { employees, scheduleByDate, datesFound: dateCols.map((d) => d.dateKey) };
}

// Parses an uploaded workbook (Buffer). Returns { employees, scheduleByDate, datesFound, sheetsParsed }
function parseWorkbook(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });

  const employees = {};
  const scheduleByDate = {};
  const datesFound = new Set();
  const sheetsParsed = [];

  for (const sheetName of wb.SheetNames) {
    const result = parseSheet(wb.Sheets[sheetName]);
    if (!result) continue;
    sheetsParsed.push(sheetName);

    Object.assign(employees, result.employees);
    for (const [dateKey, dayData] of Object.entries(result.scheduleByDate)) {
      if (!scheduleByDate[dateKey]) scheduleByDate[dateKey] = {};
      Object.assign(scheduleByDate[dateKey], dayData);
      datesFound.add(dateKey);
    }
  }

  if (sheetsParsed.length === 0) {
    throw new Error(
      'No schedule sheet found. Expected a header row containing "Nom & Prenom" (or "Name") with dates two rows above it.'
    );
  }

  return {
    employees,
    scheduleByDate,
    datesFound: [...datesFound].sort(),
    sheetsParsed,
  };
}

module.exports = { parseWorkbook, dayNameFromKey };
