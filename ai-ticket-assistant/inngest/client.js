import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "ticketing-system",
  isDev: process.env.NODE_ENV !== "production",
});
