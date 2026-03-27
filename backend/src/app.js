import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import recipesRoutes from "./routes/recipes.js";
import userRouter from "./routes/users.js";
import mealPlanRoutes from "./routes/mealPlan.js";

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
app.use("/recipes", recipesRoutes);
app.use("/users", userRouter);
app.use("/meal-plan", mealPlanRoutes);
app.get("/health", (req, res) => res.json({ status: "ok" }));

export default app;