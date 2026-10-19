
"use client";

import { useEffect, useState } from "react";
import Papa from "papaparse";

export type TravelCountryRecord = {
  destination_id: string;
  origin_country: string;
  origin_state: string;
  origin_city: string;
  country: string;
  state_region: string;
  city_town: string;
  pricing_type: string;
} & Record<string, string>;

export type PriceSegment = {
  key: string;
  label: string;
  value: number;
  color: string;
  description: string;
};

export type PriceRow = {
  id: string;
  label: string;
  description: string;
  group:
    | "Essentials"
    | "Events"
    | "Heritage"
    | "Concerts";
  segments: PriceSegment[];
};

const CSV_PATH =
  "/datasets/travel_countries.csv";

let lastRecords:
  TravelCountryRecord[] = [];

let activeRequest:
  Promise<TravelCountryRecord[]> | null =
  null;

export const usd = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);

export function price(
  record: TravelCountryRecord,
  field: string
): number | null {
  const raw = record[field];

  if (
    typeof raw !== "string" ||
    raw.trim() === ""
  ) {
    return null;
  }

  const value = Number(raw);

  return Number.isFinite(value) &&
    value >= 0
    ? value
    : null;
}

export function comparisonSum(
  record: TravelCountryRecord,
  includeTransport = false
) {
  const columns = [
    "hotel_nightly_usd",
    "apartment_nightly_usd",
    "airbnb_nightly_usd",
    "tour_guide_half_day_usd",
    "tour_guide_full_day_usd",
    ...(includeTransport
      ? ["round_trip_transport_usd"]
      : []),
  ];

  return columns.reduce(
    (sum, column) =>
      sum +
      (price(record, column) ?? 0),
    0
  );
}

export function displayLocation(
  record: TravelCountryRecord
) {
  return `${record.city_town}, ${record.state_region}, ${record.country}`;
}

function parseFile(
  text: string
): TravelCountryRecord[] {
  const result =
    Papa.parse<TravelCountryRecord>(
      text.replace(/^\uFEFF/, ""),
      {
        header: true,
        skipEmptyLines: "greedy",
        transformHeader: column =>
          column.trim(),
      }
    );

  const records = result.data.filter(
    record => {
      if (
        ![
          "destination_id",
          "country",
          "state_region",
          "city_town",
        ].every(
          key =>
            record[key]?.trim()
        )
      ) {
        return false;
      }

      return [
        "round_trip_transport_usd",
        "hotel_nightly_usd",
        "apartment_nightly_usd",
        "airbnb_nightly_usd",
        "tour_guide_half_day_usd",
        "tour_guide_full_day_usd",
      ].every(
        key =>
          price(record, key) !==
          null
      );
    }
  );

  if (!records.length) {
    throw new Error(
      "No valid destination and pricing records were found in the CSV."
    );
  }

  return records;
}

function loadTravelCountries(): Promise<
  TravelCountryRecord[]
> {
  if (!activeRequest) {
    activeRequest = fetch(
      CSV_PATH,
      { cache: "no-store" }
    )
      .then(response => {
        if (!response.ok) {
          throw new Error(
            `CSV request failed (HTTP ${response.status}).`
          );
        }

        return response.text();
      })
      .then(parseFile)
      .then(records => {
        lastRecords = records;
        return records;
      })
      .finally(() => {
        activeRequest = null;
      });
  }

  return activeRequest;
}

// Re-fetch whenever the screen mounts
// or the browser tab receives focus.
// Concurrent requests share one promise.

export function useTravelCountries() {
  const [records, setRecords] =
    useState<
      TravelCountryRecord[]
    >(lastRecords);

  const [loading, setLoading] =
    useState(
      !lastRecords.length
    );

  const [error, setError] =
    useState("");

  useEffect(() => {
    let active = true;

    const refresh = () => {
      void loadTravelCountries()
        .then(nextRecords => {
          if (!active) {
            return;
          }

          setRecords(
            nextRecords
          );

          setError("");
          setLoading(false);
        })
        .catch(reason => {
          if (!active) {
            return;
          }

          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to load travel prices."
          );

          setLoading(false);
        });
    };

    refresh();

    window.addEventListener(
      "focus",
      refresh
    );

    return () => {
      active = false;

      window.removeEventListener(
        "focus",
        refresh
      );
    };
  }, []);

  return {
    records,
    loading,
    error,
  };
}

const MAIN_PRICES = [
  {
    key: "round_trip_transport_usd",
    label: "Return transport",
    color: "#2563eb",
  },
  {
    key: "hotel_nightly_usd",
    label: "Hotel/night",
    color: "#1e70ad",
  },
  {
    key: "apartment_nightly_usd",
    label: "Apartment/night",
    color: "#00977e",
  },
  {
    key: "airbnb_nightly_usd",
    label: "Airbnb/night",
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
];

// Retain the existing 14-bar,
// 32-price-field comparison contract.

export function detailedPriceRows(
  record: TravelCountryRecord
): PriceRow[] {
  const essentials:
    PriceSegment[] =
    MAIN_PRICES.flatMap(item => {
      const value = price(
        record,
        item.key
      );

      return value === null
        ? []
        : [
            {
              key: item.key,
              label: item.label,
              value,
              color: item.color,
              description:
                item.label,
            },
          ];
    });

  const result: PriceRow[] = [
    {
      id: "essentials",
      label:
        "Transport, stays & guides",
      description:
        "Alternative nightly stays, guides and return transport",
      group: "Essentials",
      segments: essentials,
    },
  ];

  const collections = [
    {
      prefix: "event",
      heading: "Event",
      group:
        "Events" as const,
      count: 6,
      colors: [
        "#3a9e78",
        "#007a32",
      ],
    },
    {
      prefix: "heritage",
      heading: "Heritage",
      group:
        "Heritage" as const,
      count: 3,
      colors: [
        "#d39a1b",
        "#b87806",
      ],
    },
    {
      prefix: "concert",
      heading: "Concert",
      group:
        "Concerts" as const,
      count: 4,
      colors: [
        "#9571d2",
        "#6d43ba",
      ],
    },
  ];

  for (const collection of collections) {
    for (
      let index = 1;
      index <= collection.count;
      index++
    ) {
      const base =
        `${collection.prefix}_${index}`;

      const name =
        record[
          `${base}_name`
        ]?.trim() ||
        `${collection.heading} ${index}`;

      const low = price(
        record,
        `${base}_price_min_usd`
      );

      const high = price(
        record,
        `${base}_price_max_usd`
      );

      if (
        low === null &&
        high === null
      ) {
        continue;
      }

      const segments:
        PriceSegment[] = [];

      if (low !== null) {
        segments.push({
          key:
            `${base}_price_min_usd`,
          label: "Min",
          value: low,
          color:
            collection.colors[0],
          description: name,
        });
      }

      if (high !== null) {
        segments.push({
          key:
            `${base}_price_max_usd`,
          label: "Max",
          value: high,
          color:
            collection.colors[1],
          description: name,
        });
      }

      result.push({
        id: base,
        label:
          `${collection.heading} ${index}`,
        description: name,
        group:
          collection.group,
        segments,
      });
    }
  }

  return result;
}
