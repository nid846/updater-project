const cron = require("node-cron");
const { AllCommits,saveToDb } = require("../services/githubService");
const {redisClient} = require("../utils/redisClient"); // adjust if different

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
        await saveToDb(validCommits);

        await redisClient.del(`commits:${username}`);

        console.log("Valid commits saved");
        } else {
        console.log("No valid commits found — skipping DB update");
        }
    } catch (error) {
      console.error("Cron job failed:", error.message);
    }
  });
};

module.exports = { startCommitCron };