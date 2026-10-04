const express = require('express');
const db = require('../db');

const router = express.Router();

const IDEA_COUNT = 11;

// Public: aggregate like counts per idea, plus which ideas this visitor liked.
router.get('/', (req, res) => {
  const visitorId = typeof req.query.visitorId === 'string' ? req.query.visitorId : null;
  const counts = db.getLikeCounts(IDEA_COUNT);
  const likedByVisitor = visitorId ? db.getVisitorLikes(visitorId) : [];
  res.json({ counts, likedByVisitor });
});

// Public: toggle a like for one idea, identified by an anonymous visitorId.
router.post('/:ideaIndex', (req, res) => {
  const ideaIndex = Number(req.params.ideaIndex);
  const { visitorId } = req.body || {};

  if (!Number.isInteger(ideaIndex) || ideaIndex < 0 || ideaIndex >= IDEA_COUNT) {
    return res.status(400).json({ error: 'invalid_idea_index' });
  }
  if (typeof visitorId !== 'string' || !visitorId.trim()) {
    return res.status(400).json({ error: 'visitorId_required' });
  }

  const result = db.toggleLike(ideaIndex, visitorId);
  res.json(result);
});

module.exports = router;
