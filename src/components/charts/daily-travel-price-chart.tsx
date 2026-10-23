"use client";

import { useState } from "react";

import type { RecommendationResponse } from "@/types/travel";
import styles from "./destination-overview.module.css";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const COLORS = {
  accommodation: "#1e70ad",
  food: "#d88d13",
} as const;

const ACTIVITY_COLORS = [
  "#6f42a1",
  "#9346b5",
  "#5449a8",
  "#a23489",
  "#7c3cc4",
] as const;

const STACK_NAME_ALIASES: Record<string, string> = {
  "Mauerflimmern Open-Air-Kino": "Mauerflimmern",
  "Schübel & Hofmann Gesunde Schuhe": "Schübel & Hofmann",
  "BROOKLYN Fashion GmbH": "BROOKLYN Fashion",
  "Richard Riedel GmbH MBT-Service-Center Schuh Hofmann": "Richard Riede",
};

function stackName(name: string): string {
  const normalized = name.trim().replace(/\s+/g, " ");
  if (STACK_NAME_ALIASES[normalized]) return STACK_NAME_ALIASES[normalized];
  if (normalized.length <= 26) return normalized;

  const words = normalized.split(" ");
  let shortName = words[0];
  for (const word of words.slice(1)) {
    if (`${shortName} ${word}`.length > 26) break;
    shortName += ` ${word}`;
  }
  return shortName;
}

type Segment = {
  name: string;
  amount: number;
  color: string;
};

export function DailyTravelPriceChart({
  recommendations,
  accommodationId,
}: {
  recommendations: RecommendationResponse;
  accommodationId?: string;
}) {
  const [selectedRank, setSelectedRank] = useState(1);
  const detailed = Boolean(accommodationId);
  const trip = accommodationId
    ? recommendations.top10.find(item => item.accommodation.id === accommodationId)
      ?? recommendations.top10[0]
    : recommendations.top10.find(item => item.rank === selectedRank)
      ?? recommendations.top10[0];

  if (!trip || trip.days.length === 0) {
    return (
      <section className={styles.chartPanel}>
        <h2>Detailed stacked price comparison</h2>
        <p>No daily cost estimate is available for this recommendation.</p>
      </section>
    );
  }

  const limited = !detailed && trip.days.length > 25;
  const days = limited ? trip.days.slice(0, 20) : trip.days;
  const perDayStay = trip.accommodationCost / trip.days.length;
  const rows = days.map((day, index) => {
    const activitySegments: Segment[] = day.activities.flatMap((activity, activityIndex) => {
      const price = day.activityCosts[activityIndex];
      return price == null ? [] : [{
        name: activity.name,
        amount: price,
        color: ACTIVITY_COLORS[activityIndex % ACTIVITY_COLORS.length],
      }];
    });
    const segments: Segment[] = [
      { name: trip.accommodation.name,
        amount: perDayStay, color: COLORS.accommodation },
      ...activitySegments,
      { name: day.foodVenue?.name ?? "Food allowance estimate",
        amount: day.foodCost, color: COLORS.food },
    ].filter(segment => Number.isFinite(segment.amount) && segment.amount > 0);
    const segmentWidths = segments.map(segment => Math.max(
      104,
      Math.round(segment.amount / Math.max(1, day.activityCost + perDayStay +
        day.foodCost) * 650),
    ));
    return {
      date: day.date,
      dayNumber: index + 1,
      segments,
      segmentWidths,
      barWidth: segmentWidths.reduce((sum, width) => sum + width, 0),
      total: segments.reduce((sum, segment) => sum + segment.amount, 0),
    };
  });
  const chartWidth = Math.max(980, ...rows.map(row => row.barWidth + 260));

  return (
    <section className={styles.chartPanel} aria-labelledby="daily-travel-price-title">
      <div className={styles.chartHeader}>
        <div>
          <h2 id="daily-travel-price-title">
            {detailed ? "Detailed stacked price comparison" : "Daily Travel Price Comparison"}
          </h2>
          <p>
            {detailed
              ? `Daily estimates for all ${trip.days.length} days at ${trip.accommodation.name}: stay, priced activities, and food.`
              : "Estimated daily costs. Different purple shades identify individual events and activities."}
          </p>
        </div>
        <span className={styles.sourceBadge}>Recommendation · #{trip.rank}</span>
      </div>

      {!detailed && (
        <div className={styles.controls}>
          <label htmlFor="daily-price-recommendation">
            Recommendation
            <select
              id="daily-price-recommendation"
              value={trip.rank}
              onChange={event => setSelectedRank(Number(event.target.value))}
            >
              {recommendations.top10.map(item => (
                <option key={item.rank} value={item.rank}>
                  #{item.rank} · {item.accommodation.name} · {item.accommodation.city}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className={styles.dailyScroll}>
        <div className={styles.dailyChartCanvas} style={{ minWidth: chartWidth }}>
          {rows.map(row => (
            <article className={styles.dailyDay} key={row.date}>
              <div className={styles.dailyChartRow}>
                <span className={styles.locationLabel}>
                  <strong>Day {row.dayNumber}</strong>
                  <small>{row.date}</small>
                </span>
                <span className={styles.barTrack}>
                  <span className={styles.barStack} style={{ width: row.barWidth }}>
                    {row.segments.map((segment, index) => (
                      <span
                        className={`${styles.barSegment} ${styles.dailyBarSegment}`}
                        key={`${segment.name}-${index}`}
                        style={{
                          width: row.segmentWidths[index],
                          backgroundColor: segment.color,
                        }}
                        title={`${segment.name}: ${money.format(segment.amount)}`}
                      >
                        <span>{stackName(segment.name)}</span>
                        <strong>{money.format(segment.amount)}</strong>
                      </span>
                    ))}
                  </span>
                </span>
                <strong className={styles.totalLabel}>{money.format(row.total)}</strong>
              </div>
            </article>
          ))}
        </div>
      </div>

      <p className={styles.chartCaution}>
        Round-trip and local travel are excluded from this daily chart. Activities without a USD price are excluded from the stack.
        {limited && ` Showing days 1–20 of ${trip.days.length}; all days remain in the itinerary below.`}
      </p>
    </section>
  );
}
