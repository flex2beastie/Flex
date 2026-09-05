const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');

const router = express.Router();

const findByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
const countUsers = db.prepare('SELECT COUNT(*) AS n FROM users');
const insertUser = db.prepare(
  'INSERT INTO users (email, display_name, password_hash, is_admin) VALUES (?, ?, ?, ?)'
);

router.get('/register', (req, res) => {
  if (req.user) return res.redirect('/');
  res.render('register', { error: null, email: '', displayName: '' });
});

router.post('/register', (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const displayName = (req.body.displayName || '').trim();
  const password = req.body.password || '';

  if (!email || !displayName || password.length < 8) {
    return res.status(400).render('register', {
      error: 'Please fill out every field. Password must be at least 8 characters.',
      email,
      displayName,
    });
  }

  if (findByEmail.get(email)) {
    return res.status(400).render('register', {
      error: 'An account with that email already exists.',
      email,
      displayName,
    });
  }

  const passwordHash = bcrypt.hashSync(password, 12);
  const isFirstUser = countUsers.get().n === 0;
  const info = insertUser.run(email, displayName, passwordHash, isFirstUser ? 1 : 0);
  req.session.userId = info.lastInsertRowid;
  res.redirect('/');
});

router.get('/login', (req, res) => {
  if (req.user) return res.redirect('/');
  res.render('login', { error: null, email: '' });
});

router.post('/login', (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  const user = findByEmail.get(email);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).render('login', { error: 'Invalid email or password.', email });
  }

  req.session.regenerate((err) => {
    if (err) return res.status(500).render('login', { error: 'Something went wrong. Try again.', email });
    req.session.userId = user.id;
    const dest = req.session.returnTo || '/';
    delete req.session.returnTo;
    res.redirect(dest);
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
