import express from 'express'
import { getUsers, login, logout, signup, updateUser } from "../controllers/user.js"

import { authenicate } from "../middlewares/auth.js"
const router = express.Router()

router.post("/update-user", authenicate, updateUser)
router.get("/users", authenicate, getUsers)

router.post("/signup", signup)
router.post("/login", login)
router.post("/logout", logout)

export default router