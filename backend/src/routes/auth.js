import express from "express";
import bcrypt from "bcrypt";
import User from "../models/User.js";

const router = express.Router();

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

export default router;

