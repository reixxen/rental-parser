import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createMany = mutation({
  args: {
    items: v.array(
      v.object({
        sourceId: v.string(),
        sourceType: v.union(v.literal("vk"), v.literal("avito")),
        sourceUrl: v.string(),
        entityId: v.string(),
        entityUrl: v.string(),
        text: v.string(),
        images: v.array(v.string()),
        postedAt: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const newIds = [];
    for (const item of args.items) {
      const existing = await ctx.db
        .query("listings")
        .withIndex("by_source_entity", (q) =>
          q.eq("sourceId", item.sourceId).eq("entityId", item.entityId)
        )
        .unique();

      if (!existing) {
        const id = await ctx.db.insert("listings", {
          ...item,
          status: "pending",
          updatedAt: Date.now(),
        });
        newIds.push(id);
      }
    }

    return newIds;
  },
});

export const getById = query({
  args: {
    id: v.id("listings"),
  },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id);
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("listings"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("processed"),
      v.literal("error")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status, updatedAt: Date.now() });

    return args.id;
  },
});
