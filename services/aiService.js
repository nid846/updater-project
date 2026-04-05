// aiService.js
const { InferenceClient } = require("@huggingface/inference");
require("dotenv").config();

const client = new InferenceClient(process.env.HF_API_KEY);

async function generateSummary(commits) {
  try {
    const commitText = commits.map(c => c.message).join("\n");
    const prompt = `
Summarize the following commit messages.
Rules:
- Only use the given commits
- Do not add extra information
- Keep summary under 40 words

Commit messages:
${commitText}
`;

    const chatCompletion = await client.chatCompletion({
      model: "google/gemma-3-27b-it:featherless-ai",
      messages: [{ role: "user", content: [{ type: "text", text: prompt }] }]
    });

    const summary =
      chatCompletion?.choices?.[0]?.message?.content?.trim() ||
      "Summary unavailable";

    console.log(summary);
    return summary;

  } catch (err) {
    console.error("AI ERROR:", err.message);
    return "Summary unavailable";
  }
}

async function generateSummaryWithRetry(commits) {
  let attempts = 0;

  while (attempts < 2) {
    const summary = await generateSummary(commits);

    if (summary !== "Summary unavailable") {
      return summary;
    }

    console.log("Retrying AI...");
    attempts++;
  }

  return null;
}

async function generateDeveloperSummary(commits) {
  try {
    const commitText = commits.map(c => c.message).join("\n");

    const prompt = `
You are analyzing a developer's GitHub commits.

Based ONLY on the commit messages, generate a professional developer summary.

Rules:
- 1-2 lines max
- Mention role (Frontend / Backend / Fullstack)
- Mention technologies
- Resume-style sentence
- No assumptions beyond commits

Commits:
${commitText}
`;

    const res = await client.chatCompletion({
      model: "google/gemma-3-27b-it:featherless-ai",
      messages: [{ role: "user", content: [{ type: "text", text: prompt }] }]
    });

    return res?.choices?.[0]?.message?.content?.trim() || null;

  } catch (err) {
    console.error("Dev Summary Error:", err.message);
    return null;
  }
}

// 🔹 Helper: group commits by repo
function groupByRepo(commits) {
  const map = {};

  commits.forEach(c => {
    if (!map[c.repo]) map[c.repo] = [];
    map[c.repo].push(c.message);
  });

  return map;
}

// 🔹 MAIN: Generate Top Projects (FIXED)
async function generateTopProjects(commits) {
  try {
    const grouped = groupByRepo(commits);

    const prompt = `
You are analyzing GitHub repositories.

From the grouped commits below:
1. Identify top 3 meaningful projects
2. Return ONLY valid JSON
3. No markdown, no explanation

STRICT FORMAT:
[
 { "name": "", "description": "", "tech": [] }
]

Data:
${JSON.stringify(grouped)}
`;

    const res = await client.chatCompletion({
      model: "google/gemma-3-27b-it:featherless-ai",
      messages: [{ role: "user", content: [{ type: "text", text: prompt }] }]
    });

    let content = res?.choices?.[0]?.message?.content?.trim();

    console.log("RAW PROJECT AI:", content); // 🔥 debug once

    // 🔥 CLEANING STARTS HERE
    if (!content) return [];

    // Remove ```json blocks
    content = content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    // Extract JSON array only
    const start = content.indexOf("[");
    const end = content.lastIndexOf("]");

    if (start !== -1 && end !== -1) {
      content = content.slice(start, end + 1);
    }

    try {
      const parsed = JSON.parse(content);

      // ✅ Safety check
      if (!Array.isArray(parsed)) {
        console.log("⚠️ Not an array");
        return [];
      }

      return parsed;

    } catch (err) {
      console.log("❌ FINAL PARSE ERROR:", content);
      return [];
    }

  } catch (err) {
    console.error("Top Projects AI Error:", err.message);
    return [];
  }
}

module.exports = {
  generateSummary,
  generateSummaryWithRetry,
  generateDeveloperSummary,
  generateTopProjects
};