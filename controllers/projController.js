const {getRepositories,getCommits,getRepoName,AllCommits,saveToDb,getLatestCommitsFromDB}=require("../services/githubService")
const {getCache,setCache}=require('../utils/redisClient')
const { redisClient } = require('../utils/redisClient')
const { generateSummary } = require("../services/aiService");
const pool=require('../db')

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

      // Generate AI summary even if cached
      const summary = await generateSummary(commits)

      return res.render("profile", { commits, summary })
    }

    // 2️⃣ DB instead of GitHub
    commits = await getLatestCommitsFromDB()

    console.log("Serving from DB")

    if (commits && commits.length > 0) {
      await setCache(cachekey, commits)
    }

    // GitHub
    // commits = await AllCommits(username)

    // console.log("Serving from GitHub")

    // if (commits && commits.length > 0) {
    //   await saveToDb(commits)
    //   await setCache(cachekey, commits)
    // }

    // Generate AI summary
    const summary = await generateSummary(commits)

    res.render("profile", { commits, summary })
    

  } catch (error) {
    console.log(error.message)
    res.render("profile", { 
      commits: [], 
      summary: "Summary unavailable" // fallback
    })
  }
}

const crypto = require('crypto');
const verifySignature = (req) => {
  try {
    // 1. Get GitHub signature from headers
    const signature = req.headers['x-hub-signature-256'];

    if (!signature) {
      console.log("No signature found in headers");
      return false;
    }

    // 2. Create HMAC using your secret
    const hmac = crypto.createHmac(
      'sha256',
      process.env.WEBHOOK_SECRET
    );

    // 3. Generate digest from RAW body
    const digest = 'sha256=' + hmac.update(req.body).digest('hex');

    // 4. Compare safely (prevents timing attacks)
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(digest)
    )
    return isValid;
  } catch (error) {
    console.error("Signature verification error:", error.message);
    return false;
  }
}

const handleGithubWebhook = async (req, res) => {
    if (!verifySignature(req)) {
        return res.status(401).send("Invalid signature");
    }
    console.log("WEBHOOK HIT");

    try {
        const event = req.headers["x-github-event"];

        if (event === "push") {
            const payload = JSON.parse(req.body.toString()); 

            const repoName = payload.repository?.name;
            const commits = payload.commits || [];

            console.log("Repo:", repoName);
            console.log("Commits received:", commits.length);

            if (commits.length === 0) {
                return res.status(200).send("No commits");
            }

            const formattedCommits = commits.map(c => ({
                repo: repoName,
                message: c.message,
                author: c.author.name,
                date: c.timestamp,
                sha: c.id 
            }));

            console.log("Formatted:", formattedCommits);

            // 1️⃣ Save commits to DB
            await saveToDb(formattedCommits);

            const username = payload.repository.owner.name || payload.repository.owner.login;
            const commitsCacheKey = `commits:${username}`;
            const summaryCacheKey = `summary:${username}`; // Step 2 key

            // 2️⃣ Clear commits cache
            await redisClient.del(commitsCacheKey);

            // 3️⃣ Clear summary cache so background job regenerates it
            await redisClient.del(summaryCacheKey);

            // Optional: mark summary stale in DB (if using last_updated)
            await pool.query(
                `UPDATE summaries SET last_updated = NULL WHERE username = $1`,
                [username]
            );

            console.log("Caches cleared, summary marked stale");
        }

        res.status(200).send("Webhook processed");

    } catch (err) {
        console.log("ERROR:", err.message);
        res.status(500).send("Webhook error");
    }
};

module.exports={getGithubRepos,getGithubCommits,getAllRepoNames,getAllCommits,getProfilePage,handleGithubWebhook}