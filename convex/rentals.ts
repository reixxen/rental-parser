import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    listingId: v.id("listings"),
    totalArea: v.optional(v.number()),
    floor: v.optional(v.number()),
    totalFloor: v.optional(v.number()),
    rooms: v.optional(v.number()),
    rent: v.number(),
    deposit: v.number(),
    commission: v.number(),
    description: v.string(),
    bills: v.object({
      metered: v.union(v.literal("owner"), v.literal("tenant")),
      fixed: v.union(v.literal("owner"), v.literal("tenant")),
      fixedAmount: v.number(),
    }),
    location: v.object({
      address: v.string(),
      city: v.string(),
      district: v.string(),
      lat: v.number(),
      lng: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("rentals")
      .withIndex("by_listing", (q) => q.eq("listingId", args.listingId))
      .unique();

    if (existing) return existing._id;

    return await ctx.db.insert("rentals", args);
  },
});

export const getList = query({
  args: {
    paginationOpts: paginationOptsValidator,
    sort: v.optional(
      v.union(
        v.literal("date-desc"),
        v.literal("date-asc"),
        v.literal("price-asc"),
        v.literal("price-desc")
      )
    ),
    priceMin: v.optional(v.number()),
    priceMax: v.optional(v.number()),
    noCommission: v.optional(v.boolean()),
    noDeposit: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const sort = args.sort ?? "date-desc";

    const applyRentalFilters = (rental: {
      rent: number;
      commission: number;
      deposit: number;
    }) => {
      if (args.priceMin && rental.rent < args.priceMin) return false;
      if (args.priceMax && rental.rent > args.priceMax) return false;
      if (args.noCommission && rental.commission > 0) return false;
      if (args.noDeposit && rental.deposit > 0) return false;
      return true;
    };

    if (sort === "price-asc" || sort === "price-desc") {
      const result = await ctx.db
        .query("rentals")
        .withIndex("by_rent", (q) => {
          if (args.priceMin !== undefined && args.priceMax !== undefined) {
            return q.gte("rent", args.priceMin).lte("rent", args.priceMax);
          }
          if (args.priceMin !== undefined) {
            return q.gte("rent", args.priceMin);
          }
          if (args.priceMax !== undefined) {
            return q.lte("rent", args.priceMax);
          }
          return q;
        })
        .order(sort === "price-asc" ? "asc" : "desc")
        .paginate(args.paginationOpts);

      const page = (
        await Promise.all(
          result.page.map(async (rental) => {
            if (args.noCommission && rental.commission > 0) return null;
            if (args.noDeposit && rental.deposit > 0) return null;

            const listing = await ctx.db.get(rental.listingId);
            if (!listing || listing.status !== "processed") return null;

            return { rental, listing };
          })
        )
      ).filter((r): r is NonNullable<typeof r> => r !== null);

      return { ...result, page };
    }

    const result = await ctx.db
      .query("listings")
      .withIndex("by_status_posted", (q) => q.eq("status", "processed"))
      .order(sort === "date-asc" ? "asc" : "desc")
      .paginate(args.paginationOpts);

    const page = (
      await Promise.all(
        result.page.map(async (listing) => {
          const rental = await ctx.db
            .query("rentals")
            .withIndex("by_listing", (q) => q.eq("listingId", listing._id))
            .unique();

          if (!rental) return null;
          if (!applyRentalFilters(rental)) return null;

          return { rental, listing };
        })
      )
    ).filter((r): r is NonNullable<typeof r> => r !== null);

    return { ...result, page };
  },
});
