console.log("recipes.js loaded ✅");
// backend/src/routes/recipes.js
import express from "express";
import Recipe from "../models/Recipe.js";

const router = express.Router();

/**
 * GET /recipes
 * Optional query params:
 *   - search: string (recipe name, case-insensitive)
 *   - minPrepTime: number
 *   - maxPrepTime: number
 *   - minCost: number
 *   - maxCost: number
 *   - difficulty: string (easy|medium|hard)
 *   - dietaryTag: string (single tag)
 *   - dietaryTags: comma-separated tags (ex: vegan,gluten-free)
 */
router.get("/", async (req, res) => {
  try {
    const {
      search,
      minPrepTime,
      maxPrepTime,
      minCost,
      maxCost,
      difficulty,
      dietaryTag,
      dietaryTags,
    } = req.query;

    const query = {};

    // SEARCH (name)
    if (search && String(search).trim() !== "") {
      query.name = { $regex: String(search).trim(), $options: "i" };
    }

    // FILTER: prepTime range
    if (minPrepTime !== undefined || maxPrepTime !== undefined) {
      const minT =
        minPrepTime !== undefined && String(minPrepTime).trim() !== ""
          ? Number(minPrepTime)
          : null;

      const maxT =
        maxPrepTime !== undefined && String(maxPrepTime).trim() !== ""
          ? Number(maxPrepTime)
          : null;

      if (minT !== null && (!Number.isFinite(minT) || minT < 0)) {
        return res.status(400).json({
          success: false,
          error: "minPrepTime must be a non-negative number.",
        });
      }
      if (maxT !== null && (!Number.isFinite(maxT) || maxT < 0)) {
        return res.status(400).json({
          success: false,
          error: "maxPrepTime must be a non-negative number.",
        });
      }

      query.prepTime = {};
      if (minT !== null) query.prepTime.$gte = minT;
      if (maxT !== null) query.prepTime.$lte = maxT;
    }

    // FILTER: cost range
    if (minCost !== undefined || maxCost !== undefined) {
      const minC =
        minCost !== undefined && String(minCost).trim() !== ""
          ? Number(minCost)
          : null;

      const maxC =
        maxCost !== undefined && String(maxCost).trim() !== ""
          ? Number(maxCost)
          : null;

      if (minC !== null && (!Number.isFinite(minC) || minC < 0)) {
        return res.status(400).json({
          success: false,
          error: "minCost must be a non-negative number.",
        });
      }
      if (maxC !== null && (!Number.isFinite(maxC) || maxC < 0)) {
        return res.status(400).json({
          success: false,
          error: "maxCost must be a non-negative number.",
        });
      }

      query.cost = {};
      if (minC !== null) query.cost.$gte = minC;
      if (maxC !== null) query.cost.$lte = maxC;
    }

    // FILTER: difficulty
    if (difficulty && String(difficulty).trim() !== "") {
      query.difficulty = String(difficulty).trim().toLowerCase();
    }

    // FILTER: dietary tags
    let tags = [];

    if (dietaryTag && String(dietaryTag).trim() !== "") {
      tags.push(String(dietaryTag).trim().toLowerCase());
    }

    if (dietaryTags && String(dietaryTags).trim() !== "") {
      tags = tags.concat(
        String(dietaryTags)
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean)
      );
    }

    if (tags.length > 0) {
      query.dietaryTags = { $in: tags };
    }

    const recipes = await Recipe.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Recipes fetched successfully.",
      count: recipes.length,
      filters: {
        search: search ?? null,
        minPrepTime: minPrepTime ?? null,
        maxPrepTime: maxPrepTime ?? null,
        minCost: minCost ?? null,
        maxCost: maxCost ?? null,
        difficulty: difficulty ?? null,
        tags,
      },
      data: recipes,
    });
  } catch (err) {
    console.error("Unexpected server error (GET /recipes):", err);
    return res.status(500).json({
      success: false,
      error: "Something went wrong while fetching recipes.",
    });
  }
});

/**
 * POST /recipes
 * Now supports: difficulty + dietaryTags
 * dietaryTags can be:
 *   - an array: ["vegan","gluten-free"]
 *   - a string: "vegan,gluten-free"
 */
