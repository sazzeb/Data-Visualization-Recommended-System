"use client";

import { ArrowRight, CalendarDays, MapPin, Sparkles } from "lucide-react";
import { DetailedStackedPrices } from "@/components/charts/detail-stacked-chart";
import { DestinationDiscovery } from "@/components/travel/destination-discovery";
import { SelectedTripStory } from "@/components/travel/selected-trip-story";
import {
  displayLocation,
  useTravelCountries,
  type TravelCountryRecord,
} from "@/hooks/use-travel-countries";
import type { RecommendationItinerary, RecommendationResponse, TravelPlan } from "@/types/travel";
import styles from "./accommodation-detail.module.css";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

type Props = {
  plan: TravelPlan;
  recommendations: RecommendationResponse | null;
  onSelectDestination: (row: TravelCountryRecord) => void;
};

function recommendationRecord(
  trip: RecommendationItinerary,
  records: TravelCountryRecord[]
): TravelCountryRecord {
  const stay = trip.accommodation;
  const matchingRecord = records.find(record =>
    record.city_town === stay.city &&
    record.state_region === stay.state &&
    record.country === stay.country
  );

  return {
    ...matchingRecord,
    destination_id: stay.id,
    origin_country: matchingRecord?.origin_country ?? "",
    origin_state: matchingRecord?.origin_state ?? "",
    origin_city: matchingRecord?.origin_city ?? "",
    city_town: stay.city,
    state_region: stay.state,
    country: stay.country,
    pricing_type: matchingRecord?.pricing_type ?? "recommendation",
    latitude: String(stay.latitude),
    longitude: String(stay.longitude),
  } as TravelCountryRecord;
}

export function AccommodationDetail({ plan, recommendations, onSelectDestination }: Props) {
  const { records, loading, error } = useTravelCountries();
  const trips = recommendations?.top10 ?? [];
  const selectedTrip = trips.find(item =>
    item.accommodation.id === plan.selectedDestinationId
  ) ?? trips[0];
  const recommendedDestinations = trips.map(item => recommendationRecord(item, records));
  const destinationOptions = recommendedDestinations.length ? recommendedDestinations : records;
  const selected = destinationOptions.find(record =>
    record.destination_id === (selectedTrip?.accommodation.id ?? plan.selectedDestinationId)
  ) ?? destinationOptions[0] ?? null;

  function label(record: TravelCountryRecord) {
    const trip = trips.find(item => item.accommodation.id === record.destination_id);
    return trip
      ? `${trip.accommodation.name}, ${trip.accommodation.city}, ${trip.accommodation.country}`
      : displayLocation(record);
  }

  function selectRecommendation(trip: RecommendationItinerary) {
    onSelectDestination(recommendationRecord(trip, records));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div className="step-heading">
          <h1>Accommodation Insights{selected ? ` — ${selected.city_town}` : ""}</h1>
          <p>Explore the selected accommodation, its daily itinerary, and the other recommended stays.</p>
        </div>
        <p className="sample-note">All displayed prices are estimates, not confirmed offers.</p>
      </div>

      {loading && <p role="status" className="empty-state">Loading destination data…</p>}
      {error && <p role="alert" className="empty-state">Unable to refresh destination data: {error}</p>}

      {selected ? (
        <>
          <section className="content-panel">
            <div className="panel-title">
              <h2>Selected destination</h2>
              <span className="section-tag"><MapPin size={12} aria-hidden="true" /> {label(selected)}</span>
            </div>
            <label className="field-label" htmlFor="destination-detail-picker">
              Choose a recommended accommodation
              <select
                id="destination-detail-picker"
                className="input-bordered"
                value={selected.destination_id}
                onChange={event => {
                  const destination = destinationOptions.find(record =>
                    record.destination_id === event.target.value
                  );
                  if (destination) onSelectDestination(destination);
                }}
              >
                {destinationOptions.map(record => (
                  <option key={record.destination_id} value={record.destination_id}>
                    {label(record)}
                  </option>
                ))}
              </select>
            </label>
          </section>

          {selectedTrip && recommendations ? (
            <DetailedStackedPrices
              key={selectedTrip.accommodation.id}
              accommodationId={selectedTrip.accommodation.id}
              recommendations={recommendations}
            />
          ) : (
            <section className="content-panel">
              <h2>Detailed stacked price comparison</h2>
              <p className="muted">Generate recommendations in Explore Destinations to see daily estimates here.</p>
            </section>
          )}

          {selectedTrip ? (
            <SelectedTripStory key={selectedTrip.accommodation.id} trip={selectedTrip} plan={plan} />
          ) : (
            <DestinationDiscovery selected={selected} allRecords={records} onSelectDestination={onSelectDestination} />
          )}

          {selectedTrip && trips.length > 1 && (
            <section className={styles.others} aria-labelledby="other-stays-title">
              <div className={styles.heading}>
                <div>
                  <span><Sparkles size={15} /> MORE RECOMMENDED STAYS</span>
                  <h2 id="other-stays-title">Other trips worth exploring</h2>
                  <p>Select a stay to see its full daily itinerary, source details, and travel flows above.</p>
                </div>
                <b>{trips.length - 1} alternatives</b>
              </div>
              <div className={styles.grid}>
                {trips.filter(trip => trip.rank !== selectedTrip.rank).map(trip => {
                  const stay = trip.accommodation;
                  const nightly = trip.nights ? trip.accommodationCost / trip.nights : trip.accommodationCost;
                  const visits = trip.days.reduce((sum, day) => sum + day.activities.length, 0);
                  return (
                    <button
                      key={`${trip.rank}-${stay.id}`}
                      type="button"
                      className={styles.card}
                      onClick={() => selectRecommendation(trip)}
                      aria-label={`View full details for ${stay.name}, ${stay.city}, ${stay.country}`}
                    >
                      <div className={styles.cardTop}>
                        <span className={styles.rank}>#{trip.rank}</span>
                        <span className={styles.fit}>{trip.budgetFitPercentage}% budget fit</span>
                      </div>
                      <h3>{stay.name}</h3>
                      <p className={styles.location}><MapPin size={14} /> {stay.city}, {stay.state}, {stay.country}</p>
                      <div className={styles.stats}>
                        <span><CalendarDays size={14} /> {trip.nights} nights</span>
                        <span>{visits} planned visits</span>
                      </div>
                      <div className={styles.costs}>
                        <div><small>Stay estimate / night</small><strong>{usd.format(nightly)}</strong></div>
                        <div><small>Complete trip estimate</small><strong>{usd.format(trip.totalCost)}</strong></div>
                      </div>
                      <span className={styles.cardAction}>Explore complete trip <ArrowRight size={16} /></span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </>
      ) : !loading && !error ? (
        <p className="empty-state">No destination is available. Return to Explore Destinations to choose a recommendation.</p>
      ) : null}
    </div>
  );
}
