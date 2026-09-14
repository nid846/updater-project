const express = require('express')
const router = express.Router()
const { getGithubRepos, getGithubCommits, getAllRepoNames, getAllCommits, getProfilePage, handleGithubWebhook } = require('../controllers/projController')
const { signup, login, logout } = require("../controllers/authController");
const { requireAuth } = require("../middleware/authMiddleware");

router.get('/repos/:username', getGithubRepos)

router.get('/commits/:owner/:repo', getGithubCommits)

router.get('/:username/repo', getAllRepoNames)

router.get('/:username/allCommits', getAllCommits)

router.get('/profile/:username', requireAuth, getProfilePage);

router.post('/github/webhook', handleGithubWebhook);
router.post('/webhook', handleGithubWebhook);
router.get('/github/webhook', (req, res) => res.status(200).send("GitHub webhook endpoint is active (send POST requests from GitHub)."));

// Root route
router.get("/", (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect(`/profile/${req.session.user.github_username}`);
  }
  res.redirect("/login");
});

// Auth routes
router.get("/signup", (req, res) => res.render("signup"));
router.post("/signup", signup);

router.get("/login", (req, res) => res.render("login"));
router.post("/login", login);

router.get("/logout", logout);

module.exports = router;
