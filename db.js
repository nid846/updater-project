require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "postgres",
  password: `${process.env.postgres_pass}`,
  port: 5432,
});

module.exports = pool;