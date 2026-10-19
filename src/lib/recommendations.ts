import fs from "node:fs/promises";
import path from "node:path";

import Papa from "papaparse";

import type {
  RecommendationItem,
  RecommendationItinerary,
  RecommendationResponse,
  TravelPlan,
} from "@/types/travel";

type CsvRow = Record<string, string>;

type UploadedCsv = {
  name: string;
  content: string;
};

type Point = {
  latitude: number;
  longitude: number;
};

type FilterMatches = ReturnType<typeof filterMatches>;

type ScoredCandidate = {
  candidate: {
    source: string;
    row: CsvRow;
    matches: FilterMatches;
  };
  point: Point;
  matches: FilterMatches;
  distance: number;
};

type ProgressReporter = (
  percent: number,
  message: string,
  details?: {
    completed: number;
    total: number;
  }
) => void;

const DATASET_DIRECTORY = path.join(
  process.cwd(),
  "public",
  "datasets",
  "csv_file"
);

const EARTH_RADIUS_KM = 6371;

const RETAINED_COLUMNS = new Set([
  "destination_id",
  "fsq_place_id",
  "event_id",
  "unesco_site_id",
  "route_id",
  "name",
  "site_name",
  "name_en",
  "event_name",
  "venue_name",
  "destination_city",
  "city_town",
  "country",
  "destination_country",
  "venue_country",
  "origin_country",
  "state_region",
  "region",
  "venue_region",
  "destination_state_region",
  "locality",
  "venue_city",
  "latitude",
  "longitude",
  "property_representative_latitude",
  "property_representative_longitude",
  "destination_latitude",
  "destination_longitude",
  "origin_latitude",
  "origin_longitude",
  "fsq_category_labels",
  "price_min",
  "price_max",
  "price_midpoint",
  "price_recommendation",
  "price_currency",
  "price_basis",
  "event_status",
  "segment",
  "genre",
  "subgenre",
  "classification_type",
  "classification_subtype",
  "is_festival",
  "event_year",
  "traveler_count",
  "origin_city",
  "origin_country",
  "destination_city",
  "destination_country",
  "recommended_standard_total_round_trip_transport_usd",
  "budget_total_round_trip_transport_usd",
  "standard_economy_round_trip_airfare_usd",
  "round_trip_distance_km",
]);

let cachedRows:
  | Promise<{ name: string; rows: CsvRow[] }[]>
  | undefined;

function parseCsv(
  name: string,
  content: string
): { name: string; rows: CsvRow[] } {
  const parsed = Papa.parse<CsvRow>(
    content.replace(/^\uFEFF/, ""),
    {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: header => header.trim(),
      transform: value => value.trim(),
    }
  );

  if (parsed.errors.length > 0) {
    throw new Error(
      `Unable to parse ${name}: ${parsed.errors[0].message}`
    );
  }

  return {
    name,
    rows: parsed.data
      .filter(row =>
        Object.values(row).some(Boolean)
      )
      .map(row => {
        const compact = Object.fromEntries(
          Object.entries(row).filter(
            ([key]) => RETAINED_COLUMNS.has(key)
          )
        );

        compact.__searchText =
          Object.values(row).join(" ").toLowerCase();

        return compact;
      }),
  };
}

async function loadBundledCsvs() {
  if (!cachedRows) {
    cachedRows = fs
      .readdir(DATASET_DIRECTORY)
      .then(names =>
        names
          .filter(name =>
            name.toLowerCase().endsWith(".csv")
          )
          .sort()
      )
      .then(async names =>
        Promise.all(
          names.map(async name =>
            parseCsv(
              name,
              await fs.readFile(
                path.join(DATASET_DIRECTORY, name),
                "utf8"
              )
            )
          )
        )
      );
  }

  return cachedRows;
}

