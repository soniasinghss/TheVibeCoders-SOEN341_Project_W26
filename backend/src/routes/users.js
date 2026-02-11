import express from "express";
import requireAuth from "../middleware/auth.js";
import User from "../models/User.js";

const router = express.Router();

router.get("/me", requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("name email dietPreferences allergies");
        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to retrieve user profile." });
    }
});

router.put("/me", requireAuth, async (req, res) => {
    try {
        const { dietPreferences, allergies } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        if (dietPreferences !== undefined) user.dietPreferences = dietPreferences;
        
        if (allergies !== undefined) {
            // Validate and deduplicate allergies
            if (typeof allergies === 'string') {
                const allergyArray = allergies.split(',')
                    .map(a => a.trim())
                    .filter(a => a); // Remove empty strings
                
                // Remove duplicates (case-insensitive)
                const uniqueAllergies = [...new Map(
                    allergyArray.map(allergy => [allergy.toLowerCase(), allergy])
                ).values()];
                
                user.allergies = uniqueAllergies.join(', ');
            }
        }

        await user.save();
        res.json({ message: "Profile updated successfully", user: { name: user.name, email: user.email, dietPreferences: user.dietPreferences, allergies: user.allergies } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update profile." });
    }
});

export default router;