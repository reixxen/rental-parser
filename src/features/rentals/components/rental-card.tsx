import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { formatCurrency } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { ExternalLinkIcon, MapPinIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Doc } from "../../../../convex/_generated/dataModel";
import { RentalImages } from "./rental-images";

const RentalTitle = ({ rental }: { rental: Doc<"rentals"> }) => {
  const parts: string[] = [];

  // Тип жилья (Обязательно)
  if (rental.rooms === 0) {
    parts.push("Квартира-студия");
  } else if (rental.rooms) {
    parts.push(`${rental.rooms}-к. квартира`);
  } else {
    parts.push("Квартира");
  }

  // Метраж (Только если ИИ его нашел)
  if (rental.totalArea && rental.totalArea > 0) {
    parts.push(`${rental.totalArea} м²`);
  }

  // Этажность (Форматируем 3/5 или просто 3 эт.)
  if (rental.floor && rental.floor > 0) {
    if (rental.totalFloor && rental.totalFloor > 0) {
      parts.push(`${rental.floor}/${rental.totalFloor} эт.`);
    } else {
      parts.push(`${rental.floor} эт.`);
    }
  }

  return <span>{parts.join(", ")}</span>;
};

const RentalBadges = ({ rental }: { rental: Doc<"rentals"> }) => {
  return (
    <div className="flex items-center flex-wrap gap-0.5">
      <Badge className="text-sm [&>svg]:size-4! p-0 bg-transparent rounded-none text-neutral-800 dark:text-neutral-300">
        {rental.deposit > 0
          ? `Залог ${formatCurrency(rental.deposit)}`
          : "Без залога"}
      </Badge>
      <span className="bg-foreground size-0.5 rounded-full mx-1" />

      <Badge className="text-sm [&>svg]:size-4! p-0 bg-transparent rounded-none text-neutral-800 dark:text-neutral-300">
        {rental.commission > 0
          ? `Комиссия ${formatCurrency(rental.commission)}`
          : "Без комиссии"}
      </Badge>
      <span className="bg-foreground size-0.5 rounded-full mx-1" />

      {(() => {
        const { metered, fixed, fixedAmount } = rental.bills;
        const hasFixedAmount = fixedAmount && fixedAmount > 0;

        if (metered === "owner" && fixed === "owner") {
          return (
            <Badge className="text-sm [&>svg]:size-4! p-0 bg-transparent rounded-none text-neutral-800 dark:text-neutral-300">
              Все ЖКУ включены
            </Badge>
          );
        }

        if (metered === "tenant" && fixed === "owner") {
          return (
            <Badge className="text-sm [&>svg]:size-4! p-0 bg-transparent rounded-none text-neutral-800 dark:text-neutral-300">
              {hasFixedAmount
                ? `${formatCurrency(fixedAmount)} + счетчики`
                : "Счетчики"}
            </Badge>
          );
        }

        if (metered === "owner" && fixed === "tenant") {
          return (
            <Badge className="text-sm [&>svg]:size-4! p-0 bg-transparent rounded-none text-neutral-800 dark:text-neutral-300">
              {hasFixedAmount
                ? `ЖКУ ${formatCurrency(fixedAmount)}`
                : "ЖКУ включены"}
            </Badge>
          );
        }

        return (
          <Badge className="text-sm [&>svg]:size-4! p-0 bg-transparent rounded-none text-neutral-800 dark:text-neutral-300">
            {hasFixedAmount
              ? `${formatCurrency(fixedAmount)} + счетчики`
              : "Счетчики"}
          </Badge>
        );
      })()}
    </div>
  );
};

export const RentalCard = ({
  rental,
  listing,
  viewMode,
}: {
  rental: Doc<"rentals">;
  listing: Doc<"listings">;
  viewMode: "grid" | "list";
}) => {
  const formatPostedAt = () =>
    formatDistanceToNow(new Date(listing.postedAt), {
      addSuffix: true,
      locale: ru,
    });

  if (viewMode === "grid") {
    return (
      <div className="flex flex-col gap-2 p-3 overflow-hidden rounded-xl bg-card text-neutral-800 dark:text-neutral-300">
        <Carousel>
          <CarouselContent>
            {listing.images.map((image, index) => (
              <CarouselItem key={image}>
                <div className="relative aspect-square overflow-hidden shrink-0">
                  <Image
                    src={image}
                    alt={listing.text}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 30vw"
                    priority={index === 0}
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
        <div className="flex flex-col leading-snug font-semibold text-foreground">
          <RentalTitle rental={rental} />
          <span>{formatCurrency(rental.rent)}/месяц</span>
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <RentalBadges rental={rental} />
          <div className="flex items-center gap-1 [&>svg]:size-4 [&>svg]:shrink-0">
            <MapPinIcon />
            <span className="truncate">{rental.location.address}</span>
          </div>
          <span className="truncate">Район: {rental.location.district}</span>
        </div>

        <div className="flex gap-2 items-center justify-between mt-auto">
          <Button
            variant="secondary"
            render={({ className }) => (
              <Link
                className={className}
                href={listing.entityUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Подробнее
                <ExternalLinkIcon />
              </Link>
            )}
          />
          <span className="text-sm text-muted-foreground line-clamp-1">
            {formatPostedAt()}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[auto_1fr] gap-4 overflow-hidden p-3 rounded-xl bg-card text-neutral-800 dark:text-neutral-300">
      <RentalImages images={listing.images} className="size-60 rounded-lg" />

      <div className="flex flex-col gap-2">
        <div className="flex flex-col leading-snug font-semibold text-foreground">
          <RentalTitle rental={rental} />
          <span>{formatCurrency(rental.rent)}/месяц</span>
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <RentalBadges rental={rental} />
          <div className="flex items-center gap-1 [&>svg]:size-4 [&>svg]:shrink-0">
            <MapPinIcon />
            <span className="truncate">{rental.location.address}</span>
          </div>
          <span className="truncate">Район: {rental.location.district}</span>
        </div>

        <div className="line-clamp-3 text-sm text-muted-foreground">
          {rental.description}
        </div>

        <div className="flex gap-2 items-center justify-between mt-auto">
          <Button
            variant="secondary"
            render={({ className }) => (
              <Link
                className={className}
                href={listing.entityUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Подробнее
                <ExternalLinkIcon />
              </Link>
            )}
          />
          <span className="text-sm text-muted-foreground line-clamp-1">
            {formatPostedAt()}
          </span>
        </div>
      </div>
    </div>
  );
};
