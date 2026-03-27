const cron = require("node-cron");
const {
  AllCommits,
  saveToDb,
  saveSummary,
  getLatestCommitsFromDB
} = require("../services/githubService");

const { redisClient, setCache } = require("../utils/redisClient");
const { generateSummary } = require("../services/aiService");

const username = process.env.GITHUB_USERNAME;

const startCommitCron = () => {
  cron.schedule("0 */24 * * *", async () => {
    console.log("Running commit cron job...");

    try {
      const commits = await AllCommits(username);

      // ✅ FILTER VALID COMMITS
      const validCommits = commits.filter(c =>
        c.message && c.date && c.repo
      );

      if (validCommits.length > 0) {
        // 1️⃣ Save commits
        await saveToDb(validCommits);

        // 2️⃣ Clear commits cache
        await redisClient.del(`commits:${username}`);

        console.log("Valid commits saved");

        // 3️⃣ Regenerate summary
        const commitsFromDB = await getLatestCommitsFromDB(20);
        const summary = await generateSummary(commitsFromDB);

        if (summary !== "Summary unavailable") {
          await saveSummary(username, summary);
          await setCache(`summary:${username}`, summary);
          console.log("Summary updated via cron");
        } else {
          console.log("AI failed — keeping old summary");
        }

      } else {
        console.log("No valid commits found — skipping DB + summary update");
      }

    } catch (error) {
      console.error("Cron job failed:", error.message);
    }
  });
};

module.exports = { startCommitCron };