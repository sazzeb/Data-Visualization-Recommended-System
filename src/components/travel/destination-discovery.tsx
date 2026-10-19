
"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  MapPin,
  X,
} from "lucide-react";

import {
  comparisonSum,
  displayLocation,
  price,
  usd,
  type TravelCountryRecord,
} from "@/hooks/use-travel-countries";

import styles from "./destination-discovery.module.css";

type Category =
  | "Trips & towns"
  | "All housing"
  | "Events"
  | "Tours"
  | "Heritage"
  | "Concerts"
  | "Conventions";

type MoneyValue = {
  label: string;
  value: number;
  unit?: string;
};

type DiscoveryCard = {
  id: string;
  type: Category;
  record: TravelCountryRecord;
  title: string;
  subtitle: string;
  description: string;
  prices: MoneyValue[];
  image: string;
  sourceField: string;
};

const CATEGORIES: Category[] = [
  "Trips & towns",
  "All housing",
  "Events",
  "Tours",
  "Heritage",
  "Concerts",
  "Conventions",
];

// These photographs are illustrative.
// The CSV has no images of actual venues.

const PHOTO_IDS: Record<
  Category,
  string[]
> = {
  "Trips & towns": [
    "photo-1539037116277-4db20889f2d4",
    "photo-1502602898657-3e91760cbb34",
    "photo-1533105079780-92b9be482077",
    "photo-1517935706615-2717063c2225",
    "photo-1493976040374-85c8e12f0c0e",
    "photo-1512470876302-972faa2aa9a4",
  ],
  "All housing": [
    "photo-1566073771259-6a8506099945",
    "photo-1522708323590-d24dbb6b0267",
    "photo-1582719508461-905c673771fd",
    "photo-1564501049412-61c2a3083791",
    "photo-1571896349842-33c89424de2d",
    "photo-1564013799919-ab600027ffc6",
  ],
  Events: [
    "photo-1459749411175-04bf5292ceea",
    "photo-1492684223066-81342ee5ff30",
    "photo-1506157786151-b8491531f063",
    "photo-1531058020387-3be344556be6",
    "photo-1540575467063-178a50c2df87",
    "photo-1470229722913-7c0e2dbbafd3",
  ],
  Tours: [
    "photo-1464822759023-fed622ff2c3b",
    "photo-1500534623283-312aade485b7",
    "photo-1500534314209-a25ddb2bd429",
    "photo-1528181304800-259b08848526",
    "photo-1519681393784-d120267933ba",
    "photo-1493246507139-91e8fad9978e",
  ],
  Heritage: [
    "photo-1531058020387-3be344556be6",
    "photo-1561214115-f2f134cc4912",
    "photo-1577083552431-6e5fd01aa342",
    "photo-1533158326339-7f3cf2404354",
    "photo-1487958449943-2429e8be8625",
    "photo-1554907984-15263bfd63bd",
  ],
  Concerts: [
    "photo-1459749411175-04bf5292ceea",
    "photo-1470229722913-7c0e2dbbafd3",
    "photo-1501386761578-eac5c94b800a",
    "photo-1493225457124-a3eb161ffa5f",
    "photo-1506157786151-b8491531f063",
    "photo-1501612780327-45045538702b",
  ],
  Conventions: [
    "photo-1540575467063-178a50c2df87",
    "photo-1505373877841-8d25f7d46678",
    "photo-1497366811353-6870744d04b2",
    "photo-1556761175-b413da4baf72",
    "photo-1517245386807-bb43f82c33c4",
    "photo-1511795409834-ef04bbd61622",
  ],
};

