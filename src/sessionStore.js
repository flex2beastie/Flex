const session = require('express-session');
const db = require('./db');

const getStmt = db.prepare('SELECT data, expires FROM sessions WHERE sid = ?');
const setStmt = db.prepare(
  'INSERT INTO sessions (sid, expires, data) VALUES (?, ?, ?) ' +
  'ON CONFLICT(sid) DO UPDATE SET expires = excluded.expires, data = excluded.data'
);
const destroyStmt = db.prepare('DELETE FROM sessions WHERE sid = ?');
const pruneStmt = db.prepare('DELETE FROM sessions WHERE expires < ?');

class SqliteSessionStore extends session.Store {
  constructor() {
    super();
    // Periodically clear out expired sessions so the table doesn't grow forever.
    this.pruneInterval = setInterval(() => {
      try { pruneStmt.run(Date.now()); } catch (_) { /* ignore */ }
    }, 15 * 60 * 1000).unref();
  }

  get(sid, cb) {
    try {
      const row = getStmt.get(sid);
      if (!row || row.expires < Date.now()) return cb(null, null);
      cb(null, JSON.parse(row.data));
    } catch (err) {
      cb(err);
    }
  }

  set(sid, sessionData, cb) {
    try {
      const maxAge = sessionData.cookie && sessionData.cookie.maxAge
        ? sessionData.cookie.maxAge
        : 24 * 60 * 60 * 1000;
      setStmt.run(sid, Date.now() + maxAge, JSON.stringify(sessionData));
      cb && cb(null);
    } catch (err) {
      cb && cb(err);
    }
  }

  destroy(sid, cb) {
    try {
      destroyStmt.run(sid);
      cb && cb(null);
    } catch (err) {
      cb && cb(err);
    }
  }
}

module.exports = SqliteSessionStore;
