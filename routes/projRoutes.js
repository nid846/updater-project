const express = require('express')
const router = express.Router()
const {getGithubRepos,getGithubCommits,getAllRepoNames,getAllCommits,getProfilePage,handleGithubWebhook}=require('../controllers/projController')
const { signup, login, logout } = require("../controllers/authController");
const { requireAuth } = require("../middleware/authMiddleware");

// router.get('/health',getHealth)
// router.get('/profile',getProfile)

router.get('/repos/:username',    getGithubRepos)

router.get('/commits/:owner/:repo',getGithubCommits)

router.get('/:username/repo',getAllRepoNames)

router.get('/:username/allCommits',getAllCommits)

router.get('/profile/:username', requireAuth, getProfilePage);

router.post('/github/webhook', handleGithubWebhook)

// Auth routes
router.get("/signup", (req, res) => res.render("signup"));
router.post("/signup", signup);

router.get("/login", (req, res) => res.render("login"));
router.post("/login", login);

router.get("/logout", logout);

// Protect profile
router.get("/profile/:username", requireAuth, getProfilePage);
module.exports = router
