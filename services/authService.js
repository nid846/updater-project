const pool = require("../db");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10;

async function createUser(username, email, password, github_username) {
  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await pool.query(
    `INSERT INTO users(username, email, password, github_username)
     VALUES($1, $2, $3, $4)
     RETURNING id, username, email, github_username`,
    [username, email, hashedPassword, github_username]
  );

  return result.rows[0];
}

async function findUserByEmail(email) {
  const res = await pool.query(
    `SELECT * FROM users WHERE email = $1`,
    [email]
  );
  return res.rows[0];
}

async function validatePassword(inputPassword, storedPassword) {
  return await bcrypt.compare(inputPassword, storedPassword);
}

module.exports = {
  createUser,
  findUserByEmail,
  validatePassword
};