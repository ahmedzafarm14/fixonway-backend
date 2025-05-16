import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["provider", "acquirer"], required: true },
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], default: [0, 0] },
  },
  isAvailable: { type: Boolean, default: true },
});

userSchema.index({ location: "2dsphere" });

export default mongoose.model("User", userSchema);
