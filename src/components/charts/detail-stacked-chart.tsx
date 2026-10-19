
"use client";

import {
  useMemo,
  useState,
  type CSSProperties,
} from "react";

import {
  detailedPriceRows,
  displayLocation,
  usd,
  type PriceRow,
  type TravelCountryRecord,
} from "@/hooks/use-travel-countries";

import styles from "./detail-stacked-chart.module.css";

type FilterGroup =
  | "All"
  | PriceRow["group"];

const GROUPS: FilterGroup[] = [
  "All",
  "Essentials",
  "Events",
  "Heritage",
  "Concerts",
];

function ComparisonRow({
  row,
  axisMax,
  position,
}: {
  row: PriceRow;
  axisMax: number;
  position: number;
}) {
  const total = row.segments.reduce(
    (sum, item) =>
      sum + item.value,
    0
  );

  return (
    <div className={styles.row}>
      <div
        className={styles.rowHeading}
        title={row.description}
      >
        <strong>
          {row.label}
        </strong>

        <small>
          {row.description}
        </small>
      </div>

      <div
        className={styles.track}
        role="img"
        aria-label={`${row.label}, ${row.description}. ${row.segments
          .map(
            segment =>
              `${segment.label}: ${usd(
                segment.value
              )}`
          )
          .join(", ")}`}
      >
        <div
          className={styles.stack}
          style={
            {
              width: `${
                total > 0
                  ? (total /
                      axisMax) *
                    100
                  : 0
              }%`,
              "--delay": `${Math.min(
                position * 45,
                650
              )}ms`,
            } as CSSProperties
          }
        >
          {row.segments.map(
            segment => (
              <div
                className={
                  styles.segment
                }
                key={segment.key}
                title={`${segment.description} — ${segment.label}: ${usd(
                  segment.value
                )}`}
                style={{
                  background:
                    segment.color,
                  width: `${
                    total > 0
                      ? (segment.value /
                          total) *
                        100
                      : 0
                  }%`,
                }}
              >
                <span>
                  {segment.label}
                </span>

                <b>
                  {usd(
                    segment.value
                  )}
                </b>
              </div>
            )
          )}
        </div>
      </div>

      <strong
        className={
          styles.rowTotal
        }
      >
        {usd(total)}
      </strong>
    </div>
  );
}

