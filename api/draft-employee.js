const store = require('../lib/store');
const { dayNameFromKey } = require('../lib/parser');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  res.setHeader('Cache-Control', 'no-store');

  const id = req.query.id;
  if (!id) {
    res.status(400).json({ error: 'Missing id' });
    return;
  }

  try {
    const draft = await store.loadDraft();
    const emp = draft && draft.employees[id];
    if (!emp) {
      res.status(404).json({ error: 'Not found in the current draft' });
      return;
    }

    const days = Object.keys(draft.schedule)
      .filter((dateKey) => draft.schedule[dateKey][id])
      .sort((a, b) => a.localeCompare(b))
      .map((dateKey) => ({
        date: dateKey,
        dayName: dayNameFromKey(dateKey),
        ...draft.schedule[dateKey][id],
      }));

    res.status(200).json({ employee: emp, days });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load draft schedule' });
  }
};
