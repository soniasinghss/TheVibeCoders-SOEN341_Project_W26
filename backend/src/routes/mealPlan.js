console.log("mealPlan.js loaded ✅");
// backend/src/routes/mealPlan.js
import express from "express";
import MealPlanEntry from "../models/Mealplan.js";
import Recipe from "../models/Recipe.js";

const router = express.Router();

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

// Helper: compute ISO week id from a Date, e.g. "2026-W12"
function getWeekId(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum =
    Math.round(
      ((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
    ) + 1;
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

/**
 * GET /meal-plan?weekId=2026-W12
 * Returns all meal plan entries for a given user and week.
 * If no weekId is provided, defaults to the current week.
 */
router.get("/", async (req, res) => {
  try {
    const { userId, weekId } = req.query;

    if (!userId || String(userId).trim() === "") {
      return res.status(400).json({
        success: false,
        error: "userId is required.",
      });
    }

    const resolvedWeekId = weekId && String(weekId).trim() !== "" ? weekId : getWeekId();

    const entries = await MealPlanEntry.find({
      user: userId,
      weekId: resolvedWeekId,
    }).populate("recipe", "name prepTime difficulty cost dietaryTags");

    return res.status(200).json({
      success: true,
      message: "Meal plan fetched successfully.",
      weekId: resolvedWeekId,
      count: entries.length,
      data: entries,
    });
  } catch (err) {
    console.error("Unexpected server error (GET /meal-plan):", err);
    return res.status(500).json({
      success: false,
      error: "Something went wrong while fetching the meal plan.",
    });
  }
});

/**
 * POST /meal-plan
 * Assigns a recipe to a meal slot (day + mealType) for a given week.
 * Body: { userId, recipeId, day, mealType, weekId? }
 */
router.post("/", async (req, res) => {
  try {
    const { userId, recipeId, day, mealType, weekId } = req.body ?? {};

    // VALIDATION
    if (!userId || String(userId).trim() === "") {
      return res.status(400).json({
        success: false,
        error: "userId is required.",
      });
    }

    if (!recipeId || String(recipeId).trim() === "") {
      return res.status(400).json({
        success: false,
        error: "recipeId is required.",
      });
    }

    // AC: user cannot submit without selecting both a day and a meal type
    if (!day || String(day).trim() === "") {
      return res.status(400).json({
        success: false,
        error: "day is required.",
      });
    }

    if (!mealType || String(mealType).trim() === "") {
      return res.status(400).json({
        success: false,
        error: "mealType is required.",
      });
    }

    if (!DAYS.includes(day)) {
      return res.status(400).json({
        success: false,
        error: `day must be one of: ${DAYS.join(", ")}.`,
      });
    }

    if (!MEAL_TYPES.includes(mealType)) {
      return res.status(400).json({
        success: false,
        error: `mealType must be one of: ${MEAL_TYPES.join(", ")}.`,
      });
    }

    // Confirm recipe exists
    const recipe = await Recipe.findById(recipeId);
    if (!recipe) {
      return res.status(404).json({
        success: false,
        error: "Recipe not found.",
      });
    }

    const resolvedWeekId = weekId && String(weekId).trim() !== "" ? weekId : getWeekId();

    // TA-16.4: Duplicate prevention — check before inserting
    const existing = await MealPlanEntry.findOne({
      user: userId,
      day,
      mealType,
      weekId: resolvedWeekId,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: `You already have a meal planned for ${day} ${mealType} this week.`,
      });
    }

    const entry = await MealPlanEntry.create({
      user: userId,
      recipe: recipeId,
      day,
      mealType,
      weekId: resolvedWeekId,
    });

    await entry.populate("recipe", "name prepTime difficulty cost dietaryTags");

    // AC: confirmation message shown after meal is successfully added
    return res.status(201).json({
      success: true,
      message: `${recipe.name} added to ${day} ${mealType} successfully.`,
      data: entry,
    });
  } catch (err) {
    // Fallback: catch MongoDB duplicate key error from the unique index
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        error: "A meal is already planned for that slot this week.",
      });
    }
    console.error("Unexpected server error (POST /meal-plan):", err);
    return res.status(500).json({
      success: false,
      error: "Something went wrong while adding the meal.",
    });
  }
});

/**
 * DELETE /meal-plan/:id
 * Removes a meal plan entry by its ID.
 */
router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const deleted = await MealPlanEntry.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: "Meal plan entry not found.",
      });
    }

    return res.json({
      success: true,
      message: "Meal removed from plan successfully.",
      data: deleted,
    });
  } catch (err) {
    console.error("Unexpected server error (DELETE /meal-plan/:id):", err);
    return res.status(500).json({
      success: false,
      error: "Something went wrong while removing the meal.",
    });
  }
});

export default router;