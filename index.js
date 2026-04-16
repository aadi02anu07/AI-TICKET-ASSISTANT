import dotenv from "dotenv";
dotenv.config();
import express from "express"
import mongoose from "mongoose"
import cors from "cors" //acts as a middleware between front end and backend cause both are running at different ports/url
import userRoutes from "./routes/user.js"
import { useReducer } from "react";

const PORT = process.env.PORT || 3000
const app = express()

app.use(cors())
app.use(express.json()) //so that we can accept json data

app.use("/api/auth", userRoutes)

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB connected ✅");
        app.listen(PORT, () => console.log("🚀 Server at http://localhost:3000"))
    })
    .catch((err) => console.error("❌ MONGODB error:", err))