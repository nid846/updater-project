const {
  createUser,
  findUserByEmail,
  validatePassword
} = require("../services/authService");

// Signup
const signup = async (req, res) => {
  try {
    const { username, email, password, github_username } = req.body;

    const existing = await findUserByEmail(email);
    if (existing) return res.send("User already exists");

    const user = await createUser(
      username,
      email,
      password,
      github_username
    );

    req.session.user = user;

    // 🔥 REDIRECT USING github_username
    res.redirect(`/profile/${user.github_username}`);

  } catch (err) {
    console.log(err.message);
    res.send("Signup failed");
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).send("Email and password are required");
    }

    const user = await findUserByEmail(email);
    if (!user) return res.status(404).send("User not found");

    if (!user.password) {
      return res.status(400).send("Account has no password set. Please sign up again.");
    }

    const isValid = await validatePassword(password, user.password);
    if (!isValid) return res.status(401).send("Invalid password");

    req.session.user = user;
    res.redirect(`/profile/${user.github_username}`);

  } catch (err) {
    console.log("Login error:", err.message);
    res.status(500).send("Login failed: " + err.message);
  }
};

// Logout
const logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
};

module.exports = { signup, login, logout };