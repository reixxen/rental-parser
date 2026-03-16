import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";

const searchParamsSchema = z.object({
  sort: z
    .enum(["date-desc", "date-asc", "price-asc", "price-desc"])
    .catch("date-desc"),
  priceMin: z.coerce.number().min(0).catch(0),
  priceMax: z.coerce.number().min(0).catch(0),
  noCommission: z
    .literal("true")
    .transform(() => true)
    .catch(false),
  noDeposit: z
    .literal("true")
    .transform(() => true)
    .catch(false),
});

export type SortOption = z.infer<typeof searchParamsSchema>["sort"];
export type FiltersOption = Omit<z.infer<typeof searchParamsSchema>, "sort">;

export const useRentalsFilters = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const parsed = searchParamsSchema.parse({
    sort: searchParams.get("sort"),
    priceMin: searchParams.get("priceMin"),
    priceMax: searchParams.get("priceMax"),
    noCommission: searchParams.get("noCommission"),
    noDeposit: searchParams.get("noDeposit"),
  });

  const handleSortChange = (sort: SortOption) => {
    const params = new URLSearchParams(searchParams);
    params.set("sort", sort);
    router.push(`?${params.toString()}`);
  };

  const handleFilterChange = (filters: FiltersOption) => {
    const params = new URLSearchParams(searchParams);

    if (filters.priceMin) {
      params.set("priceMin", filters.priceMin.toString());
    } else {
      params.delete("priceMin");
    }

    if (filters.priceMax) {
      params.set("priceMax", filters.priceMax.toString());
    } else {
      params.delete("priceMax");
    }

    if (filters.noCommission) {
      params.set("noCommission", "true");
    } else {
      params.delete("noCommission");
    }

    if (filters.noDeposit) {
      params.set("noDeposit", "true");
    } else {
      params.delete("noDeposit");
    }

    router.push(`?${params.toString()}`);
  };

  return {
    sort: parsed.sort,
    filters: {
      priceMin: parsed.priceMin,
      priceMax: parsed.priceMax,
      noCommission: parsed.noCommission,
      noDeposit: parsed.noDeposit,
    } satisfies FiltersOption,
    handleSortChange,
    handleFilterChange,
  };
};
