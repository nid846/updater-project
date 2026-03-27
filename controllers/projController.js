const {getRepositories,getCommits,getRepoName,AllCommits,saveToDb,getLatestCommitsFromDB,saveSummary,getSummary}=require("../services/githubService")
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
    const username = req.params.username;
    const commitsCacheKey = `commits:${username}`;
    const summaryCacheKey = `summary:${username}`;

    // 1️⃣ Try to get commits from Redis
    let commits = await getCache(commitsCacheKey);

    if (!commits) {
      // 2️⃣ If not in Redis, get from DB
      commits = await getLatestCommitsFromDB();
      console.log("Serving commits from DB");

      if (commits && commits.length > 0) {
        await setCache(commitsCacheKey, commits);
      }
    } else {
      console.log("Serving commits from Redis");
    }

    // GitHub
    // commits = await AllCommits(username)

    // console.log("Serving from GitHub")
    // if (commits && commits.length > 0) {
    //   await saveToDb(commits)
    //   await setCache(commitsCacheKey, commits)
    // }

    // 3️⃣ Try to get summary from Redis
    let summary = await getCache(summaryCacheKey);

    if (!summary) {
      // 4️⃣ Try DB
      summary = await getSummary(username);

      if (summary) {
        console.log("Serving summary from DB");
        await setCache(summaryCacheKey, summary);
      } 
      // 🔥 5️⃣ FIRST-TIME GENERATION (only if DB empty)
      else if (commits && commits.length > 0) {
        console.log("First-time summary generation");

        const generated = await generateSummary(commits);

        if (generated !== "Summary unavailable") {
          await saveSummary(username, generated);
          await setCache(summaryCacheKey, generated);
          summary = generated;
        } else {
          summary = "Summary not ready yet";
        }
      } 
      // 6️⃣ No commits at all
      else {
        summary = "Summary not ready yet";
      }

    } else {
      console.log("Serving summary from Redis");
    }

    res.render("profile", { commits, summary });

  } catch (error) {
    console.log(error.message);
    res.render("profile", { 
      commits: [], 
      summary: "Summary unavailable" // fallback
    });
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

            // 3️⃣ regenerate summary immediately
            const commitsFromDB = await getLatestCommitsFromDB(20);
            const summary = await generateSummary(commitsFromDB);

            if (summary !== "Summary unavailable") {
                await saveSummary(username, summary);
                await setCache(summaryCacheKey, summary);
                console.log("Summary regenerated from webhook");
            } else {
                console.log("AI failed — keeping old summary");
            }
        }

        res.status(200).send("Webhook processed");

    } catch (err) {
        console.log("ERROR:", err.message);
        res.status(500).send("Webhook error");
    }
};

module.exports={getGithubRepos,getGithubCommits,getAllRepoNames,getAllCommits,getProfilePage,handleGithubWebhook}