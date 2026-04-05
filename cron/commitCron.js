const cron = require("node-cron");
const pool = require("../db");

const {AllCommits,saveToDb,saveSummary,getLatestCommitsFromDB,saveDevSummary, saveProjects} = require("../services/githubService");
const { redisClient, setCache } = require("../utils/redisClient");
const { generateSummaryWithRetry,generateDeveloperSummary, generateTopProjects } = require("../services/aiService");

const startCommitCron = () => {
  // Runs once every day at midnight
  cron.schedule("*/10 * * * *", async () => {
    console.log("⏰ Running commit cron for ALL users...");
    try {
      // ✅ Get all users
      const users = await pool.query(`SELECT github_username FROM users WHERE github_username IS NOT NULL`);

      for (const user of users.rows) {
        const username = user.github_username;
        try {
          console.log(`🔄 Processing ${username}`);

          // ✅ Fetch commits
          const commits = await AllCommits(username);
          const validCommits = commits.filter(
            (c) => c.message && c.date && c.repo
          );
          if (validCommits.length === 0) {
            console.log(`⚠️ No valid commits for ${username}`);
            continue;
          }
          console.log(`${validCommits.length} commits fetched`);
          // ✅ Attach username
          const commitsWithUser = validCommits.map((c) => ({
            ...c,
            username,
          }));
          // ✅ Save to DB
          await saveToDb(commitsWithUser, username);
          // ✅ Clear cache
          await redisClient.del(`commits:${username}`);
          await redisClient.del(`summary:${username}`);

          // ✅ Get latest commits
          const commitsFromDB = await getLatestCommitsFromDB(username,20);

          if (!commitsFromDB.length) {
            console.log(`⚠️ No commits found in DB for ${username}`);
            continue;
          }

          console.log(`🧠 Generating summary for ${username}...`);

          // ✅ Generate summary
          const summary = await generateSummaryWithRetry(commitsFromDB);
          if (summary) {
            await saveSummary(username, summary);
            await setCache(`summary:${username}`, summary);
          }
          console.log(`✅ Done for ${username}`);

          // 🔥 DEV SUMMARY
          const devSummary = await generateDeveloperSummary(commitsFromDB);
          if (devSummary) {
            await saveDevSummary(username, devSummary);
          }

          // 🔥 PROJECTS
          const projects = await generateTopProjects(commitsFromDB);
          if (projects && projects.length > 0) {
            await saveProjects(username, projects);
          }
        } catch (err) {
          // ✅ Per-user error handling (IMPORTANT)
          console.error(
            `❌ Failed for ${username}:`,
            err.message
          );
        }
      }
    } catch (err) {
      // ✅ Global cron error handling
      console.error("❌ Cron failed:", err.message);
    }
  });
};

module.exports = { startCommitCron };