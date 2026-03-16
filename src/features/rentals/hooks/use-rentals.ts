import { usePaginatedQuery } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "../../../../convex/_generated/api";
import { FiltersOption, SortOption } from "./use-rentals-filters";

interface UseRentalsProps {
  limit?: number;
  sort?: SortOption;
  filters?: FiltersOption;
}

export const useRentals = ({ limit = 10, sort, filters }: UseRentalsProps) => {
  const loaderRef = useRef<HTMLDivElement>(null);

  const { loadMore, results, status, isLoading } = usePaginatedQuery(
    api.rentals.getList,
    {
      sort,
      priceMin:
        filters?.priceMin && filters.priceMin > 0
          ? filters.priceMin
          : undefined,
      priceMax:
        filters?.priceMax && filters.priceMax > 0
          ? filters.priceMax
          : undefined,
      noCommission: filters?.noCommission,
      noDeposit: filters?.noDeposit,
    },
    {
      initialNumItems: limit,
    }
  );

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && status === "CanLoadMore") {
          loadMore(10);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, status]);

  return {
    results,
    isLoading,
    canLoadMore: status === "CanLoadMore",
    isLoadingMore: status === "LoadingMore",
    isLoadingFirstPage: status === "LoadingFirstPage",
    loaderRef,
  };
};
