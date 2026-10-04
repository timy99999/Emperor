const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

// COOKIE_SECURE=true (set on Railway) switches the cookie to SameSite=None; Secure,
// which cross-site requests (frontend on Vercel, API on Railway) require. Plain
// 'lax' is used for local dev over http://localhost, where 'none' cookies are dropped.
const CROSS_SITE = process.env.COOKIE_SECURE === 'true';
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: CROSS_SITE ? 'none' : 'lax',
  secure: CROSS_SITE,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

router.post('/login', (req, res) => {
  const { password } = req.body || {};
  const hash = process.env.ADMIN_PASSWORD_HASH;

  if (!hash) {
    return res.status(500).json({ error: 'admin_not_configured' });
  }
  if (typeof password !== 'string' || !bcrypt.compareSync(password, hash)) {
    return res.status(401).json({ error: 'invalid_password' });
  }

  const token = jwt.sign({ role: 'admin' }, process.env.SESSION_SECRET, { expiresIn: '7d' });
  res.cookie('admin_token', token, COOKIE_OPTS);
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  res.clearCookie('admin_token');
  res.json({ ok: true });
});

router.get('/session', requireAdmin, (req, res) => {
  res.json({ ok: true });
});

module.exports = router;
