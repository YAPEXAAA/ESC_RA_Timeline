const { parseWorkbook } = require('../lib/parser');
const store = require('../lib/store');

const UPLOAD_PASSWORD = process.env.UPLOAD_PASSWORD || 'changeme';

// Vercel Functions cap the whole request body at 4.5MB, and base64 inflates
// the raw file by ~33%. This keeps us comfortably under that ceiling.
const MAX_FILE_BYTES = 3 * 1024 * 1024;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const provided = req.headers['x-upload-password'] || '';
  if (provided !== UPLOAD_PASSWORD) {
    res.status(401).json({ error: 'Wrong password' });
    return;
  }

  const { filename, fileBase64, mode } = req.body || {};
  const isDraft = mode === 'draft';
  if (!filename || !fileBase64) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }
  if (!/\.(xlsx|xlsm)$/i.test(filename)) {
    res.status(400).json({ error: 'Only .xlsx files are supported' });
    return;
  }

  let buffer;
  try {
    buffer = Buffer.from(fileBase64, 'base64');
  } catch (err) {
    res.status(400).json({ error: 'Could not read the uploaded file' });
    return;
  }

  if (buffer.length > MAX_FILE_BYTES) {
    res.status(400).json({ error: `File too large (max ${MAX_FILE_BYTES / (1024 * 1024)}MB)` });
    return;
  }

  try {
    const parsed = parseWorkbook(buffer);

    if (isDraft) {
      const state = await store.saveDraftUpload(parsed, filename);
      res.status(200).json({
        ok: true,
        mode: 'draft',
        sheetsParsed: parsed.sheetsParsed,
        datesAffected: parsed.datesFound,
        employeeCount: Object.keys(state.employees).length,
      });
      return;
    }

    const state = await store.mergeUpload(parsed, filename);
    res.status(200).json({
      ok: true,
      mode: 'final',
      sheetsParsed: parsed.sheetsParsed,
      datesAffected: parsed.datesFound,
      employeeCount: Object.keys(state.employees).length,
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};