
"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  Heart,
  MapPin,
  RefreshCcw,
} from "lucide-react";

import { HOTELS } from "@/data/travel-catalog";

import {
  DonutChart,
  VerticalBars,
  Currency,
} from "@/components/charts/travel-charts";

import { DetailedStackedPrices } from "@/components/charts/detail-stacked-chart";

import { DestinationDiscovery } from "@/components/travel/destination-discovery";

import {
  useTravelCountries,
  price,
  displayLocation,
  type TravelCountryRecord,
} from "@/hooks/use-travel-countries";

import type {
  TravelPlan,
} from "@/types/travel";

type AccommodationProps = {
  plan: TravelPlan;
  onSelectDestination: (
    row: TravelCountryRecord
  ) => void;
};

export function AccommodationDetail({
  plan,
  onSelectDestination,
}: AccommodationProps) {
  const {
    records,
    loading,
    error,
  } = useTravelCountries();

  const [
    maxPrice,
    setMaxPrice,
  ] = useState(500);

  const [
    stars,
    setStars,
  ] = useState(0);

  const [
    area,
    setArea,
  ] = useState("All Areas");

  const [
    selectedHotelId,
    setSelectedHotelId,
  ] = useState<
    string | null
  >(null);

  const [
    favorites,
    setFavorites,
  ] = useState<string[]>([]);

  const selected = useMemo(
    () => {
      const matchById =
        records.find(
          record =>
            record.destination_id ===
            plan.selectedDestinationId
        );

      if (matchById) {
        return matchById;
      }

      const [
        city,
        country,
      ] = plan.destination
        .split(",")
        .map(value =>
          value.trim()
        );

      return (
        records.find(
          record =>
            record.city_town ===
              city &&
            record.country ===
              country
        ) ??
        records[0] ??
        null
      );
    },
    [
      records,
      plan.selectedDestinationId,
      plan.destination,
    ]
  );

  const city =
    selected?.city_town ??
    plan.destination.split(
      ","
    )[0];

  // Existing hotel cards are illustrative.
  // Show only those matching this city.

  const sampleHotels =
    HOTELS.filter(
      hotel =>
        hotel.city === city
    );

  const shownHotels =
    sampleHotels.filter(
      hotel =>
        hotel.nightly <=
          maxPrice &&
        (stars === 0 ||
          stars ===
            hotel.stars) &&
        (area ===
          "All Areas" ||
          area ===
            hotel.area)
    );

  const chosenHotel =
    HOTELS.find(
      hotel =>
        hotel.id ===
        selectedHotelId
    );

  const bins = [
    100,
    150,
    200,
    250,
    300,
    350,
    400,
    500,
  ];

  const priceGroups =
    bins.map(
      (
        max,
        index
      ) => ({
        label: `$${max}`,
        value:
          sampleHotels.filter(
            hotel =>
              hotel.nightly >=
                (index ===
                0
                  ? 0
                  : bins[
                      index -
                        1
                    ]) &&
              hotel.nightly <
                max
          ).length,
      })
    );

  const typeCounts =
    sampleHotels.reduce<
      Record<
        string,
        number
      >
    >(
      (
        result,
        hotel
      ) => {
        result[
          hotel.type
        ] =
          (result[
            hotel.type
          ] ?? 0) + 1;

        return result;
      },
      {}
    );

  const hotelTypes =
    Object.entries(
      typeCounts
    ).map(
      ([
        label,
        value,
      ]) => ({
        label,
        value,
      })
    );

  function resetFilters() {
    setMaxPrice(500);
    setStars(0);
    setArea("All Areas");
  }

  function toggleFavorite(
    id: string
  ) {
    setFavorites(current =>
      current.includes(id)
        ? current.filter(
            item =>
              item !== id
          )
        : [
            ...current,
            id,
          ]
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div className="step-heading">
          <h1>
            Accommodation Insights
            — {city}
          </h1>

          <p>
            Compare detailed
            prices, explore your
            selected route, and
            discover related
            destinations and
            local experiences.
          </p>
        </div>

        <p className="sample-note">
          CSV prices and hotel
          cards are illustrative
          estimates, not confirmed
          offers.
        </p>
      </div>

      {loading && (
        <p
          role="status"
          className="empty-state"
        >
          Loading
          travel_countries.csv…
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="empty-state"
        >
          Unable to refresh
          the CSV: {error}
        </p>
      )}

      {selected ? (
        <>
          <section className="content-panel">
            <div className="panel-title">
              <h2>
                Selected destination
              </h2>

              <span className="section-tag">
                <MapPin
                  size={12}
                  aria-hidden="true"
                />

                {
                  selected.destination_id
                }
              </span>
            </div>

            <label
              className="field-label"
              htmlFor="destination-detail-picker"
            >
              Choose another city
              or town

              <select
                id="destination-detail-picker"
                className="input-bordered"
                value={
                  selected.destination_id
                }
                onChange={event => {
                  const destination =
                    records.find(
                      record =>
                        record.destination_id ===
                        event.target.value
                    );

                  if (destination) {
                    onSelectDestination(
                      destination
                    );
                  }
                }}
              >
                {[...records]
                  .sort(
                    (
                      left,
                      right
                    ) =>
                      displayLocation(
                        left
                      ).localeCompare(
                        displayLocation(
                          right
                        )
                      )
                  )
                  .map(
                    record => (
                      <option
                        key={
                          record.destination_id
                        }
                        value={
                          record.destination_id
                        }
                      >
                        {displayLocation(
                          record
                        )}
                      </option>
                    )
                  )}
              </select>
            </label>

            <p className="muted tiny">
              Estimated hotel
              rate from CSV:{" "}
              <strong>
                <Currency
                  value={
                    price(
                      selected,
                      "hotel_nightly_usd"
                    ) ?? 0
                  }
                />
              </strong>{" "}
              per night.
              Origin:{" "}
              {[
                selected.origin_city,
                selected.origin_state,
                selected.origin_country,
              ]
                .filter(Boolean)
                .join(", ") ||
                "Not provided"}
              .
            </p>
          </section>

          <section
            className="content-panel filter-panel"
            aria-labelledby="hotel-refine-title"
          >
            <div className="panel-title">
              <h2 id="hotel-refine-title">
                Refine hotel results
              </h2>

              <button
                type="button"
                className="back-button"
                onClick={
                  resetFilters
                }
              >
                <RefreshCcw
                  size={14}
                  aria-hidden="true"
                />

                Reset filters
              </button>
            </div>

            <div className="hotel-filters">
              <div className="filter-section">
                <label htmlFor="hotel-detail-price">
                  Hotel Price Range

                  <b>
                    $0 – $
                    {maxPrice}
                    {maxPrice ===
                    500
                      ? "+"
                      : ""}
                  </b>
                </label>

                <input
                  id="hotel-detail-price"
                  type="range"
                  className="green-range"
                  min={50}
                  max={500}
                  step={25}
                  value={
                    maxPrice
                  }
                  onChange={event =>
                    setMaxPrice(
                      Number(
                        event.target
                          .value
                      )
                    )
                  }
                />
              </div>

              <div className="filter-section">
                <span className="field-label">
                  Star Rating
                </span>

                <div
                  className="pill-tabs"
                  role="group"
                  aria-label="Hotel star rating"
                >
                  {[
                    0,
                    3,
                    4,
                    5,
                  ].map(
                    value => (
                      <button
                        type="button"
                        key={value}
                        aria-pressed={
                          stars ===
                          value
                        }
                        className={
                          stars ===
                          value
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          setStars(
                            value
                          )
                        }
                      >
                        {value ===
                        0
                          ? "All"
                          : `${value}★`}
                      </button>
                    )
                  )}
                </div>
              </div>

              <label className="field-label">
                Area

                <select
                  className="input-bordered"
                  value={area}
                  onChange={event =>
                    setArea(
                      event.target.value
                    )
                  }
                >
                  <option>
                    All Areas
                  </option>

                  {[
                    ...new Set(
                      sampleHotels.map(
                        hotel =>
                          hotel.area
                      )
                    ),
                  ].map(
                    name => (
                      <option
                        key={name}
                      >
                        {name}
                      </option>
                    )
                  )}
                </select>
              </label>
            </div>

            <p className="muted tiny">
              These filters apply
              to the illustrative
              hotel cards below.
              All source prices
              remain visible in
              the detailed
              comparison.
            </p>
          </section>

          <DetailedStackedPrices
            selected={selected}
            allRecords={
              records
            }
          />

          {/* New dynamic discovery gallery */}
          <DestinationDiscovery
            key={
              selected.destination_id
            }
            selected={selected}
            allRecords={
              records
            }
            onSelectDestination={
              onSelectDestination
            }
          />

          {sampleHotels.length ? (
            <>
              <div className="two-panel-grid">
                <section className="content-panel">
                  <div className="panel-title">
                    <h2>
                      Price Distribution
                    </h2>
                  </div>

                  <VerticalBars
                    items={
                      priceGroups
                    }
                    title="Sample hotel price distribution"
                  />
                </section>

                <section className="content-panel">
                  <div className="panel-title">
                    <h2>
                      Hotel Types
                    </h2>
                  </div>

                  <DonutChart
                    items={
                      hotelTypes
                    }
                    total={`${sampleHotels.length}`}
                    label="Sample listings"
                  />
                </section>
              </div>

              <section className="content-panel">
                <div className="panel-title">
                  <h2>
                    Top Hotel Picks
                    in {city}
                  </h2>

                  <span className="section-tag">
                    {shownHotels.length}{" "}
                    sample results
                  </span>
                </div>

                {shownHotels.length ? (
                  <div className="result-cards">
                    {shownHotels.map(
                      hotel => (
                        <article
                          key={
                            hotel.id
                          }
                          className="result-card"
                        >
                          <div className="result-photo">
                            <div
                              className="cover-image"
                              role="img"
                              aria-label={`Illustrative image of ${hotel.name}`}
                              style={{
                                backgroundImage: `url("${hotel.image}")`,
                              }}
                            />

                            <button
                              type="button"
                              className={`favorite ${
                                favorites.includes(
                                  hotel.id
                                )
                                  ? "liked"
                                  : ""
                              }`}
                              aria-label={`${
                                favorites.includes(
                                  hotel.id
                                )
                                  ? "Remove"
                                  : "Add"
                              } ${hotel.name} favorite`}
                              onClick={() =>
                                toggleFavorite(
                                  hotel.id
                                )
                              }
                            >
                              <Heart
                                size={16}
                                fill={
                                  favorites.includes(
                                    hotel.id
                                  )
                                    ? "currentColor"
                                    : "none"
                                }
                              />
                            </button>
                          </div>

                          <div className="result-body">
                            <b>
                              {hotel.name}
                            </b>

                            <small>
                              ★{" "}
                              {hotel.rating.toFixed(
                                1
                              )}{" "}
                              ·{" "}
                              {hotel.stars}{" "}
                              stars ·{" "}
                              {hotel.area}
                            </small>

                            <p>
                              <strong>
                                <Currency
                                  value={
                                    hotel.nightly
                                  }
                                />
                              </strong>{" "}
                              <span className="muted">
                                / night ·
                                sample
                              </span>
                            </p>

                            <button
                              type="button"
                              className="outline-button"
                              onClick={() =>
                                setSelectedHotelId(
                                  hotel.id
                                )
                              }
                            >
                              View Details
                            </button>
                          </div>
                        </article>
                      )
                    )}
                  </div>
                ) : (
                  <p className="empty-state">
                    No sample hotels
                    match the current
                    filters. Try a
                    higher price or
                    a different star
                    rating.
                  </p>
                )}
              </section>
            </>
          ) : (
            <section className="content-panel">
              <div className="panel-title">
                <h2>
                  Hotel Listings
                  in {city}
                </h2>
              </div>

              <p className="empty-state">
                This project has
                no verified hotel
                listings for{" "}
                {city}. The
                CSV-backed price
                comparison and
                discovery cards
                above remain
                available.
              </p>
            </section>
          )}
        </>
      ) : !loading &&
        !error ? (
        <p className="empty-state">
          No destination could
          be matched to the
          selected trip. Return
          to Destination Overview
          to choose a town.
        </p>
      ) : null}

      {chosenHotel && (
        <div
          className="dialog-scrim"
          onMouseDown={event => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedHotelId(
                null
              );
            }
          }}
        >
          <section
            className="detail-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={
              chosenHotel.name
            }
          >
            <div className="dialog-header">
              <h2>
                {chosenHotel.name}
              </h2>

              <button
                type="button"
                className="icon-button"
                aria-label="Close hotel details"
                onClick={() =>
                  setSelectedHotelId(
                    null
                  )
                }
              >
                ×
              </button>
            </div>

            <div
              className="cover-image dialog-cover"
              role="img"
              aria-label={`Illustrative image of ${chosenHotel.name}`}
              style={{
                backgroundImage: `url("${chosenHotel.image}")`,
              }}
            />

            <p>
              <b>Location:</b>{" "}
              {chosenHotel.area}
              , {city}
            </p>

            <p>
              <b>Type:</b>{" "}
              {chosenHotel.type}{" "}
              ·{" "}
              {chosenHotel.stars}{" "}
              stars
            </p>

            <p>
              <b>
                Illustrative guest
                rating:
              </b>{" "}
              {chosenHotel.rating}
              /5
            </p>

            <p>
              <b>
                Illustrative
                nightly rate:
              </b>{" "}
              <Currency
                value={
                  chosenHotel.nightly
                }
              />
            </p>

            <p className="sample-note">
              Demonstration hotel,
              not a verified
              reservation listing.
            </p>

            <button
              type="button"
              className="primary-button dialog-done"
              onClick={() =>
                setSelectedHotelId(
                  null
                )
              }
            >
              Close details
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
