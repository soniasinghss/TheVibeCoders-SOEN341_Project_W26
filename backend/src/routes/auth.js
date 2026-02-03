import express from "express";

const router = express.Router();

router.post("/register", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  return res.status(201).json({
    message: "Register endpoint works (Task 3).",
    received: { email }
  });
});

export default router;
