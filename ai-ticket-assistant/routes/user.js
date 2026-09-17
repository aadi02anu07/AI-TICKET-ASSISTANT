import express from "express";
import {
  getUsers,
  login,
  signup,
  updateUser,
  logout,
  deleteUser,
  createModerator,
} from "../controllers/user.js";

import { authenticate } from "../middlewares/auth.js";
const router = express.Router();

router.post("/update-user", authenticate, updateUser);
router.delete("/users/:id", authenticate, deleteUser);
router.get("/users", authenticate, getUsers);
router.post("/create-moderator", authenticate, createModerator);
router.post("/add-moderator", authenticate, createModerator);

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

export default router;
