const {getRepositories,getCommits,getRepoName,AllCommits,saveToDb,getLatestCommitsFromDB}=require("../services/githubService")
const {getCache,setCache}=require('../utils/redisClient')
// const getHealth=(req,res)=>{
//     try{
//         res.json({status:"thriving"})
//     } catch(err){
//         res.status(500).json({message:"error..try again"})
//     }
// }

const getGithubRepos=async(req, res, next)=>{
    try{
        const repos=await getRepositories(req.params.username)
        res.json(repos)
    }catch(error){
        next(error)
    }
}

const getGithubCommits=async(req,res,next)=>{
    try{
        const commits= await getCommits(req.params.owner,req.params.repo)
        res.json(commits)
    }catch(error){
        next(error)
    }
}

const getAllRepoNames=async(req,res,next)=>{
    try{
        const names=await getRepoName(req.params.username)
        res.json(names)
    }catch(error){
        console.log(error.message)
    }
}

const getAllCommits=async(req,res,next)=>{
    try{
        const commits=await AllCommits(req.params.username)
        res.json(commits)
    }catch(error){
        console.log(error.message)
    }
}

const getProfilePage = async (req, res) => {
  try {

    const username = req.params.username
    const cachekey = `commits:${username}`

    // 1️⃣ Redis
    let commits = await getCache(cachekey)

    if (commits) {
      console.log("Serving from Redis")
      return res.render("profile", { commits })
    }

    // 2️⃣ GitHub
    commits = await AllCommits(username)

    console.log("Serving from GitHub")

    if (commits && commits.length > 0) {
      await saveToDb(commits)
      await setCache(cachekey, commits)
    }

    res.render("profile", { commits })

  } catch (error) {
    console.log(error.message)
    res.render("profile", { commits: [] })
  }
}
module.exports={getGithubRepos,getGithubCommits,getAllRepoNames,getAllCommits,getProfilePage}