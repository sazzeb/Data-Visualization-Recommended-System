
"use client";

import {
  useMemo,
  useState,
  type CSSProperties,
} from "react";

import { MapPin } from "lucide-react";
import type {
  RecommendationItem,
  RecommendationResponse,
  TravelPlan,
} from "@/types/travel";

import {
  useTravelCountries,
  price,
  usd,
  comparisonSum,
  displayLocation,
  type TravelCountryRecord,
} from "@/hooks/use-travel-countries";

import styles from "./destination-overview.module.css";

const SERIES = [
  {
    key: "hotel_nightly_usd",
    label: "Hotel",
    color: "#1e70ad",
  },
  {
    key: "apartment_nightly_usd",
    label: "Apartment",
    color: "#00977e",
  },
  {
    key: "airbnb_nightly_usd",
    label: "Airbnb",
    color: "#d88d13",
  },
  {
    key: "tour_guide_half_day_usd",
    label: "Half-day guide",
    color: "#8b50b7",
  },
  {
    key: "tour_guide_full_day_usd",
    label: "Full-day guide",
    color: "#bd4561",
  },
  {
    key: "round_trip_transport_usd",
    label: "Return transport",
    color: "#4387ba",
  },
] as const;

type PriceSeries =
  (typeof SERIES)[number];

type OverviewProps = {
  plan: TravelPlan;
  recommendations?: RecommendationResponse;
  onOpenDestination: (
    row: TravelCountryRecord
  ) => void;
};

