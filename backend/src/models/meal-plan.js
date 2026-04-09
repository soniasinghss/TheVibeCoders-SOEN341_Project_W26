import mongoose from "mongoose";

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

const mealPlanSchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		recipeId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Recipe",
			required: true,
		},
		day: {
			type: String,
			enum: DAYS,
			required: true,
			trim: true,
		},
		mealType: {
			type: String,
			enum: MEAL_TYPES,
			required: true,
			trim: true,
			lowercase: true,
		},
		weekId: {
			type: String,
			required: true,
			trim: true,
		},
		plannedDateTime: {
			type: Date,
			default: null,
		},
		servings: {
			type: Number,
			min: 1,
			default: 1,
		},
	},
	{
		timestamps: true,
	}
);

mealPlanSchema.index(
	{ userId: 1, weekId: 1, day: 1, mealType: 1 },
	{ unique: true }
);

const MealPlan = mongoose.models.MealPlan || mongoose.model("MealPlan", mealPlanSchema);

export default MealPlan;
