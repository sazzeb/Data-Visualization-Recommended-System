"use client";

import { useState } from "react";
import type { RecommendationResponse } from "@/types/travel";
import styles from "./destination-overview.module.css";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const COLORS = { stay: "#1e70ad", food: "#d88d13" };
const ACTIVITY_COLORS = ["#6f42a1", "#9346b5", "#5449a8", "#a23489", "#7c3cc4"];
const PLOTS = [
  { id: "stacked", label: "Stacked bars" },
  { id: "treemap", label: "Treemap" },
  { id: "lollipop", label: "Lollipop" },
] as const;
type Plot = typeof PLOTS[number]["id"];
type Segment = { name: string; amount: number; color: string; kind: "stay" | "activity" | "food" };
type Row = { date: string; day: number; segments: Segment[]; total: number };

const ALIASES: Record<string, string> = {
  "Mauerflimmern Open-Air-Kino": "Mauerflimmern",
  "Schübel & Hofmann Gesunde Schuhe": "Schübel & Hofmann",
  "BROOKLYN Fashion GmbH": "BROOKLYN Fashion",
  "Richard Riedel GmbH MBT-Service-Center Schuh Hofmann": "Richard Riede",
};
function shortName(name: string) {
  const normalized = name.trim().replace(/\s+/g, " ");
  if (ALIASES[normalized]) return ALIASES[normalized];
  if (normalized.length <= 26) return normalized;
  let result = normalized.split(" ")[0];
  for (const word of normalized.split(" ").slice(1)) {
    if (`${result} ${word}`.length > 26) break;
    result += ` ${word}`;
  }
  return result;
}
function DayLabel({ row }: { row: Row }) {
  return <span className={styles.locationLabel}><strong>Day {row.day}</strong><small>{row.date}</small></span>;
}
function Stacked({ rows }: { rows: Row[] }) {
  const widths = rows.map(row => row.segments.map(segment =>
    Math.max(104, Math.round(segment.amount / Math.max(1, row.total) * 650))));
  const chartWidth = Math.max(980, ...widths.map(items => items.reduce((sum, width) => sum + width, 260)));
  return <div className={styles.dailyScroll}><div style={{ minWidth: chartWidth }}>
    {rows.map((row, rowIndex) => <article className={styles.dailyDay} key={row.date}>
      <div className={styles.dailyChartRow}>
        <DayLabel row={row} />
        <span className={styles.barTrack}><span className={styles.barStack}
          style={{ width: widths[rowIndex].reduce((sum, width) => sum + width, 0) }}>
          {row.segments.map((segment, index) => <span
            className={`${styles.barSegment} ${styles.dailyBarSegment}`}
            key={`${segment.name}-${index}`}
            style={{ width: widths[rowIndex][index], backgroundColor: segment.color }}
            title={`${segment.name}: ${money.format(segment.amount)}`}>
            <span>{shortName(segment.name)}</span><strong>{money.format(segment.amount)}</strong>
          </span>)}
        </span></span>
        <strong className={styles.totalLabel}>{money.format(row.total)}</strong>
      </div>
    </article>)}
  </div></div>;
}
function Treemap({ rows }: { rows: Row[] }) {
  const widths = rows.map(row => row.segments.map(segment =>
    Math.max(104, Math.round(segment.amount / Math.max(1, row.total) * 650))));
  const chartWidth = Math.max(980, ...widths.map(items => items.reduce((sum, width) => sum + width, 260)));
  return <div className={styles.dailyScroll}><div style={{ minWidth: chartWidth }}>
    {rows.map((row, rowIndex) => <article className={styles.dailyDay} key={row.date}>
      <div className={styles.dailyChartRow}>
        <DayLabel row={row} />
        <span className={styles.barTrack}><span className={styles.treemapTiles}
          style={{ width: widths[rowIndex].reduce((sum, width) => sum + width, 0) }}>
          {row.segments.map((segment, index) => <span
            className={styles.treemapTile} key={`${segment.name}-${index}`}
            style={{ width: widths[rowIndex][index], backgroundColor: segment.color }}
            title={`${segment.name}: ${money.format(segment.amount)}`}>
            <span>{shortName(segment.name)}</span><strong>{money.format(segment.amount)}</strong>
          </span>)}
        </span></span>
        <strong className={styles.totalLabel}>{money.format(row.total)}</strong>
      </div>
    </article>)}
  </div></div>;
}
function Lollipop({ rows }: { rows: Row[] }) {
  const maximum = Math.max(1, ...rows.flatMap(row => row.segments.map(segment => segment.amount)));
  return <div className={styles.dailyScroll}>{rows.map(row => <article className={styles.lollipopDay} key={row.date}>
    <header><DayLabel row={row} /><strong>{money.format(row.total)}</strong></header>
    {row.segments.map((segment, index) => <div className={styles.lollipopRow} key={`${segment.name}-${index}`}>
      <span title={segment.name}>{segment.name}</span>
      <div className={styles.lollipopTrack} title={`${segment.name}: ${money.format(segment.amount)}`}>
        <div style={{ width: `${segment.amount / maximum * 100}%`, backgroundColor: segment.color }}>
          <i style={{ backgroundColor: segment.color }} />
        </div>
      </div>
      <strong>{money.format(segment.amount)}</strong>
    </div>)}
  </article>)}<p className={styles.plotCaption}>Each dot uses the same price scale across all displayed days.</p></div>;
}

