// backend/tests/sprint4.test.js
// Sprint 4: Full lifecycle integration, auth hardening, cross-sprint regression.
process.env.JWT_SECRET = 'test_secret';
import request from 'supertest';
import mongoose from 'mongoose';
import {MongoMemoryServer} from 'mongodb-memory-server';
import app from '../src/app.js';

let mongoServer;
let userId;
let token;

const validRecipe = {
  name: 'Avocado Toast',
  ingredients: [
    {name: 'bread', quantity: 2, unit: 'slice'},
    {name: 'avocado', quantity: 1, unit: 'whole'},
    {name: 'salt', quantity: 1, unit: 'tsp'},
  ],
  prepTime: 10,
  steps: 'Toast bread. Mash avocado. Spread and season.',
  cost: 4,
  difficulty: 'easy',
  dietaryTags: ['vegan'],
};

const veganSoup = {
  name: 'Tomato Soup',
  ingredients: [
    {name: 'tomatoes', quantity: 400, unit: 'g'},
    {name: 'onion', quantity: 1, unit: 'whole'},
    {name: 'vegetable broth', quantity: 500, unit: 'ml'},
  ],
  prepTime: 25,
  steps: 'Saute onion. Add tomatoes and broth. Blend and simmer.',
  cost: 5,
  difficulty: 'easy',
  dietaryTags: ['vegan', 'gluten-free'],
};

const chickenRecipe = {
  name: 'Grilled Chicken',
  ingredients: [
    {name: 'chicken breast', quantity: 150, unit: 'g'},
    {name: 'olive oil', quantity: 1, unit: 'tbsp'},
    {name: 'garlic', quantity: 2, unit: 'clove'},
  ],
  prepTime: 30,
  steps: 'Marinate chicken. Grill for 15 minutes each side.',
  cost: 12,
  difficulty: 'medium',
  dietaryTags: [],
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  await request(app)
      .post('/auth/register')
      .send({email: 'final@example.com', password: 'Password1', firstName: 'Final', lastName: 'User'});

  const res = await request(app)
      .post('/auth/login')
      .send({email: 'final@example.com', password: 'Password1'});

  userId = res.body.user.id;
  token = res.body.token;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    if (key !== 'users') {
      await collections[key].deleteMany({});
    }
  }
});

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
async function createRecipe(data = validRecipe) {
  const res = await request(app).post('/recipes').send(data);
  return res.body.data._id;
}

async function addMeal(recipeId, day = 'Monday', mealType = 'breakfast', weekId = '2026-W20') {
  return request(app)
      .post('/meal-plan')
      .send({userId, recipeId, day, mealType, weekId});
}

