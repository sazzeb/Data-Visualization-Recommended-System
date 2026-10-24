"use client";

import { MapPin } from "lucide-react";
import { DetailedStackedPrices } from "@/components/charts/detail-stacked-chart";
import { SelectedTripStory } from "@/components/travel/selected-trip-story";
import type { TravelCountryRecord } from "@/hooks/use-travel-countries";
import type { RecommendationItinerary, RecommendationResponse, TravelPlan } from "@/types/travel";

type Props = {
  plan: TravelPlan;
  recommendations: RecommendationResponse | null;
  onSelectDestination: (row: TravelCountryRecord) => void;
};

function recommendationRecord(trip: RecommendationItinerary): TravelCountryRecord {
  const stay = trip.accommodation;
  return {
    destination_id: stay.id,
    origin_country: "",
    origin_state: "",
    origin_city: "",
    city_town: stay.city,
    state_region: stay.state,
    country: stay.country,
    pricing_type: "recommendation",
    latitude: String(stay.latitude),
    longitude: String(stay.longitude),
  };
}

export function AccommodationDetail({ plan, recommendations, onSelectDestination }: Props) {
  const trips = recommendations?.top10 ?? [];
  const selectedTrip = plan.selectedDestinationId
    ? trips.find(trip => trip.accommodation.id === plan.selectedDestinationId)
    : trips[0];
  const stay = selectedTrip?.accommodation;

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div className="step-heading">
          <h1>Accommodation Insights{stay ? ` — ${stay.city}` : ""}</h1>
          <p>Explore the selected accommodation and its complete daily itinerary.</p>
        </div>
        <p className="sample-note">All displayed prices are estimates, not confirmed offers.</p>
      </div>

      {selectedTrip && recommendations ? (
        <>
          <section className="content-panel">
            <div className="panel-title">
              <h2>Selected destination</h2>
              <span className="section-tag">
                <MapPin size={12} aria-hidden="true" /> {stay?.name}, {stay?.city}, {stay?.country}
              </span>
            </div>
            <label className="field-label" htmlFor="destination-detail-picker">
              Choose a recommended accommodation
              <select
                id="destination-detail-picker"
                className="input-bordered"
                value={selectedTrip.accommodation.id}
                onChange={event => {
                  const trip = trips.find(item => item.accommodation.id === event.target.value);
                  if (trip) onSelectDestination(recommendationRecord(trip));
                }}
              >
                {trips.map(trip => (
                  <option key={trip.rank} value={trip.accommodation.id}>
                    {trip.accommodation.name}, {trip.accommodation.city}, {trip.accommodation.country}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <DetailedStackedPrices
            key={selectedTrip.accommodation.id}
            accommodationId={selectedTrip.accommodation.id}
            recommendations={recommendations}
          />
          <SelectedTripStory
            key={`trip-${selectedTrip.accommodation.id}`}
            trip={selectedTrip}
            plan={plan}
          />
        </>
      ) : (
        <p className="empty-state">
          {trips.length
            ? "The selected accommodation is no longer in these recommendations. Choose a destination from the map."
            : "No recommendation is available. Return to Explore Destinations to create one."}
        </p>
      )}
    </div>
  );
}
