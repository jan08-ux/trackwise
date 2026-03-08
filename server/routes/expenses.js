const express = require('express');
const db      = require('../db');
const guard   = require('../middleware/auth');
const router  = express.Router();

router.get('/', guard, async (req, res) => {
  try {
    const { month, year, category_id } = req.query;
    let sql = `SELECT e.expense_id, e.amount, e.description, e.expense_date,
               c.category_name, c.category_id
               FROM expenses e
               JOIN categories c ON e.category_id = c.category_id
               WHERE e.user_id = ?`;
    const params = [req.session.userId];
    if (month)       { sql += ' AND MONTH(e.expense_date) = ?'; params.push(month); }
    if (year)        { sql += ' AND YEAR(e.expense_date) = ?';  params.push(year);  }
    if (category_id) { sql += ' AND e.category_id = ?';         params.push(category_id); }
    sql += ' ORDER BY e.expense_date DESC, e.created_at DESC';
    const [rows] = await db.execute(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch expenses.' });
  }
});

router.post('/', guard, async (req, res) => {
  const { category_id, amount, description, expense_date } = req.body;
  if (!category_id || !amount || !expense_date)
    return res.status(400).json({ error: 'Missing required fields.' });
  try {
    const [result] = await db.execute(
      'INSERT INTO expenses (user_id, category_id, amount, description, expense_date) VALUES (?,?,?,?,?)',
      [req.session.userId, category_id, parseFloat(amount), description || '', expense_date]
    );
    res.status(201).json({ ok: true, expense_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add expense.' });
  }
});

router.put('/:id', guard, async (req, res) => {
  const { category_id, amount, description, expense_date } = req.body;
  try {
    const [result] = await db.execute(
      'UPDATE expenses SET category_id=?, amount=?, description=?, expense_date=? WHERE expense_id=? AND user_id=?',
      [category_id, parseFloat(amount), description, expense_date, req.params.id, req.session.userId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Expense not found.' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update expense.' });
  }
});

router.delete('/:id', guard, async (req, res) => {
  try {
    const [result] = await db.execute(
      'DELETE FROM expenses WHERE expense_id=? AND user_id=?',
      [req.params.id, req.session.userId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Expense not found.' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete expense.' });
  }
});

module.exports = router;
