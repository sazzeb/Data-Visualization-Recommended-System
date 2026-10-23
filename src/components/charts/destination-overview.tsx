
"use client";

import { useState } from "react";

import { MapPin } from "lucide-react";
import { DailyTravelPriceChart } from "./daily-travel-price-chart";
import { RecommendationMap } from "./recommendation-map";
import type {
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

type OverviewProps = {
  plan: TravelPlan;
  recommendations?: RecommendationResponse;
  onOpenDestination: (row: TravelCountryRecord) => void;
};

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
            Explore recommended locations
            and open destination details
            from the map.
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

      {!recommendations && loading && (
        <p
          className={styles.empty}
          role="status"
        >
          Loading CSV destination
          prices…
        </p>
      )}

      {!recommendations && error && (
        <p
          className={
            styles.loadError
          }
          role="alert"
        >
          {error}
        </p>
      )}

      {recommendations && (
        <>
          <DailyTravelPriceChart recommendations={recommendations} />
          <RecommendationMap
            recommendations={recommendations}
            onOpen={onOpenDestination}
          />
        </>
      )}

      {!loading && !error && !recommendations && (
        <>
          <div className={styles.controls}>
            <label htmlFor="overview-country">
              Country
              <select id="overview-country" value={activeCountry}
                onChange={event => setCountry(event.target.value)}>
                {available.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
          </div>

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
