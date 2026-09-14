const dotenv = require("dotenv")
dotenv.config();
const { Pool } = require("pg");

// const pool = new Pool({
//   user: "postgres",
//   host: "localhost",
//   database: "postgres",
//   password: `${process.env.postgres_pass}`,
//   port: 5432,
// });

let rawDbUrl = process.env.DATABASE_URL ? process.env.DATABASE_URL.trim() : '';
if (rawDbUrl.startsWith('DATABASE_URL=')) {
  rawDbUrl = rawDbUrl.replace(/^DATABASE_URL=/, '').trim();
}
if ((rawDbUrl.startsWith('"') && rawDbUrl.endsWith('"')) || (rawDbUrl.startsWith("'") && rawDbUrl.endsWith("'"))) {
  rawDbUrl = rawDbUrl.slice(1, -1).trim();
}

const isProduction = process.env.NODE_ENV === "production" || (rawDbUrl && !rawDbUrl.includes("localhost") && !rawDbUrl.includes("127.0.0.1"));

const pool = new Pool({
  connectionString: rawDbUrl || undefined,
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

module.exports = pool;