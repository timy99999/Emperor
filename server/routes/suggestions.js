const express = require('express');
const db = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

const MAX_LEN = 2000;
const RATE_LIMIT_MS = 30 * 1000;
const lastSubmitByVisitor = new Map();

const VALID_STATUSES = new Set(['pending', 'approved', 'rejected']);

// Public: submit a new suggestion.
router.post('/', (req, res) => {
  const { text, visitorId } = req.body || {};

  if (typeof visitorId !== 'string' || !visitorId.trim()) {
    return res.status(400).json({ error: 'visitorId_required' });
  }
  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'text_required' });
  }
  const trimmed = text.trim().slice(0, MAX_LEN);

  const last = lastSubmitByVisitor.get(visitorId);
  const now = Date.now();
  if (last && now - last < RATE_LIMIT_MS) {
    return res.status(429).json({ error: 'rate_limited' });
  }
  lastSubmitByVisitor.set(visitorId, now);

  const row = db.addSuggestion(visitorId, trimmed);
  res.status(201).json({ id: row.id });
});

// Public: list approved suggestions only (shown on the public site).
// Any other listing requires admin auth.
router.get('/', (req, res) => {
  if (req.query.status === 'approved') {
    const rows = db.listSuggestions('approved').map(({ id, text, created_at }) => ({ id, text, created_at }));
    return res.json(rows);
  }

  requireAdmin(req, res, () => {
    res.json(db.listSuggestions());
  });
});

// Admin: update a suggestion's status.
router.patch('/:id', requireAdmin, (req, res) => {
  const { status } = req.body || {};
  if (!VALID_STATUSES.has(status)) {
    return res.status(400).json({ error: 'invalid_status' });
  }
  const changed = db.updateSuggestionStatus(req.params.id, status);
  if (!changed) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true });
});

// Admin: delete a suggestion.
router.delete('/:id', requireAdmin, (req, res) => {
  const changed = db.deleteSuggestion(req.params.id);
  if (!changed) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true });
});

module.exports = router;
