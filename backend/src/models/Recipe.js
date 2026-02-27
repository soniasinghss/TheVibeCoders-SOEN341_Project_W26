import mongoose from "mongoose";

const ingredientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const recipeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    ingredients: { type: [ingredientSchema], required: true },

    prepTime: { type: Number, required: true, min: 0 },

    steps: { type: String, required: true, trim: true },

    cost: { type: Number, default: null, min: 0 },

    // ✅ NEW: difficulty (optional)
    // You can change the allowed values if your team uses different ones
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "easy",
      trim: true,
    },

    // ✅ NEW: dietary tags (optional)
    // Example: ["vegan", "gluten-free", "halal"]
    dietaryTags: {
      type: [String],
      default: [],
      set: (arr) =>
        Array.isArray(arr)
          ? arr.map((t) => String(t).trim().toLowerCase()).filter(Boolean)
          : [],
    },
  },
  { timestamps: true }
);

export default mongoose.model("Recipe", recipeSchema);