"use client";

import { DailyTravelPriceChart } from "./daily-travel-price-chart";
import type { RecommendationResponse } from "@/types/travel";

export function DetailedStackedPrices({
  accommodationId,
  recommendations,
}: {
  accommodationId: string;
  recommendations: RecommendationResponse;
}) {
  return (
    <DailyTravelPriceChart
      recommendations={recommendations}
      accommodationId={accommodationId}
    />
  );
}
