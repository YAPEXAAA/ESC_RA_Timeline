const store = require('../lib/store');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  res.setHeader('Cache-Control', 'no-store');

  try {
    const state = await store.load();
    const employeeCount = Object.keys(state.employees).length;
    const dateKeys = Object.keys(state.schedule).sort();

    res.status(200).json({
      employeeCount,
      firstDate: dateKeys[0] || null,
      lastDate: dateKeys[dateKeys.length - 1] || null,
      lastUpload: state.meta?.lastUpload || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
};