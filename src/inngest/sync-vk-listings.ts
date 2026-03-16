import { convex } from "@/lib/convex-client";
import { GetEvents } from "inngest";
import { z } from "zod";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { inngest, PROCESS_LISTING_EVENT } from "./client";

type Events = GetEvents<typeof inngest>;

const vkItemSchema = z.object({
  id: z.number().transform((val) => val.toString()),
  owner_id: z.number().transform((val) => val.toString()),
  post_type: z.literal("post"),
  text: z.string(),
  attachments: z
    .array(
      z.object({
        type: z.literal("photo"),
        photo: z.object({
          sizes: z.array(
            z.object({
              width: z.number(),
              height: z.number(),
              type: z.enum([
                "s",
                "m",
                "x",
                "y",
                "z",
                "w",
                "o",
                "p",
                "q",
                "r",
                "base",
              ]),
              url: z.url(),
            })
          ),
          orig_photo: z.object({
            width: z.number(),
            height: z.number(),
            type: z.literal("base"),
            url: z.url(),
          }),
        }),
      })
    )
    .min(1),
  date: z.number().transform((val) => val * 1000),
});

type VKItem = z.infer<typeof vkItemSchema>;

export const syncMgnKvartiraListings = inngest.createFunction(
  { id: "sync-mgn-kvartira-listings" },
  { cron: "TZ=Asia/Yekaterinburg */10 * * * *" }, // every 10 minutes
  async ({ step }) => {
    const domain = "mgn.kvartira";

    const response = await step.fetch(
      `https://api.vk.com/method/wall.get?v=5.199&domain=${domain}&count=100`,
      {
        headers: {
          Authorization: `Bearer ${process.env.VK_ACCESS_TOKEN}`,
        },
      }
    );

    const items = await step.run("parse-response", async () => {
      const data = await response.json();

      const items: VKItem[] = [];
      for (const item of data.response.items) {
        const result = await vkItemSchema.safeParseAsync(item);
        if (!result.success) continue;
        items.push(result.data);
      }
      return items;
    });

    const filterItems = (items: VKItem[]): VKItem[] => {
      const cutoff = Date.now() - 168 * 3600 * 1000; // 7 дней
      const KEYWORDS = ["сдам", "сдаю", "сдает", "сдаёт"];

      return items.filter((item) => {
        const text = item.text.toLowerCase();

        const isRecent = item.date >= cutoff;
        const hasKeywords = KEYWORDS.some((keyword) => text.includes(keyword));

        const allNumbers =
          text.replace(/[.\s](?=\d{3})/g, "").match(/\d+/g) || [];

        const hasValidPrice = allNumbers.some((numStr) => {
          const price = parseInt(numStr, 10);
          return price >= 1000 && price <= 100000;
        });

        return isRecent && hasKeywords && hasValidPrice;
      });
    };

    const filteredItems = filterItems(items);

    const newListingIds = await step.run("create-listings", async () => {
      return await convex.mutation(api.listings.createMany, {
        items: filteredItems.map(
          (item) =>
            ({
              sourceId: domain,
              sourceType: "vk",
              sourceUrl: `https://vk.ru/${domain}`,
              entityId: item.id,
              entityUrl: `https://vk.ru/wall${item.owner_id}_${item.id}`,
              text: item.text,
              images: item.attachments.map((a) => a.photo.orig_photo.url),
              postedAt: item.date,
            }) satisfies Omit<
              Doc<"listings">,
              "_id" | "_creationTime" | "status" | "updatedAt"
            >
        ),
      });
    });

    if (newListingIds.length === 0) {
      return {
        received: items.length,
        created: 0,
      };
    }

    const events = newListingIds.map<Events[typeof PROCESS_LISTING_EVENT]>(
      (id) => {
        return {
          name: PROCESS_LISTING_EVENT,
          data: {
            listingId: id,
          },
        };
      }
    );

    await step.sendEvent("emit-listing-processing", events);

    return {
      received: items.length,
      created: newListingIds.length,
    };
  }
);

export const syncMgnRealtyListings = inngest.createFunction(
  { id: "sync-mgn-realty-listings" },
  { cron: "TZ=Asia/Yekaterinburg */10 * * * *" }, // every 10 minutes
  async ({ step }) => {
    const domain = "mgn.realty";

    const response = await step.fetch(
      `https://api.vk.com/method/wall.get?v=5.199&domain=${domain}&count=100`,
      {
        headers: {
          Authorization: `Bearer ${process.env.VK_ACCESS_TOKEN}`,
        },
      }
    );

    const items = await step.run("parse-response", async () => {
      const data = await response.json();

      const items: VKItem[] = [];
      for (const item of data.response.items) {
        const result = await vkItemSchema.safeParseAsync(item);
        if (!result.success) continue;
        items.push(result.data);
      }
      return items;
    });

    const filterItems = (items: VKItem[]): VKItem[] => {
      const cutoff = Date.now() - 168 * 3600 * 1000; // 7 дней
      const KEYWORDS = ["сдам", "сдаю", "сдает", "сдаёт"];

      return items.filter((item) => {
        const text = item.text.toLowerCase();

        const isRecent = item.date >= cutoff;
        const hasKeywords = KEYWORDS.some((keyword) => text.includes(keyword));

        const allNumbers =
          text.replace(/[.\s](?=\d{3})/g, "").match(/\d+/g) || [];

        const hasValidPrice = allNumbers.some((numStr) => {
          const price = parseInt(numStr, 10);
          return price >= 1000 && price <= 100000;
        });

        return isRecent && hasKeywords && hasValidPrice;
      });
    };

    const filteredItems = filterItems(items);

    const newListingIds = await step.run("create-listings", async () => {
      return await convex.mutation(api.listings.createMany, {
        items: filteredItems.map(
          (item) =>
            ({
              sourceId: domain,
              sourceType: "vk",
              sourceUrl: `https://vk.ru/${domain}`,
              entityId: item.id,
              entityUrl: `https://vk.ru/wall${item.owner_id}_${item.id}`,
              text: item.text,
              images: item.attachments.map((a) => a.photo.orig_photo.url),
              postedAt: item.date,
            }) satisfies Omit<
              Doc<"listings">,
              "_id" | "_creationTime" | "status" | "updatedAt"
            >
        ),
      });
    });

    if (newListingIds.length === 0) {
      return {
        received: items.length,
        created: 0,
      };
    }

    const events = newListingIds.map<Events[typeof PROCESS_LISTING_EVENT]>(
      (id) => {
        return {
          name: PROCESS_LISTING_EVENT,
          data: {
            listingId: id,
          },
        };
      }
    );

    await step.sendEvent("emit-listing-processing", events);

    return {
      received: items.length,
      created: newListingIds.length,
    };
  }
);
