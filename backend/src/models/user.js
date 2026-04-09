import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    dietPreferences: { type: String, default: "" },
    allergies: { type: String, default: "" }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
