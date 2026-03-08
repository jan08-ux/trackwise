const express = require('express');
const db      = require('../db');
const guard   = require('../middleware/auth');
const router  = express.Router();

router.get('/', guard, async (req, res) => {
  const month = req.query.month || new Date().getMonth() + 1;
  const year  = req.query.year  || new Date().getFullYear();
  try {
    const [rows] = await db.execute(
      'SELECT * FROM budgets WHERE user_id=? AND budget_month=? AND budget_year=?',
      [req.session.userId, month, year]
    );
    res.json(rows[0] || null);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch budget.' }); }
});

router.post('/', guard, async (req, res) => {
  const { monthly_limit, budget_month, budget_year } = req.body;
  if (!monthly_limit) return res.status(400).json({ error: 'monthly_limit is required.' });
  const month = budget_month || new Date().getMonth() + 1;
  const year  = budget_year  || new Date().getFullYear();
  try {
    await db.execute(`
      INSERT INTO budgets (user_id, monthly_limit, budget_month, budget_year)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE monthly_limit = VALUES(monthly_limit)
    `, [req.session.userId, parseFloat(monthly_limit), month, year]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Failed to save budget.' }); }
});

module.exports = router;
