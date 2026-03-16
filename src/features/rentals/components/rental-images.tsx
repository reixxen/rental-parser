"use client";
import { cn } from "@/lib/utils";
import Image from "next/image";
import * as React from "react";

export const RentalImages = ({
  className,
  images,
  ...props
}: React.ComponentProps<"div"> & { images: string[] }) => {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const MAX_VISIBLE = 5;

  const displayCount = Math.min(images.length, MAX_VISIBLE);
  const visibleImages = images.slice(0, displayCount);
  const hasMore = images.length > MAX_VISIBLE;
  const isLastSlot = activeIndex === MAX_VISIBLE - 1;

  return (
    <div
      className={cn(
        "relative aspect-square overflow-hidden shrink-0",
        className
      )}
      onMouseLeave={() => setActiveIndex(0)}
      {...props}
    >
      {visibleImages.map((src, index) => (
        <Image
          key={src}
          src={src}
          fill
          alt="Product image"
          sizes="(max-width: 768px) 100vw, 30vw"
          className={cn(
            "object-cover",
            // Затемнение последнего слота
            hasMore &&
              index === MAX_VISIBLE - 1 &&
              isLastSlot &&
              "brightness-50",
            activeIndex === index ? "block" : "hidden"
          )}
          priority={index === 0}
        />
      ))}

      {/* Оверлей "Показать еще" */}
      {hasMore && isLastSlot && (
        <div className="absolute inset-0 z-5 flex flex-col items-center justify-center pointer-events-none bg-black/40">
          <span className="text-sm font-medium">
            Ещё {images.length - (MAX_VISIBLE - 1)} фото
          </span>
        </div>
      )}

      {/* Сетка невидимых зон */}
      <div className="absolute inset-0 flex z-4">
        {Array.from({ length: displayCount }).map((_, index) => (
          <div
            key={index}
            className="h-full flex-1"
            onMouseEnter={() => setActiveIndex(index)}
          />
        ))}
      </div>

      {/* Индикаторы */}
      <div className="absolute bottom-1 left-1 z-5 flex items-center gap-1.5 px-2 py-1 rounded-full backdrop-blur-lg">
        {Array.from({ length: displayCount }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "size-1 rounded-full transition-all",
              activeIndex === index ? "w-4 bg-foreground" : "bg-foreground/50"
            )}
          />
        ))}
      </div>
    </div>
  );
};
