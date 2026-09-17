import { inngest } from "../inngest/client.js";
import Ticket from "../models/ticket.js";

export const createTicket = async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || !description) {
      return res
        .status(400)
        .json({ message: "Title and description are required" });
    }
    const newTicket = await Ticket.create({
      title,
      description,
      createdBy: req.user._id.toString(),
    });

    await inngest.send({
      name: "ticket/created",
      data: {
        ticketId: newTicket._id.toString(),
        title,
        description,
        createdBy: req.user._id.toString(),
      },
    });
    return res.status(201).json({
      message: "Ticket created and processing started",
      ticket: newTicket,
    });
  } catch (error) {
    console.error("Error creating ticket", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getTickets = async (req, res) => {
  try {
    const user = req.user;
    let tickets = [];
    if (user.role === "admin") {
      tickets = await Ticket.find({})
        .populate("assignedTo", ["email", "_id"])
        .sort({ createdAt: -1 });
    } else if (user.role === "moderator") {
      // Moderator only sees tickets assigned to them
      tickets = await Ticket.find({ assignedTo: user._id })
        .populate("assignedTo", ["email", "_id"])
        .sort({ createdAt: -1 });
    } else {
      tickets = await Ticket.find({ createdBy: user._id })
        .populate("assignedTo", ["email", "_id"])
        .select(
          "title description status priority relatedSkills assignedTo createdBy createdAt"
        )
        .sort({ createdAt: -1 });
    }
    return res.status(200).json({ tickets });
  } catch (error) {
    console.error("Error fetching tickets", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getTicket = async (req, res) => {
  try {
    const user = req.user;
    let ticket;

    if (user.role === "admin") {
      ticket = await Ticket.findById(req.params.id).populate("assignedTo", [
        "email",
        "_id",
      ]);
    } else if (user.role === "moderator") {
      // Moderator can view if assigned to them or created by them
      ticket = await Ticket.findOne({
        _id: req.params.id,
        $or: [{ assignedTo: user._id }, { createdBy: user._id }],
      }).populate("assignedTo", ["email", "_id"]);
    } else {
      ticket = await Ticket.findOne({
        createdBy: user._id,
        _id: req.params.id,
      })
        .populate("assignedTo", ["email", "_id"])
        .select(
          "title description status priority helpfulNotes relatedSkills assignedTo createdBy createdAt"
        );
    }

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }
    return res.status(200).json({ ticket });
  } catch (error) {
    console.error("Error fetching ticket", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const resolveTicket = async (req, res) => {
  try {
    const user = req.user;
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Only the creator, the assigned moderator, or an admin can resolve
    const isCreator = ticket.createdBy?.toString() === user._id.toString();
    const isAdmin = user.role === "admin";
    const isAssignedModerator =
      user.role === "moderator" &&
      ticket.assignedTo &&
      ticket.assignedTo.toString() === user._id.toString();

    if (!isCreator && !isAdmin && !isAssignedModerator) {
      return res.status(403).json({ message: "Forbidden: Not assigned to this ticket" });
    }

    if (ticket.status === "RESOLVED") {
      return res.status(400).json({ message: "Ticket is already resolved" });
    }

    const updated = await Ticket.findByIdAndUpdate(
      req.params.id,
      { status: "RESOLVED" },
      { new: true }
    );

    return res.status(200).json({ message: "Ticket resolved", ticket: updated });
  } catch (error) {
    console.error("Error resolving ticket", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deleteTicket = async (req, res) => {
  try {
    const user = req.user;

    if (user?.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Forbidden: Only admins can delete tickets" });
    }

    const ticket = await Ticket.findByIdAndDelete(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    return res.status(200).json({ message: "Ticket deleted successfully" });
  } catch (error) {
    console.error("Error deleting ticket", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getTicketMessages = async (req, res) => {
  try {
    const user = req.user;
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Only ticket creator, assigned moderator, or admin can access messages
    const isCreator = ticket.createdBy?.toString() === user._id.toString();
    const isAssignedModerator =
      user.role === "moderator" &&
      ticket.assignedTo &&
      ticket.assignedTo.toString() === user._id.toString();
    const isAdmin = user.role === "admin";

    if (!isCreator && !isAssignedModerator && !isAdmin) {
      return res
        .status(403)
        .json({ message: "Forbidden: You cannot access this chat" });
    }

    return res.status(200).json({ messages: ticket.messages || [] });
  } catch (error) {
    console.error("Error fetching messages", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const addTicketMessage = async (req, res) => {
  try {
    const user = req.user;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Message text is required" });
    }

    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Chat is only available once Gemini has responded and ticket is assigned
    if (!ticket.helpfulNotes || !ticket.assignedTo) {
      return res.status(400).json({
        message:
          "Chat will be available once the ticket has been analyzed and assigned to a moderator",
      });
    }

    // Only ticket creator, assigned moderator, or admin can send messages
    const isCreator = ticket.createdBy?.toString() === user._id.toString();
    const isAssignedModerator =
      user.role === "moderator" &&
      ticket.assignedTo &&
      ticket.assignedTo.toString() === user._id.toString();
    const isAdmin = user.role === "admin";

    if (!isCreator && !isAssignedModerator && !isAdmin) {
      return res
        .status(403)
        .json({ message: "Forbidden: You cannot send messages in this chat" });
    }

    const newMessage = {
      sender: user._id,
      senderEmail: user.email,
      senderRole: user.role,
      text: text.trim(),
      createdAt: new Date(),
    };

    ticket.messages.push(newMessage);
    await ticket.save();

    return res.status(201).json({
      message: "Message sent",
      data: newMessage,
      messages: ticket.messages,
    });
  } catch (error) {
    console.error("Error adding message", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
