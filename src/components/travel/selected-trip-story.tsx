"use client";

import { ArrowRight, CalendarDays, Clock3, MapPin, Plane, Route, Users } from "lucide-react";
import type { RecommendationItem, RecommendationItinerary, TravelPlan } from "@/types/travel";
import styles from "./selected-trip-story.module.css";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function location(item: RecommendationItem) {
  return [item.city, item.state, item.country].filter(Boolean).join(", ");
}

function sourceDetails(item: RecommendationItem) {
  return Object.entries(item.sourceRow ?? {}).filter(([key, value]) =>
    value?.trim() && !/^(id|fsq_place_id|latitude|longitude|lat|lon|lng)$/i.test(key)
  );
}

function category(item: RecommendationItem) {
  const text = `${item.type} ${item.metadata?.fsq_category_labels ?? ""} ${item.matchedFilters.join(" ")}`;
  if (/shop|boutique|clothing|jewel|gift|electronic/i.test(text)) return "Shopping";
  if (/concert|orchestra|music|festival/i.test(text)) return "Concert & music";
  if (/museum|heritage|historic|gallery|church|theater/i.test(text)) return "Heritage & culture";
  if (/event|venue|competition|convention/i.test(text)) return "Event";
  if (/tour|cruise|spa|amusement/i.test(text)) return "Experience";
  return item.type || "Activity";
}

