import express from "express";
import { authenticate } from "../middlewares/auth.js";
import {
  createTicket,
  getTicket,
  getTickets,
  resolveTicket,
  deleteTicket,
  getTicketMessages,
  addTicketMessage,
} from "../controllers/ticket.js";

const router = express.Router();

router.get("/", authenticate, getTickets);
router.get("/:id", authenticate, getTicket);
router.post("/", authenticate, createTicket);
router.patch("/:id/resolve", authenticate, resolveTicket);
router.delete("/:id", authenticate, deleteTicket);
router.get("/:id/messages", authenticate, getTicketMessages);
router.post("/:id/messages", authenticate, addTicketMessage);

export default router;
