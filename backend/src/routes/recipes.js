// backend/src/routes/recipes.js
import express from "express";
import Recipe from "../models/Recipe.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { name, ingredients, prepTime, steps, cost } = req.body ?? {};

    // =========================
    // VALIDATION (400 errors)
    // =========================

    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "Recipe name is required.",
      });
    }

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one ingredient is required.",
      });
    }

    for (let i = 0; i < ingredients.length; i++) {
      const ing = ingredients[i];

      const ingName = String(ing?.name ?? "").trim();
      const unit = String(ing?.unit ?? "").trim();
      const qty = Number(ing?.quantity);

      if (!ingName) {
        return res.status(400).json({
          success: false,
          error: `Ingredient #${i + 1} name is required.`,
        });
      }

      if (!unit) {
        return res.status(400).json({
          success: false,
          error: `Ingredient #${i + 1} unit is required.`,
        });
      }

      if (!Number.isFinite(qty) || qty <= 0) {
        return res.status(400).json({
          success: false,
          error: `Ingredient #${i + 1} quantity must be a positive number.`,
        });
      }
    }

    const prep = Number(prepTime);
    if (!Number.isFinite(prep) || prep <= 0) {
      return res.status(400).json({
        success: false,
        error: "prepTime must be a positive number.",
      });
    }

    if (!steps || typeof steps !== "string" || steps.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "steps are required.",
      });
    }

    let parsedCost = null;
    if (cost !== undefined && cost !== null && String(cost).trim() !== "") {
      const c = Number(cost);
      if (!Number.isFinite(c) || c < 0) {
        return res.status(400).json({
          success: false,
          error: "cost must be a non-negative number.",
        });
      }
      parsedCost = c;
    }

    // =========================
    // DATABASE SAVE (201)
    // =========================

    const newRecipe = await Recipe.create({
      name: name.trim(),
      ingredients: ingredients.map((ing) => ({
        name: String(ing.name).trim(),
        quantity: Number(ing.quantity),
        unit: String(ing.unit).trim(),
      })),
      prepTime: prep,
      steps: steps.trim(),
      cost: parsedCost,
    });

    return res.status(201).json({
      success: true,
      message: "Recipe created successfully.",
      data: newRecipe,
    });

  } catch (err) {
    console.error("Unexpected server error:", err);

    // =========================
    // SERVER ERROR (500)
    // =========================

    return res.status(500).json({
      success: false,
      error: "Something went wrong while creating the recipe.",
    });
  }
});

export default router;