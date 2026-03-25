import pool from "../db.js";

const getUser = async () => {
  try {
    const result = await pool.query("SELECT * FROM users LIMIT 1");
    return result.rows[0];
  } catch (err) {
    console.error(err);
  }
};

export { getUser };