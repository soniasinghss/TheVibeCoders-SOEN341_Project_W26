import express from "express";
import requireAuth from "../middleware/auth.js";
import User from "../models/User.js";

const router = express.Router();

router.get("/me", requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("email dietPreferences allergies");
        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to retrieve user profile." });
    }
});

export default router;