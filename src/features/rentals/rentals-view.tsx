"use client";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Empty, EmptyTitle } from "@/components/ui/empty";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useForm } from "@tanstack/react-form-nextjs";
import { LayoutGrid, List, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { RentalCard } from "./components/rental-card";
import { useRentals } from "./hooks/use-rentals";
import { SortOption, useRentalsFilters } from "./hooks/use-rentals-filters";

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "date-desc", label: "Сначала новые" },
  { value: "date-asc", label: "Сначала старые" },
  { value: "price-asc", label: "Цена: по возрастанию" },
  { value: "price-desc", label: "Цена: по убыванию" },
];

type ViewMode = "grid" | "list";

const formSchema = z.object({
  priceMin: z.number().min(0),
  priceMax: z.number().min(0),
  noCommission: z.boolean(),
  noDeposit: z.boolean(),
});

export const RentalsView = () => {
  const { sort, filters, handleSortChange, handleFilterChange } =
    useRentalsFilters();

  const {
    results,
    isLoading,
    canLoadMore,
    isLoadingMore,
    isLoadingFirstPage,
    loaderRef,
  } = useRentals({
    sort,
    filters,
  });

  const form = useForm({
    defaultValues: filters,
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: ({ value }) => handleFilterChange(value),
  });

  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            <div className="sticky top-0 z-10 bg-background flex items-center justify-between w-full gap-2 p-3">
              {/* Sort select — shadcn Select */}
              <Select
                disabled={isLoading}
                items={sortOptions}
                value={sort}
                onValueChange={(v) => handleSortChange(v as SortOption)}
              >
                <SelectTrigger className="w-full max-w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filters drawer */}
              <Drawer direction="right">
                <DrawerTrigger asChild>
                  <Button variant="outline" size="icon" disabled={isLoading}>
                    <SlidersHorizontal />
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="h-full max-w-sm ml-auto">
                  <DrawerHeader>
                    <DrawerTitle>Фильтры</DrawerTitle>
                  </DrawerHeader>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      form.handleSubmit();
                    }}
                    className="flex flex-col flex-1 gap-4 overflow-y-auto px-4 pb-4"
                  >
                    <FieldSet>
                      <FieldLegend variant="label">
                        Арендная плата за месяц
                      </FieldLegend>
                      <FieldGroup>
                        <form.Field name="priceMin">
                          {(field) => (
                            <Field orientation="horizontal">
                              <FieldLabel htmlFor={field.name}>От</FieldLabel>
                              <Input
                                id={field.name}
                                name={field.name}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) =>
                                  field.handleChange(Number(e.target.value))
                                }
                                placeholder="От"
                                autoComplete="off"
                                type="number"
                                min={0}
                              />
                            </Field>
                          )}
                        </form.Field>
                        <form.Field name="priceMax">
                          {(field) => (
                            <Field orientation="horizontal">
                              <FieldLabel htmlFor={field.name}>До</FieldLabel>
                              <Input
                                id={field.name}
                                name={field.name}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) =>
                                  field.handleChange(Number(e.target.value))
                                }
                                placeholder="До"
                                autoComplete="off"
                                type="number"
                                min={0}
                              />
                            </Field>
                          )}
                        </form.Field>

                        <form.Field name="noCommission">
                          {(field) => (
                            <Field orientation="horizontal">
                              <Checkbox
                                id={field.name}
                                name={field.name}
                                checked={field.state.value}
                                onCheckedChange={field.handleChange}
                              />
                              <FieldLabel htmlFor={field.name}>
                                Без комиссии
                              </FieldLabel>
                            </Field>
                          )}
                        </form.Field>
                        <form.Field name="noDeposit">
                          {(field) => (
                            <Field orientation="horizontal">
                              <Checkbox
                                id={field.name}
                                name={field.name}
                                checked={field.state.value}
                                onCheckedChange={field.handleChange}
                              />
                              <FieldLabel htmlFor={field.name}>
                                Без залога
                              </FieldLabel>
                            </Field>
                          )}
                        </form.Field>
                      </FieldGroup>
                    </FieldSet>

                    <div className="flex flex-col gap-2 mt-auto">
                      <DrawerClose asChild>
                        <Button type="submit">Применить</Button>
                      </DrawerClose>
                    </div>
                  </form>
                </DrawerContent>
              </Drawer>

              {/* View mode toggle — shadcn ButtonGroup */}
              <ButtonGroup className="hidden sm:flex">
                <Button
                  disabled={isLoading}
                  variant={viewMode === "grid" ? "default" : "outline"}
                  onClick={() => setViewMode("grid")}
                  size="icon"
                >
                  <LayoutGrid />
                </Button>
                <Button
                  disabled={isLoading}
                  variant={viewMode === "list" ? "default" : "outline"}
                  onClick={() => setViewMode("list")}
                  size="icon"
                >
                  <List />
                </Button>
              </ButtonGroup>
            </div>

            {results.length === 0 && !isLoading && (
              <Empty className="px-3">
                <EmptyTitle>Ничего не найдено</EmptyTitle>
              </Empty>
            )}

            {results.length > 0 && (
              <div className="text-sm text-muted-foreground px-3">
                Найдено: {results.length} объявлений
              </div>
            )}

            <div
              className={cn(
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                  : "flex flex-col gap-4"
              )}
            >
              {isLoadingFirstPage
                ? Array.from({ length: 10 }).map((_, index) => (
                    <Skeleton key={index} className="w-full h-96" />
                  ))
                : results.map((result) => (
                    <RentalCard
                      key={result.rental._id}
                      rental={result.rental}
                      listing={result.listing}
                      viewMode={viewMode}
                    />
                  ))}

              {canLoadMore && (
                <div
                  ref={loaderRef}
                  className="flex justify-center items-center py-8"
                >
                  {isLoadingMore && <Spinner />}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
