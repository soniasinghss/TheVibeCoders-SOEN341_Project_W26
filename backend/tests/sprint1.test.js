// backend/tests/sprint1.test.js
// Sprint 1: User Registration, Login, Logout, Auth Guard, Profile
process.env.JWT_SECRET = "test_secret";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../src/app.js";

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// ─────────────────────────────────────────────────────────────
// US-1: User Registration
// ─────────────────────────────────────────────────────────────
describe("POST /auth/register", () => {

  test("1.3 registers a new user successfully", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "test@example.com", password: "Password1" });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("User registered successfully.");
    expect(res.body.user.email).toBe("test@example.com");
  });

  test("1.4 does not return passwordHash in response", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "test@example.com", password: "Password1" });

    expect(res.body.user.password).toBeUndefined();
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  test("1.5 returns 409 for duplicate email", async () => {
    await request(app)
      .post("/auth/register")
      .send({ email: "dupe@example.com", password: "Password1" });

    const res = await request(app)
      .post("/auth/register")
      .send({ email: "dupe@example.com", password: "Password1" });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already registered/i);
  });

  test("1.5 returns 400 when email is missing", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ password: "Password1" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test("1.5 returns 400 when password is missing", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "test@example.com" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test("1.5 returns 400 for invalid email format", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "notanemail", password: "Password1" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid email/i);
  });

  test("1.5 returns 400 for password shorter than 8 characters", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "test@example.com", password: "Ab1" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/password/i);
  });

  test("1.5 returns 400 for password with no number", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "test@example.com", password: "onlyletters" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/password/i);
  });

  test("1.5 returns 400 for empty email string", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "   ", password: "Password1" });

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────
// US-2: Login
// ─────────────────────────────────────────────────────────────
describe("POST /auth/login", () => {

  beforeEach(async () => {
    await request(app)
      .post("/auth/register")
      .send({ email: "login@example.com", password: "Password1" });
  });

  test("2.2 logs in successfully and returns a token", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "login@example.com", password: "Password1" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test("2.3 returns user info on successful login", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "login@example.com", password: "Password1" });

    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe("login@example.com");
    expect(res.body.user.id).toBeDefined();
  });

  test("2.3 does not return passwordHash in login response", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "login@example.com", password: "Password1" });

    expect(res.body.user.passwordHash).toBeUndefined();
  });

  test("2.4 returns a JWT token on login", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "login@example.com", password: "Password1" });

    expect(res.body.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
  });

  test("2.7 returns 401 for wrong password", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "login@example.com", password: "WrongPass1" });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
  });

  test("2.7 returns 401 for non-existent email", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "nobody@example.com", password: "Password1" });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
  });

  test("2.7 returns 400 when email is missing", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ password: "Password1" });

    expect(res.status).toBe(400);
  });

  test("2.7 returns 400 when password is missing", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "login@example.com" });

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────
// US-5: Profile — GET /users/me
// ─────────────────────────────────────────────────────────────
describe("GET /users/me", () => {
  let token;

  beforeEach(async () => {
    await request(app)
      .post("/auth/register")
      .send({ email: "profile@example.com", password: "Password1" });

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "profile@example.com", password: "Password1" });

    token = res.body.token;
  });

  test("5.2 returns profile data for authenticated user", async () => {
    const res = await request(app)
      .get("/users/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe("profile@example.com");
  });

  test("5.2 does not return passwordHash in profile", async () => {
    const res = await request(app)
      .get("/users/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.body.passwordHash).toBeUndefined();
  });

  test("5.4 returns 401 when no token is provided", async () => {
    const res = await request(app).get("/users/me");
    expect(res.status).toBe(401);
  });

  test("5.4 returns 401 for invalid token", async () => {
    const res = await request(app)
      .get("/users/me")
      .set("Authorization", "Bearer invalidtoken");

    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────
// US-6: Diet Preferences — PUT /users/me
// ─────────────────────────────────────────────────────────────
describe("PUT /users/me", () => {
  let token;

  beforeEach(async () => {
    await request(app)
      .post("/auth/register")
      .send({ email: "prefs@example.com", password: "Password1" });

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "prefs@example.com", password: "Password1" });

    token = res.body.token;
  });

  test("6.2 updates dietPreferences successfully", async () => {
    const res = await request(app)
      .put("/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ dietPreferences: "vegan", allergies: "peanuts" });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Profile updated successfully");
  });

  test("6.4 persists updated preferences and returns them", async () => {
    await request(app)
      .put("/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ dietPreferences: "vegetarian", allergies: "gluten" });

    const res = await request(app)
      .put("/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ dietPreferences: "vegetarian", allergies: "gluten" });

    expect(res.body.user.dietPreferences).toBe("vegetarian");
    expect(res.body.user.allergies).toBe("gluten");
  });

  test("6.4 returns 401 when updating without token", async () => {
    const res = await request(app)
      .put("/users/me")
      .send({ dietPreferences: "vegan" });

    expect(res.status).toBe(401);
  });
});