const pool = require('./db');

async function initDB() {
  try {
    console.log("Checking and ensuring database tables...");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        github_username VARCHAR(255)
      );

      CREATE TABLE IF NOT EXISTS commits (
        id SERIAL PRIMARY KEY,
        repo VARCHAR(255),
        message TEXT,
        author VARCHAR(255),
        date TIMESTAMP,
        sha VARCHAR(255) UNIQUE,
        github_username VARCHAR(255)
      );

      CREATE TABLE IF NOT EXISTS summaries (
        username VARCHAR(255) PRIMARY KEY,
        summary TEXT,
        last_updated TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS developer_summary (
        github_username VARCHAR(255) PRIMARY KEY,
        summary TEXT
      );

      CREATE TABLE IF NOT EXISTS projects (
        github_username VARCHAR(255) PRIMARY KEY,
        project_data JSONB
      );
    `);

    console.log("✅ All tables ensured successfully!");
  } catch (err) {
    console.error("❌ Database initialization error:", err.message);
  }
}

if (require.main === module) {
  initDB().then(() => pool.end());
}

module.exports = { initDB };
