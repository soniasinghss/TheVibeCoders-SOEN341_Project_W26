// backend/src/models/MealPlan.js
import mongoose from 'mongoose';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

const mealPlanEntrySchema = new mongoose.Schema(
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      recipe: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Recipe',
        required: true,
      },
      day: {
        type: String,
        enum: DAYS,
        required: true,
      },
      mealType: {
        type: String,
        enum: MEAL_TYPES,
        required: true,
      },
      // ISO week string e.g. "2026-W12" — scopes entries to a specific week
      weekId: {
        type: String,
        required: true,
        match: /^\d{4}-W\d{2}$/,
      },
    },
    {timestamps: true},
);

// TA-16.4: Prevent duplicate entries for the same user/day/mealType/week
mealPlanEntrySchema.index(
    {user: 1, day: 1, mealType: 1, weekId: 1},
    {unique: true},
);

const MealPlanEntry = mongoose.model('MealPlanEntry', mealPlanEntrySchema);

export default MealPlanEntry;
