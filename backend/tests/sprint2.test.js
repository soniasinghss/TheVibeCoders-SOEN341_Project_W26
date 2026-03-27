// backend/tests/sprint2.test.js
// Sprint 2: Recipe Management + Meal Plan
process.env.JWT_SECRET = "test_secret";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../src/app.js";

let mongoServer;
let userId;

const validRecipe = {
  name: "Pasta Bolognese",
  ingredients: [
    { name: "pasta", quantity: 200, unit: "g" },
    { name: "tomato sauce", quantity: 1, unit: "cup" },
  ],
  prepTime: 30,
  steps: "Boil pasta. Add sauce. Serve.",
  cost: 8,
  difficulty: "easy",
  dietaryTags: ["gluten-free"],
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  await request(app)
    .post("/auth/register")
    .send({ email: "chef@example.com", password: "Password1" });

  const res = await request(app)
    .post("/auth/login")
    .send({ email: "chef@example.com", password: "Password1" });

  userId = res.body.user.id;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    if (key !== "users") {
      await collections[key].deleteMany({});
    }
  }
});

// ─────────────────────────────────────────────────────────────
// US-7: Create Recipe
// ─────────────────────────────────────────────────────────────
describe("POST /recipes", () => {

  test("7.4 creates a recipe successfully", async () => {
    const res = await request(app)
      .post("/recipes")
      .send(validRecipe);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Pasta Bolognese");
  });

  test("7.6 saves recipe to database with all fields", async () => {
    const res = await request(app)
      .post("/recipes")
      .send(validRecipe);

    expect(res.body.data._id).toBeDefined();
    expect(res.body.data.prepTime).toBe(30);
    expect(res.body.data.difficulty).toBe("easy");
    expect(res.body.data.dietaryTags).toContain("gluten-free");
  });

  test("7.5 returns 400 when name is missing", async () => {
    const { name, ...noName } = validRecipe;
    const res = await request(app).post("/recipes").send(noName);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/i);
  });

  test("7.5 returns 400 when ingredients are empty", async () => {
    const res = await request(app)
      .post("/recipes")
      .send({ ...validRecipe, ingredients: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/ingredient/i);
  });

  test("7.5 returns 400 when prepTime is missing", async () => {
    const { prepTime, ...noPrepTime } = validRecipe;
    const res = await request(app).post("/recipes").send(noPrepTime);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/prepTime/i);
  });

  test("7.5 returns 400 for negative prepTime", async () => {
    const res = await request(app)
      .post("/recipes")
      .send({ ...validRecipe, prepTime: -5 });
    expect(res.status).toBe(400);
  });

  test("7.5 returns 400 when steps are missing", async () => {
    const { steps, ...noSteps } = validRecipe;
    const res = await request(app).post("/recipes").send(noSteps);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/steps/i);
  });

  test("7.5 returns 400 for invalid difficulty value", async () => {
    const res = await request(app)
      .post("/recipes")
      .send({ ...validRecipe, difficulty: "superhard" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/difficulty/i);
  });

  test("7.5 returns 400 for negative cost", async () => {
    const res = await request(app)
      .post("/recipes")
      .send({ ...validRecipe, cost: -10 });
    expect(res.status).toBe(400);
  });

  test("7.5 returns 400 when ingredient is missing a name", async () => {
    const res = await request(app)
      .post("/recipes")
      .send({ ...validRecipe, ingredients: [{ quantity: 1, unit: "cup" }] });
    expect(res.status).toBe(400);
  });

  test("7.5 returns 400 when ingredient is missing a unit", async () => {
    const res = await request(app)
      .post("/recipes")
      .send({ ...validRecipe, ingredients: [{ name: "flour", quantity: 1 }] });
    expect(res.status).toBe(400);
  });

  test("7.5 returns 400 when ingredient quantity is zero", async () => {
    const res = await request(app)
      .post("/recipes")
      .send({ ...validRecipe, ingredients: [{ name: "flour", quantity: 0, unit: "g" }] });
    expect(res.status).toBe(400);
  });

  test("7.7 returns correct response shape on success", async () => {
    const res = await request(app).post("/recipes").send(validRecipe);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("message");
    expect(res.body).toHaveProperty("data");
  });
});

