const express = require('express');
const db      = require('../db');
const guard   = require('../middleware/auth');
const router  = express.Router();

router.get('/', guard, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM categories ORDER BY category_id');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch categories.' }); }
});

module.exports = router;
