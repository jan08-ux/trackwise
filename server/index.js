const express = require('express');
const session = require('express-session');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(session({
  secret:            process.env.SESSION_SECRET || 'trackwise_secret',
  resave:            true,
  saveUninitialized: true,
  cookie: {
    secure:   false,
    httpOnly: true,
    maxAge:   86400000,
    sameSite: 'lax'
  }
}));

app.use('/api/auth',       require('./routes/auth'));
app.use('/api/expenses',   require('./routes/expenses'));
app.use('/api/analytics',  require('./routes/analytics'));
app.use('/api/budgets',    require('./routes/budgets'));
app.use('/api/categories', require('./routes/categories'));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('');
  console.log('  TrackWise is running!');
  console.log('  Open: http://localhost:' + PORT);
  console.log('');
});
