// Lightweight dependency-free JSON-file store.
//
// better-sqlite3 needs native build tools (Visual Studio C++ workload) that
// aren't available in this environment, so we use a small synchronous JSON
// file instead. Fine for a low-traffic single-process campaign site.

const fs = require('fs');
const path = require('path');

// DATA_FILE lets Railway point this at a mounted volume (e.g. /data/data.json) so
// likes/suggestions survive redeploys instead of resetting with the container.
const FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json');

function load() {
  if (!fs.existsSync(FILE)) {
    return { suggestions: [], likes: [], nextSuggestionId: 1 };
  }
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch (e) {
    return { suggestions: [], likes: [], nextSuggestionId: 1 };
  }
}

let data = load();

function save() {
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, FILE);
}

// --- Suggestions ---

function addSuggestion(visitorId, text) {
  const row = {
    id: data.nextSuggestionId++,
    visitor_id: visitorId,
    text,
    status: 'pending',
    created_at: Date.now(),
  };
  data.suggestions.push(row);
  save();
  return row;
}

function listSuggestions(status) {
  const rows = status ? data.suggestions.filter((s) => s.status === status) : data.suggestions;
  return [...rows].sort((a, b) => b.created_at - a.created_at);
}

function updateSuggestionStatus(id, status) {
  const row = data.suggestions.find((s) => s.id === Number(id));
  if (!row) return false;
  row.status = status;
  save();
  return true;
}

function deleteSuggestion(id) {
  const before = data.suggestions.length;
  data.suggestions = data.suggestions.filter((s) => s.id !== Number(id));
  const changed = data.suggestions.length !== before;
  if (changed) save();
  return changed;
}

// --- Likes ---

function getLikeCounts(ideaCount) {
  const counts = new Array(ideaCount).fill(0);
  for (const like of data.likes) {
    if (like.idea_index >= 0 && like.idea_index < ideaCount) counts[like.idea_index]++;
  }
  return counts;
}

function getVisitorLikes(visitorId) {
  return data.likes.filter((l) => l.visitor_id === visitorId).map((l) => l.idea_index);
}

function toggleLike(ideaIndex, visitorId) {
  const idx = data.likes.findIndex((l) => l.idea_index === ideaIndex && l.visitor_id === visitorId);
  let liked;
  if (idx >= 0) {
    data.likes.splice(idx, 1);
    liked = false;
  } else {
    data.likes.push({ idea_index: ideaIndex, visitor_id: visitorId, created_at: Date.now() });
    liked = true;
  }
  save();
  const count = data.likes.filter((l) => l.idea_index === ideaIndex).length;
  return { liked, count };
}

module.exports = {
  addSuggestion,
  listSuggestions,
  updateSuggestionStatus,
  deleteSuggestion,
  getLikeCounts,
  getVisitorLikes,
  toggleLike,
};
