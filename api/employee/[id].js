const store = require('../../lib/store');
const { dayNameFromKey } = require('../../lib/parser');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const state = await store.load();
    const emp = state.employees[req.query.id];
    if (!emp) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const days = Object.keys(state.schedule)
      .filter((dateKey) => state.schedule[dateKey][emp.id])
      .sort((a, b) => b.localeCompare(a))
      .map((dateKey) => ({
        date: dateKey,
        dayName: dayNameFromKey(dateKey),
        ...state.schedule[dateKey][emp.id],
      }));

    res.status(200).json({ employee: emp, days });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load employee schedule' });
  }
};