// ─────────────────────────────────────────────────────────────
// US-9: GET /recipes
// ─────────────────────────────────────────────────────────────
describe("GET /recipes", () => {

  beforeEach(async () => {
    await request(app).post("/recipes").send(validRecipe);
    await request(app).post("/recipes").send({
      ...validRecipe,
      name: "Vegan Salad",
      cost: 5,
      dietaryTags: ["vegan"],
    });
  });

  test("9.1 returns all recipes", async () => {
    const res = await request(app).get("/recipes");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);
  });

  test("9.3 recipe schema includes ingredients array and dietaryTags array", async () => {
    const res = await request(app).get("/recipes");
    const recipe = res.body.data[0];
    expect(Array.isArray(recipe.ingredients)).toBe(true);
    expect(Array.isArray(recipe.dietaryTags)).toBe(true);
  });

  test("filters recipes by name search", async () => {
    const res = await request(app).get("/recipes?search=vegan");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].name).toBe("Vegan Salad");
  });

  test("filters recipes by difficulty", async () => {
    const res = await request(app).get("/recipes?difficulty=easy");
    expect(res.status).toBe(200);
    expect(res.body.data.every(r => r.difficulty === "easy")).toBe(true);
  });

  test("filters recipes by dietary tag", async () => {
    const res = await request(app).get("/recipes?dietaryTags=vegan");
    expect(res.status).toBe(200);
    expect(res.body.data[0].dietaryTags).toContain("vegan");
  });

  test("filters recipes by maxCost", async () => {
    const res = await request(app).get("/recipes?maxCost=6");
    expect(res.status).toBe(200);
    expect(res.body.data.every(r => r.cost <= 6)).toBe(true);
  });

  test("filters recipes by maxPrepTime", async () => {
    const res = await request(app).get("/recipes?maxPrepTime=30");
    expect(res.status).toBe(200);
    expect(res.body.data.every(r => r.prepTime <= 30)).toBe(true);
  });

  test("returns 400 for invalid minPrepTime", async () => {
    const res = await request(app).get("/recipes?minPrepTime=-5");
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────
// GET /recipes/:id
// ─────────────────────────────────────────────────────────────
describe("GET /recipes/:id", () => {
  let recipeId;

  beforeEach(async () => {
    const res = await request(app).post("/recipes").send(validRecipe);
    recipeId = res.body.data._id;
  });

  test("returns a single recipe by id", async () => {
    const res = await request(app).get(`/recipes/${recipeId}`);
    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(recipeId);
  });

  test("returns 404 for non-existent recipe id", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/recipes/${fakeId}`);
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────
// US-8: Edit Recipe
// ─────────────────────────────────────────────────────────────
describe("PUT /recipes/:id", () => {
  let recipeId;

  beforeEach(async () => {
    const res = await request(app).post("/recipes").send(validRecipe);
    recipeId = res.body.data._id;
  });

  test("8.2 updates a recipe successfully", async () => {
    const res = await request(app)
      .put(`/recipes/${recipeId}`)
      .send({ ...validRecipe, name: "Updated Pasta" });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Updated Pasta");
  });

  test("8.2 returns 404 when recipe does not exist", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .put(`/recipes/${fakeId}`)
      .send(validRecipe);
    expect(res.status).toBe(404);
  });

  test("8.2 returns 400 when updating with invalid data", async () => {
    const res = await request(app)
      .put(`/recipes/${recipeId}`)
      .send({ ...validRecipe, name: "" });
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────
// US-10: Delete Recipe
// ─────────────────────────────────────────────────────────────
describe("DELETE /recipes/:id", () => {
  let recipeId;

  beforeEach(async () => {
    const res = await request(app).post("/recipes").send(validRecipe);
    recipeId = res.body.data._id;
  });

  test("10.2 deletes a recipe successfully", async () => {
    const res = await request(app).delete(`/recipes/${recipeId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test("10.2 recipe no longer exists after deletion", async () => {
    await request(app).delete(`/recipes/${recipeId}`);
    const res = await request(app).get(`/recipes/${recipeId}`);
    expect(res.status).toBe(404);
  });

  test("10.4 returns 404 when deleting non-existent recipe", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).delete(`/recipes/${fakeId}`);
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────
// US-16: Meal Plan
// ─────────────────────────────────────────────────────────────
describe("Meal Plan API", () => {
  let recipeId;

  beforeEach(async () => {
    const res = await request(app).post("/recipes").send(validRecipe);
    recipeId = res.body.data._id;
  });

  test("adds a recipe to a meal slot successfully", async () => {
    const res = await request(app)
      .post("/meal-plan")
      .send({ userId, recipeId, day: "Monday", mealType: "breakfast" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.day).toBe("Monday");
    expect(res.body.data.mealType).toBe("breakfast");
  });

  test("returns confirmation message after adding meal", async () => {
    const res = await request(app)
      .post("/meal-plan")
      .send({ userId, recipeId, day: "Monday", mealType: "lunch" });

    expect(res.body.message).toBeDefined();
  });

  test("returns 400 when day is missing", async () => {
    const res = await request(app)
      .post("/meal-plan")
      .send({ userId, recipeId, mealType: "breakfast" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/day/i);
  });

  test("returns 400 when mealType is missing", async () => {
    const res = await request(app)
      .post("/meal-plan")
      .send({ userId, recipeId, day: "Monday" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/mealType/i);
  });

  test("returns 400 for invalid day value", async () => {
    const res = await request(app)
      .post("/meal-plan")
      .send({ userId, recipeId, day: "Funday", mealType: "breakfast" });

    expect(res.status).toBe(400);
  });

  test("returns 400 for invalid mealType value", async () => {
    const res = await request(app)
      .post("/meal-plan")
      .send({ userId, recipeId, day: "Monday", mealType: "brunch" });

    expect(res.status).toBe(400);
  });

  test("returns 404 when recipe does not exist", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post("/meal-plan")
      .send({ userId, recipeId: fakeId, day: "Monday", mealType: "breakfast" });

    expect(res.status).toBe(404);
  });

  test("returns 409 for duplicate day/mealType/week entry", async () => {
    await request(app)
      .post("/meal-plan")
      .send({ userId, recipeId, day: "Tuesday", mealType: "dinner" });

    const res = await request(app)
      .post("/meal-plan")
      .send({ userId, recipeId, day: "Tuesday", mealType: "dinner" });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already/i);
  });

  test("fetches meal plan entries for the current week", async () => {
    await request(app)
      .post("/meal-plan")
      .send({ userId, recipeId, day: "Wednesday", mealType: "lunch" });

    const res = await request(app).get(`/meal-plan?userId=${userId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  test("GET meal plan populates recipe name", async () => {
    await request(app)
      .post("/meal-plan")
      .send({ userId, recipeId, day: "Thursday", mealType: "snack" });

    const res = await request(app).get(`/meal-plan?userId=${userId}`);
    expect(res.body.data[0].recipe.name).toBe("Pasta Bolognese");
  });

  test("GET returns empty array when no meals planned", async () => {
    const res = await request(app)
      .get(`/meal-plan?userId=${userId}&weekId=2020-W01`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  test("deletes a meal plan entry successfully", async () => {
    const post = await request(app)
      .post("/meal-plan")
      .send({ userId, recipeId, day: "Friday", mealType: "breakfast" });

    const entryId = post.body.data._id;
    const res = await request(app).delete(`/meal-plan/${entryId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test("returns 404 when deleting non-existent meal plan entry", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).delete(`/meal-plan/${fakeId}`);
    expect(res.status).toBe(404);
  });
});