import express from "express";
import { signup, login } from "../controllers/authController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import User from "../models/User.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);

router.post("/status-change", authMiddleware, async (req, res) => {
  const { changeStatus } = req.body;

  try {
    const user = await User.findById(req.user.id);
    user.isAvailable = changeStatus;
    await user.save();

    res.json({ message: "Status updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
