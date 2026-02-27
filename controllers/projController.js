const {getRepositories,getCommits,getRepoName,AllCommits}=require("../services/githubService")
const getHealth=(req,res)=>{
    try{
        res.json({status:"thriving"})
    } catch(err){
        res.status(500).json({message:"error..try again"})
    }
}

const getProfile=(req,res)=>{
    try{
            res.json({
            name: "Nidhi",
            role: "Developer",
            projects: 3
        })
    } catch(err){
        res.status(500).json({message:"invalid..try again"})
    }
}

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
module.exports={getHealth,getProfile,getGithubRepos,getGithubCommits,getAllRepoNames,getAllCommits}