function StacksForCity({
  record,
  group,
  maximums,
}: {
  record: TravelCountryRecord;
  group: FilterGroup;
  maximums: Record<
    PriceRow["group"],
    number
  >;
}) {
  const rows = useMemo(
    () =>
      detailedPriceRows(record),
    [record]
  );

  const groupRows =
    group === "All"
      ? rows
      : rows.filter(
          item =>
            item.group === group
        );

  const groups = GROUPS.slice(
    1
  ).filter(
    name =>
      group === "All" ||
      group === name
  );

  return (
    <section
      className={
        styles.citySection
      }
    >
      <div
        className={
          styles.cityHeading
        }
      >
        <h3>
          {displayLocation(
            record
          )}
        </h3>

        <span>
          CSV ID{" "}
          {record.destination_id}
        </span>
      </div>

      {groups.map(name => {
        const subset =
          groupRows.filter(
            item =>
              item.group === name
          );

        if (!subset.length) {
          return null;
        }

        const axisMax =
          maximums[
            name as PriceRow["group"]
          ];

        return (
          <section
            className={
              styles.group
            }
            key={name}
          >
            <div
              className={
                styles.groupHeader
              }
            >
              <h4>
                {name ===
                "Essentials"
                  ? "Transport, stays and tour guides"
                  : `${name} · minimum and maximum price`}
              </h4>

              <small>
                {subset.length}{" "}
                {subset.length === 1
                  ? "bar"
                  : "bars"}{" "}
                · USD
              </small>
            </div>

            <div
              className={
                styles.scroll
              }
              tabIndex={0}
              aria-label={`Scroll to see ${name} prices`}
            >
              <div
                className={
                  styles.canvas
                }
              >
                {subset.map(
                  (
                    row,
                    index
                  ) => (
                    <ComparisonRow
                      key={row.id}
                      row={row}
                      axisMax={
                        axisMax
                      }
                      position={
                        index
                      }
                    />
                  )
                )}

                <div
                  className={
                    styles.axis
                  }
                  aria-hidden="true"
                >
                  <span />

                  <div>
                    {[
                      0, 1, 2, 3, 4,
                    ].map(number => (
                      <span
                        key={number}
                      >
                        {usd(
                          (axisMax *
                            number) /
                            4
                        )}
                      </span>
                    ))}
                  </div>

                  <span />
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </section>
  );
}

export function DetailedStackedPrices({
  selected,
  allRecords,
}: {
  selected: TravelCountryRecord;
  allRecords: TravelCountryRecord[];
}) {
  const [group, setGroup] =
    useState<FilterGroup>("All");

  const [compareId, setCompareId] =
    useState("");

  const peers = allRecords.filter(
    row =>
      row.country ===
        selected.country &&
      row.destination_id !==
        selected.destination_id
  );

  const comparison = peers.find(
    row =>
      row.destination_id ===
      compareId
  );

  const rows =
    detailedPriceRows(
      selected
    );

  const count = rows.reduce(
    (sum, row) =>
      sum +
      row.segments.length,
    0
  );

  // Both selected cities use the same
  // axis scale within each category.

  const maxPerGroup = useMemo(
    () => {
      const combined = [
        ...detailedPriceRows(
          selected
        ),
        ...(comparison
          ? detailedPriceRows(
              comparison
            )
          : []),
      ];

      const result = {} as Record<
        PriceRow["group"],
        number
      >;

      for (const name of GROUPS.slice(
        1
      ) as PriceRow["group"][]) {
        const maximum = Math.max(
          0,
          ...combined
            .filter(
              row =>
                row.group ===
                name
            )
            .map(row =>
              row.segments.reduce(
                (sum, segment) =>
                  sum +
                  segment.value,
                0
              )
            )
        );

        result[name] = Math.max(
          25,
          Math.ceil(
            maximum / 25
          ) * 25
        );
      }

      return result;
    },
    [selected, comparison]
  );

  return (
    <section
      className={styles.panel}
      aria-labelledby="detail-price-heading"
    >
      <header
        className={styles.header}
      >
        <div>
          <h2 id="detail-price-heading">
            Detailed stacked price
            comparison
          </h2>

          <p>
            City/town:{" "}
            <strong>
              {displayLocation(
                selected
              )}
            </strong>
            . Values come from
            travel_countries.csv.
          </p>
        </div>

        <span
          className={styles.badge}
        >
          {count} price fields
        </span>
      </header>

      <div
        className={styles.filters}
      >
        <fieldset
          className={
            styles.groupPicker
          }
        >
          <legend>
            Price categories
          </legend>

          <div>
            {GROUPS.map(name => (
              <button
                type="button"
                key={name}
                aria-pressed={
                  group === name
                }
                className={
                  group === name
                    ? styles.active
                    : ""
                }
                onClick={() =>
                  setGroup(name)
                }
              >
                {name}
              </button>
            ))}
          </div>
        </fieldset>

        <label
          className={
            styles.comparePicker
          }
        >
          Compare with another
          city/town

          <select
            value={compareId}
            onChange={event =>
              setCompareId(
                event.target.value
              )
            }
          >
            <option value="">
              Selected city only
            </option>

            {peers.map(row => (
              <option
                key={
                  row.destination_id
                }
                value={
                  row.destination_id
                }
              >
                {row.city_town} ·{" "}
                {row.state_region}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        key={`${selected.destination_id}-${compareId}-${group}`}
      >
        <StacksForCity
          record={selected}
          group={group}
          maximums={
            maxPerGroup
          }
        />

        {comparison && (
          <StacksForCity
            record={comparison}
            group={group}
            maximums={
              maxPerGroup
            }
          />
        )}
      </div>

      <div className={styles.note}>
        <strong>
          How to read this
          visualization:
        </strong>{" "}
        Each bar shows the source
        fields and their USD values.
        Event, heritage, and concert
        bars display a minimum and
        maximum as two labelled
        segments. Their stacked sum
        is a <em>comparison sum</em>,
        not a price range or a booking
        quote. Charts comparing two
        cities use the same scale
        within each price group.
        Hotel, apartment, and Airbnb
        are alternative nightly
        rates; transport is a
        round-trip rate; guide prices
        are per session. The CSV
        contains simulated estimates,
        not verified listings.
        Hover or focus on a bar
        for the full source name
        and exact price.
      </div>
    </section>
  );
}
