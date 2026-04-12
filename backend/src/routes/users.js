import express from 'express';
import requireAuth from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('name firstName lastName email dietPreferences allergies');
    if (!user) {
      return res.status(404).json({error: 'User not found.'});
    }

    // Backward compatibility: if firstName/lastName not set, try to use name
    if (!user.firstName && user.name) {
      const nameParts = user.name.split(' ');
      user.firstName = nameParts[0] || '';
      user.lastName = nameParts.slice(1).join(' ') || '';
    }

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({error: 'Failed to retrieve user profile.'});
  }
});

router.put('/me', requireAuth, async (req, res) => {
  try {
    const {dietPreferences, allergies, firstName, lastName} = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({error: 'User not found.'});
    }

    if (firstName !== undefined) {
      user.firstName = String(firstName).trim();
    }

    if (lastName !== undefined) {
      user.lastName = String(lastName).trim();
    }

    if (dietPreferences !== undefined) user.dietPreferences = dietPreferences;

    if (allergies !== undefined) {
      // Validate and deduplicate allergies
      if (typeof allergies === 'string') {
        const allergyArray = allergies.split(',')
            .map((a) => a.trim())
            .filter(Boolean); // Remove empty strings

        // Remove duplicates (case-insensitive)
        const uniqueAllergies = [...new Map(
            allergyArray.map((allergy) => [allergy.toLowerCase(), allergy]),
        ).values()];

        user.allergies = uniqueAllergies.join(', ');
      }
    }

    await user.save();
    res.json({message: 'Profile updated successfully', user: {firstName: user.firstName, lastName: user.lastName, email: user.email, dietPreferences: user.dietPreferences, allergies: user.allergies}});
  } catch (err) {
    console.error(err);
    res.status(500).json({error: 'Failed to update profile.'});
  }
});

export default router;
