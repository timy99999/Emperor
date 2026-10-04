const express = require('express');
const db = require('../db');

const router = express.Router();

// Public: aggregate like counts per idea, plus which ideas this visitor liked.
router.get('/', (req, res) => {
  const visitorId = typeof req.query.visitorId === 'string' ? req.query.visitorId : null;
  const counts = db.getLikeCounts();
  const likedByVisitor = visitorId ? db.getVisitorLikes(visitorId) : [];
  res.json({ counts, likedByVisitor });
});

// Public: toggle a like for one idea, identified by an anonymous visitorId.
router.post('/:ideaId', (req, res) => {
  const ideaId = Number(req.params.ideaId);
  const { visitorId } = req.body || {};

  if (!Number.isInteger(ideaId)) {
    return res.status(400).json({ error: 'invalid_idea_id' });
  }
  if (typeof visitorId !== 'string' || !visitorId.trim()) {
    return res.status(400).json({ error: 'visitorId_required' });
  }
  if (!db.ideaExists(ideaId)) {
    return res.status(404).json({ error: 'idea_not_found' });
  }

  const result = db.toggleLike(ideaId, visitorId);
  res.json(result);
});

module.exports = router;