export function DailyTravelPriceChart({ recommendations, accommodationId }: {
  recommendations: RecommendationResponse; accommodationId?: string;
}) {
  const [selectedRank, setSelectedRank] = useState(1);
  const [plot, setPlot] = useState<Plot>("stacked");
  const detailed = Boolean(accommodationId);
  const trip = accommodationId
    ? recommendations.top10.find(item => item.accommodation.id === accommodationId) ?? recommendations.top10[0]
    : recommendations.top10.find(item => item.rank === selectedRank) ?? recommendations.top10[0];
  if (!trip || trip.days.length === 0) return <section className={styles.chartPanel}>
    <h2>Daily price comparison</h2><p>No daily cost estimate is available for this recommendation.</p>
  </section>;

  const limited = !detailed && trip.days.length > 25;
  const days = limited ? trip.days.slice(0, 20) : trip.days;
  const perDayStay = trip.accommodationCost / trip.days.length;
  const rows: Row[] = days.map((day, index) => {
    const activities: Segment[] = day.activities.flatMap((activity, activityIndex) => {
      const price = day.activityCosts[activityIndex];
      return price == null ? [] : [{
        name: activity.name, amount: price, color: ACTIVITY_COLORS[activityIndex % ACTIVITY_COLORS.length],
        kind: "activity" as const,
      }];
    });
    const segments: Segment[] = [
      { name: trip.accommodation.name, amount: perDayStay, color: COLORS.stay, kind: "stay" as const },
      ...activities,
      { name: day.foodVenue?.name ?? "Food allowance estimate", amount: day.foodCost,
        color: COLORS.food, kind: "food" as const },
    ].filter(segment => Number.isFinite(segment.amount) && segment.amount > 0);
    return { date: day.date, day: index + 1, segments,
      total: segments.reduce((sum, segment) => sum + segment.amount, 0) };
  });

  return <section className={styles.chartPanel} aria-labelledby="daily-travel-price-title">
    <div className={styles.chartHeader}><div>
      <h2 id="daily-travel-price-title">{detailed ? "Detailed daily price comparison" : "Daily Travel Price Comparison"}</h2>
      <p>{detailed
        ? `Daily estimates for all ${trip.days.length} days at ${trip.accommodation.name}: stay, priced activities, and food.`
        : "Explore daily costs from several views. Each uses the same estimated prices."}</p>
    </div><span className={styles.sourceBadge}>Recommendation · #{trip.rank}</span></div>
    {!detailed && <div className={styles.controls}><label htmlFor="daily-price-recommendation">Recommendation
      <select id="daily-price-recommendation" value={trip.rank} onChange={event => setSelectedRank(Number(event.target.value))}>
        {recommendations.top10.map(item => <option key={item.rank} value={item.rank}>
          #{item.rank} · {item.accommodation.name} · {item.accommodation.city}
        </option>)}
      </select>
    </label></div>}
    <div className={styles.plotPicker}>
      <label htmlFor="daily-price-plot">Plot type
        <select id="daily-price-plot" value={plot}
          onChange={event => setPlot(event.target.value as Plot)}>
          {PLOTS.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      </label>
    </div>
    <div className={styles.plotBody}>
      {plot === "stacked" && <Stacked rows={rows} />}
      {plot === "treemap" && <Treemap rows={rows} />}
      {plot === "lollipop" && <Lollipop rows={rows} />}
    </div>
    <p className={styles.chartCaution}>
      Round-trip and local travel are excluded from these daily plots. Activities without a USD price are excluded.
      {limited && ` Showing days 1–20 of ${trip.days.length}; all days remain in the itinerary below.`}
    </p>
  </section>;
}