router.post("/", async (req, res) => {
  try {
    const {
      name,
      ingredients,
      prepTime,
      steps,
      cost,
      difficulty,
      dietaryTags,
    } = req.body ?? {};

    // VALIDATION
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

    // ✅ difficulty (optional)
    const allowed = ["easy", "medium", "hard"];
    let parsedDifficulty = "easy";
    if (difficulty !== undefined && difficulty !== null && String(difficulty).trim() !== "") {
      const d = String(difficulty).trim().toLowerCase();
      if (!allowed.includes(d)) {
        return res.status(400).json({
          success: false,
          error: "difficulty must be one of: easy, medium, hard.",
        });
      }
      parsedDifficulty = d;
    }

    // ✅ dietaryTags (optional): array OR comma string
    let parsedTags = [];
    if (Array.isArray(dietaryTags)) {
      parsedTags = dietaryTags
        .map((t) => String(t).trim().toLowerCase())
        .filter(Boolean);
    } else if (typeof dietaryTags === "string" && dietaryTags.trim() !== "") {
      parsedTags = dietaryTags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
    }

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
      difficulty: parsedDifficulty,
      dietaryTags: parsedTags,
    });

    return res.status(201).json({
      success: true,
      message: "Recipe created successfully.",
      data: newRecipe,
    });
  } catch (err) {
    console.error("Unexpected server error (POST /recipes):", err);
    return res.status(500).json({
      success: false,
      error: "Something went wrong while creating the recipe.",
    });
  }
});

// LIST /recipes - return all recipes
router.get("/", async (req, res) => {
  try {
    const all = await Recipe.find().lean();
    return res.json({ success: true, data: all });
  } catch (err) {
    console.error("Error listing recipes:", err);
    return res.status(500).json({ success: false, error: "Something went wrong while fetching recipes." });
  }
});

// GET /recipes/:id - fetch a single recipe
router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const recipe = await Recipe.findById(id).lean();
    if (!recipe) {
      return res.status(404).json({ success: false, error: "Recipe not found." });
    }
    return res.json({ success: true, data: recipe });
  } catch (err) {
    console.error("Error fetching recipe:", err);
    return res.status(500).json({ success: false, error: "Something went wrong while fetching the recipe." });
  }
});

// PUT /recipes/:id - update an existing recipe
router.put("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { name, ingredients, prepTime, steps, cost } = req.body ?? {};

    // =========================
    // VALIDATION (400 errors) - reuse same rules as POST
    // =========================

    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({ success: false, error: "Recipe name is required." });
    }

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ success: false, error: "At least one ingredient is required." });
    }

    for (let i = 0; i < ingredients.length; i++) {
      const ing = ingredients[i];
      const ingName = String(ing?.name ?? "").trim();
      const unit = String(ing?.unit ?? "").trim();
      const qty = Number(ing?.quantity);

      if (!ingName) {
        return res.status(400).json({ success: false, error: `Ingredient #${i + 1} name is required.` });
      }

      if (!unit) {
        return res.status(400).json({ success: false, error: `Ingredient #${i + 1} unit is required.` });
      }

      if (!Number.isFinite(qty) || qty <= 0) {
        return res.status(400).json({ success: false, error: `Ingredient #${i + 1} quantity must be a positive number.` });
      }
    }

    const prep = Number(prepTime);
    if (!Number.isFinite(prep) || prep <= 0) {
      return res.status(400).json({ success: false, error: "prepTime must be a positive number." });
    }

    if (!steps || typeof steps !== "string" || steps.trim() === "") {
      return res.status(400).json({ success: false, error: "steps are required." });
    }

    let parsedCost = null;
    if (cost !== undefined && cost !== null && String(cost).trim() !== "") {
      const c = Number(cost);
      if (!Number.isFinite(c) || c < 0) {
        return res.status(400).json({ success: false, error: "cost must be a non-negative number." });
      }
      parsedCost = c;
    }

    // =========================
    // DATABASE UPDATE (200)
    // =========================

    const update = {
      name: name.trim(),
      ingredients: ingredients.map((ing) => ({
        name: String(ing.name).trim(),
        quantity: Number(ing.quantity),
        unit: String(ing.unit).trim(),
      })),
      prepTime: prep,
      steps: steps.trim(),
      cost: parsedCost,
    };

    const updated = await Recipe.findByIdAndUpdate(id, update, { new: true });
    if (!updated) {
      return res.status(404).json({ success: false, error: "Recipe not found." });
    }

    return res.json({ success: true, message: "Recipe updated successfully.", data: updated });

  } catch (err) {
    console.error("Unexpected server error while updating:", err);
    return res.status(500).json({ success: false, error: "Something went wrong while updating the recipe." });
  }
});

// DELETE /recipes/:id - delete an existing recipe
router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await Recipe.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, error: "Recipe not found." });
    }

    return res.json({ success: true, message: "Recipe deleted successfully.", data: deleted });
  } catch (err) {
    console.error("Unexpected server error while deleting:", err);
    return res.status(500).json({ success: false, error: "Something went wrong while deleting the recipe." });
  }
});

export default router;