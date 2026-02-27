// backend/src/routes/recipes.js
import express from "express";

const router = express.Router();

// POST /recipes
router.post("/", (req, res) => {
  const { name, ingredients, prepTime, steps, cost } = req.body ?? {};

  // Validate name
  if (!name || typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({
      success: false,
      error: "Recipe name is required."
    });
  }

  // Validate ingredients
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return res.status(400).json({
      success: false,
      error: "At least one ingredient is required."
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
        error: `Ingredient #${i + 1} name is required.`
      });
    }

    if (!unit) {
      return res.status(400).json({
        success: false,
        error: `Ingredient #${i + 1} unit is required.`
      });
    }

    if (!Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({
        success: false,
        error: `Ingredient #${i + 1} quantity must be a positive number.`
      });
    }
  }

  // Validate prepTime
  const prep = Number(prepTime);
  if (!Number.isFinite(prep) || prep <= 0) {
    return res.status(400).json({
      success: false,
      error: "prepTime must be a positive number."
    });
  }

  // Validate steps
  if (!steps || typeof steps !== "string" || steps.trim() === "") {
    return res.status(400).json({
      success: false,
      error: "steps are required."
    });
  }

  // Validate cost (optional)
  let parsedCost = null;
  if (cost !== undefined && cost !== null && String(cost).trim() !== "") {
    const c = Number(cost);
    if (!Number.isFinite(c) || c < 0) {
      return res.status(400).json({
        success: false,
        error: "cost must be a non-negative number."
      });
    }
    parsedCost = c;
  }

  // Placeholder response (NO DB save in this task)
  return res.status(201).json({
    success: true,
    message: "Recipe received (not saved to DB yet).",
    data: {
      id: `temp_${Date.now()}`,
      name: name.trim(),
      ingredients: ingredients.map((ing) => ({
        name: String(ing.name).trim(),
        quantity: Number(ing.quantity),
        unit: String(ing.unit).trim(),
      })),
      prepTime: prep,
      steps: steps.trim(),
      cost: parsedCost,
    },
  });
});

export default router;