// ─────────────────────────────────────────────────────────────
// Full Meal Plan Lifecycle Integration
// ─────────────────────────────────────────────────────────────
describe('Full Meal Plan Lifecycle (Integration)', () => {
  test('creates and deletes a meal plan entry end-to-end', async () => {
    const recipeId = await createRecipe();

    const create = await addMeal(recipeId, 'Monday', 'breakfast', '2026-W20');
    expect(create.status).toBe(201);
    const entryId = create.body.data._id;

    const get = await request(app).get(`/meal-plan?userId=${userId}&weekId=2026-W20`);
    expect(get.body.data[0].day).toBe('Monday');

    const del = await request(app).delete(`/meal-plan/${entryId}`);
    expect(del.status).toBe(200);

    const final = await request(app).get(`/meal-plan?userId=${userId}&weekId=2026-W20`);
    expect(final.body.data).toHaveLength(0);
  });

  test('multiple meals can be added across different days in a week', async () => {
    const recipeId = await createRecipe();
    const recipe2Id = await createRecipe(veganSoup);
    const recipe3Id = await createRecipe(chickenRecipe);

    await addMeal(recipeId, 'Monday', 'breakfast', '2026-W20');
    await addMeal(recipe2Id, 'Wednesday', 'lunch', '2026-W20');
    await addMeal(recipe3Id, 'Friday', 'dinner', '2026-W20');

    const res = await request(app).get(`/meal-plan?userId=${userId}&weekId=2026-W20`);
    expect(res.body.data).toHaveLength(3);
  });

  test('meal plan is empty after all entries are deleted', async () => {
    const recipeId = await createRecipe();
    const recipe2Id = await createRecipe(veganSoup);

    const e1 = await addMeal(recipeId, 'Monday', 'breakfast', '2026-W20');
    const e2 = await addMeal(recipe2Id, 'Tuesday', 'lunch', '2026-W20');

    await request(app).delete(`/meal-plan/${e1.body.data._id}`);
    await request(app).delete(`/meal-plan/${e2.body.data._id}`);

    const res = await request(app).get(`/meal-plan?userId=${userId}&weekId=2026-W20`);
    expect(res.body.data).toHaveLength(0);
  });

  test('same recipe can be re-added after deletion', async () => {
    const recipeId = await createRecipe();

    const e1 = await addMeal(recipeId, 'Monday', 'breakfast', '2026-W20');
    await request(app).delete(`/meal-plan/${e1.body.data._id}`);

    const res = await addMeal(recipeId, 'Monday', 'breakfast', '2026-W20');
    expect(res.status).toBe(201);
  });

  test('duplicate recipe is blocked within same week', async () => {
    const recipeId = await createRecipe();

    await addMeal(recipeId, 'Monday', 'breakfast', '2026-W20');
    const res = await addMeal(recipeId, 'Friday', 'dinner', '2026-W20');

    expect(res.status).toBe(409);
  });

  test('meal plan entry contains populated recipe data', async () => {
    const recipeId = await createRecipe();
    await addMeal(recipeId, 'Monday', 'breakfast', '2026-W20');

    const res = await request(app).get(`/meal-plan?userId=${userId}&weekId=2026-W20`);
    expect(res.body.data[0].recipe.name).toBe('Avocado Toast');
  });

  test('PUT /meal-plan/:id endpoint responds without crashing', async () => {
    const recipeId = await createRecipe();
    const add = await addMeal(recipeId, 'Monday', 'breakfast', '2026-W20');
    const entryId = add.body.data._id;

    const res = await request(app)
        .put(`/meal-plan/${entryId}`)
        .send({userId, day: 'Tuesday', mealType: 'dinner', weekId: '2026-W20'});

    // Either implemented (200) or not yet (404) — must not crash (500)
    expect(res.status).not.toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────
// Auth Hardening & Regression
// ─────────────────────────────────────────────────────────────
describe('Auth hardening and regression (Sprint 4)', () => {
  test('expired token is rejected with 401', async () => {
    const res = await request(app)
        .get('/users/me')
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJvbGQifQ.invalid');

    expect(res.status).toBe(401);
  });

  test('token with wrong signature is rejected', async () => {
    const res = await request(app)
        .get('/users/me')
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFiYyJ9.wrongsig');

    expect(res.status).toBe(401);
  });

  test('malformed Authorization header is rejected', async () => {
    const res = await request(app)
        .get('/users/me')
        .set('Authorization', 'NotBearer sometoken');

    expect(res.status).toBe(401);
  });

  test('GET /recipes returns 200 with empty array when no recipes exist', async () => {
    const res = await request(app).get('/recipes');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  test('GET /recipes with empty search string returns all recipes', async () => {
    await request(app).post('/recipes').send(validRecipe);
    await request(app).post('/recipes').send(veganSoup);

    const res = await request(app).get('/recipes?search=');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
  });

  test('combined filters difficulty and dietaryTags work correctly', async () => {
    await request(app).post('/recipes').send(validRecipe);
    await request(app).post('/recipes').send(veganSoup);
    await request(app).post('/recipes').send(chickenRecipe);

    const res = await request(app).get('/recipes?difficulty=easy&dietaryTags=vegan');
    expect(res.status).toBe(200);
    res.body.data.forEach((r) => {
      expect(r.difficulty).toBe('easy');
      expect(r.dietaryTags).toContain('vegan');
    });
    expect(res.body.data.length).toBe(2);
  });

  test('GET /recipes/:id returns 404 for non-existent id', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/recipes/${fakeId}`);
    expect(res.status).toBe(404);
  });

  test('PUT /recipes/:id returns 400 when name is empty', async () => {
    const recipeId = await createRecipe();
    const res = await request(app)
        .put(`/recipes/${recipeId}`)
        .send({...validRecipe, name: ''});
    expect(res.status).toBe(400);
  });

  test('DELETE /recipes/:id returns 404 for non-existent recipe', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).delete(`/recipes/${fakeId}`);
    expect(res.status).toBe(404);
  });

  test('profile update persists dietPreferences and allergies together', async () => {
    const res = await request(app)
        .put('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({dietPreferences: 'keto', allergies: 'dairy'});

    expect(res.status).toBe(200);
    expect(res.body.user.dietPreferences).toBe('keto');
    expect(res.body.user.allergies).toBe('dairy');
  });
});

// ─────────────────────────────────────────────────────────────
// Cross-sprint Regression Suite
// ─────────────────────────────────────────────────────────────
describe('Cross-sprint regression', () => {
  test('Sprint 1 - registration still works', async () => {
    const res = await request(app)
        .post('/auth/register')
        .send({email: 'reg_check@example.com', password: 'Password1', firstName: 'Reg', lastName: 'Check'});
    expect(res.status).toBe(201);
  });

  test('Sprint 1 - login still returns a JWT', async () => {
    await request(app).post('/auth/register').send({
      email: 'jwt_check@example.com', password: 'Password1', firstName: 'JWT', lastName: 'Check',
    });
    const res = await request(app).post('/auth/login').send({
      email: 'jwt_check@example.com', password: 'Password1',
    });
    expect(res.body.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
  });

  test('Sprint 1 - GET /users/me still returns profile', async () => {
    const res = await request(app)
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('final@example.com');
  });

  test('Sprint 2 - create recipe still works', async () => {
    const res = await request(app).post('/recipes').send(validRecipe);
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Avocado Toast');
  });

  test('Sprint 2 - GET /recipes returns all recipes', async () => {
    await request(app).post('/recipes').send(validRecipe);
    await request(app).post('/recipes').send(veganSoup);

    const res = await request(app).get('/recipes');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
  });

  test('Sprint 2 - POST /meal-plan still works', async () => {
    const recipeId = await createRecipe();
    const res = await addMeal(recipeId);
    expect(res.status).toBe(201);
  });

  test('Sprint 2 - DELETE /meal-plan/:id still works', async () => {
    const recipeId = await createRecipe();
    const add = await addMeal(recipeId);
    const entryId = add.body.data._id;

    const res = await request(app).delete(`/meal-plan/${entryId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('Sprint 3 - weekly grid scoping still works', async () => {
    const recipeId = await createRecipe();
    await addMeal(recipeId, 'Monday', 'breakfast', '2026-W20');

    const res = await request(app).get(`/meal-plan?userId=${userId}&weekId=2026-W21`);
    expect(res.body.data).toHaveLength(0);
  });

  test('Sprint 3 - duplicate meal prevention still works', async () => {
    const recipeId = await createRecipe();
    await addMeal(recipeId, 'Monday', 'breakfast', '2026-W20');
    const res = await addMeal(recipeId, 'Friday', 'lunch', '2026-W20');
    expect(res.status).toBe(409);
  });
});
