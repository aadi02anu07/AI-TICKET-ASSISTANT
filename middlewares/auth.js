import jwt, { decode } from "jsonwebtoken";

export const authenicate = (req, res, next) => {
    const token = req.headers.authorization.split(" ")[1]

    if (!toked) {
        return res.status(401).json({ error: "Access denied. No token found" })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user=decoded
        next();
    } catch (error) {
        res.status(401).json({ error: "Invalid token" })
    }
}