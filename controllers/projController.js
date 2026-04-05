const {getRepositories,getCommits,getRepoName,AllCommits,saveToDb,getLatestCommitsFromDB,saveSummary,getSummary,saveDevSummary, getDevSummary, saveProjects, getProjects}=require("../services/githubService")
const {getCache,setCache}=require('../utils/redisClient')
const { redisClient } = require('../utils/redisClient')
const { generateSummaryWithRetry, generateDeveloperSummary,generateTopProjects } = require("../services/aiService");const pool=require('../db')

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
    const githubUsername = req.session.user.github_username;
    const commitsCacheKey = `commits:${githubUsername}`;
    const summaryCacheKey = `summary:${githubUsername}`;

    const devSummaryCacheKey = `devSummary:${githubUsername}`; // 🔥 NEW
    const projectsCacheKey = `projects:${githubUsername}`; // 🔥 NEW

    // 1️⃣ Try to get commits from Redis
    let commits = await getCache(commitsCacheKey);

    if (!commits) {
      console.log("⚡ Cache miss → syncing from GitHub...");

      const freshCommits = await AllCommits(githubUsername);

      if (freshCommits && freshCommits.length > 0) {
        await saveToDb(freshCommits, githubUsername);
        console.log("✅ DB synced with latest commits");
      } else {
        console.log("⚠️ No new commits found from GitHub");
      }

      commits = await getLatestCommitsFromDB(githubUsername, 10);
      console.log("📦 Serving commits from DB");

      if (commits && commits.length > 0) {
        await setCache(commitsCacheKey, commits);
      }
    } else {
      console.log("⚡ Serving commits from Redis");
    }

    // ================= SUMMARY =================

    let summary = await getCache(summaryCacheKey);

    if (!summary) {
      summary = await getSummary(githubUsername);

      if (summary) {
        console.log("📦 Serving summary from DB");
        await setCache(summaryCacheKey, summary);
      } 
      else if (commits && commits.length > 0) {
        console.log("🧠 First-time summary generation");

        const generated = await generateSummaryWithRetry(commits);

        if (generated !== "Summary unavailable") {
          await saveSummary(githubUsername, generated);
          await setCache(summaryCacheKey, generated);
          summary = generated;
        } else {
          summary = "Summary not ready yet";
        }
      } 
      else {
        summary = "Summary not ready yet";
      }
    } else {
      console.log("⚡ Serving summary from Redis");
    }

    // ================= 🔥 DEV SUMMARY =================

    let devSummary = await getCache(devSummaryCacheKey);

    if (!devSummary) {
      devSummary = await getDevSummary(githubUsername);

      if (devSummary) {
        console.log("📦 Dev summary from DB");
        await setCache(devSummaryCacheKey, devSummary);
      } 
      else if (commits && commits.length > 0) {
        console.log("🧠 Generating developer summary...");

        const generated = await generateDeveloperSummary(commits);

        if (generated) {
          await saveDevSummary(githubUsername, generated);
          await setCache(devSummaryCacheKey, generated);
          devSummary = generated;
        } else {
          devSummary = "Profile summary not ready";
        }
      } else {
        devSummary = "Profile summary not ready";
      }
    }

    // ================= 🔥 TOP PROJECTS =================

    let projects = await getCache(projectsCacheKey);

    if (!projects) {
      projects = await getProjects(githubUsername);

      if (projects && projects.length > 0) {
        console.log("📦 Projects from DB");
        await setCache(projectsCacheKey, projects);
      } 
      else if (commits && commits.length > 0) {
        console.log("🚀 Generating top projects...");

        const generated = await generateTopProjects(commits);

        if (generated && generated.length > 0) {
          await saveProjects(githubUsername, generated);
          await setCache(projectsCacheKey, generated);
          projects = generated;
        } else {
          projects = [];
        }
      } else {
        projects = [];
      }
    }

    res.render("profile", { 
      commits, 
      summary, 
      devSummary,   // 🔥 NEW
      projects      // 🔥 NEW
    });

  } catch (error) {
    console.log(error.message);
    res.render("profile", { 
      commits: [], 
      summary: "Summary unavailable",
      devSummary: "Unavailable", // 🔥 NEW
      projects: []               // 🔥 NEW
    });
  }
};

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

  console.log("🚀 WEBHOOK HIT");

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

      // ✅ Get GitHub username
      const githubUsername =
        payload.repository?.owner?.login ||
        payload.repository?.owner?.name;

      if (!githubUsername) {
        console.log("No GitHub username found");
        return res.status(200).send("No username");
      }

      console.log("GitHub User:", githubUsername);

      // ✅ Format commits
      const formattedCommits = commits.map(c => ({
        repo: repoName,
        message: c.message,
        author: c.author.name,
        date: c.timestamp,
        sha: c.id
      }));

      console.log("Formatted commits:", formattedCommits);

      // ✅ Save commits using github_username
      await saveToDb(formattedCommits, githubUsername);

      // ✅ Cache keys (USER SPECIFIC)
      const commitsCacheKey = `commits:${githubUsername}`;
      const summaryCacheKey = `summary:${githubUsername}`;

      // ✅ Clear old cache
      await redisClient.del(commitsCacheKey);
      await redisClient.del(summaryCacheKey);
      await redisClient.del(`devSummary:${githubUsername}`);
      await redisClient.del(`projects:${githubUsername}`);
      console.log("Cache cleared");

      // ✅ Fetch commits for THIS user only
      const commitsFromDB = await getLatestCommitsFromDB(githubUsername, 20);

      if (!commitsFromDB || commitsFromDB.length === 0) {
        console.log("No commits found for summary");
        return res.status(200).send("No commits for summary");
      }

      console.log("Generating summary...");

      // ✅ Generate summary
      const summary = await generateSummaryWithRetry(commitsFromDB);

      if (summary && summary !== "Summary unavailable") {
        await saveSummary(githubUsername, summary);
        await setCache(summaryCacheKey, summary);
        console.log("✅ Summary updated for:", githubUsername);
      } else {
        console.log("⚠️ AI failed — keeping old summary");
      }
    }

    res.status(200).send("Webhook processed");

  } catch (err) {
    console.error("❌ WEBHOOK ERROR:", err.message);
    res.status(500).send("Webhook error");
  }
};

module.exports={getGithubRepos,getGithubCommits,getAllRepoNames,getAllCommits,getProfilePage,handleGithubWebhook}