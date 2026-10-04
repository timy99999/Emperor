const express = require('express');
const db = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

const MAX_TITLE_LEN = 200;
const MAX_TEXT_LEN = 4000;

function validateFields(body, { partial }) {
  const { title, text } = body || {};
  const patch = {};
  if (!partial || title !== undefined) {
    if (typeof title !== 'string' || !title.trim()) return { error: 'title_required' };
    patch.title = title.trim().slice(0, MAX_TITLE_LEN);
  }
  if (!partial || text !== undefined) {
    if (typeof text !== 'string' || !text.trim()) return { error: 'text_required' };
    patch.text = text.trim().slice(0, MAX_TEXT_LEN);
  }
  return { patch };
}

// Public: list ideas in display order.
router.get('/', (req, res) => {
  res.json(db.listIdeas());
});

// Admin: add a new idea.
router.post('/', requireAdmin, (req, res) => {
  const { error, patch } = validateFields(req.body, { partial: false });
  if (error) return res.status(400).json({ error });
  const row = db.addIdea(patch.title, patch.text);
  res.status(201).json(row);
});

// Admin: edit an idea's title/text.
router.patch('/:id', requireAdmin, (req, res) => {
  const { error, patch } = validateFields(req.body, { partial: true });
  if (error) return res.status(400).json({ error });
  const changed = db.updateIdea(req.params.id, patch);
  if (!changed) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true });
});

// Admin: delete an idea (and its likes).
router.delete('/:id', requireAdmin, (req, res) => {
  const changed = db.deleteIdea(req.params.id);
  if (!changed) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true });
});

module.exports = router;
