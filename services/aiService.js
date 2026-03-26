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

    console.log(chatCompletion?.choices?.[0]?.message?.content?.trim());
    return summary;

  } catch (err) {
    console.error("AI ERROR:", err.message);
    return "Summary unavailable";
  }
}

module.exports = { generateSummary };