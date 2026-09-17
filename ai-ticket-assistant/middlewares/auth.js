import jwt from "jsonwebtoken";
import User from "../models/user.js";

export const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access Denied. No token found." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    if (!req.user.email) {
      const dbUser = await User.findById(decoded._id).select("email role");
      if (dbUser) {
        req.user.email = dbUser.email;
        req.user.role = dbUser.role;
      }
    }

    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};
