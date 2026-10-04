const jwt = require('jsonwebtoken');

function requireAdmin(req, res, next) {
  const token = req.cookies && req.cookies.admin_token;
  if (!token) return res.status(401).json({ error: 'not_authenticated' });

  try {
    jwt.verify(token, process.env.SESSION_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: 'invalid_session' });
  }
}

module.exports = requireAdmin;
