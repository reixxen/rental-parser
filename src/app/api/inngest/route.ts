import { inngest } from "@/inngest/client";
import { processListing } from "@/inngest/process-listing";
import {
  syncMgnKvartiraListings,
  syncMgnRealtyListings,
} from "@/inngest/sync-vk-listings";
import { serve } from "inngest/next";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [syncMgnKvartiraListings, syncMgnRealtyListings, processListing],
});
