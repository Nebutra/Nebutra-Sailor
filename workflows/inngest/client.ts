import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "nebutra-sailor",
  eventKey: process.env.INNGEST_EVENT_KEY,
});
