import express from "express";
import mongoose from "mongoose";
import MealPlanEntry from "../models/Mealplan.js";
import Recipe from "../models/Recipe.js";

const router = express.Router();

const DAYS = [
	"Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
];

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

function getWeekId(date = new Date()) {
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
	const week1 = new Date(d.getFullYear(), 0, 4);
	const weekNum = Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7) + 1;
	return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function isValidObjectId(id) {
	return mongoose.Types.ObjectId.isValid(id);
}

function mapEntry(entry) {
	const recipeDoc = entry.recipe;
	const recipe = recipeDoc ? { _id: recipeDoc._id, name: recipeDoc.name } : null;

	return {
		_id: entry._id,
		userId: entry.user,
		recipe,
		recipeId: recipe?._id ?? null,
		day: entry.day,
		mealType: entry.mealType,
		weekId: entry.weekId,
		servings: entry.servings,
		createdAt: entry.createdAt,
		updatedAt: entry.updatedAt,
	};
}

router.get("/", async (req, res) => {
	try {
		const { userId, weekId } = req.query;

		if (!userId) {
			return res.status(400).json({ success: false, error: "userId is required." });
		}

		if (!isValidObjectId(userId)) {
			return res.status(400).json({ success: false, error: "Invalid userId." });
		}

		const resolvedWeekId = weekId || getWeekId();

		const entries = await MealPlanEntry.find({ user: userId, weekId: resolvedWeekId })
			.populate("recipe", "name")
			.sort({ day: 1, mealType: 1 })
			.lean();

		return res.json({ success: true, data: entries.map(mapEntry) });
	} catch (err) {
		console.error("Error fetching meal plan:", err);
		return res.status(500).json({ success: false, error: "Something went wrong while fetching meal plan." });
	}
});

router.post("/", async (req, res) => {
	try {
		const { userId, recipeId, day, mealType, weekId, servings } = req.body ?? {};

		if (!userId || !recipeId || !day || !mealType) {
			return res.status(400).json({
				success: false,
				error: "userId, recipeId, day, mealType are required.",
			});
		}

		if (!isValidObjectId(userId) || !isValidObjectId(recipeId)) {
			return res.status(400).json({ success: false, error: "Invalid userId or recipeId." });
		}

		if (!DAYS.includes(day)) {
			return res.status(400).json({ success: false, error: "Invalid day." });
		}

		if (!MEAL_TYPES.includes(String(mealType).toLowerCase())) {
			return res.status(400).json({ success: false, error: "Invalid meal type." });
		}

		const recipeExists = await Recipe.exists({ _id: recipeId });
		if (!recipeExists) {
			return res.status(404).json({ success: false, error: "Recipe not found." });
		}

		const resolvedWeekId = weekId || getWeekId();

		const duplicate = await MealPlanEntry.exists({
			user: userId,
			recipe: recipeId,
			weekId: resolvedWeekId,
		});
		if (duplicate) {
			return res.status(409).json({
				success: false,
				error: "This meal is already planned for this week.",
			});
		}

		const slotTaken = await MealPlanEntry.exists({
			user: userId,
			day,
			mealType: String(mealType).toLowerCase(),
			weekId: resolvedWeekId,
		});
		if (slotTaken) {
			return res.status(409).json({
				success: false,
				error: "A meal is already planned for this day and meal slot.",
			});
		}

		let normalizedServings = 1;
		if (servings !== undefined) {
			const parsedServings = Number(servings);
			if (!Number.isInteger(parsedServings) || parsedServings < 1) {
				return res.status(400).json({ success: false, error: "servings must be an integer greater than 0." });
			}
			normalizedServings = parsedServings;
		}

		const entry = await MealPlanEntry.create({
			user: userId,
			recipe: recipeId,
			day,
			mealType: String(mealType).toLowerCase(),
			weekId: resolvedWeekId,
			servings: normalizedServings,
		});

		const populated = await MealPlanEntry.findById(entry._id).populate("recipe", "name").lean();

		return res.status(201).json({
			success: true,
			message: "Meal added to planner.",
			data: mapEntry(populated),
		});
	} catch (err) {
		if (err?.code === 11000) {
			return res.status(409).json({ success: false, error: "A meal is already planned for this day and meal slot." });
		}
		console.error("Error creating meal plan entry:", err);
		return res.status(500).json({ success: false, error: "Something went wrong while adding meal to planner." });
	}
});

router.delete("/:id", async (req, res) => {
	try {
		const { id } = req.params;

		if (!isValidObjectId(id)) {
			return res.status(400).json({ success: false, error: "Invalid meal plan entry id." });
		}

		const deleted = await MealPlanEntry.findByIdAndDelete(id).lean();
		if (!deleted) {
			return res.status(404).json({ success: false, error: "Meal plan entry not found." });
		}

		return res.json({ success: true, message: "Meal removed from planner." });
	} catch (err) {
		console.error("Error deleting meal plan entry:", err);
		return res.status(500).json({ success: false, error: "Something went wrong while removing meal from planner." });
	}
});

export default router;
