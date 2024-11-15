const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const dotenv = require("dotenv");
dotenv.config();

const app = express();
app.use(express.json());

app.use("/api/auth", require("./auth"));
app.use("/api/user", require("./routes/user"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

app.get("/", (req, res) => res.send("Server is up and running"));

const router = express.Router();
const { body, validationResult } = require("express-validator");

router.post(
  "/register",
  body("username").isLength({ min: 3 }),
  body("email").isEmail(),
  body("password").isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await db.query(
        "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email",
        [username, email, hashedPassword]
      );
      res.status(201).json({ user: result.rows[0] });
    } catch (error) {
      res.status(500).json({ error: "User registration failed" });
    }
  }
);

router.post(
  "/login",
  body("email").isEmail(),
  body("password").isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1", [
        email,
      ]);
      const user = result.rows[0];
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });
      res.json({ token });
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  }
);

module.exports = router;
