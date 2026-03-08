const express = require('express');
const bcrypt  = require('bcryptjs');
const db      = require('../db');
const router  = express.Router();

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'All fields are required.' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name, email, hash]
    );
    req.session.userId = result.insertId;
    req.session.name   = name;
    res.json({ ok: true, userId: result.insertId, name });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Email already registered.' });
    res.status(500).json({ error: 'Server error.' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required.' });
  try {
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length)
      return res.status(401).json({ error: 'Invalid credentials.' });
    const match = await bcrypt.compare(password, rows[0].password_hash);
    if (!match)
      return res.status(401).json({ error: 'Invalid credentials.' });
    req.session.userId = rows[0].user_id;
    req.session.name   = rows[0].name;
    res.json({ ok: true, userId: rows[0].user_id, name: rows[0].name });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

router.get('/me', (req, res) => {
  if (req.session && req.session.userId)
    return res.json({ loggedIn: true, userId: req.session.userId, name: req.session.name });
  res.json({ loggedIn: false });
});

module.exports = router;
