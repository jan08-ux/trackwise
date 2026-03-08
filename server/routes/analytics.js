const express = require('express');
const db      = require('../db');
const guard   = require('../middleware/auth');
const router  = express.Router();

router.get('/monthly', guard, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT DATE_FORMAT(expense_date, '%b %Y') AS month_label,
             YEAR(expense_date) AS yr, MONTH(expense_date) AS mo,
             SUM(amount) AS total
      FROM expenses
      WHERE user_id = ? AND expense_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY YEAR(expense_date), MONTH(expense_date)
      ORDER BY YEAR(expense_date), MONTH(expense_date)
    `, [req.session.userId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Query failed.' }); }
});

router.get('/categories', guard, async (req, res) => {
  const month = req.query.month || new Date().getMonth() + 1;
  const year  = req.query.year  || new Date().getFullYear();
  try {
    const [rows] = await db.execute(`
      SELECT c.category_id, c.category_name,
             SUM(e.amount) AS total,
             ROUND(SUM(e.amount) / SUM(SUM(e.amount)) OVER() * 100, 1) AS pct
      FROM expenses e
      JOIN categories c ON e.category_id = c.category_id
      WHERE e.user_id = ? AND MONTH(e.expense_date) = ? AND YEAR(e.expense_date) = ?
      GROUP BY c.category_id, c.category_name
      ORDER BY total DESC
    `, [req.session.userId, month, year]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Query failed.' }); }
});

router.get('/budget-status', guard, async (req, res) => {
  const month = req.query.month || new Date().getMonth() + 1;
  const year  = req.query.year  || new Date().getFullYear();
  try {
    const [rows] = await db.execute(`
      SELECT b.monthly_limit, COALESCE(SUM(e.amount), 0) AS spent
      FROM budgets b
      LEFT JOIN expenses e ON e.user_id = b.user_id
        AND MONTH(e.expense_date) = b.budget_month
        AND YEAR(e.expense_date)  = b.budget_year
      WHERE b.user_id = ? AND b.budget_month = ? AND b.budget_year = ?
      GROUP BY b.monthly_limit
    `, [req.session.userId, month, year]);
    if (!rows.length) return res.json({ limit: null, spent: 0, pct: 0, status: 'NO_BUDGET' });
    const { monthly_limit: limit, spent } = rows[0];
    const pct    = Math.round(spent / limit * 100);
    const status = spent >= limit ? 'EXCEEDED' : pct >= 80 ? 'WARNING' : 'OK';
    res.json({ limit, spent, pct, status });
  } catch (err) { res.status(500).json({ error: 'Query failed.' }); }
});

router.get('/insights', guard, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT c.category_name,
        SUM(CASE WHEN MONTH(e.expense_date) = MONTH(CURDATE())     THEN e.amount ELSE 0 END) AS cur_month,
        SUM(CASE WHEN MONTH(e.expense_date) = MONTH(CURDATE()) - 1 THEN e.amount ELSE 0 END) AS prev_month
      FROM expenses e
      JOIN categories c ON e.category_id = c.category_id
      WHERE e.user_id = ? AND YEAR(e.expense_date) = YEAR(CURDATE())
      GROUP BY c.category_id, c.category_name
      HAVING cur_month > 0
      ORDER BY (cur_month - prev_month) DESC
    `, [req.session.userId]);
    const insights = [];
    rows.forEach(r => {
      if (r.prev_month > 0) {
        const change = Math.round((r.cur_month - r.prev_month) / r.prev_month * 100);
        if (change > 30)
          insights.push({ type: 'warn', category: r.category_name,
            message: r.category_name + ' spending up ' + change + '% from last month' });
        else if (change < -20)
          insights.push({ type: 'good', category: r.category_name,
            message: r.category_name + ' spending down ' + Math.abs(change) + '% - great job!' });
      }
    });
    res.json({ rows, insights });
  } catch (err) { res.status(500).json({ error: 'Query failed.' }); }
});

router.get('/heatmap', guard, async (req, res) => {
  const month = req.query.month || new Date().getMonth() + 1;
  const year  = req.query.year  || new Date().getFullYear();
  try {
    const [rows] = await db.execute(`
      SELECT DAY(expense_date) AS day_num, SUM(amount) AS total
      FROM expenses
      WHERE user_id = ? AND MONTH(expense_date) = ? AND YEAR(expense_date) = ?
      GROUP BY DAY(expense_date) ORDER BY day_num
    `, [req.session.userId, month, year]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Query failed.' }); }
});

router.get('/compare', guard, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT c.category_name,
        SUM(CASE WHEN MONTH(e.expense_date) = MONTH(CURDATE()) - 2 THEN e.amount ELSE 0 END) AS m1,
        SUM(CASE WHEN MONTH(e.expense_date) = MONTH(CURDATE()) - 1 THEN e.amount ELSE 0 END) AS m2,
        SUM(CASE WHEN MONTH(e.expense_date) = MONTH(CURDATE())     THEN e.amount ELSE 0 END) AS m3
      FROM expenses e
      JOIN categories c ON e.category_id = c.category_id
      WHERE e.user_id = ? AND YEAR(e.expense_date) = YEAR(CURDATE())
      GROUP BY c.category_id, c.category_name
    `, [req.session.userId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Query failed.' }); }
});

module.exports = router;
