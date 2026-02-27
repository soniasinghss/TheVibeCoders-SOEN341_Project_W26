console.log("🔥 USING BACKEND SRC SERVER FILE");
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.js";
import recipesRoutes from "./routes/recipes.js"; // ✅ NEW

dotenv.config();

const app = express();

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

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 4000;

async function start() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing in .env");
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB ✅");

  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Server failed to start:", err.message);
  process.exit(1);
});