function ItemDetails({ item }: { item: RecommendationItem }) {
  const details = sourceDetails(item);
  return (
    <details className={styles.sourceDetails}>
      <summary>View full source details</summary>
      {details.length ? (
        <dl>
          {details.map(([key, value]) => (
            <div key={key}>
              <dt>{key.replaceAll("_", " ")}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      ) : <p>No additional source fields are available.</p>}
    </details>
  );
}

function Place({ item, price, timing }: {
  item: RecommendationItem;
  price: number | null;
  timing?: string;
}) {
  return (
    <article className={styles.place}>
      <span className={styles.placeIcon}><MapPin size={16} /></span>
      <div className={styles.placeBody}>
        <div className={styles.placeTop}>
          <div>
            <span className={styles.kind}>{category(item)}</span>
            <h4>{item.name}</h4>
          </div>
          <strong>{price === null ? "Price unavailable" : usd.format(price)}</strong>
        </div>
        <p>{location(item)}{timing ? ` · ${timing}` : ""}</p>
        <div className={styles.chips}>
          {item.matchedFilters.map(filter => <span key={filter}>{filter}</span>)}
          <span>{item.distanceKm.toFixed(1)} km from stay</span>
          <span>{item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}</span>
        </div>
        <ItemDetails item={item} />
      </div>
    </article>
  );
}

export function SelectedTripStory({ trip, plan }: {
  trip: RecommendationItinerary;
  plan: TravelPlan;
}) {
  const stay = trip.accommodation;
  const travelers = plan.adults + plan.children;
  const interests = [...new Set(Object.values(plan.recommendationFilters).flat())];
  const transport = trip.transport;
  const routeRow = transport?.sourceRow ?? {};
  const origin = [routeRow.origin_city, routeRow.origin_state, routeRow.origin_country]
    .filter(Boolean).join(", ") || "Dallas, Texas";
  const destination = location(stay);
  const nightly = trip.nights > 0 ? trip.accommodationCost / trip.nights : trip.accommodationCost;

  return (
    <section className={styles.story} aria-labelledby="selected-trip-title">
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>EXPLORE YOUR SELECTED TRIP · RECOMMENDATION #{trip.rank}</span>
          <h2 id="selected-trip-title">{stay.name}</h2>
          <p><MapPin size={16} /> {destination}</p>
          <div className={styles.heroChips}>
            <span><CalendarDays size={15} /> {plan.checkIn || trip.days[0]?.date} – {plan.checkOut || trip.days.at(-1)?.date}</span>
            <span><Users size={15} /> {travelers} {travelers === 1 ? "traveler" : "travelers"}</span>
            <span>{trip.nights} nights</span>
            <span>{usd.format(plan.budget)} selected budget</span>
          </div>
        </div>
        <div className={styles.heroPrice}>
          <small>Estimated trip total</small>
          <strong>{usd.format(trip.totalCost)}</strong>
          <span>{usd.format(trip.remainingBudget)} remaining against budget</span>
        </div>
      </header>

      <div className={styles.selectionStrip}>
        <div><strong>Your selected countries</strong><p>{plan.countries.join(" · ") || stay.country}</p></div>
        <div><strong>Stay preferences</strong><p>{plan.accommodationChoices.join(" · ") || "Accommodation selected"}</p></div>
        <div><strong>Interests used</strong><p>{interests.join(" · ") || plan.interests.join(" · ") || "Nearby experiences"}</p></div>
      </div>

      <div className={styles.stayCard}>
        <div>
          <span className={styles.eyebrow}>YOUR HOME BASE</span>
          <h3>{stay.name}</h3>
          <p>{destination}</p>
          <div className={styles.chips}>
            <span>{stay.type}</span>
            <span>{stay.latitude.toFixed(5)}, {stay.longitude.toFixed(5)}</span>
            <span>{trip.nights} nights</span>
          </div>
          <ItemDetails item={stay} />
        </div>
        <div className={styles.stayPrice}><small>Estimated nightly rate</small><strong>{usd.format(nightly)}</strong><span>{usd.format(trip.accommodationCost)} for the stay</span></div>
      </div>

      <div className={styles.daysHeading}>
        <div><span className={styles.eyebrow}>YOUR DAYS, IN ORDER</span><h3>Events, places & experiences</h3></div>
        <span>{trip.days.length} daily plans · {trip.days.reduce((sum, day) => sum + day.activities.length, 0)} visits</span>
      </div>
      <div className={styles.days}>
        {trip.days.map((day, dayIndex) => (
          <details className={styles.day} key={`${day.date}-${dayIndex}`} open={dayIndex === 0}>
            <summary>
              <span className={styles.dayNumber}>{String(dayIndex + 1).padStart(2, "0")}</span>
              <span><strong>Day {dayIndex + 1}</strong><small>{day.date} · {day.activities.length} planned visits</small></span>
              <b>{usd.format(nightly + day.activityCost + day.foodCost + day.localTransportCost)}</b>
            </summary>
            <div className={styles.dayContent}>
              {day.activities.map((activity, index) => {
                const slot = day.schedule.find(schedule => schedule.activityId === activity.id);
                const timing = slot ? `${slot.startTime}–${slot.endTime}${slot.timing === "estimated" ? " (estimated)" : ""}` : undefined;
                return <Place key={`${activity.id}-${index}`} item={activity} price={day.activityCosts[index] ?? null} timing={timing} />;
              })}
              {day.foodVenue && <Place item={day.foodVenue} price={day.foodCost} />}
              {!day.foodVenue && <p className={styles.foodNote}>Food allowance estimate: {usd.format(day.foodCost)}. No restaurant was matched for this day.</p>}
              <div className={styles.dayTotals}>
                <span>Stay {usd.format(nightly)}</span><span>Activities {usd.format(day.activityCost)}</span>
                <span>Food {usd.format(day.foodCost)}{day.foodPriceEstimated ? " (estimated)" : ""}</span>
                <span>Local travel {usd.format(day.localTransportCost)}</span>
              </div>
            </div>
          </details>
        ))}
      </div>

      <div className={styles.flowHeading}><span className={styles.eyebrow}>THE COMPLETE JOURNEY</span><h3>From departure to the last local stop</h3></div>
      <div className={styles.flowGrid}>
        <article className={styles.flowCard}>
          <div className={styles.flowTitle}><Plane size={20} /><div><span>01 · ROUND TRIP</span><h4>There and back</h4></div><strong>{usd.format(trip.transportCost)}</strong></div>
          <div className={styles.routeLine}><span>{origin}</span><ArrowRight size={18} /><span>{destination}</span><ArrowRight size={18} /><span>{origin}</span></div>
          <p>{transport?.name || "Round-trip transport estimate"}{trip.roundTripTravelHours !== null ? ` · ${trip.roundTripTravelHours.toFixed(1)} estimated travel hours` : ""}</p>
          {transport && <ItemDetails item={transport} />}
        </article>
        <article className={styles.flowCard}>
          <div className={styles.flowTitle}><Route size={20} /><div><span>02 · LOCAL TRIPS</span><h4>Daily loops from your stay</h4></div><strong>{usd.format(trip.localTransportCost)}</strong></div>
          <div className={styles.localFlows}>
            {trip.days.map((day, index) => (
              <div key={`${day.date}-${index}`}>
                <b>Day {index + 1}</b>
                <span>{[stay.name, ...day.activities.map(item => item.name), ...(day.foodVenue ? [day.foodVenue.name] : []), stay.name].join(" → ")}</span>
                <small><Clock3 size={13} /> {day.travelHours.toFixed(1)} h · {day.travelKm.toFixed(1)} km · {usd.format(day.localTransportCost)}</small>
              </div>
            ))}
          </div>
          <p>Local transport is estimated from the planned route; no carrier or booked fare is implied.</p>
        </article>
      </div>
    </section>
  );
}
