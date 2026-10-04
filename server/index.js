require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const suggestionsRouter = require('./routes/suggestions');
const likesRouter = require('./routes/likes');
const adminRouter = require('./routes/admin');

if (!process.env.SESSION_SECRET) {
  console.error('SESSION_SECRET is not set. Copy server/.env.example to server/.env and fill it in.');
  process.exit(1);
}

const app = express();

// FRONTEND_ORIGIN: the deployed frontend's origin (e.g. https://imperator.vercel.app).
// Required when the frontend and backend run on different domains (Vercel + Railway) —
// credentialed cross-site requests need an exact origin, not "*". Falls back to
// reflecting no origin (same-origin only) when unset, which is fine for local dev
// where one Express process serves both the site and the API.
if (process.env.FRONTEND_ORIGIN) {
  app.use(cors({ origin: process.env.FRONTEND_ORIGIN, credentials: true }));
}

app.use(express.json());
app.use(cookieParser());

app.use('/api/suggestions', suggestionsRouter);
app.use('/api/likes', likesRouter);
app.use('/api/admin', adminRouter);

// Serve the static site (Император.dc.html, _ds/, support.js, admin.html, uploads, ...)
// from the project root, one directory up from server/.
app.use(express.static(path.join(__dirname, '..')));

const PORT = process.env.PORT || 8743;
app.listen(PORT, () => {
  console.log(`Imperator server running at http://localhost:${PORT}`);
});
