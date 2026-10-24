import fs from "node:fs/promises";
import path from "node:path";
import { gunzip } from "node:zlib";
import { promisify } from "node:util";

import Papa from "papaparse";

import { COUNTRY_CARDS } from "@/data/travel-catalog";
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

const gunzipAsync = promisify(gunzip);

async function readDataset(name: string): Promise<string> {
  const baseUrl = process.env.TRAVEL_DATA_BASE_URL?.trim();
  if (!baseUrl) {
    if (process.env.VERCEL) {
      throw new Error("TRAVEL_DATA_BASE_URL is required for deployed recommendations.");
    }
    return fs.readFile(path.join(DATASET_DIRECTORY, name), "utf8");
  }

  const url = `${baseUrl.replace(/\/$/, "")}/${encodeURIComponent(name)}.gz`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to load ${name} from dataset storage (${response.status}).`);
  }
  const compressed = Buffer.from(await response.arrayBuffer());
  return (await gunzipAsync(compressed)).toString("utf8");
}

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
  "destination_country_code",
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
  "start_date_local",
  "end_date_local",
  "start_time_local",
  "end_time_local",
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
  "round_trip_route",
  "primary_transport_mode",
  "origin_airport_name",
  "destination_airport_name",
  "estimated_nonstop_round_trip_airborne_hours",
  "outbound_representative_duration",
  "return_representative_duration",
  "origin_city",
  "origin_state_region",
  "origin_latitude",
  "origin_longitude",
  "hotel_nightly_usd",
  "apartment_nightly_usd",
  "airbnb_nightly_usd",
  "entry_fee",
  "entry_fee_min",
  "entry_fee_max",
  "entry_fee_currency",
  "destination_state_region",
]);

let cachedRows:
  | { key: string; promise: Promise<{ name: string; rows: CsvRow[] }[]> }
  | undefined;
let cachedCityPrices: Promise<CsvRow[]> | undefined;

function loadCityPrices(): Promise<CsvRow[]> {
  cachedCityPrices ??= fs.readFile(path.join(process.cwd(), "public", "datasets", "travel_countries.csv"), "utf8")
    .then(content => Papa.parse<CsvRow>(content.replace(/^\uFEFF/, ""), {
      header: true, skipEmptyLines: "greedy"
    }).data);
  return cachedCityPrices;
}

function parseCsv(
  name: string,
  content: string,
  selectedCountries: string[] = []
): { name: string; rows: CsvRow[] } {
  const rows: CsvRow[] = [];
  let parseError: string | null = null;
  Papa.parse<CsvRow>(
    content.replace(/^\uFEFF/, ""),
    {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: header => header.trim(),
      transform: value => value.trim(),
      step(result) {
        if (result.errors.length && !parseError) {
          parseError = result.errors[0].message;
        }
        const row = result.data;
        if (!Object.values(row).some(Boolean)) return;
        if (selectedCountries.length &&
            !countryMatches(row, selectedCountries, name)) return;
        const compact = Object.fromEntries(
          Object.entries(row).filter(([key]) => RETAINED_COLUMNS.has(key))
        );
        compact.__searchText = Object.values(compact).join(" ").toLowerCase();
        rows.push(compact);
      },
    }
  );

  if (parseError) {
    throw new Error(`Unable to parse ${name}: ${parseError}`);
  }

  return { name, rows };
}

async function loadBundledCsvs(countries: string[], report: ProgressReporter) {
  const selected = COUNTRY_CARDS.filter(card =>
    countries.some(country => country.toLowerCase() === card.name.toLowerCase()));
  const key = selected.map(card => card.datasetFile).sort().join("|");
  if (cachedRows?.key === key) return cachedRows.promise;

  const promise = (async () => {
    const names = [
      ...selected.map(card => card.datasetFile),
      "Estimated_Round_Trip_Travel_Costs_20_Countries_ALL_CITY_ROUTES.csv",
      "ticketmaster_events_20_countries_unified.csv",
      "UNESCO_World_Heritage_20_Countries_ENHANCED.csv",
    ];
    const datasets: { name: string; rows: CsvRow[] }[] = [];
    for (const [index, name] of names.entries()) {
      report(2 + Math.round(index / names.length * 18), `Reading ${name}`,
        { completed: index, total: names.length });
      const content = await readDataset(name);
      const sharedDataset = !selected.some(card => card.datasetFile === name);
      datasets.push(parseCsv(name, content, sharedDataset ? countries : []));
    }
    return datasets;
  })();
  cachedRows = { key, promise };
  try {
    return await promise;
  } catch (error) {
    if (cachedRows?.promise === promise) cachedRows = undefined;
    throw error;
  }
}

function numberValue(
  row: CsvRow,
  keys: string[]
): number | null {
  for (const key of keys) {
    if (!row[key]?.trim()) continue;
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
      : await readDataset(source);
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

function isAccommodationRow(
  row: CsvRow,
  choices: string[]
) {
  return Boolean(
    row.fsq_category_labels &&
      /hotel|apartment|condo|bed and breakfast|hostel|lodging|resort|motel|\binn\b/i.test(row.fsq_category_labels) &&
      accommodationMatch(row, choices)
  );
}

function isRestaurantRow(row: CsvRow) {
  return Boolean(row.fsq_place_id &&
    /restaurant|café|cafe|bistro|diner|food court/i.test(row.fsq_category_labels ?? ""));
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

const DALLAS = { latitude: 32.7767, longitude: -96.7970 };
const NEARBY_KM = 40;
const EXTENDED_KM = 100;

function tripDates(plan: TravelPlan): string[] {
  const count = nightsFor(plan);
  const start = plan.checkIn ? new Date(`${plan.checkIn}T12:00:00Z`) : new Date();
  if (Number.isNaN(start.getTime())) return [new Date().toISOString().slice(0, 10)];
  return Array.from({ length: count }, (_, index) =>
    new Date(start.getTime() + index * 86_400_000).toISOString().slice(0, 10)
  );
}

function availableOn(row: CsvRow, source: string, date: string): boolean {
  if (!source.includes("ticketmaster")) return true;
  const start = row.start_date_local?.slice(0, 10);
  const end = row.end_date_local?.slice(0, 10) || start;
  return Boolean(start && start <= date && date <= end &&
    !/cancelled|postponed/i.test(row.event_status ?? ""));
}

type ActivityCandidate = { source: string; row: CsvRow; distance: number };

function clockMinutes(value: string | undefined): number | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(value ?? "");
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : null;
}

function clockLabel(minutes: number): string {
  const time = `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(Math.floor(minutes % 60)).padStart(2, "0")}`;
  return minutes >= 24 * 60 ? `${time} (+1 day)` : time;
}

function scheduleDay(items: ActivityCandidate[], stay: Point) {
  let best: {
    items: ActivityCandidate[];
    travelKm: number;
    schedule: { activityId: string; startTime: string; endTime: string; timing: "source" | "estimated" }[];
  } | null = null;
  const visit = (order: ActivityCandidate[], remaining: ActivityCandidate[]) => {
    if (remaining.length) {
      for (const item of remaining) {
        visit([...order, item], remaining.filter(candidate => candidate !== item));
      }
      return;
    }
    let current = stay;
    let minute = 0;
    let travelKm = 0;
    const schedule: NonNullable<typeof best>["schedule"] = [];
    for (const item of order) {
      const destination = coordinates(item.row)!;
      const distance = distanceKm(current, destination);
      const arrival = minute + Math.ceil(distance / 30 * 60);
      const eventStart = item.source.includes("ticketmaster")
        ? clockMinutes(item.row.start_time_local) : null;
      const eventEnd = item.source.includes("ticketmaster")
        ? clockMinutes(item.row.end_time_local) : null;
      const start = eventStart ?? Math.max(arrival, 9 * 60);
      const end = eventStart !== null && eventEnd !== null
        ? eventEnd > start ? eventEnd : eventEnd + 24 * 60
        : start + (item.source.includes("ticketmaster") ? 120 : 90);
      if (arrival > start || end > 26 * 60 ||
        (eventStart === null && end > 22 * 60)) return;
      schedule.push({
        activityId: rowIdentity(item.row) || rowName(item.row, item.source),
        startTime: clockLabel(start), endTime: clockLabel(end),
        timing: eventStart !== null ? "source" : "estimated",
      });
      travelKm += distance;
      current = destination;
      minute = end;
    }
    travelKm += distanceKm(current, stay);
    if (minute + Math.ceil(distanceKm(current, stay) / 30 * 60) > 26 * 60) return;
    if (!best || travelKm < best.travelKm) best = { items: order, travelKm, schedule };
  };
  visit([], items);
  return best as { items: ActivityCandidate[]; travelKm: number; schedule: {
    activityId: string; startTime: string; endTime: string; timing: "source" | "estimated"
  }[] } | null;
}

function activityPrice(row: CsvRow): number | null {
  const currency = row.price_currency || row.entry_fee_currency;
  if (currency !== "USD") return null;
  const midpoint = numberValue(row, ["price_midpoint"]);
  const minimum = numberValue(row, ["price_min", "entry_fee_min"]);
  const maximum = numberValue(row, ["price_max", "entry_fee_max"]);
  const value = midpoint ?? (minimum !== null && maximum !== null
    ? (minimum + maximum) / 2 : minimum ?? numberValue(row, ["entry_fee"]));
  return value !== null && value >= 0 ? value : null;
}

function stayPrice(row: CsvRow, choices: string[], cityPrice?: CsvRow): number {
  const keys = choices.some(choice => /apartment|condo/i.test(choice))
    ? ["apartment_nightly_usd", "airbnb_nightly_usd", "hotel_nightly_usd"]
    : ["hotel_nightly_usd", "apartment_nightly_usd", "airbnb_nightly_usd"];
  return numberValue(row, keys) ?? numberValue(cityPrice ?? {}, keys) ?? 150;
}

function bestRoute(
  routes: { source: string; row: CsvRow }[],
  stay: CsvRow,
  point: Point
) {
  const country = textValue(stay, ["country", "destination_country"]).toLowerCase();
  const sameCountry = routes.filter(({ row }) =>
    row.destination_country?.toLowerCase() === country ||
    row.destination_country_code?.toLowerCase() === country
  );
  return sameCountry.sort((a, b) => {
    const origin = (row: CsvRow) =>
      row.origin_city?.toLowerCase() === "dallas" ? 0 :
      row.origin_country === "United States" ? 1 : 2;
    const destinationDistance = (row: CsvRow) => {
      const latitude = Number(row.destination_latitude);
      const longitude = Number(row.destination_longitude);
      return Number.isFinite(latitude) && Number.isFinite(longitude)
        ? distanceKm(point, { latitude, longitude }) : 10_000;
    };
    const originDistance = (row: CsvRow) => {
      const latitude = Number(row.origin_latitude);
      const longitude = Number(row.origin_longitude);
      return Number.isFinite(latitude) && Number.isFinite(longitude)
        ? distanceKm(DALLAS, { latitude, longitude }) : 10_000;
    };
    return origin(a.row) - origin(b.row) ||
      destinationDistance(a.row) - destinationDistance(b.row) ||
      originDistance(a.row) - originDistance(b.row);
  })[0] ?? null;
}

async function buildDailyRecommendations(
  datasets: { name: string; rows: CsvRow[] }[],
  plan: TravelPlan,
  report: ProgressReporter,
  uploads: UploadedCsv[]
): Promise<RecommendationResponse> {
  const countries = plan.countries ?? [];
  const choices = plan.accommodationChoices ?? [];
  const filters = plan.recommendationFilters ?? {};
  const selected = Object.entries(filters).flatMap(([category, options]) =>
    options.map(option => ({ category, option }))
  );
  const dates = tripDates(plan);
  const travelers = travelersFor(plan);
  const budget = Math.max(0, plan.budget ?? 0);
  const rows = datasets.flatMap(dataset => dataset.rows.map(row => ({ source: dataset.name, row })));
  const routes = rows.filter(item => item.source.includes("Estimated_Round_Trip"));
  const cityPrices = await loadCityPrices();
  const places = rows.filter(item =>
    !item.source.includes("Estimated_Round_Trip") &&
    countryMatches(item.row, countries, item.source) && coordinates(item.row)
  );
  const stays = places.filter(item => isAccommodationRow(item.row, choices));
  const foodPlaces = places.filter(item => isRestaurantRow(item.row));
  const activities = places.filter(item =>
    !isAccommodationRow(item.row, []) &&
    !isRestaurantRow(item.row) &&
    (item.source.includes("ticketmaster") || item.source.includes("UNESCO") || Boolean(item.row.fsq_place_id))
  );
  report(25, `Found ${stays.length} stays and ${activities.length} activities`);

  // Spread the search across cities so a large city cannot take every result slot.
  const anchors: typeof stays = [];
  const cityCounts = new Map<string, number>();
  const byCountry = new Map<string, typeof stays>();
  for (const stay of stays) {
    const city = textValue(stay.row, ["locality", "city_town", "venue_city"]).toLowerCase();
    const country = stay.row.country || stay.source;
    const key = `${country}:${city}`;
    if ((cityCounts.get(key) ?? 0) >= 2) continue;
    const group = byCountry.get(country) ?? [];
    if (group.length >= 20) continue;
    cityCounts.set(key, (cityCounts.get(key) ?? 0) + 1);
    group.push(stay);
    byCountry.set(country, group);
  }
  for (let round = 0; round < 20 && anchors.length < 80; round++) {
    for (const group of byCountry.values()) {
      if (group[round]) anchors.push(group[round]);
      if (anchors.length >= 80) break;
    }
  }

  const itineraries: RecommendationItinerary[] = [];
  for (const [index, stay] of anchors.entries()) {
    const point = coordinates(stay.row)!;
    const reference = { name: rowName(stay.row, stay.source), point };
    const stayCountry = stay.source.replace(/^[^_]+_/, "").replace(/\.csv$/, "").replaceAll("_", " ");
    const route = bestRoute(routes, stay.row, point);
    const nearby = activities.flatMap(item => {
      if (!countryMatches(item.row, [stayCountry], item.source)) return [];
      const activityPoint = coordinates(item.row)!;
      if (Math.abs(activityPoint.latitude - point.latitude) > 1 ||
        Math.abs(activityPoint.longitude - point.longitude) > 1.5) return [];
      const distance = distanceKm(point, activityPoint);
      return distance <= EXTENDED_KM ? [{ ...item, distance }] : [];
    }).sort((a, b) => a.distance - b.distance);
    const nearbyRestaurants = foodPlaces.flatMap(item => {
      if (!countryMatches(item.row, [stayCountry], item.source)) return [];
      const restaurantPoint = coordinates(item.row)!;
      if (Math.abs(restaurantPoint.latitude - point.latitude) > 0.2 ||
        Math.abs(restaurantPoint.longitude - point.longitude) > 0.3) return [];
      const distance = distanceKm(point, restaurantPoint);
      return distance <= 20 ? [{ ...item, distance }] : [];
    }).sort((a, b) => a.distance - b.distance).slice(0, 12);
    if (nearby.length < 2) continue;

    const days: RecommendationItinerary["days"] = [];
    const usedEvents = new Set<string>();
    const usedPlaces = new Set<string>();
    const matchedInterests = new Set<string>();
    let unpricedActivityCount = 0;
    for (const [dayIndex, date] of dates.entries()) {
      const valid = nearby.filter(item => availableOn(item.row, item.source, date));
      const chosen: typeof valid = [];
      const pick = (pool: typeof valid, limit = 5) => {
        for (const item of pool) {
          if (chosen.length >= limit) break;
          const id = `${item.source}:${rowIdentity(item.row) || rowName(item.row, item.source)}`;
          if (chosen.some(candidate => candidate === item) || usedEvents.has(id)) continue;
          if (!scheduleDay([...chosen, item], point)) continue;
          chosen.push(item);
          if (item.source.includes("ticketmaster")) usedEvents.add(id);
          else usedPlaces.add(id);
        }
      };
      // Exact selected interests nearby, then broader nearby choices, then other places.
      const rotated = [...selected.slice(dayIndex % Math.max(1, selected.length)),
        ...selected.slice(0, dayIndex % Math.max(1, selected.length))];
      for (const { option } of rotated) {
        if (chosen.length >= 5) break;
        pick(valid.filter(item => item.distance <= NEARBY_KM &&
          searchableText(item.row).includes(option.toLowerCase()) &&
          !usedPlaces.has(`${item.source}:${rowIdentity(item.row) || rowName(item.row, item.source)}`)),
          chosen.length + 1);
      }
      pick(valid.filter(item => item.distance <= NEARBY_KM &&
        !usedPlaces.has(`${item.source}:${rowIdentity(item.row) || rowName(item.row, item.source)}`)));
      if (chosen.length < 2) pick(valid.filter(item => item.distance <= EXTENDED_KM &&
        !usedPlaces.has(`${item.source}:${rowIdentity(item.row) || rowName(item.row, item.source)}`)));
      if (chosen.length < 2) pick(valid.filter(item => item.distance <= NEARBY_KM));
      if (chosen.length < 2) pick(valid);
      if (chosen.length < 2) break;

      const scheduled = scheduleDay(chosen, point);
      if (!scheduled) break;
      const ordered = scheduled.items;
      const dayActivities = ordered.map(item => {
        const matches = filterMatches(item.row, filters);
        for (const option of matches.matchedFilters) matchedInterests.add(option.toLowerCase());
        return itineraryItem(item.source, item.row, reference, matches)!;
      });
      const restaurant = nearbyRestaurants.length
        ? nearbyRestaurants[dayIndex % nearbyRestaurants.length] : null;
      const foodVenue = restaurant
        ? itineraryItem(restaurant.source, restaurant.row, reference,
          { matchedFilters: [], matchedFilterCategories: [] }) : null;
      const restaurantPrice = restaurant ? activityPrice(restaurant.row) : null;
      const foodCost = Number((restaurantPrice ?? 45) * travelers);
      const lastActivityPoint = coordinates(ordered.at(-1)!.row)!;
      const restaurantPoint = restaurant ? coordinates(restaurant.row)! : null;
      const travelKm = restaurantPoint
        ? scheduled.travelKm - distanceKm(lastActivityPoint, point) +
          distanceKm(lastActivityPoint, restaurantPoint) + distanceKm(restaurantPoint, point)
        : scheduled.travelKm;
      unpricedActivityCount += ordered.filter(item => activityPrice(item.row) === null).length;
      const activityCosts = ordered.map(item => {
        const unitPrice = activityPrice(item.row);
        return unitPrice === null ? null : Number((unitPrice * travelers).toFixed(2));
      });
      days.push({
        date,
        activities: dayActivities,
        activityCosts,
        activityCost: Number(activityCosts.reduce<number>(
          (total, cost) => total + (cost ?? 0),
          0
        ).toFixed(2)),
        foodVenue,
        foodCost: Number(foodCost.toFixed(2)),
        foodPriceEstimated: restaurantPrice === null,
        localTransportCost: Number((travelKm * 0.5).toFixed(2)),
        travelKm: Number(travelKm.toFixed(2)),
        travelHours: Number((travelKm / 30).toFixed(2)),
        schedule: scheduled.schedule,
      });
    }
    if (days.length !== dates.length) continue;

    const accommodation = itineraryItem(stay.source, stay.row, reference,
      { matchedFilters: [], matchedFilterCategories: [] })!;
    const cityName = textValue(stay.row, ["locality", "city_town"]).toLowerCase();
    const cityPrice = cityPrices.find(row =>
      row.city_town?.toLowerCase() === cityName &&
      (row.country?.toLowerCase() === stay.row.country?.toLowerCase() ||
        row.country?.toLowerCase() === stay.source.replace(/^[^_]+_/, "").replace(/\.csv$/, "").replaceAll("_", " ").toLowerCase())
    );
    const transport = route ? itineraryItem(route.source, route.row, reference,
      { matchedFilters: [], matchedFilterCategories: [] }) : null;
    const accommodationCost = stayPrice(stay.row, choices, cityPrice) * dates.length;
    const activityCost = days.reduce((total, day) => total + day.activityCost, 0);
    const localTransportCost = days.reduce((total, day) => total + day.localTransportCost, 0);
    const foodCost = days.reduce((total, day) => total + day.foodCost, 0);
    const perPersonRoute = route ? numberValue(route.row,
      ["recommended_standard_total_round_trip_transport_usd", "budget_total_round_trip_transport_usd"]) : null;
    const transportCost = (perPersonRoute ?? 800) * travelers;
    const roundTripTravelHours = route ? numberValue(route.row,
      ["estimated_nonstop_round_trip_airborne_hours"]) : null;
    const localTravelHours = days.reduce((total, day) => total + day.travelHours, 0);
    const totalCost = accommodationCost + activityCost + localTransportCost + foodCost + transportCost;
    const fit = budget > 0 ? Math.max(0, 100 - Math.abs(totalCost - budget) / budget * 100) : 0;
    const coverage = selected.length ? Math.min(1, matchedInterests.size / selected.length) : 1;
    const scheduledActivities = days.flatMap(day => day.activities);
    const priceCompleteness = 1 - unpricedActivityCount / scheduledActivities.length;
    const averageDistance = scheduledActivities.reduce((sum, item) => sum + item.distanceKm, 0)
      / scheduledActivities.length;
    const proximity = Math.max(0, 1 - averageDistance / NEARBY_KM);
    const score = Math.max(0, coverage * 55 + fit * 0.3 +
      priceCompleteness * 10 + proximity * 5 -
      (budget > 0 && totalCost > budget ? 15 : 0));
    const costNotes = [
      "Food uses a restaurant's USD price estimate when available; otherwise $45 per traveler per day. Restaurant opening hours are unverified.",
      "Local transport is a route estimate at $0.50/km, not a booked carrier.",
      "Local travel time assumes 30 km/h and excludes time spent at activities.",
      `${unpricedActivityCount} activity visits have no USD price and are excluded from the quoted total; the actual trip may cost more.`,
      "When only an activity price range is supplied, its midpoint is used as an estimate.",
      "Activity durations are estimated where event times are absent. Place opening hours are not supplied by these datasets.",
    ];
    if (cityPrice) costNotes.push("Nightly lodging uses a simulated city estimate, not a quote for this specific stay.");
    else costNotes.push("Stay has no matched nightly rate; $150 per night was estimated.");
    if (perPersonRoute === null) costNotes.push("No matching route price; $800 per traveler was estimated.");
    itineraries.push({
      rank: 0, score: Number(score.toFixed(2)), budgetFitPercentage: Number(fit.toFixed(2)),
      totalCost: Number(totalCost.toFixed(2)), budget,
      remainingBudget: Number((budget - totalCost).toFixed(2)),
      nights: dates.length, travelers, accommodationCost, activityCost,
      unpricedActivityCount,
      transportCost, foodCost, localTransportCost: Number(localTransportCost.toFixed(2)),
      roundTripTravelHours,
      totalTravelHours: roundTripTravelHours === null ? null :
        Number((roundTripTravelHours + localTravelHours).toFixed(2)),
      costNotes, distanceKm: days[0].activities[0].distanceKm,
      accommodation, activities: days.flatMap(day => day.activities), days,
      childRecommendations: Object.fromEntries(selected.map(({ category, option }) => [
        `${category}: ${option}`,
        days.flatMap(day => day.activities).filter(item =>
          item.matchedFilters.some(match => match.toLowerCase() === option.toLowerCase()))
      ])),
      transport,
    });
    if (index % 5 === 0) report(30 + Math.round(index / anchors.length * 60),
      "Building daily itineraries", { completed: index + 1, total: anchors.length });
  }
  const top10 = itineraries.sort((a, b) => b.score - a.score ||
    b.budgetFitPercentage - a.budgetFitPercentage || a.distanceKm - b.distanceKm)
    .slice(0, 10).map((item, index) => ({ ...item, rank: index + 1 }));
  report(95, "Loading complete source rows");
  const output = [...new Map(top10.flatMap(item => [item.accommodation, ...item.activities,
    ...item.days.flatMap(day => day.foodVenue ? [day.foodVenue] : []),
    ...(item.transport ? [item.transport] : [])]).map(item =>
    [`${item.source}:${item.id}`, item] as const)).values()];
  const hydrated = await hydrateSourceRows(output, uploads);
  const byId = new Map(hydrated.map(item => [`${item.source}:${item.id}`, item]));
  const full = (item: RecommendationItem) => byId.get(`${item.source}:${item.id}`) ?? item;
  const complete = top10.map(item => ({
    ...item, accommodation: full(item.accommodation),
    days: item.days.map(day => ({ ...day, activities: day.activities.map(full),
      foodVenue: day.foodVenue ? full(day.foodVenue) : null })),
    transport: item.transport ? full(item.transport) : null,
  }));
  report(100, "Recommendations ready");
  return {
    generatedAt: new Date().toISOString(),
    criteria: { countries, accommodationChoices: choices, filters },
    top10: complete, firstRecommendation: complete[0] ?? null,
    dataSources: datasets.map(dataset => dataset.name), totalCandidates: itineraries.length,
  };
}

export async function createRecommendations(
  plan: TravelPlan,
  uploads: UploadedCsv[] = [],
  report?: ProgressReporter
) {
  const notify = report ?? (() => {});
  notify(2, "Starting recommendation search");
  const bundled = await loadBundledCsvs(plan.countries ?? [], notify);
  notify(7, "Reading bundled CSV datasets");
  const uploaded = uploads.map(file =>
    parseCsv(file.name, file.content)
  );

  return buildDailyRecommendations(
    [...bundled, ...uploaded],
    plan,
    notify,
    uploads
  );
}
