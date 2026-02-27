import mongoose from "mongoose";

const ingredientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const recipeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    ingredients: {
      type: [ingredientSchema],
      required: true,
    },
    prepTime: {
      type: Number,
      required: true,
      min: 0,
    },
    steps: {
      type: String,
      required: true,
      trim: true,
    },
    cost: {
      type: Number,
      default: null,
      min: 0,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

export default mongoose.model("Recipe", recipeSchema);