const store = require('../lib/store');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const q = (req.query.q || '').trim().toLowerCase();
  if (!q) {
    res.status(200).json([]);
    return;
  }

  try {
    const draft = await store.loadDraft();
    if (!draft) {
      res.status(200).json([]);
      return;
    }

    const results = Object.values(draft.employees)
      .filter((e) => e.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 20)
      .map((e) => ({ id: e.id, name: e.name, skill: e.skill }));

    res.status(200).json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Draft search failed' });
  }
};