function recommendationPrice(item: RecommendationItem): number {
  const row = item.sourceRow;
  for (const key of [
    "price_midpoint",
    "price_recommendation",
    "price_min",
    "price_max",
    "hotel_nightly_usd",
    "apartment_nightly_usd",
  ]) {
    const value = Number(row[key]);
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return 0;
}

function PriceBar({
  record,
  fields,
  maximum,
  index,
  onOpen,
}: {
  record: TravelCountryRecord;
  fields: readonly PriceSeries[];
  maximum: number;
  index: number;
  onOpen: () => void;
}) {
  const total = fields.reduce(
    (sum, field) =>
      sum +
      (price(
        record,
        field.key
      ) ?? 0),
    0
  );

  return (
    <button
      className={styles.chartRow}
      type="button"
      onClick={onOpen}
      aria-label={`Open ${displayLocation(
        record
      )} in Accommodation Insights`}
      title={`View all prices for ${displayLocation(
        record
      )}`}
    >
      <span
        className={
          styles.locationLabel
        }
      >
        <strong>
          {record.city_town}
        </strong>

        <small>
          {record.state_region} ·{" "}
          {record.country}
        </small>
      </span>

      <span
        className={styles.barTrack}
      >
        <span
          className={styles.barStack}
          style={
            {
              width: `${
                (total /
                  maximum) *
                100
              }%`,
              "--stagger": `${Math.min(
                index * 60,
                900
              )}ms`,
            } as CSSProperties
          }
        >
          {fields.map(field => {
            const amount =
              price(
                record,
                field.key
              ) ?? 0;

            return (
              <span
                key={field.key}
                className={
                  styles.barSegment
                }
                style={{
                  width: `${
                    total
                      ? (amount /
                          total) *
                        100
                      : 0
                  }%`,
                  backgroundColor:
                    field.color,
                }}
                title={`${field.label}: ${usd(
                  amount
                )}`}
              >
                <span>
                  {field.label}
                </span>

                <strong>
                  {usd(amount)}
                </strong>
              </span>
            );
          })}
        </span>
      </span>

      <strong
        className={styles.totalLabel}
      >
        {usd(total)}
      </strong>
    </button>
  );
}

function DestinationPriceChart({
  records,
  country,
  setCountry,
  onOpen,
}: {
  records: TravelCountryRecord[];
  country: string;
  setCountry: (name: string) => void;
  onOpen: (
    row: TravelCountryRecord
  ) => void;
}) {
  const [sort, setSort] =
    useState<
      "high" | "low" | "city"
    >("high");

  const [limit, setLimit] =
    useState(7);

  const [transport, setTransport] =
    useState(false);

  const countries = useMemo(
    () =>
      [
        ...new Set(
          records.map(
            row => row.country
          )
        ),
      ].sort(),
    [records]
  );

  const active =
    countries.includes(country)
      ? country
      : countries[0] ?? "";

  const fields = transport
    ? SERIES
    : SERIES.slice(0, 5);

  const matching = records
    .filter(
      row =>
        row.country === active
    )
    .sort((a, b) =>
      sort === "city"
        ? a.city_town.localeCompare(
            b.city_town
          )
        : sort === "high"
        ? comparisonSum(
            b,
            transport
          ) -
          comparisonSum(
            a,
            transport
          )
        : comparisonSum(
            a,
            transport
          ) -
          comparisonSum(
            b,
            transport
          )
    );

  const visible = matching.slice(
    0,
    limit
  );

  const highest = Math.max(
    1,
    ...visible.map(
      row =>
        comparisonSum(
          row,
          transport
        )
    )
  );

  const axisMax =
    Math.ceil(
      highest / 200
    ) * 200 || 200;

  return (
    <section
      className={styles.chartPanel}
      aria-labelledby="overview-price-title"
    >
      <div
        className={
          styles.chartHeader
        }
      >
        <div>
          <h2 id="overview-price-title">
            {active} — Travel Price
            Comparison
          </h2>

          <p>
            Estimated prices for real
            states, cities, and towns
            from the CSV.
          </p>
        </div>

        <span
          className={
            styles.sourceBadge
          }
        >
          CSV data · {active}
        </span>
      </div>

      <div className={styles.controls}>
        <label>
          Country

          <select
            value={active}
            onChange={event =>
              setCountry(
                event.target.value
              )
            }
          >
            {countries.map(name => (
              <option key={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Sort by

          <select
            value={sort}
            onChange={event =>
              setSort(
                event.target
                  .value as typeof sort
              )
            }
          >
            <option value="high">
              Highest sum
            </option>

            <option value="low">
              Lowest sum
            </option>

            <option value="city">
              City A–Z
            </option>
          </select>
        </label>

        <label>
          Show destinations

          <select
            value={limit}
            onChange={event =>
              setLimit(
                Number(
                  event.target.value
                )
              )
            }
          >
            <option value={7}>
              Top 7
            </option>

            <option value={15}>
              Top 15
            </option>

            <option value={200}>
              All
            </option>
          </select>
        </label>

        <label
          className={
            styles.checkLabel
          }
        >
          <input
            type="checkbox"
            checked={transport}
            onChange={event =>
              setTransport(
                event.target.checked
              )
            }
          />

          Add return transport
        </label>
      </div>

      <div
        className={styles.legend}
        aria-label="Price categories"
      >
        {fields.map(field => (
          <span
            className={
              styles.legendItem
            }
            key={field.key}
          >
            <span
              className={
                styles.legendSwatch
              }
              style={{
                backgroundColor:
                  field.color,
              }}
            />

            {field.label}
          </span>
        ))}
      </div>

      <div
        className={
          styles.horizontalScroll
        }
        tabIndex={0}
        aria-label="Scroll for stacked prices"
      >
        <div
          key={`${active}-${sort}-${limit}-${transport}`}
          className={
            styles.chartCanvas
          }
        >
          <div
            className={
              styles.chartRows
            }
          >
            {visible.map(
              (record, index) => (
                <PriceBar
                  key={
                    record.destination_id
                  }
                  record={record}
                  fields={fields}
                  maximum={axisMax}
                  index={index}
                  onOpen={() =>
                    onOpen(record)
                  }
                />
              )
            )}
          </div>

          <div
            className={styles.axisRow}
            aria-hidden="true"
          >
            <span />

            <div
              className={
                styles.axisTicks
              }
            >
              {[0, 1, 2, 3, 4].map(
                number => (
                  <span key={number}>
                    {usd(
                      (axisMax *
                        number) /
                        4
                    )}
                  </span>
                )
              )}
            </div>

            <span />
          </div>
        </div>
      </div>

      <footer
        className={
          styles.chartFooter
        }
      >
        <span>
          Source:
          travel_countries.csv ·
          simulated estimates
        </span>

        <strong>
          {visible.length} of{" "}
          {matching.length}{" "}
          destinations shown
        </strong>
      </footer>

      <p
        className={
          styles.chartCaution
        }
      >
        Click any stacked bar to open
        the exact city/town in
        Accommodation Insights.
        Stacked sums combine
        alternative services with
        different units for comparison
        only, and are not actual
        trip quotes.
      </p>
    </section>
  );
}

const POSITIONS = [
  { left: 18, top: 24 },
  { left: 46, top: 20 },
  { left: 70, top: 29 },
  { left: 32, top: 52 },
  { left: 58, top: 67 },
  { left: 84, top: 61 },
];

function DestinationMap({
  records,
  onOpen,
}: {
  records: TravelCountryRecord[];
  onOpen: (
    row: TravelCountryRecord
  ) => void;
}) {
  return (
    <section
      className={styles.mapPanel}
      aria-labelledby="overview-map-title"
    >
      <header
        className={styles.mapTitle}
      >
        <div>
          <h2 id="overview-map-title">
            Destination Map
          </h2>

          <p>
            Click a city or town to
            open its accommodation
            and price details.
          </p>
        </div>

        <span
          className={styles.mapHint}
        >
          Illustrative positions ·
          no coordinates in CSV
        </span>
      </header>

      <div
        className={styles.mapCanvas}
      >
        <svg
          className={styles.mapArtwork}
          viewBox="0 0 900 420"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <rect
            width="900"
            height="420"
            fill="#dfeef5"
          />

          <g
            fill="#e6eadb"
            stroke="#fff"
            strokeWidth="4"
          >
            <path d="M0 46L120 27 202 81 223 142 184 197 213 263 151 295 110 387 0 341Z" />
            <path d="M260 0L449 0 473 52 556 43 622 88 705 96 757 0 900 0 900 295 838 333 773 302 690 342 620 302 570 336 510 278 442 309 399 250 337 248 341 169 288 113Z" />
            <path d="M326 305L406 313 460 420 296 420 273 375Z" />
            <path d="M628 321L740 337 802 420 634 420Z" />
          </g>

          <g
            fill="none"
            stroke="#bfd4d3"
            strokeWidth="2"
            opacity=".7"
          >
            <path d="M413 28L469 138 430 276M542 65L565 190 543 283M300 200L415 225 610 247" />
          </g>
        </svg>

        {records
          .slice(0, 6)
          .map((record, index) => (
            <button
              key={
                record.destination_id
              }
              className={
                styles.mapPin
              }
              type="button"
              onClick={() =>
                onOpen(record)
              }
              aria-label={`Open Accommodation Insights for ${displayLocation(
                record
              )}`}
              style={{
                left: `${
                  POSITIONS[index]
                    .left
                }%`,
                top: `${
                  POSITIONS[index]
                    .top
                }%`,
              }}
            >
              <MapPin
                size={19}
                aria-hidden="true"
              />

              <span
                className={
                  styles.pinCard
                }
              >
                <strong>
                  {record.city_town}
                </strong>

                <small>
                  {record.state_region} ·{" "}
                  {record.country}
                </small>

                <b>
                  {usd(
                    price(
                      record,
                      "hotel_nightly_usd"
                    ) ?? 0
                  )}{" "}
                  <span>
                    / night
                  </span>
                </b>
              </span>
            </button>
          ))}
      </div>
    </section>
  );
}

function RecommendationMap({
  recommendations,
  onOpen,
}: {
  recommendations: RecommendationResponse;
  onOpen: (row: TravelCountryRecord) => void;
}) {
  const items = recommendations.top10;
  const points = items.map(item => item.accommodation);
  const longitudes = points.map(item => item.longitude);
  const latitudes = points.map(item => item.latitude);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const longitudeRange = Math.max(1, maxLongitude - minLongitude);
  const latitudeRange = Math.max(1, maxLatitude - minLatitude);

  return (
    <section
      className={styles.mapPanel}
      aria-labelledby="recommendation-map-title"
    >
      <header className={styles.mapTitle}>
        <div>
          <h2 id="recommendation-map-title">
            Destination Map
          </h2>
          <p>
            The ten recommendations are positioned from their
            accommodation latitude and longitude.
          </p>
        </div>
        <span className={styles.mapHint}>
          Top choice highlighted
        </span>
      </header>

      <div className={styles.mapCanvas}>
        <svg
          className={styles.mapArtwork}
          viewBox="0 0 900 420"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <rect width="900" height="420" fill="#dfeef5" />
          <g fill="#e6eadb" stroke="#fff" strokeWidth="4">
            <path d="M0 46L120 27 202 81 223 142 184 197 213 263 151 295 110 387 0 341Z" />
            <path d="M260 0L449 0 473 52 556 43 622 88 705 96 757 0 900 0 900 295 838 333 773 302 690 342 620 302 570 336 510 278 442 309 399 250 337 248 341 169 288 113Z" />
            <path d="M326 305L406 313 460 420 296 420 273 375Z" />
            <path d="M628 321L740 337 802 420 634 420Z" />
          </g>
        </svg>

        {items.map((item, index) => {
          const accommodation = item.accommodation;
          const left =
            ((accommodation.longitude - minLongitude) /
              longitudeRange) *
              82 +
            9;
          const top =
            ((maxLatitude - accommodation.latitude) /
              latitudeRange) *
              76 +
            12;
          const location = {
            destination_id: accommodation.id,
            origin_country: "",
            origin_state: "",
            origin_city: "",
            city_town: accommodation.city,
            state_region: accommodation.state,
            country: accommodation.country,
            pricing_type: "recommendation",
            latitude: String(accommodation.latitude),
            longitude: String(accommodation.longitude),
          };

          return (
            <button
              key={`${accommodation.id}-${index}`}
              className={`${styles.mapPin} ${
                index === 0 ? styles.mapPinActive : ""
              }`}
              type="button"
              onClick={() => onOpen(location)}
              aria-label={`Open recommendation ${index + 1} for ${accommodation.city}, ${accommodation.state}, ${accommodation.country}`}
              style={{ left: `${left}%`, top: `${top}%` }}
            >
              <MapPin size={19} aria-hidden="true" />
              <span className={styles.pinCard}>
                <strong>
                  {index === 0 ? "TOP CHOICE · " : `#${index + 1} · `}
                  {accommodation.city}
                </strong>
                <small>
                  {accommodation.state} · {accommodation.country}
                </small>
                <b>
                  {usd(recommendationPrice(accommodation))}
                  <span> / night</span>
                </b>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function DestinationOverview({
  plan,
  recommendations,
  onOpenDestination,
}: OverviewProps) {
  const {
    records,
    loading,
    error,
  } = useTravelCountries();

  const [country, setCountry] =
    useState(
      plan.countries[0] ||
        "Spain"
    );

  const available = [
    ...new Set(
      records.map(
        row => row.country
      )
    ),
  ].sort();

  const activeCountry =
    available.includes(country)
      ? country
      : available[0] ?? country;

  const current = records
    .filter(
      row =>
        row.country ===
        activeCountry
    )
    .sort(
      (a, b) =>
        comparisonSum(b) -
        comparisonSum(a)
    );

  return (
    <div className={styles.overview}>
      <div
        className={
          styles.pageHeader
        }
      >
        <div>
          <h1>
            Explore Destinations
          </h1>

          <p>
            Compare travel prices and
            open destination details
            directly from the chart
            or map.
          </p>
        </div>

        <span
          className={
            styles.pageStatus
          }
        >
          Destination overview ·
          Page 9
        </span>
      </div>

      {loading && (
        <p
          className={styles.empty}
          role="status"
        >
          Loading CSV destination
          prices…
        </p>
      )}

      {error && (
        <p
          className={
            styles.loadError
          }
          role="alert"
        >
          {error}
        </p>
      )}

      {!loading && !error && recommendations && (
        <>
          <DestinationPriceChart
            records={records}
            country={activeCountry}
            setCountry={setCountry}
            onOpen={onOpenDestination}
          />
          <RecommendationMap
            recommendations={recommendations}
            onOpen={onOpenDestination}
          />
        </>
      )}

      {!loading && !error && !recommendations && (
        <>
          <DestinationPriceChart
            records={records}
            country={activeCountry}
            setCountry={setCountry}
            onOpen={
              onOpenDestination
            }
          />

          <DestinationMap
            records={current}
            onOpen={
              onOpenDestination
            }
          />
        </>
      )}
    </div>
  );
}
