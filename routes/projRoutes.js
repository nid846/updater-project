const express = require('express')
const router = express.Router()
const {getHealth,getProfile,getGithubRepos,getGithubCommits,getAllRepoNames,getAllCommits}=require('../controllers/projController')

router.get('/health',getHealth)

router.get('/profile',getProfile)

router.get('/repos/:username', getGithubRepos)

router.get('/commits/:owner/:repo',getGithubCommits)

router.get('/:username/repo',getAllRepoNames)

router.get('/:username/allCommits',getAllCommits)

module.exports = router
