require('dotenv').config();

const express = require('express');
const app = express();

// Enable trust proxy for cloud deployment (Render, Railway, Heroku, etc.)
app.set('trust proxy', 1);

// Configure view engine
app.set('view engine', 'ejs');
app.set('views', './views');

const session = require("express-session");
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'fallback_session_secret_updater',
    resave: false, // dont save if nothing changed in session
    saveUninitialized: false, // dont create or save until user logs in
    cookie: {
      secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE === 'true' ? true : false,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  })
);

// Health check endpoint for deployment platforms & uptime monitors
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

const { initDB } = require("./init_db");
initDB();

const { startCommitCron } = require("./cron/commitCron");
startCommitCron();

app.use(
  "/github/webhook",
  express.raw({ type: "*/*" })
);

const { connectRedis } = require("./utils/redisClient");
connectRedis().catch((err) => {
  console.error("Redis connection failed:", err.message);
});

app.use(express.json()); // -> converts everything below it to json format
app.use(express.urlencoded({ extended: true })); // forms
app.use(express.static('public')); // -> load the static frontend files

const portfolioRoutes = require('./routes/projRoutes');
const errorHandler = require('./utils/errorHandler');
app.use('/', portfolioRoutes);
app.use(errorHandler);

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

