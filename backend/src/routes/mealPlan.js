import express from "express";
import mongoose from "mongoose";
import Mealplan from "../models/Mealplan.js";
import Recipe from "../models/Recipe.js";

const router = express.Router();

const DAYS = [
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
	"Sunday",
];

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

function isValidObjectId(id) {
	return mongoose.Types.ObjectId.isValid(id);
}

function mapEntry(entry) {
	const recipeDoc = entry.recipeId;
	const recipe = recipeDoc
		? {
				_id: recipeDoc._id,
				name: recipeDoc.name,
			}
		: null;

	return {
		_id: entry._id,
		userId: entry.userId,
		recipe,
		recipeId: recipe?._id ?? null,
		day: entry.day,
		mealType: entry.mealType,
		weekId: entry.weekId,
		plannedDateTime: entry.plannedDateTime,
		servings: entry.servings,
		createdAt: entry.createdAt,
		updatedAt: entry.updatedAt,
	};
}

router.get("/", async (req, res) => {
	try {
		const { userId, weekId } = req.query;

		if (!userId || !weekId) {
			return res.status(400).json({
				success: false,
				error: "userId and weekId are required.",
			});
		}

		if (!isValidObjectId(userId)) {
			return res.status(400).json({
				success: false,
				error: "Invalid userId.",
			});
		}

		const entries = await Mealplan.find({ userId, weekId })
			.populate("recipeId", "name")
			.sort({ day: 1, mealType: 1 })
			.lean();

		return res.json({
			success: true,
			data: entries.map(mapEntry),
		});
	} catch (err) {
		console.error("Error fetching meal plan:", err);
		return res.status(500).json({
			success: false,
			error: "Something went wrong while fetching meal plan.",
		});
	}
});

router.post("/", async (req, res) => {
	try {
		const {
			userId,
			recipeId,
			day,
			mealType,
			weekId,
			plannedDateTime,
			servings,
		} = req.body ?? {};

		if (!userId || !recipeId || !day || !mealType || !weekId) {
			return res.status(400).json({
				success: false,
				error: "userId, recipeId, day, mealType, and weekId are required.",
			});
		}

		if (!isValidObjectId(userId) || !isValidObjectId(recipeId)) {
			return res.status(400).json({
				success: false,
				error: "Invalid userId or recipeId.",
			});
		}

		if (!DAYS.includes(day)) {
			return res.status(400).json({
				success: false,
				error: "Invalid day.",
			});
		}

		if (!MEAL_TYPES.includes(String(mealType).toLowerCase())) {
			return res.status(400).json({
				success: false,
				error: "Invalid meal type.",
			});
		}

		const recipeExists = await Recipe.exists({ _id: recipeId });
		if (!recipeExists) {
			return res.status(404).json({
				success: false,
				error: "Recipe not found.",
			});
		}

		let normalizedServings = 1;
		if (servings !== undefined) {
			const parsedServings = Number(servings);
			if (!Number.isInteger(parsedServings) || parsedServings < 1) {
				return res.status(400).json({
					success: false,
					error: "servings must be an integer greater than 0.",
				});
			}
			normalizedServings = parsedServings;
		}

		let normalizedDateTime = null;
		if (plannedDateTime) {
			const parsedDateTime = new Date(plannedDateTime);
			if (Number.isNaN(parsedDateTime.getTime())) {
				return res.status(400).json({
					success: false,
					error: "plannedDateTime is invalid.",
				});
			}
			normalizedDateTime = parsedDateTime;
		}

		const entry = await Mealplan.create({
			userId,
			recipeId,
			day,
			mealType: String(mealType).toLowerCase(),
			weekId,
			plannedDateTime: normalizedDateTime,
			servings: normalizedServings,
		});

		const populated = await Mealplan.findById(entry._id).populate("recipeId", "name").lean();

		return res.status(201).json({
			success: true,
			message: "Meal added to planner.",
			data: mapEntry(populated),
		});
	} catch (err) {
		if (err?.code === 11000) {
			return res.status(409).json({
				success: false,
				error: "A meal is already planned for this day and meal slot.",
			});
		}

		console.error("Error creating meal plan entry:", err);
		return res.status(500).json({
			success: false,
			error: "Something went wrong while adding meal to planner.",
		});
	}
});

