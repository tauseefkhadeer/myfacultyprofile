require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');

const SQLiteStore = require('connect-sqlite3')(session);

const routes = require('./routes');

const app = express();

app.use(helmet());
app.use(compression());
app.use(morgan('dev'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const sessionDir = path.join(process.cwd(), '.data');
if (!fs.existsSync(sessionDir)) {
  fs.mkdirSync(sessionDir, { recursive: true });
}
app.use(
  session({
    store: new SQLiteStore({ dir: sessionDir, db: 'sessions.sqlite' }),
    secret: process.env.SESSION_SECRET || 'dev_secret_change_me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'views'));

app.use(express.static(path.join(process.cwd(), 'public')));

app.use((req, res, next) => {
  res.locals.sessionUser = req.session.user || null;
  next();
});

app.use(routes);

app.use((req, res) => {
  res.status(404).send('Not Found');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
