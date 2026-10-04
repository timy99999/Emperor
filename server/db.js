// Lightweight dependency-free JSON-file store.
//
// better-sqlite3 needs native build tools (Visual Studio C++ workload) that
// aren't available in this environment, so we use a small synchronous JSON
// file instead. Fine for a low-traffic single-process campaign site.

const fs = require('fs');
const path = require('path');

// DATA_FILE lets Railway point this at a mounted volume (e.g. /data/data.json) so
// likes/suggestions/ideas survive redeploys instead of resetting with the container.
const FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json');

// Seeds the ideas list on first boot (or if the data file predates ideas
// management) so the site keeps showing the same program it launched with,
// now editable from the admin panel.
const DEFAULT_IDEAS = [
  ['Дискотека после файналов', 'Общая дискотека по завершении каждого семестра — сразу после всех файналов.'],
  ['Музыка на большой перемене', 'Студенты голосуют за плейлист недели, и во время большой перемены в колледже играет весёлая музыка.'],
  ['Игра «Бегущий мудрец»', 'Каждый месяц по коридорам колледжа бегает мудрец и задаёт студентам и преподавателям тематические вопросы. За каждый верный ответ участник получает шоколадку или другой маленький приз.'],
  ['Турниры и квизы', 'Организация турниров по спорту (футбол, баскетбол, волейбол), шахматам, квизов и многого другого.'],
  ['Pajama Day', 'Объявить день, когда все студенты (и преподаватели) колледжа приходят в пижамах.'],
  ['Номинации семестра', 'Во время награждения топ-20 — дополнительные номинации со сладкими призами: Волонтёр семестра (больше всего майн-часов), Босс знаний (больше всего часов тьюторства), Лучший хэд клуба (самый интересный клуб по результатам голосования) и другие.'],
  ['Новый год', 'Новогоднее мероприятие с конкурсами и праздничной дискотекой.'],
  ['«Королевский бал»', 'Атмосферное праздничное мероприятие на День влюблённых (в университете или другом месте). Парни приглашают себе пару и идут на бал. Каждая пара сможет поучаствовать в весёлых, романтичных и даже необычных конкурсах и выиграть призы. В конце бала для всего колледжа — волшебный вальс и яркая дискотека.'],
  ['Маскот колледжа', 'Разработка вариантов маскота колледжа (мишка, тигр и т. д.) и выбор через голосование в Telegram-канале. Дальше маскот — волонтёр в костюме — появляется на всех мероприятиях и дарит всем весёлое настроение.'],
  ['Соревнование между группами', 'В течение курса группы соревнуются в квизах и других активностях. За каждую победу группа получает очки; в конце курса подсчитываем очки и объявляем группу-победительницу, её студенты получают символические призы. Дополнительные очки — за попадание в топ-20, ноль пропусков ОАА у всей группы и т. д.'],
  ['Онлайн-платформа TSI', 'Общий сайт для студентов колледжа: предлагать идеи для мероприятий, общаться в общем чате, читать о деятельности клубов, собирать команды для проектов вне колледжа — всё для крепкого community TSI.'],
];

function seedIdeas() {
  const now = Date.now();
  return DEFAULT_IDEAS.map(([title, text], i) => ({
    id: i + 1,
    title,
    text,
    order: i + 1,
    created_at: now,
  }));
}

function load() {
  let data;
  if (!fs.existsSync(FILE)) {
    data = { suggestions: [], likes: [], ideas: [], nextSuggestionId: 1, nextIdeaId: 1 };
  } else {
    try {
      data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    } catch (e) {
      data = { suggestions: [], likes: [], ideas: [], nextSuggestionId: 1, nextIdeaId: 1 };
    }
  }
  if (!Array.isArray(data.ideas) || data.ideas.length === 0) {
    data.ideas = seedIdeas();
    data.nextIdeaId = data.ideas.length + 1;
  }
  if (!data.nextIdeaId) data.nextIdeaId = data.ideas.length + 1;
  // Drop pre-migration like rows that still use the old fixed-index scheme
  // (idea_index, no idea_id) — they can't be mapped to a real idea id.
  if (Array.isArray(data.likes)) {
    data.likes = data.likes.filter((l) => l.idea_id !== undefined);
  }
  return data;
}

let data = load();

function save() {
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, FILE);
}

save();

// --- Ideas ---

function listIdeas() {
  return [...data.ideas].sort((a, b) => a.order - b.order);
}

function ideaExists(id) {
  return data.ideas.some((idea) => idea.id === id);
}

function addIdea(title, text) {
  const maxOrder = data.ideas.reduce((max, idea) => Math.max(max, idea.order), 0);
  const row = { id: data.nextIdeaId++, title, text, order: maxOrder + 1, created_at: Date.now() };
  data.ideas.push(row);
  save();
  return row;
}

function updateIdea(id, patch) {
  const row = data.ideas.find((idea) => idea.id === Number(id));
  if (!row) return false;
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.text !== undefined) row.text = patch.text;
  save();
  return true;
}

function deleteIdea(id) {
  const numId = Number(id);
  const before = data.ideas.length;
  data.ideas = data.ideas.filter((idea) => idea.id !== numId);
  const changed = data.ideas.length !== before;
  if (changed) {
    data.likes = data.likes.filter((l) => l.idea_id !== numId);
    save();
  }
  return changed;
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

// --- Likes (keyed by idea id) ---

function getLikeCounts() {
  const counts = {};
  for (const like of data.likes) {
    counts[like.idea_id] = (counts[like.idea_id] || 0) + 1;
  }
  return counts;
}

function getVisitorLikes(visitorId) {
  return data.likes.filter((l) => l.visitor_id === visitorId).map((l) => l.idea_id);
}

function toggleLike(ideaId, visitorId) {
  const idx = data.likes.findIndex((l) => l.idea_id === ideaId && l.visitor_id === visitorId);
  let liked;
  if (idx >= 0) {
    data.likes.splice(idx, 1);
    liked = false;
  } else {
    data.likes.push({ idea_id: ideaId, visitor_id: visitorId, created_at: Date.now() });
    liked = true;
  }
  save();
  const count = data.likes.filter((l) => l.idea_id === ideaId).length;
  return { liked, count };
}

module.exports = {
  listIdeas,
  ideaExists,
  addIdea,
  updateIdea,
  deleteIdea,
  addSuggestion,
  listSuggestions,
  updateSuggestionStatus,
  deleteSuggestion,
  getLikeCounts,
  getVisitorLikes,
  toggleLike,
};