router.put("/:id", async (req, res) => {
	try {
		const { id } = req.params;
		if (!isValidObjectId(id)) {
			return res.status(400).json({
				success: false,
				error: "Invalid meal plan entry id.",
			});
		}

		const entry = await Mealplan.findById(id);
		if (!entry) {
			return res.status(404).json({
				success: false,
				error: "Meal plan entry not found.",
			});
		}

		const {
			recipeId,
			day,
			mealType,
			weekId,
			plannedDateTime,
			servings,
		} = req.body ?? {};

		if (recipeId !== undefined) {
			if (!isValidObjectId(recipeId)) {
				return res.status(400).json({
					success: false,
					error: "Invalid recipeId.",
				});
			}
			const recipeExists = await Recipe.exists({ _id: recipeId });
			if (!recipeExists) {
				return res.status(404).json({
					success: false,
					error: "Recipe not found.",
				});
			}
			entry.recipeId = recipeId;
		}

		if (day !== undefined) {
			if (!DAYS.includes(day)) {
				return res.status(400).json({
					success: false,
					error: "Invalid day.",
				});
			}
			entry.day = day;
		}

		if (mealType !== undefined) {
			const normalizedMealType = String(mealType).toLowerCase();
			if (!MEAL_TYPES.includes(normalizedMealType)) {
				return res.status(400).json({
					success: false,
					error: "Invalid meal type.",
				});
			}
			entry.mealType = normalizedMealType;
		}

		if (weekId !== undefined) {
			if (!String(weekId).trim()) {
				return res.status(400).json({
					success: false,
					error: "weekId cannot be empty.",
				});
			}
			entry.weekId = String(weekId).trim();
		}

		if (servings !== undefined) {
			const parsedServings = Number(servings);
			if (!Number.isInteger(parsedServings) || parsedServings < 1) {
				return res.status(400).json({
					success: false,
					error: "servings must be an integer greater than 0.",
				});
			}
			entry.servings = parsedServings;
		}

		if (plannedDateTime !== undefined) {
			if (plannedDateTime === null || plannedDateTime === "") {
				entry.plannedDateTime = null;
			} else {
				const parsedDateTime = new Date(plannedDateTime);
				if (Number.isNaN(parsedDateTime.getTime())) {
					return res.status(400).json({
						success: false,
						error: "plannedDateTime is invalid.",
					});
				}
				entry.plannedDateTime = parsedDateTime;
			}
		}

		const slotConflict = await Mealplan.findOne({
			_id: { $ne: entry._id },
			userId: entry.userId,
			weekId: entry.weekId,
			day: entry.day,
			mealType: entry.mealType,
		}).lean();

		if (slotConflict) {
			return res.status(409).json({
				success: false,
				error: "Another meal is already planned in that slot.",
			});
		}

		await entry.save();
		const populated = await Mealplan.findById(entry._id).populate("recipeId", "name").lean();

		return res.json({
			success: true,
			message: "Meal updated successfully.",
			data: mapEntry(populated),
		});
	} catch (err) {
		if (err?.code === 11000) {
			return res.status(409).json({
				success: false,
				error: "Another meal is already planned in that slot.",
			});
		}

		console.error("Error updating meal plan entry:", err);
		return res.status(500).json({
			success: false,
			error: "Something went wrong while updating meal in planner.",
		});
	}
});

router.delete("/:id", async (req, res) => {
	try {
		const { id } = req.params;

		if (!isValidObjectId(id)) {
			return res.status(400).json({
				success: false,
				error: "Invalid meal plan entry id.",
			});
		}

		const deleted = await Mealplan.findByIdAndDelete(id).lean();
		if (!deleted) {
			return res.status(404).json({
				success: false,
				error: "Meal plan entry not found.",
			});
		}

		return res.json({
			success: true,
			message: "Meal removed from planner.",
		});
	} catch (err) {
		console.error("Error deleting meal plan entry:", err);
		return res.status(500).json({
			success: false,
			error: "Something went wrong while removing meal from planner.",
		});
	}
});

export default router;
