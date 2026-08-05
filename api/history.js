const store = require('../lib/store');

const UPLOAD_PASSWORD = process.env.UPLOAD_PASSWORD || 'changeme';

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const provided = req.headers['x-upload-password'] || '';
  if (provided !== UPLOAD_PASSWORD) {
    res.status(401).json({ error: 'Wrong password' });
    return;
  }

  try {
    const state = await store.load();
    res.status(200).json(state.meta.uploads);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load history' });
  }
};
