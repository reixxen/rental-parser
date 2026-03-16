import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  listings: defineTable({
    sourceId: v.string(), // "mgn.kvartira"
    sourceType: v.union(v.literal("vk"), v.literal("avito")),
    sourceUrl: v.string(), // https://vk.com/mgn.kvartira
    entityId: v.string(),
    entityUrl: v.string(), // https://vk.com/wall-1234567890
    text: v.string(),
    images: v.array(v.string()),
    postedAt: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("processed"),
      v.literal("error")
    ),
    updatedAt: v.number(),
  })
    .index("by_source_entity", ["sourceId", "entityId"])
    .index("by_status", ["status"])
    .index("by_status_posted", ["status", "postedAt"])
    .index("by_source_type", ["sourceType"]),

  rentals: defineTable({
    listingId: v.id("listings"),
    totalArea: v.optional(v.number()), // общая площадь
    floor: v.optional(v.number()), // этаж
    totalFloor: v.optional(v.number()), // общее количество этажей
    rooms: v.optional(v.number()), // количество комнат, 0 = студия
    rent: v.number(), // аренда в месяц
    deposit: v.number(), // залог
    commission: v.number(), // сумма комиссии
    description: v.string(), // описание объявления
    bills: v.object({
      metered: v.union(v.literal("owner"), v.literal("tenant")), // свет, вода, газ — по счётчикам
      fixed: v.union(v.literal("owner"), v.literal("tenant")), // отопление, мусор, содержание дома и т.д.
      fixedAmount: v.number(), // фиксированная сумма ЖКУ
    }),
    location: v.object({
      address: v.string(),
      city: v.string(),
      district: v.string(),
      lat: v.number(),
      lng: v.number(),
    }),
  })
    .index("by_listing", ["listingId"])
    .index("by_rent", ["rent"])
    .index("by_deposit", ["deposit"])
    .index("by_commission", ["commission"]),
});