function illustration(
  category: Category,
  index: number
) {
  const images =
    PHOTO_IDS[category];

  const id =
    images[
      index % images.length
    ];

  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=760&q=76`;
}

function displayName(
  name: string,
  city: string
) {
  return name
    .replace(
      /\s*\(illustrative[^)]*\)\s*$/i,
      ""
    )
    .replace(
      new RegExp(
        `^${city.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        )}\\s*[—–-]\\s*`,
        "i"
      ),
      ""
    )
    .trim();
}

// Read numbered records dynamically.
// New event_N, heritage_N, or concert_N
// fields can be discovered automatically.

function indexedEntries(
  record: TravelCountryRecord,
  prefix:
    | "event"
    | "heritage"
    | "concert"
    | "convention"
    | "conference"
    | "expo"
) {
  return Object.keys(record)
    .map(key =>
      new RegExp(
        `^${prefix}_(\\d+)_name$`
      ).exec(key)
    )
    .filter(
      (
        match
      ): match is RegExpExecArray =>
        match !== null
    )
    .map(
      match =>
        Number(match[1])
    )
    .sort(
      (left, right) =>
        left - right
    )
    .flatMap(index => {
      const base =
        `${prefix}_${index}`;

      const name =
        record[
          `${base}_name`
        ]?.trim();

      const minimum = price(
        record,
        `${base}_price_min_usd`
      );

      const maximum = price(
        record,
        `${base}_price_max_usd`
      );

      if (
        !name ||
        (minimum === null &&
          maximum === null)
      ) {
        return [];
      }

      return [
        {
          base,
          name,
          minimum,
          maximum,
        },
      ];
    });
}

function rangePrices(
  minimum: number | null,
  maximum: number | null
): MoneyValue[] {
  return [
    ...(minimum === null
      ? []
      : [
          {
            label:
              "Minimum estimate",
            value: minimum,
          },
        ]),
    ...(maximum === null
      ? []
      : [
          {
            label:
              "Maximum estimate",
            value: maximum,
          },
        ]),
  ];
}

function priceLabel(
  prices: MoneyValue[]
) {
  if (!prices.length) {
    return "Price unavailable";
  }

  const minimum =
    prices.find(item =>
      item.label.includes(
        "Minimum"
      )
    );

  const maximum =
    prices.find(item =>
      item.label.includes(
        "Maximum"
      )
    );

  if (
    minimum &&
    maximum
  ) {
    return `${usd(
      minimum.value
    )}–${usd(
      maximum.value
    )}`;
  }

  return `${usd(
    prices[0].value
  )}${
    prices[0].unit
      ? ` ${prices[0].unit}`
      : ""
  }`;
}

function makeCard(
  record: TravelCountryRecord,
  type: Category,
  sourceField: string,
  title: string,
  subtitle: string,
  description: string,
  prices: MoneyValue[],
  index: number
): DiscoveryCard {
  return {
    id: `${record.destination_id}:${type}:${sourceField}`,
    record,
    type,
    sourceField,
    title,
    subtitle,
    description,
    prices,
    image: illustration(
      type,
      index
    ),
  };
}

// Build category cards directly
// from the selected CSV record.

function buildCards(
  category: Category,
  selected: TravelCountryRecord,
  allRecords: TravelCountryRecord[]
): DiscoveryCard[] {
  const sameCountry =
    allRecords
      .filter(
        row =>
          row.country ===
            selected.country &&
          row.destination_id !==
            selected.destination_id
      )
      .sort(
        (a, b) =>
          comparisonSum(b) -
          comparisonSum(a)
      );

  if (
    category ===
    "Trips & towns"
  ) {
    return [
      selected,
      ...sameCountry,
    ]
      .slice(0, 6)
      .map((row, index) => {
        const origin = [
          row.origin_city,
          row.origin_state,
          row.origin_country,
        ]
          .filter(Boolean)
          .join(", ");

        return makeCard(
          row,
          category,
          "round_trip_transport_usd",
          row.city_town,
          `${row.state_region} · ${row.country}`,
          `${origin || "Origin not supplied"} → ${displayLocation(
            row
          )}`,
          [
            ...(price(
              row,
              "round_trip_transport_usd"
            ) === null
              ? []
              : [
                  {
                    label:
                      "Return transport",
                    value: price(
                      row,
                      "round_trip_transport_usd"
                    )!,
                  },
                ]),
            ...(price(
              row,
              "hotel_nightly_usd"
            ) === null
              ? []
              : [
                  {
                    label:
                      "Hotel/night",
                    value: price(
                      row,
                      "hotel_nightly_usd"
                    )!,
                  },
                ]),
            ...(price(
              row,
              "apartment_nightly_usd"
            ) === null
              ? []
              : [
                  {
                    label:
                      "Apartment/night",
                    value: price(
                      row,
                      "apartment_nightly_usd"
                    )!,
                  },
                ]),
            ...(price(
              row,
              "airbnb_nightly_usd"
            ) === null
              ? []
              : [
                  {
                    label:
                      "Airbnb/night",
                    value: price(
                      row,
                      "airbnb_nightly_usd"
                    )!,
                  },
                ]),
          ],
          index
        );
      });
  }

  if (
    category ===
    "All housing"
  ) {
    // Detect additional nightly housing
    // columns if the CSV is expanded.

    const housing =
      Object.keys(selected)
        .filter(
          key =>
            /_nightly_usd$/.test(
              key
            ) &&
            price(
              selected,
              key
            ) !== null
        )
        .map(key => ({
          key,
          name: key
            .replace(
              /_nightly_usd$/,
              ""
            )
            .replace(
              /_/g,
              " "
            )
            .replace(
              /\b\w/g,
              character =>
                character.toUpperCase()
            ),
        }));

    return [
      selected,
      ...sameCountry.slice(
        0,
        1
      ),
    ]
      .flatMap(row =>
        housing.map(item => ({
          row,
          item,
        }))
      )
      .flatMap(
        (
          {
            row,
            item,
          },
          index
        ) => {
          const amount = price(
            row,
            item.key
          );

          return amount === null
            ? []
            : [
                makeCard(
                  row,
                  category,
                  item.key,
                  `${item.name} · ${row.city_town}`,
                  `${row.state_region} · ${row.country}`,
                  `${item.name} nightly estimate for ${displayLocation(
                    row
                  )}`,
                  [
                    {
                      label: `${item.name}/night`,
                      value: amount,
                      unit: "/ night",
                    },
                  ],
                  index
                ),
              ];
        }
      )
      .slice(0, 6);
  }

  if (category === "Tours") {
    const guides = [
      {
        key: "tour_guide_half_day_usd",
        label:
          "Half-day local guide",
      },
      {
        key: "tour_guide_full_day_usd",
        label:
          "Full-day local guide",
      },
    ];

    const dedicated =
      guides.flatMap(
        (
          {
            key,
            label,
          },
          index
        ) => {
          const amount = price(
            selected,
            key
          );

          return amount === null
            ? []
            : [
                makeCard(
                  selected,
                  category,
                  key,
                  label,
                  displayLocation(
                    selected
                  ),
                  "Guide price estimate from the selected destination record",
                  [
                    {
                      label:
                        "Guide session",
                      value: amount,
                      unit:
                        "/ session",
                    },
                  ],
                  index
                ),
              ];
        }
      );

    const otherTours =
      indexedEntries(
        selected,
        "event"
      )
        .filter(
          entry =>
            /tour|guided|walk|sightsee|hiking|excursion|trail/i.test(
              entry.name
            )
        )
        .map(
          (
            entry,
            index
          ) =>
            makeCard(
              selected,
              category,
              entry.base,
              displayName(
                entry.name,
                selected.city_town
              ),
              displayLocation(
                selected
              ),
              entry.name,
              rangePrices(
                entry.minimum,
                entry.maximum
              ),
              dedicated.length +
                index
            )
        );

    return [
      ...dedicated,
      ...otherTours,
    ].slice(0, 6);
  }

  if (
    category ===
    "Conventions"
  ) {
    const dedicated = [
      ...indexedEntries(
        selected,
        "convention"
      ),
      ...indexedEntries(
        selected,
        "conference"
      ),
      ...indexedEntries(
        selected,
        "expo"
      ),
    ];

    const exhibits = [
      ...indexedEntries(
        selected,
        "event"
      ),
      ...indexedEntries(
        selected,
        "heritage"
      ),
    ].filter(
      entry =>
        /convention|conference|congress|summit|expo|exhibition|trade\s*show/i.test(
          entry.name
        )
    );

    const matches = [
      ...dedicated,
      ...exhibits,
    ];

    return matches
      .slice(0, 6)
      .map(
        (
          entry,
          index
        ) =>
          makeCard(
            selected,
            category,
            entry.base,
            displayName(
              entry.name,
              selected.city_town
            ),
            displayLocation(
              selected
            ),
            entry.name,
            rangePrices(
              entry.minimum,
              entry.maximum
            ),
            index
          )
      );
  }

  const prefix =
    category === "Events"
      ? "event"
      : category ===
        "Heritage"
      ? "heritage"
      : "concert";

  return indexedEntries(
    selected,
    prefix
  )
    .slice(0, 6)
    .map(
      (
        entry,
        index
      ) =>
        makeCard(
          selected,
          category,
          entry.base,
          displayName(
            entry.name,
            selected.city_town
          ),
          displayLocation(
            selected
          ),
          entry.name,
          rangePrices(
            entry.minimum,
            entry.maximum
          ),
          index
        )
    );
}

// Shared image cover

function CardCover({
  card,
}: {
  card: DiscoveryCard;
}) {
  return (
    <div
      className={styles.cover}
      role="img"
      aria-label={`Illustrative ${card.type.toLowerCase()} photograph; not a verified photo of ${card.title}`}
      style={{
        backgroundImage: `linear-gradient(180deg,transparent 50%,rgba(0,0,0,.22)),url("${card.image}")`,
      }}
    >
      <span
        className={styles.coverTag}
      >
        {card.type}
      </span>

      <span
        className={styles.coverNote}
      >
        Illustrative image
      </span>
    </div>
  );
}

// Reusable details dialog

function DetailModal({
  card,
  onClose,
  onSelectDestination,
}: {
  card: DiscoveryCard;
  onClose: () => void;
  onSelectDestination: (
    record: TravelCountryRecord
  ) => void;
}) {
  const closeButton =
    useRef<HTMLButtonElement>(
      null
    );

  useEffect(() => {
    closeButton.current?.focus();

    const closeOnEscape = (
      event: KeyboardEvent
    ) => {
      if (
        event.key ===
        "Escape"
      ) {
        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      closeOnEscape
    );

    return () =>
      window.removeEventListener(
        "keydown",
        closeOnEscape
      );
  }, [onClose]);

  return (
    <div
      className={
        styles.modalBackdrop
      }
      onMouseDown={event => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={`${card.title} details`}
      >
        <button
          ref={closeButton}
          type="button"
          className={
            styles.closeModal
          }
          aria-label="Close detail"
          onClick={onClose}
        >
          <X size={20} />
        </button>

        <CardCover card={card} />

        <div
          className={
            styles.modalContent
          }
        >
          <p
            className={styles.eyebrow}
          >
            Source record{" "}
            {
              card.record.destination_id
            }{" "}
            · {card.type}
          </p>

          <h3>{card.title}</h3>

          <p
            className={
              styles.modalLocation
            }
          >
            <MapPin size={15} />
            {displayLocation(
              card.record
            )}
          </p>

          <p
            className={
              styles.modalDescription
            }
          >
            {card.description}
          </p>

          {card.type ===
            "Trips & towns" && (
            <div
              className={
                styles.routeDetail
              }
            >
              <div>
                <span>From</span>

                <strong>
                  {[
                    card.record
                      .origin_city,
                    card.record
                      .origin_state,
                    card.record
                      .origin_country,
                  ]
                    .filter(Boolean)
                    .join(", ") ||
                    "Not provided"}
                </strong>
              </div>

              <ArrowRight
                size={18}
              />

              <div>
                <span>To</span>

                <strong>
                  {displayLocation(
                    card.record
                  )}
                </strong>
              </div>
            </div>
          )}

          <div
            className={
              styles.priceDetails
            }
          >
            {card.prices.map(
              item => (
                <div
                  key={`${card.id}:${item.label}`}
                >
                  <span>
                    {item.label}
                  </span>

                  <strong>
                    {usd(item.value)}
                    {item.unit
                      ? ` ${item.unit}`
                      : ""}
                  </strong>
                </div>
              )
            )}
          </div>

          <p
            className={
              styles.modalCaution
            }
          >
            Source:
            travel_countries.csv.
            These are simulated
            estimates, not
            confirmed tickets,
            venues, hotel
            listings or
            photographs.
            Minimum and maximum
            prices are alternatives
            within a range,
            not additive charges.
          </p>

          <button
            type="button"
            className={
              styles.primaryAction
            }
            onClick={() => {
              onSelectDestination(
                card.record
              );

              onClose();
            }}
          >
            Open{" "}
            {card.record.city_town}{" "}
            accommodation details

            <ArrowUpRight
              size={16}
            />
          </button>
        </div>
      </section>
    </div>
  );
}

// Route summary

function RouteSummary({
  record,
}: {
  record: TravelCountryRecord;
}) {
  const from = [
    record.origin_city,
    record.origin_state,
    record.origin_country,
  ]
    .filter(Boolean)
    .join(", ") ||
    "Origin not available";

  return (
    <div
      className={
        styles.routeSummary
      }
    >
      <div
        className={styles.routePlace}
      >
        <span
          className={styles.eyebrow}
        >
          YOUR DEPARTURE
        </span>

        <strong>
          {record.origin_city ||
            "Origin"}
        </strong>

        <small>
          {[
            record.origin_state,
            record.origin_country,
          ]
            .filter(Boolean)
            .join(" · ")}
        </small>
      </div>

      <div
        className={
          styles.routeLine
        }
        aria-label={`From ${from} to ${displayLocation(
          record
        )}`}
      >
        <span />

        <ArrowRight
          size={20}
        />
      </div>

      <div
        className={styles.routePlace}
      >
        <span
          className={styles.eyebrow}
        >
          YOUR DESTINATION
        </span>

        <strong>
          {record.city_town}
        </strong>

        <small>
          {record.state_region} ·{" "}
          {record.country}
        </small>
      </div>

      <div
        className={styles.routePrice}
      >
        <span>
          Estimated return transport
        </span>

        <strong>
          {price(
            record,
            "round_trip_transport_usd"
          ) === null
            ? "Unavailable"
            : usd(
                price(
                  record,
                  "round_trip_transport_usd"
                )!
              )}
        </strong>
      </div>
    </div>
  );
}

// Main exported component

export function DestinationDiscovery({
  selected,
  allRecords,
  onSelectDestination,
}: {
  selected: TravelCountryRecord;
  allRecords:
    TravelCountryRecord[];
  onSelectDestination: (
    record: TravelCountryRecord
  ) => void;
}) {
  const [
    category,
    setCategory,
  ] = useState<Category>(
    "Trips & towns"
  );

  const [
    details,
    setDetails,
  ] = useState<
    DiscoveryCard | null
  >(null);

  const cards = useMemo(
    () =>
      buildCards(
        category,
        selected,
        allRecords
      ),
    [
      category,
      selected,
      allRecords,
    ]
  );

  const related = useMemo(
    () =>
      allRecords
        .filter(
          record =>
            record.country ===
              selected.country &&
            record.destination_id !==
              selected.destination_id
        )
        .sort(
          (a, b) =>
            comparisonSum(b) -
            comparisonSum(a)
        )
        .slice(0, 8),
    [
      selected,
      allRecords,
    ]
  );

  return (
    <div
      className={styles.discover}
    >
      <section
        className={
          styles.discoveryPanel
        }
        aria-labelledby="travel-discovery-title"
      >
        <div
          className={
            styles.sectionHeading
          }
        >
          <div>
            <span
              className={
                styles.eyebrow
              }
            >
              EXPLORE YOUR SELECTED
              TRIP
            </span>

            <h2 id="travel-discovery-title">
              Around{" "}
              {selected.city_town}
            </h2>

            <p>
              Explore
              origin-to-destination
              routes, stays, local
              experiences and
              heritage, all tied
              to the selected CSV
              destination.
            </p>
          </div>

          <span
            className={
              styles.recordTag
            }
          >
            Destination #
            {
              selected.destination_id
            }
          </span>
        </div>

        <RouteSummary
          record={selected}
        />

        <div
          className={styles.tabs}
          role="group"
          aria-label="Choose discovery category"
        >
          {CATEGORIES.map(
            item => (
              <button
                key={item}
                type="button"
                aria-pressed={
                  category === item
                }
                className={
                  category === item
                    ? styles.tabActive
                    : ""
                }
                onClick={() =>
                  setCategory(item)
                }
              >
                {item}
              </button>
            )
          )}
        </div>

        <div
          className={
            styles.categoryHeading
          }
        >
          <div>
            <h3>
              {category}
            </h3>

            <p>
              {category ===
              "Conventions"
                ? "Matching exhibition and convention-related descriptions only; no confirmed conventions are implied."
                : "Select a card to inspect the original CSV description and prices."}
            </p>
          </div>

          <span>
            {cards.length} of
            6 max
          </span>
        </div>

        {cards.length ? (
          <div
            className={
              styles.cardGrid
            }
            key={`${selected.destination_id}:${category}`}
          >
            {cards.map(
              (
                card,
                index
              ) => (
                <button
                  type="button"
                  key={card.id}
                  className={
                    styles.discoveryCard
                  }
                  style={{
                    animationDelay: `${
                      index * 65
                    }ms`,
                  }}
                  onClick={() =>
                    setDetails(card)
                  }
                  aria-label={`See ${card.title} details`}
                >
                  <CardCover
                    card={card}
                  />

                  <div
                    className={
                      styles.cardBody
                    }
                  >
                    <div
                      className={
                        styles.cardHeading
                      }
                    >
                      <strong>
                        {card.title}
                      </strong>

                      <ArrowUpRight
                        size={16}
                      />
                    </div>

                    <small>
                      <MapPin
                        size={12}
                      />

                      {card.subtitle}
                    </small>

                    <div
                      className={
                        styles.cardFooter
                      }
                    >
                      <span>
                        {card.type ===
                        "All housing"
                          ? "Estimated nightly price"
                          : card.type ===
                            "Trips & towns"
                          ? "Return transport estimate"
                          : "Estimated price"}
                      </span>

                      <b>
                        {priceLabel(
                          card.type ===
                            "Trips & towns"
                            ? card.prices.filter(
                                item =>
                                  item.label ===
                                  "Return transport"
                              )
                            : card.prices
                        )}
                      </b>
                    </div>
                  </div>
                </button>
              )
            )}
          </div>
        ) : (
          <div
            className={
              styles.emptyCategory
            }
          >
            <CalendarDays
              size={23}
            />

            <strong>
              No matching{" "}
              {category.toLowerCase()}{" "}
              records
            </strong>

            <span>
              The CSV does not
              provide a named,
              priced item for
              this category and
              town. Nothing has
              been invented.
            </span>
          </div>
        )}

        <p
          className={
            styles.disclaimer
          }
        >
          Illustrative images only;
          these do not depict
          verified properties,
          events, or venues.
          Names and simulated
          price values come from
          travel_countries.csv.
          The selections refresh
          when the CSV is reloaded.
        </p>
      </section>

      <section
        className={
          styles.relatedPanel
        }
        aria-labelledby="other-destination-title"
      >
        <div
          className={
            styles.sectionHeading
          }
        >
          <div>
            <span
              className={
                styles.eyebrow
              }
            >
              MORE FROM THE
              OVERVIEW LIST
            </span>

            <h2 id="other-destination-title">
              Other destinations
              to compare
            </h2>

            <p>
              Top eight other{" "}
              {selected.country}{" "}
              towns ranked by
              the same descending
              comparison sum
              used on Destination
              Overview.
            </p>
          </div>

          <span
            className={
              styles.recordTag
            }
          >
            {related.length}{" "}
            recommendations
          </span>
        </div>

        <div
          className={
            styles.relatedGrid
          }
        >
          {related.map(
            (
              record,
              index
            ) => (
              <button
                key={
                  record.destination_id
                }
                type="button"
                className={
                  styles.relatedCard
                }
                onClick={() =>
                  onSelectDestination(
                    record
                  )
                }
                aria-label={`Open ${displayLocation(
                  record
                )} accommodation details`}
              >
                <span
                  className={
                    styles.relatedImage
                  }
                  role="img"
                  aria-label="Illustrative travel destination photograph"
                  style={{
                    backgroundImage: `url("${illustration(
                      "Trips & towns",
                      index
                    )}")`,
                  }}
                />

                <span
                  className={
                    styles.relatedCopy
                  }
                >
                  <strong>
                    {
                      record.city_town
                    }
                  </strong>

                  <small>
                    {
                      record.state_region
                    }{" "}
                    ·{" "}
                    {record.country}
                  </small>

                  <span>
                    Hotel{" "}
                    <b>
                      {price(
                        record,
                        "hotel_nightly_usd"
                      ) === null
                        ? "—"
                        : usd(
                            price(
                              record,
                              "hotel_nightly_usd"
                            )!
                          )}
                    </b>
                    /night
                  </span>
                </span>

                <span
                  className={
                    styles.relatedRight
                  }
                >
                  <b>
                    {usd(
                      comparisonSum(
                        record
                      )
                    )}
                  </b>

                  <small>
                    comparison sum
                  </small>

                  <ChevronRight
                    size={16}
                  />
                </span>
              </button>
            )
          )}
        </div>

        <p
          className={
            styles.disclaimer
          }
        >
          A higher comparison sum
          is not necessarily a
          better trip. These
          suggestions follow the
          Page 9 sorting convention
          and are not quality
          ratings or bookable offers.
        </p>
      </section>

      {details && (
        <DetailModal
          card={details}
          onClose={() =>
            setDetails(null)
          }
          onSelectDestination={
            onSelectDestination
          }
        />
      )}
    </div>
  );
}
