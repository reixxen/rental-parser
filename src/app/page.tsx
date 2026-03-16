import { RentalsView } from "@/features/rentals/rentals-view";
import { Suspense } from "react";

export default function Home() {
  return (
    <Suspense>
      <RentalsView />
    </Suspense>
  );
}