function numberValue(
  row: CsvRow,
  keys: string[]
): number | null {
  for (const key of keys) {
    const value = Number(row[key]);

    if (Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function textValue(
  row: CsvRow,
  keys: string[]
): string {
  for (const key of keys) {
    if (row[key]?.trim()) {
      return row[key].trim();
    }
  }

  return "";
}

function coordinates(
  row: CsvRow
): Point | null {
  const latitude = numberValue(row, [
    "latitude",
    "property_representative_latitude",
    "destination_latitude",
    "origin_latitude",
  ]);
  const longitude = numberValue(row, [
    "longitude",
    "property_representative_longitude",
    "destination_longitude",
    "origin_longitude",
  ]);

  if (
    latitude === null ||
    longitude === null ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return { latitude, longitude };
}

function distanceKm(
  first: Point,
  second: Point
) {
  const latitudeDelta =
    ((second.latitude - first.latitude) *
      Math.PI) /
    180;
  const longitudeDelta =
    ((second.longitude - first.longitude) *
      Math.PI) /
    180;
  const latitudeOne =
    (first.latitude * Math.PI) / 180;
  const latitudeTwo =
    (second.latitude * Math.PI) / 180;
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeOne) *
      Math.cos(latitudeTwo) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    EARTH_RADIUS_KM *
    2 *
    Math.atan2(
      Math.sqrt(value),
      Math.sqrt(1 - value)
    )
  );
}

function searchableText(row: CsvRow) {
  return row.__searchText ?? Object.values(row)
    .join(" ")
    .toLowerCase();
}

function countryMatches(
  row: CsvRow,
  countries: string[],
  source = ""
) {
  if (!countries.length) {
    return true;
  }

  const wanted = countries.map(country =>
    country.toLowerCase()
  );
  const values = [
    row.country,
    row.destination_country,
    row.venue_country,
    row.origin_country,
    source.replace(/\.csv$/i, ""),
  ]
    .filter(Boolean)
    .map(value => value.toLowerCase());

  return values.some(value =>
    wanted.some(
      country =>
        value === country ||
        value.includes(country) ||
        country.includes(value)
    )
  );
}

function accommodationMatch(
  row: CsvRow,
  choices: string[]
) {
  if (!choices.length) {
    return true;
  }

  const text = searchableText(row);

  return choices.some(choice => {
    const normalized = choice
      .toLowerCase()
      .replace(" or condo", "")
      .replace(" and breakfast", "");

    return text.includes(normalized);
  });
}

function filterMatches(
  row: CsvRow,
  filters: Record<string, string[]>
) {
  const text = searchableText(row);
  const matchedFilters: string[] = [];
  const matchedFilterCategories: string[] = [];

  for (const [category, options] of Object.entries(
    filters
  )) {
    const matched = options.filter(option =>
      text.includes(option.toLowerCase())
    );

    if (matched.length > 0) {
      matchedFilterCategories.push(category);
      matchedFilters.push(...matched);
    }
  }

  return {
    matchedFilters,
    matchedFilterCategories,
  };
}

function rowName(
  row: CsvRow,
  source: string
) {
  return textValue(row, [
    "name",
    "site_name",
    "name_en",
    "event_name",
    "venue_name",
    "destination_city",
    "city_town",
  ]) || source.replace(/\.csv$/i, "");
}

function rowType(
  row: CsvRow,
  source: string
) {
  if (source.includes("ticketmaster")) {
    return "event";
  }

  if (source.includes("UNESCO")) {
    return "heritage";
  }

  if (source.includes("Estimated_")) {
    return "transportation";
  }

  return row.fsq_category_labels
    ? "place"
    : "destination";
}

function metadata(
  row: CsvRow
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(row).filter(
      ([key, value]) =>
        key !== "__searchText" && Boolean(value)
    ).slice(0, 12)
  );
}

function toItem(
  source: string,
  row: CsvRow,
  anchor: { name: string; point: Point },
  matchedFilters: string[],
  matchedFilterCategories: string[]
): RecommendationItem | null {
  const point = coordinates(row);

  if (!point) {
    return null;
  }

  return {
    id:
      textValue(row, [
        "destination_id",
        "fsq_place_id",
        "event_id",
        "unesco_site_id",
        "route_id",
      ]) ||
      `${source}:${rowName(row, source)}:${point.latitude}`,
    source,
    type: rowType(row, source),
    name: rowName(row, source),
    country: textValue(row, [
      "country",
      "destination_country",
      "venue_country",
    ]),
    state: textValue(row, [
      "state_region",
      "region",
      "venue_region",
      "destination_state_region",
    ]),
    city: textValue(row, [
      "city_town",
      "locality",
      "venue_city",
      "destination_city",
    ]),
    latitude: point.latitude,
    longitude: point.longitude,
    distanceKm: Number(
      distanceKm(anchor.point, point).toFixed(2)
    ),
    matchedFilters,
    matchedFilterCategories,
    accommodationReference: anchor.name,
    metadata: metadata(row),
    sourceRow: { ...row },
  };
}

function rowIdentity(row: CsvRow) {
  return textValue(row, [
    "destination_id",
    "fsq_place_id",
    "event_id",
    "unesco_site_id",
    "route_id",
  ]);
}

async function hydrateSourceRows(
  items: RecommendationItem[],
  uploads: UploadedCsv[]
) {
  const needed = new Map<string, Set<string>>();

  for (const item of items) {
    const ids = needed.get(item.source) ?? new Set();
    ids.add(item.id);
    needed.set(item.source, ids);
  }

  const fullRows = new Map<
    string,
    Map<string, CsvRow>
  >();

  for (const [source, ids] of needed) {
    const upload = uploads.find(
      file => file.name === source
    );
    const content = upload
      ? upload.content
      : await fs.readFile(
          path.join(DATASET_DIRECTORY, source),
          "utf8"
        );
    const parsed = Papa.parse<CsvRow>(
      content.replace(/^\uFEFF/, ""),
      {
        header: true,
        skipEmptyLines: "greedy",
        transformHeader: header => header.trim(),
        transform: value => value.trim(),
      }
    );
    const rows = new Map<string, CsvRow>();

    for (const row of parsed.data) {
      const id = rowIdentity(row);
      if (id && ids.has(id)) {
        rows.set(id, row);
      }
    }

    fullRows.set(source, rows);
  }

  return items.map(item => ({
    ...item,
    sourceRow:
      fullRows.get(item.source)?.get(item.id) ??
      item.sourceRow,
  }));
}

function anchorKey(point: Point) {
  return `${Math.floor(point.latitude)}:${Math.floor(
    point.longitude
  )}`;
}

function nearestAnchor(
  point: Point,
  anchors: {
    name: string;
    point: Point;
  }[],
  index: Map<
    string,
    {
      name: string;
      point: Point;
    }[]
  >
) {
  const latitude = Math.floor(point.latitude);
  const longitude = Math.floor(point.longitude);
  let best:
    | {
        name: string;
        point: Point;
        distance: number;
      }
    | undefined;

  for (let radius = 0; radius <= 3; radius += 1) {
    for (
      let lat = latitude - radius;
      lat <= latitude + radius;
      lat += 1
    ) {
      for (
        let lon = longitude - radius;
        lon <= longitude + radius;
        lon += 1
      ) {
        for (const candidate of index.get(
          `${lat}:${lon}`
        ) ?? []) {
          const distance = distanceKm(
            candidate.point,
            point
          );

          if (!best || distance < best.distance) {
            best = { ...candidate, distance };
          }
        }
      }
    }

    if (
      best &&
      best.distance < (radius + 1) * 111
    ) {
      return best;
    }
  }

  if (best) {
    return best;
  }

  return anchors.reduce(
    (closest, candidate) => {
      const distance = distanceKm(
        candidate.point,
        point
      );

      return !closest || distance < closest.distance
        ? { ...candidate, distance }
        : closest;
    },
    undefined as
      | {
          name: string;
          point: Point;
          distance: number;
        }
      | undefined
  );
}

function isAccommodationRow(
  row: CsvRow,
  choices: string[]
) {
  return Boolean(
    row.fsq_category_labels &&
      accommodationMatch(row, choices)
  );
}

function rowPrice(row: CsvRow, fallback: number) {
  const values = [
    numberValue(row, ["price_midpoint"]),
    numberValue(row, ["price_recommendation"]),
    numberValue(row, ["price_min"]),
    numberValue(row, ["price_max"]),
  ].filter(
    (value): value is number =>
      value !== null && value >= 0
  );

  return values[0] ?? fallback;
}

function nightsFor(plan: TravelPlan) {
  if (!plan.checkIn || !plan.checkOut) {
    return 1;
  }

  const start = new Date(plan.checkIn).getTime();
  const end = new Date(plan.checkOut).getTime();
  const nights = Math.ceil(
    (end - start) / (1000 * 60 * 60 * 24)
  );

  return Number.isFinite(nights) && nights > 0
    ? nights
    : 1;
}

function travelersFor(plan: TravelPlan) {
  if (plan.budgetMode === "group-person") {
    return Math.max(
      1,
      plan.travelerNames.length ||
        plan.adults + plan.children
    );
  }

  return Math.max(
    1,
    plan.adults + plan.children
  );
}

function routeFor(
  rows: { source: string; row: CsvRow }[],
  accommodation: CsvRow,
  countries: string[]
) {
  const city = textValue(accommodation, [
    "city_town",
    "locality",
    "venue_city",
  ]).toLowerCase();
  const country = textValue(accommodation, [
    "country",
    "destination_country",
    "venue_country",
  ]).toLowerCase();

  const routes = rows
    .filter(({ source }) =>
      source.includes("Estimated_Round_Trip")
    )
    .filter(({ row }) => {
      const destinationCity = textValue(row, [
        "destination_city",
      ]).toLowerCase();
      const destinationCountry = textValue(row, [
        "destination_country",
      ]).toLowerCase();

      return (
        destinationCountry === country ||
        countries.some(
          selected =>
            destinationCountry ===
            selected.toLowerCase()
        )
      ) && (
        !city ||
        destinationCity === city
      );
    });
  const usableRoutes = routes.length
    ? routes
    : rows.filter(({ source }) =>
        source.includes("Estimated_Round_Trip")
      );
  const cityRoutes = usableRoutes.filter(({ row }) =>
    textValue(row, ["destination_city"]).toLowerCase() ===
    city
  );
  const countryRoutes = usableRoutes.filter(({ row }) =>
    textValue(row, ["destination_country"]).toLowerCase() ===
      country ||
    countries.some(
      selected =>
        textValue(row, [
          "destination_country",
        ]).toLowerCase() === selected.toLowerCase()
    )
  );

  return (cityRoutes.length > 0
    ? cityRoutes
    : countryRoutes.length > 0
    ? countryRoutes
    : usableRoutes
  )
    .sort((first, second) => {
      const firstIsUs =
        first.row.origin_country ===
        "United States";
      const secondIsUs =
        second.row.origin_country ===
        "United States";

      return (
        Number(secondIsUs) - Number(firstIsUs) ||
        Number(
          first.row
            .recommended_standard_total_round_trip_transport_usd
        ) -
        Number(
          second.row
            .recommended_standard_total_round_trip_transport_usd
        )
      );
    })[0] ?? null;
}

function itineraryItem(
  source: string,
  row: CsvRow,
  anchor: { name: string; point: Point },
  matches: {
    matchedFilters: string[];
    matchedFilterCategories: string[];
  }
) {
  return toItem(
    source,
    row,
    anchor,
    matches.matchedFilters,
    matches.matchedFilterCategories
  );
}

async function buildRecommendations(
  datasets: { name: string; rows: CsvRow[] }[],
  plan: TravelPlan,
  report: ProgressReporter = () => {},
  uploads: UploadedCsv[] = []
): Promise<RecommendationResponse> {
  const countries = plan.countries ?? [];
  const filters = plan.recommendationFilters ?? {};
  const choices = plan.accommodationChoices ?? [];
  const selectedFilters = Object.values(filters)
    .flat()
    .filter(Boolean);
  const budget = Math.max(0, plan.budget ?? 0);
  const nights = nightsFor(plan);
  const travelers = travelersFor(plan);
  const allRows = datasets.flatMap(dataset =>
    dataset.rows.map(row => ({
      source: dataset.name,
      row,
    }))
  );
  report(10, "Loaded all CSV records");
  const accommodations = allRows
    .filter(({ source, row }) =>
      countryMatches(row, countries, source)
    )
    .filter(({ row }) =>
      isAccommodationRow(row, choices)
    )
    .map(({ source, row }) => {
      const point = coordinates(row);

      return point
        ? {
            source,
            row,
            point,
            name: rowName(row, source),
          }
        : null;
    })
    .filter(
      (
        anchor
      ): anchor is {
        source: string;
        row: CsvRow;
        point: Point;
        name: string;
      } => anchor !== null
    );
  const accommodationRows = accommodations.length
    ? accommodations
    : allRows.filter(({ source, row }) =>
        countryMatches(row, countries, source)
      );
  const balancedAccommodations = (() => {
    const perCountry = new Map<string, number>();
    const selected = [];

    for (const accommodation of accommodationRows) {
      const country = textValue(accommodation.row, [
        "country",
        "destination_country",
      ]) || accommodation.source;
      const count = perCountry.get(country) ?? 0;

      if (count >= 5) {
        continue;
      }

      perCountry.set(country, count + 1);
      selected.push(accommodation);

      if (selected.length >= 60) {
        break;
      }
    }

    return selected;
  })();
  const candidates = allRows
    .filter(
      ({ source, row }) =>
        countryMatches(row, countries, source) &&
        coordinates(row) &&
        !(
          choices.length > 0 &&
          isAccommodationRow(row, choices)
        )
    )
    .map(candidate => ({
      ...candidate,
      matches: filterMatches(candidate.row, filters),
    }))
    .filter(
      candidate =>
        selectedFilters.length === 0 ||
        candidate.matches.matchedFilters.length > 0
    );
  report(
    25,
    `Found ${balancedAccommodations.length} accommodation and ${candidates.length} matching activity candidates`
  );
  const itineraries: RecommendationItinerary[] = [];
  const accommodationLimit = Math.min(
    60,
    balancedAccommodations.length
  );
  for (
    let index = 0;
    index < accommodationLimit;
    index += 1
  ) {
    const accommodation = balancedAccommodations[index];
    const accommodationPoint = coordinates(
      accommodation.row
    );

    if (!accommodationPoint) {
      continue;
    }

    const anchor = {
      name: rowName(
        accommodation.row,
        accommodation.source
      ),
      point: accommodationPoint,
    };
    const scoredCandidates = candidates
      .map(candidate => {
        const point = coordinates(candidate.row);
        return point
          ? {
              candidate,
              point,
              matches: candidate.matches,
              distance: distanceKm(
                accommodationPoint,
                point
              ),
            }
          : null;
      })
      .filter(
        (item): item is ScoredCandidate => item !== null
      );
    const childRecommendations: Record<
      string,
      RecommendationItem[]
    > = {};
    for (const [category, options] of Object.entries(filters)) {
      for (const option of options) {
        const key = `${category}: ${option}`;
        childRecommendations[key] = scoredCandidates
          .filter(item =>
            Object.values(item.candidate.row)
              .join(" ")
              .toLowerCase()
              .includes(option.toLowerCase()) ||
            item.candidate.matches.matchedFilters.some(
              match =>
                match.toLowerCase() === option.toLowerCase()
            )
          )
          .sort((first, second) =>
            first.distance - second.distance
          )
          .slice(0, 15)
          .map(item =>
            itineraryItem(
              item.candidate.source,
              item.candidate.row,
              anchor,
              {
                matchedFilters: [option],
                matchedFilterCategories: [category],
              }
            )
          )
          .filter(
            (item): item is RecommendationItem =>
              item !== null
          );
      }
    }
    if (
      selectedFilters.length > 0 &&
      Object.values(childRecommendations).some(
        group => group.length === 0
      )
    ) {
      continue;
    }
    const nearby = scoredCandidates
      .sort(
        (first, second) =>
          first.distance - second.distance
      )
      .slice(0, 2);
    const activities = nearby
      .map(item =>
        itineraryItem(
          item.candidate.source,
          item.candidate.row,
          anchor,
          item.matches
        )
      )
      .filter(
        (item): item is RecommendationItem =>
          item !== null
      );

    if (activities.length < 2) {
      continue;
    }

    const accommodationCost =
      rowPrice(accommodation.row, 150) *
      nights *
      travelers;
    const activityCost =
      activities.reduce(
        (total, activity) =>
          total +
          rowPrice(
            allRows.find(
              ({ row }) =>
                row.fsq_place_id === activity.id ||
                row.event_id === activity.id
            )?.row ?? {},
            50
          ),
        0
      ) *
      travelers;
    const route = routeFor(
      allRows,
      accommodation.row,
      countries
    );
    const transportCost =
      numberValue(
        route?.row ?? {},
        [
          "recommended_standard_total_round_trip_transport_usd",
          "budget_total_round_trip_transport_usd",
        ]
      ) ??
      800;
    const totalCost =
      accommodationCost +
      activityCost +
      transportCost * travelers;
    const fit =
      budget > 0
        ? Math.max(
            0,
            Math.min(
              100,
              (1 - Math.abs(budget - totalCost) / budget) *
                100
            )
          )
        : 0;
    const accommodationItem = itineraryItem(
      accommodation.source,
      accommodation.row,
      anchor,
      { matchedFilters: [], matchedFilterCategories: [] }
    );

    if (!accommodationItem) {
      continue;
    }

    itineraries.push({
      rank: 0,
      budgetFitPercentage: Number(fit.toFixed(2)),
      totalCost: Number(totalCost.toFixed(2)),
      budget,
      remainingBudget: Number(
        (budget - totalCost).toFixed(2)
      ),
      nights,
      travelers,
      accommodationCost: Number(
        accommodationCost.toFixed(2)
      ),
      activityCost: Number(activityCost.toFixed(2)),
      transportCost: Number(
        (transportCost * travelers).toFixed(2)
      ),
      distanceKm: Number(
        nearby[0]!.distance.toFixed(2)
      ),
      accommodation: accommodationItem,
      activities,
      childRecommendations,
      transport: route
        ? itineraryItem(
            route.source,
            route.row,
            anchor,
            { matchedFilters: [], matchedFilterCategories: [] }
          )
        : null,
    });

    if (
      index % Math.max(1, Math.floor(accommodationLimit / 20)) ===
      0
    ) {
      report(
        30 +
          Math.round(
            (index / Math.max(1, accommodationLimit)) * 60
          ),
        "Calculating complete trip costs",
        {
          completed: index + 1,
          total: accommodationLimit,
        }
      );
    }
  }

  report(95, "Sorting recommendations by budget fit");
  const top10 = itineraries
    .sort(
      (first, second) =>
        second.budgetFitPercentage -
          first.budgetFitPercentage ||
        first.distanceKm - second.distanceKm
    )
    .slice(0, 10)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

  const outputItems = [
    ...top10.flatMap(item => [
      item.accommodation,
      ...item.activities,
      ...Object.values(item.childRecommendations).flat(),
      ...(item.transport ? [item.transport] : []),
    ]),
  ];
  const hydrated = await hydrateSourceRows(
    outputItems,
    uploads
  );
  const hydratedById = new Map(
    hydrated.map(item => [item.id, item])
  );
  const hydratedItineraries = top10.map(item => ({
    ...item,
    accommodation:
      hydratedById.get(item.accommodation.id) ??
      item.accommodation,
    activities: item.activities.map(
      activity =>
        hydratedById.get(activity.id) ?? activity
    ),
    childRecommendations: Object.fromEntries(
      Object.entries(item.childRecommendations).map(
        ([key, children]) => [
          key,
          children.map(
            child =>
              hydratedById.get(child.id) ?? child
          ),
        ]
      )
    ),
    transport: item.transport
      ? hydratedById.get(item.transport.id) ??
        item.transport
      : null,
  }));
  const response: RecommendationResponse = {
    generatedAt: new Date().toISOString(),
    criteria: {
      countries,
      accommodationChoices: choices,
      filters,
    },
    top10: hydratedItineraries,
    firstRecommendation:
      hydratedItineraries[0] ?? null,
    dataSources: datasets.map(
      dataset => dataset.name
    ),
    totalCandidates: itineraries.length,
  };

  report(100, "Recommendations ready");

  return response;
}

export async function createRecommendations(
  plan: TravelPlan,
  uploads: UploadedCsv[] = [],
  report?: ProgressReporter
) {
  const notify = report ?? (() => {});
  notify(2, "Starting recommendation search");
  const bundled = await loadBundledCsvs();
  notify(7, "Reading bundled CSV datasets");
  const uploaded = uploads.map(file =>
    parseCsv(file.name, file.content)
  );

  return buildRecommendations(
    [...bundled, ...uploaded],
    plan,
    notify,
    uploads
  );
}
