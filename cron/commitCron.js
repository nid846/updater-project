const cron = require("node-cron");
const {AllCommits,saveToDb,saveSummary,getLatestCommitsFromDB} = require("../services/githubService");
const { redisClient, setCache } = require("../utils/redisClient");
const { generateSummaryWithRetry } = require("../services/aiService");

const username = process.env.GITHUB_USERNAME;

const startCommitCron = () => {
  cron.schedule("0 */24 * * *", async () => {
    console.log("Running commit cron job...");

    try {
      const commits = await AllCommits(username);

      // ✅ 1️⃣ Filter valid commits
      const validCommits = commits.filter(c =>
        c.message && c.date && c.repo
      );

      if (validCommits.length === 0) {
        console.log("No valid commits — skipping everything");
        return;
      }

      // ✅ 2️⃣ Save commits ONCE
      await saveToDb(validCommits);

      // ✅ 3️⃣ Clear caches
      await redisClient.del(`commits:${username}`);
      await redisClient.del(`summary:${username}`);

      console.log("Commits saved & cache cleared");

      // ✅ 4️⃣ Get latest commits from DB
      const commitsFromDB = await getLatestCommitsFromDB(20);

      // ✅ 5️⃣ Generate summary with retry
      const summary = await generateSummaryWithRetry(commitsFromDB);

      if (summary) {
        await saveSummary(username, summary);
        await setCache(`summary:${username}`, summary);
        console.log("✅ Summary updated via cron");
      } else {
        console.log("⚠️ AI failed twice — keeping old summary");
      }

    } catch (error) {
      console.error("❌ Cron job failed:", error.message);
    }
  });
};

module.exports = { startCommitCron };