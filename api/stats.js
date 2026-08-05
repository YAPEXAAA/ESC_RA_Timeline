const store = require('../lib/store');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const state = await store.load();
    const dates = Object.keys(state.schedule).sort();
    res.status(200).json({
      employeeCount: Object.keys(state.employees).length,
      dateCount: dates.length,
      firstDate: dates[0] || null,
      lastDate: dates[dates.length - 1] || null,
      lastUpload: state.meta.lastUpload,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load schedule data' });
  }
};
