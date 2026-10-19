
"use client";

import type { CSSProperties } from "react";
import { BUDGET_PARTS } from "@/data/travel-catalog";
import type {
  Destination,
  LocalEvent,
} from "@/types/travel";

export interface ChartItem {
  label: string;
  value: number;
  color?: string;
}

const PALETTE = [
  "#007a32",
  "#20b98b",
  "#3989f5",
  "#f7ac24",
  "#8d62d9",
  "#f45d6b",
];

export function Currency({ value }: { value: number }) {
  return (
    <>
      {new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(value)}
    </>
  );
}

export function DonutChart({
  items,
  total,
  label,
}: {
  items: ChartItem[];
  total: string;
  label: string;
}) {
  const sum =
    items.reduce((n, item) => n + Math.max(0, item.value), 0) || 1;

  let progress = 0;

  const segments = items.map((item, index) => {
    const start = progress;
    progress += (Math.max(0, item.value) / sum) * 100;

    return `${
      item.color || PALETTE[index % PALETTE.length]
    } ${start}% ${progress}%`;
  });

  return (
    <div className="donut-layout">
      <div
        className="donut"
        role="img"
        aria-label={`${label}: ${items
          .map(item => `${item.label} ${item.value}`)
          .join(", ")}`}
        style={{
          background: `conic-gradient(${segments.join(",")})`,
        }}
      >
        <div className="donut-hole">
          <strong>{total}</strong>
          <span>{label}</span>
        </div>
      </div>

      <div className="legend">
        {items.map((item, index) => (
          <div className="legend-row" key={item.label}>
            <span
              className="legend-dot"
              style={{
                background:
                  item.color || PALETTE[index % PALETTE.length],
              }}
            />

            <span className="legend-name">{item.label}</span>

            <b>{Math.round((item.value / sum) * 100)}%</b>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BudgetBreakdown({
  amount,
}: {
  amount: number;
}) {
  return (
    <DonutChart
      items={BUDGET_PARTS.map(item => ({
        label: `${item.name} · $${Math.round(
          (amount * item.value) / 100
        ).toLocaleString()}`,
        value: item.value,
        color: item.color,
      }))}
      total={`$${amount.toLocaleString()}`}
      label="Total budget"
    />
  );
}

export function HorizontalBars({
  items,
  max = 100,
  suffix = "",
  title,
}: {
  items: ChartItem[];
  max?: number;
  suffix?: string;
  title: string;
}) {
  return (
    <div
      className="hbars"
      role="img"
      aria-label={`${title}: ${items
        .map(item => `${item.label}: ${item.value}${suffix}`)
        .join(", ")}`}
    >
      {items.map((item, index) => (
        <div className="hbar-row" key={item.label}>
          <span className="hbar-label">{item.label}</span>

          <div className="hbar-track">
            <span
              className="hbar-fill"
              style={{
                width: `${Math.max(
                  0,
                  Math.min(100, (item.value / max) * 100)
                )}%`,
                background:
                  item.color || PALETTE[index % PALETTE.length],
              }}
            />
          </div>

          <b>
            {item.value}
            {suffix}
          </b>
        </div>
      ))}
    </div>
  );
}

export function VerticalBars({
  items,
  title,
  color = "#007a32",
}: {
  items: ChartItem[];
  title: string;
  color?: string;
}) {
  const max = Math.max(...items.map(item => item.value), 1);

  return (
    <div
      className="vchart"
      role="img"
      aria-label={`${title}: ${items
        .map(item => `${item.label} ${item.value}`)
        .join(", ")}`}
    >
      <div className="vchart-grid" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className="vbars">
        {items.map(item => (
          <div className="vbar-column" key={item.label}>
            <div className="vbar-well">
              <span
                title={`${item.label}: ${item.value}`}
                style={{
                  height: `${(item.value / max) * 100}%`,
                  background: color,
                }}
              />
            </div>

            <span className="vbar-label">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const METRICS = [
  {
    key: "cost",
    label: "Value",
    color: "#007a32",
  },
  {
    key: "activities",
    label: "Activities",
    color: "#3989f5",
  },
  {
    key: "weather",
    label: "Weather",
    color: "#f7b633",
  },
  {
    key: "popularity",
    label: "Popularity",
    color: "#8957db",
  },
] as const;

export function ComparisonChart({
  destinations,
}: {
  destinations: Destination[];
}) {
  const lowest = Math.min(
    ...destinations.map(d => d.cost),
    1000
  );

  const bars = destinations.map(d => ({
    label: d.city,
    scores: {
      cost: Math.min(
        100,
        Math.round((lowest / d.cost) * 90)
      ),
      activities: d.activities,
      weather: d.weather,
      popularity: d.popularity,
    },
  }));

  return (
    <div
      className="comparison-chart"
      role="img"
      aria-label="Illustrative comparison of value, activities, weather and popularity across destinations"
    >
      <div className="compare-plots">
        {bars.map(d => (
          <div className="compare-city" key={d.label}>
            <div className="compare-bars">
              {METRICS.map(metric => (
                <span
                  key={metric.key}
                  title={`${d.label} ${metric.label}: ${
                    d.scores[metric.key]
                  }`}
                  style={{
                    height: `${
                      d.scores[metric.key]
                    }%`,
                    background: metric.color,
                  }}
                />
              ))}
            </div>

            <small>{d.label}</small>
          </div>
        ))}
      </div>

      <div className="chart-key">
        {METRICS.map(metric => (
          <span key={metric.key}>
            <i
              style={{
                background: metric.color,
              }}
            />
            {metric.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function DestinationMap({
  destinations,
}: {
  destinations: Destination[];
}) {
  return (
    <div
      className="destination-map"
      aria-label="Illustrative map with destination cards"
    >
      <svg
        viewBox="0 0 900 480"
        preserveAspectRatio="xMidYMid slice"
        className="map-art"
        aria-hidden="true"
      >
        <rect
          width="900"
          height="480"
          fill="#dcedf5"
        />

        <g
          fill="#e4e9d5"
          stroke="#fff"
          strokeWidth="3"
        >
          <path d="M0 50L130 24 198 80 225 130 187 178 215 244 147 268 122 345 24 320 0 256Z" />
          <path d="M258 0L437 0 471 46 527 50 586 98 681 99 720 30 900 12 900 333 848 364 760 314 684 331 621 292 560 324 512 284 478 348 425 341 411 282 361 267 358 192 323 143 294 87Z" />
          <path d="M332 348L397 350 434 412 410 478 295 480 278 408Z" />
          <path d="M478 339L544 360 566 400 545 455 511 434Z" />
          <path d="M664 345L788 354 850 480 680 480 650 412Z" />
        </g>

        <g
          fill="none"
          stroke="#c4d2c4"
          strokeWidth="2"
          opacity=".75"
        >
          <path d="M416 54L439 145 407 250M470 87L525 170 506 286M565 111L605 228 560 315M322 166L402 212 489 227" />
        </g>

        <g
          stroke="#fff"
          strokeWidth="1"
          opacity=".25"
        >
          {Array.from({ length: 12 }, (_, i) => (
            <path
              key={i}
              d={`M${i * 90} 0v480`}
            />
          ))}
        </g>
      </svg>

      {destinations.slice(0, 6).map((destination, index) => (
        <div
          className={`map-pin pin-${index}`}
          style={
            {
              left: `${destination.x}%`,
              top: `${destination.y}%`,
            } as CSSProperties
          }
          key={destination.city}
        >
          <span className="pin-dot" />

          <span className="pin-caption">
            <b>{destination.city}</b>
            <small>
              <Currency value={destination.cost} />
            </small>
          </span>
        </div>
      ))}

      <span className="map-hint">
        Schematic preview · Not for navigation
      </span>
    </div>
  );
}

const EVENT_COLORS: Record<string, string> = {
  Concerts: "#fa5171",
  Festivals: "#3cbc86",
  Sports: "#488bfb",
  Culture: "#ffb52d",
  Exhibitions: "#985edb",
};

export function EventTimeline({
  events,
}: {
  events: LocalEvent[];
}) {
  const months = Array.from(
    new Set(events.map(e => e.date.slice(0, 7)))
  ).sort();

  const categories = [
    "Concerts",
    "Festivals",
    "Sports",
    "Culture",
    "Exhibitions",
  ];

  return (
    <div className="timeline-scroll">
      <div
        className="timeline"
        role="img"
        aria-label={`Events by month: ${events
          .map(event => `${event.name} on ${event.date}`)
          .join(", ")}`}
      >
        <div className="timeline-labels">
          {categories.map(category => (
            <span key={category}>{category}</span>
          ))}
        </div>

        <div className="timeline-body">
          {categories.map(category => (
            <div
              key={category}
              className="timeline-row"
            >
              {events
                .filter(e => e.category === category)
                .map(event => {
                  const monthIndex = months.indexOf(
                    event.date.slice(0, 7)
                  );

                  const left =
                    ((monthIndex +
                      (Number(event.date.slice(8, 10)) -
                        1) /
                        31) /
                      Math.max(1, months.length)) *
                    100;

                  return (
                    <span
                      title={`${event.name} · ${event.date}`}
                      key={event.id}
                      className="event-dot"
                      style={{
                        left: `${Math.min(96, left)}%`,
                        background:
                          EVENT_COLORS[event.category] ||
                          "#007a32",
                      }}
                    />
                  );
                })}
            </div>
          ))}

          <div className="timeline-months">
            {months.map(month => (
              <span key={month}>
                {new Date(
                  `${month}-01T12:00:00`
                ).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
