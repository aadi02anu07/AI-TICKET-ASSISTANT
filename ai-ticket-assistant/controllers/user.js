import brcypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import Ticket from "../models/ticket.js";
import { inngest } from "../inngest/client.js";

export const signup = async (req, res) => {
  const { email, password, skills = [] } = req.body;
  try {
    const hashed = await brcypt.hash(password, 10);
    const user = await User.create({ email, password: hashed, skills });

    //Fire inngest event

    await inngest.send({
      name: "user/signup",
      data: {
        email,
      },
    });

    const token = jwt.sign(
      { _id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET
    );

    res.json({ user, token });
  } catch (error) {
    res.status(500).json({ error: "Signup failed", details: error.message });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "User not found" });

    const isMatch = await brcypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { _id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET
    );

    res.json({ user, token });
  } catch (error) {
    res.status(500).json({ error: "Login failed", details: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorzed" });
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return res.status(401).json({ error: "Unauthorized" });
    });
    res.json({ message: "Logout successfully" });
  } catch (error) {
    res.status(500).json({ error: "Login failed", details: error.message });
  }
};

export const updateUser = async (req, res) => {
  const { skills = [], role, email } = req.body;
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "User not found" });

    const targetRole = role || user.role;

    // Standard users cannot have skills assigned
    let targetSkills = [];
    if (targetRole !== "user") {
      targetSkills = skills.length ? skills : user.skills;
    }

    await User.updateOne(
      { email },
      { skills: targetSkills, role: targetRole }
    );
    return res.json({ message: "User updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Update failed", details: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { id } = req.params;

    // Prevent admin from deleting their own account
    if (req.user._id === id) {
      return res
        .status(400)
        .json({ error: "Cannot delete your own admin account" });
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Unassign tickets that were assigned to this deleted user
    await Ticket.updateMany({ assignedTo: id }, { assignedTo: null });

    return res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Delete failed", details: error.message });
  }
};

export const getUsers = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const users = await User.find().select("-password");
    return res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Fetch failed", details: error.message });
  }
};

export const createModerator = async (req, res) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { email, password, role = "moderator", skills = [] } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: "A user with this email already exists" });
    }

    const userPassword = password || "moderator123";
    const hashed = await brcypt.hash(userPassword, 10);

    const targetRole = role || "moderator";
    const parsedSkills =
      targetRole === "user"
        ? []
        : Array.isArray(skills)
        ? skills
        : typeof skills === "string"
        ? skills.split(",").map((s) => s.trim()).filter(Boolean)
        : [];

    const user = await User.create({
      email: email.toLowerCase().trim(),
      password: hashed,
      role: targetRole,
      skills: parsedSkills,
    });

    try {
      await inngest.send({
        name: "user/signup",
        data: { email: user.email },
      });
    } catch (inngestErr) {
      console.error("Inngest send error:", inngestErr.message);
    }

    const userObj = user.toObject();
    delete userObj.password;

    return res.status(201).json({
      message: "Moderator created successfully",
      user: userObj,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to create moderator", details: error.message });
  }
};
