import { inngest } from "../client.js";
import Ticket from "../../models/ticket.js";
import User from "../../models/user.js";
import { NonRetriableError } from "inngest";
import { sendMail } from "../../utils/mailer.js";
import analyzeTicket from "../../utils/ai.js";

export const onTicketCreated = inngest.createFunction(
  {
    id: "on-ticket-created",
    retries: 2,
    triggers: [{ event: "ticket/created" }],
  },
  async ({ event, step }) => {
    try {
      const { ticketId } = event.data;

      //fetch ticket from DB
      const ticket = await step.run("fetch-ticket", async () => {
        const ticketObject = await Ticket.findById(ticketId);
        if (!ticketObject) {
          throw new NonRetriableError("Ticket not found");
        }
        return ticketObject;
      });

      await step.run("update-ticket-status", async () => {
        await Ticket.findByIdAndUpdate(ticket._id, { status: "TODO" });
      });

      const relatedskills = await step.run("ai-processing", async () => {
        let skills = [];
        const aiResponse = await analyzeTicket(ticket);
        if (aiResponse) {
          await Ticket.findByIdAndUpdate(ticket._id, {
            priority: !["low", "medium", "high"].includes(aiResponse.priority)
              ? "medium"
              : aiResponse.priority,
            helpfulNotes: aiResponse.helpfulNotes,
            status: "IN_PROGRESS",
            relatedSkills: aiResponse.relatedSkills,
          });
          skills = aiResponse.relatedSkills;
        }
        return skills;
      });

      const moderator = await step.run("assign-moderator", async () => {
        let user = null;
        if (relatedskills && relatedskills.length > 0) {
          user = await User.findOne({
            role: "moderator",
            skills: {
              $elemMatch: {
                $regex: relatedskills.join("|"),
                $options: "i",
              },
            },
          });
        }
        if (!user) {
          user = await User.findOne({ role: "moderator" });
        }
        // Never assign tickets to admins - only moderators
        await Ticket.findByIdAndUpdate(ticket._id, {
          assignedTo: user?._id || null,
        });
        return user;
      });

      await step.run("send-email-notification", async () => {
        if (moderator) {
          const finalTicket = await Ticket.findById(ticket._id);
          const textBody = `Hello,\n\nA new ticket has been assigned to you:\n\nTitle: ${finalTicket.title}\nProblem Description:\n${finalTicket.description}\n\nPriority: ${(finalTicket.priority || "medium").toUpperCase()}\nRelated Skills: ${(finalTicket.relatedSkills || []).join(", ") || "General"}\n\nPlease log in to your Ticket AI dashboard to assist the user.`;

          const htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
              <h2 style="color: #4f46e5; margin-top: 0;">🎫 New Ticket Assigned</h2>
              <p>Hello,</p>
              <p>A new support ticket has been matched and assigned to your queue:</p>
              <div style="background-color: #f8fafc; padding: 16px; border-radius: 6px; margin: 16px 0; border-left: 4px solid #4f46e5;">
                <h3 style="margin-top: 0; color: #1e293b;">${finalTicket.title}</h3>
                <p style="color: #475569; line-height: 1.5; white-space: pre-line;"><strong>Problem Description:</strong><br/>${finalTicket.description}</p>
                <div style="margin-top: 12px; font-size: 13px; color: #64748b;">
                  <span><strong>Priority:</strong> <span style="color: ${finalTicket.priority === 'high' ? '#dc2626' : '#2563eb'}; font-weight: bold;">${(finalTicket.priority || 'medium').toUpperCase()}</span></span>
                  ${finalTicket.relatedSkills?.length ? `<span style="margin-left: 16px;"><strong>Related Skills:</strong> ${finalTicket.relatedSkills.join(', ')}</span>` : ''}
                </div>
              </div>
              <p style="color: #64748b; font-size: 13px;">Please log in to your Ticket AI dashboard to view full AI notes and chat with the user.</p>
            </div>
          `;

          await sendMail(
            moderator.email,
            `Ticket Assigned: ${finalTicket.title}`,
            textBody,
            htmlBody
          );
        }
      });

      return { success: true };
    } catch (err) {
      console.error("❌ Error running the step", err.message);
      return { success: false };
    }
  }
);
