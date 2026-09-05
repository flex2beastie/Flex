function attachUser(db) {
  const getUser = db.prepare('SELECT id, email, display_name, is_admin FROM users WHERE id = ?');
  return (req, res, next) => {
    if (req.session && req.session.userId) {
      req.user = getUser.get(req.session.userId) || null;
    } else {
      req.user = null;
    }
    res.locals.currentUser = req.user;
    next();
  };
}

function requireAuth(req, res, next) {
  if (!req.user) {
    req.session.returnTo = req.originalUrl;
    return res.redirect('/login');
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    req.session.returnTo = req.originalUrl;
    return res.redirect('/login');
  }
  if (!req.user.is_admin) {
    return res.status(403).render('403');
  }
  next();
}

module.exports = { attachUser, requireAuth, requireAdmin };
