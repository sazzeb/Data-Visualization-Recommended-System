"""Complete budget, filter, and proximity recommendation algorithm."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Callable

from .geo import haversine_km
from .models import (
    RecommendationItem,
    RecommendationItinerary,
    RecommendationResponse,
    SourceRecord,
    TravelPlan,
)
from .normalize import first_value
from .store import TravelDataStore

Progress = Callable[[int, str], None]


class RecommendationEngine:
    """Generate top-ten complete itineraries from an indexed data store."""

    def __init__(self, store: TravelDataStore):
        self.store = store

    def recommend(
        self,
        plan: TravelPlan,
        progress: Progress | None = None,
    ) -> RecommendationResponse:
        report = progress or (lambda _percent, _message: None)
        report(2, "Starting indexed recommendation search")
        all_records = self.store.query()
        report(15, f"Loaded {len(all_records):,} indexed records")

        destinations = {
            country.lower() for country in plan.countries
        }
        scoped = [
            record for record in all_records
            if not destinations or self._country_matches(record, destinations)
        ]
        accommodations = [
            record for record in scoped
            if record.record_type == "place"
            and self._accommodation_matches(record, plan)
        ]
        if not accommodations:
            accommodations = [
                record for record in scoped
                if record.latitude is not None
                and record.longitude is not None
            ]
        report(30, f"Found {len(accommodations):,} accommodations")

        activities = [
            record for record in scoped
            if record.latitude is not None
            and record.longitude is not None
            and record.record_type != "transport"
            and record not in accommodations
            and self._filter_match(record, plan)
        ]
        if not activities:
            activities = [
                record for record in scoped
                if record.latitude is not None
                and record.longitude is not None
                and record.record_type != "transport"
                and record not in accommodations
            ]
        routes = [
            record for record in all_records
            if record.record_type == "transport"
        ]
        report(45, f"Matched {len(activities):,} nearby candidates")

        selected_children = [
            (category, option)
            for category, options in plan.recommendation_filters.items()
            for option in options
        ]
        itineraries: list[RecommendationItinerary] = []
        for index, accommodation in enumerate(
            self._balanced(accommodations, 60), start=1
        ):
            child_groups: dict[str, list[tuple[float, SourceRecord]]] = {}
            for category, option in selected_children:
                matches = sorted(
                    (
                        (
                            haversine_km(
                                (
                                    accommodation.latitude,
                                    accommodation.longitude,
                                ),
                                (activity.latitude, activity.longitude),
                            ),
                            activity,
                        )
                        for activity in activities
                        if option.lower() in activity.search_text
                    ),
                    key=lambda item: item[0],
                )[:15]
                if matches:
                    child_groups[f"{category}: {option}"] = matches

            nearby = sorted(
                (
                    (distance, activity)
                    for matches in child_groups.values()
                    for distance, activity in matches
                ),
                key=lambda item: item[0],
            )
            if len(nearby) < 2:
                continue

            transport = self._route_for(accommodation, routes)
            accommodation_item = self._item(
                accommodation,
                0.0,
                {"matched": [], "categories": []},
            )
            child_items = {
                key: [
                    self._item(
                        activity,
                        distance,
                        {"matched": [option],
                         "categories": [category]},
                    )
                    for distance, activity in matches
                    for category, option in [key.split(": ", 1)]
                ]
                for key, matches in child_groups.items()
            }
            activity_items = [
                item
                for group in child_items.values()
                for item in group
            ][:2]
            nights = plan.nights
            travelers = plan.travelers
            accommodation_cost = (
                self._price(accommodation, 150)
                * nights
                * travelers
            )
            activity_cost = sum(
                self._item_price(activity, 50)
                for activity in activity_items
            ) * travelers
            transport_cost = (
                self._price(
                    transport,
                    800,
                    (
                        "recommended_standard_total_round_trip_transport_usd",
                        "budget_total_round_trip_transport_usd",
                    ),
                )
                * travelers
                if transport
                else 800 * travelers
            )
            total = accommodation_cost + activity_cost + transport_cost
            fit = self._budget_fit(plan.budget, total)
            itineraries.append(
                RecommendationItinerary(
                    rank=0,
                    budget_fit_percentage=fit,
                    total_cost=round(total, 2),
                    budget=plan.budget,
                    remaining_budget=round(plan.budget - total, 2),
                    nights=nights,
                    travelers=travelers,
                    accommodation_cost=round(accommodation_cost, 2),
                    activity_cost=round(activity_cost, 2),
                    transport_cost=round(transport_cost, 2),
                        distance_km=round(
                            max(nearby[0][0], nearby[1][0]),
                            2,
                        ),
                        accommodation=accommodation_item,
                        activities=activity_items,
                        child_recommendations=child_items,
                    transport=(
                        self._item(transport, 0.0,
                                   {"matched": [], "categories": []})
                        if transport else None
                    ),
                )
            )
            if index % 5 == 0:
                report(
                    45 + int(index / max(1, len(accommodations)) * 45),
                    "Calculating complete trip costs",
                )

        itineraries.sort(
            key=lambda item: (
                -item.budget_fit_percentage,
                item.distance_km,
            )
        )
        top10 = [
            RecommendationItinerary(
                **{
                    **item.__dict__,
                    "rank": index,
                }
            )
            for index, item in enumerate(itineraries[:10], start=1)
        ]
        report(100, "Recommendations ready")
        return RecommendationResponse(
            generated_at=datetime.now(timezone.utc).isoformat(),
            criteria={
                "countries": plan.countries,
                "accommodation_choices": plan.accommodation_choices,
                "filters": plan.recommendation_filters,
                "origin": {
                    "country": plan.origin_country,
                    "city": plan.origin_city,
                    "state": plan.origin_state,
                },
            },
            top10=top10,
            first_recommendation=top10[0] if top10 else None,
            data_sources=self.store.all_sources(),
            total_candidates=len(itineraries),
        )

    @staticmethod
    def _balanced(records: list[SourceRecord], limit: int):
        counts: dict[str, int] = {}
        selected: list[SourceRecord] = []
        for record in records:
            key = record.country or record.source
            if counts.get(key, 0) >= 5:
                continue
            counts[key] = counts.get(key, 0) + 1
            selected.append(record)
            if len(selected) >= limit:
                break
        return selected

    @staticmethod
    def _country_matches(
        record: SourceRecord,
        countries: set[str],
    ) -> bool:
        value = record.country.lower()
        source_name = record.source.rsplit("/", 1)[-1].lower()
        return any(
            value == wanted
            or wanted in value
            or value in wanted
            or wanted in source_name
            for wanted in countries
        )

    @staticmethod
    def _accommodation_matches(
        record: SourceRecord,
        plan: TravelPlan,
    ) -> bool:
        if not plan.accommodation_choices:
            return True
        text = record.search_text
        return any(
            choice.lower().replace(" or condo", "") in text
            for choice in plan.accommodation_choices
        )

    @staticmethod
    def _filter_match_details(
        record: SourceRecord,
        plan: TravelPlan,
    ) -> tuple[list[str], list[str]]:
        matched: list[str] = []
        categories: list[str] = []
        for category, options in plan.recommendation_filters.items():
            values = [
                option for option in options
                if option.lower() in record.search_text
            ]
            if values:
                categories.append(category)
                matched.extend(values)
        return matched, categories

    @classmethod
    def _filter_match(
        cls,
        record: SourceRecord,
        plan: TravelPlan,
    ) -> bool:
        selected = [
            option
            for options in plan.recommendation_filters.values()
            for option in options
        ]
        if not selected:
            return True
        matched, _categories = cls._filter_match_details(record, plan)
        return bool(matched)

    @staticmethod
    def _route_for(
        accommodation: SourceRecord,
        routes: list[SourceRecord],
    ) -> SourceRecord | None:
        country = accommodation.country.lower()
        city = accommodation.city.lower()
        source_name = accommodation.source.rsplit("/", 1)[-1].lower()
        matching = [
            route for route in routes
            if (
                (destination := first_value(
                    route.row, ("destination_country",)
                ).lower())
                and (
                    destination == country
                    or destination in country
                    or country in destination
                    or destination in source_name
                )
            )
        ]
        city_matching = [
            route for route in matching
            if first_value(
                route.row, ("destination_city",)
            ).lower() == city
        ]
        candidates = city_matching or matching or routes
        from_us = [
            route for route in candidates
            if first_value(
                route.row, ("origin_country",)
            ).lower() == "united states"
        ]
        return (from_us or candidates or [None])[0]

    @staticmethod
    def _price(
        record: SourceRecord | None,
        fallback: float,
        keys: tuple[str, ...] = (
            "price_midpoint",
            "price_recommendation",
            "price_min",
            "price_max",
        ),
    ) -> float:
        if record is None:
            return fallback
        for key in keys:
            try:
                value = float(record.row.get(key, ""))
            except (TypeError, ValueError):
                continue
            if value >= 0:
                return value
        return fallback

    @staticmethod
    def _item_price(
        item: RecommendationItem,
        fallback: float,
    ) -> float:
        for key in (
            "price_midpoint",
            "price_recommendation",
            "price_min",
            "price_max",
        ):
            try:
                value = float(item.source_row.get(key, ""))
            except (TypeError, ValueError):
                continue
            if value >= 0:
                return value
        return fallback

    @staticmethod
    def _budget_fit(budget: float, total: float) -> float:
        if budget <= 0:
            return 0.0
        return round(
            max(0.0, min(100.0, 100 - abs(budget - total) / budget * 100)),
            2,
        )

    @staticmethod
    def _item(
        record: SourceRecord,
        distance: float,
        matches: dict[str, list[str]],
    ) -> RecommendationItem:
        identifier = next(
            (
                record.row.get(key)
                for key in (
                    "destination_id",
                    "fsq_place_id",
                    "event_id",
                    "unesco_site_id",
                    "route_id",
                )
                if record.row.get(key)
            ),
            f"{record.source}:{record.row_number}",
        )
        return RecommendationItem(
            id=identifier,
            source=record.source,
            name=record.name,
            record_type=record.record_type,
            country=record.country,
            state=record.state,
            city=record.city,
            latitude=record.latitude or 0.0,
            longitude=record.longitude or 0.0,
            distance_km=round(distance, 2),
            matched_filters=matches["matched"],
            matched_filter_categories=matches["categories"],
            source_row=record.row,
        )
