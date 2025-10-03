function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.redirect('/login');
}

function redirectIfAuthed(req, res, next) {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  return next();
}

function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.redirect('/login');
    }
    const userRole = req.session.user.role;
    if (roles.includes(userRole)) {
      return next();
    }
    return res.status(403).send('Forbidden');
  };
}

module.exports = { requireAuth, redirectIfAuthed, requireRoles };
