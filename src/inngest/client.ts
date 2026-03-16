import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "rental-parser",
});

export const PROCESS_LISTING_EVENT = "listing/process" as const;
