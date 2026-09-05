require('dotenv').config();
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');

const SqliteSessionStore = require('./src/sessionStore');
const { attachUser } = require('./src/middleware/auth');
const authRoutes = require('./src/routes/auth');
const mediaRoutes = require('./src/routes/media');

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));
app.set('trust proxy', 1);

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    store: new SqliteSessionStore(),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use(attachUser(require('./src/db')));

app.use('/', authRoutes);
app.use('/', mediaRoutes);

app.use((req, res) => {
  res.status(404).render('404');
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Something went wrong.');
});

app.listen(PORT, () => {
  console.log(`We The People Library running at http://localhost:${PORT}`);
});
