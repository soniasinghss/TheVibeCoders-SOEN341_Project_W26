import express from "express";
import bcrypt from "bcrypt";
import jsonWebToken from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

// Register route
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash
    });

    return res.status(201).json({
      message: "User registered successfully.",
      user: { id: user._id, email: user.email }
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: "Email already registered." });
    }
    console.error(err);
    return res.status(500).json({ error: "Server error." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Please provide email and password." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // do not reveal whether the email exists
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    if (!process.env.JWT_SECRET) {
      console.error("Missing JWT_SECRET in environment");
      return res.status(500).json({ error: "Server configuration issue." });
    }

    // create a compact token, keep payload small
    const payload = { uid: user._id.toString(), email: user.email };
    const token = jsonWebToken.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });

    return res.json({ message: "Logged in.", token, user: { id: user._id, email: user.email } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong." });
  }
});

export default router;

