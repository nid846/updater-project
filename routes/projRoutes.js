const express = require('express')
const router = express.Router()
const {getGithubRepos,getGithubCommits,getAllRepoNames,getAllCommits,getProfilePage,handleGithubWebhook}=require('../controllers/projController')

// router.get('/health',getHealth)
// router.get('/profile',getProfile)

router.get('/repos/:username',    getGithubRepos)

router.get('/commits/:owner/:repo',getGithubCommits)

router.get('/:username/repo',getAllRepoNames)

router.get('/:username/allCommits',getAllCommits)

router.get('/profile/:username',getProfilePage)

router.post('/github/webhook', handleGithubWebhook)

module.exports = router
