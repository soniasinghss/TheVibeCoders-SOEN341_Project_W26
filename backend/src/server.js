console.log("🔥 USING BACKEND SRC SERVER FILE");
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.js";
import recipesRoutes from "./routes/recipes.js"; // ✅ NEW
import userRouter from "./routes/users.js";
import mealPlanRoutes from "./routes/mealPlan.js";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, "../../frontend");
const loginHtmlPath = path.join(frontendDir, "login.html");

app.use(cors());
app.use(express.json());

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "Invalid JSON body." });
  }
  next();
});

app.use("/auth", authRoutes);
app.use("/recipes", recipesRoutes); // ✅ NEW
app.use("/users", userRouter);
app.use("/meal-plan", mealPlanRoutes);

// Serve frontend as static files so app can run on a single origin.
app.use(express.static(frontendDir));

app.get("/login.html", (req, res) => {
  res.sendFile(loginHtmlPath);
});

app.get("/", (req, res) => {
  res.sendFile(loginHtmlPath);
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/__debug_info", (req, res) => {
  res.json({
    marker: "us6-editable-preferences-server",
    frontendDir,
    loginHtmlPath,
    loginHtmlExists: fs.existsSync(loginHtmlPath),
  });
});

const PORT = process.env.PORT || 4000;

async function start() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing in .env");
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB ✅");
  console.log(`Frontend directory: ${frontendDir}`);
  console.log(`login.html exists: ${fs.existsSync(loginHtmlPath)}`);

  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Server failed to start:", err.message);
  process.exit(1);
});