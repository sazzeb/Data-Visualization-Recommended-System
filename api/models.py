"""Typed data contracts for the recommendation engine."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(frozen=True)
class TravelPlan:
    countries: list[str] = field(default_factory=list)
    accommodation_choices: list[str] = field(default_factory=list)
    recommendation_filters: dict[str, list[str]] = field(
        default_factory=dict
    )
    budget: float = 0.0
    budget_mode: str = "personal"
    adults: int = 1
    children: int = 0
    traveler_names: list[str] = field(default_factory=list)
    individual_budgets: list[float] = field(default_factory=list)
    check_in: str = ""
    check_out: str = ""
    origin_country: str = "United States"
    origin_city: str = "Dallas"
    origin_state: str = "Texas"

    @classmethod
    def from_dict(cls, value: dict[str, Any]) -> "TravelPlan":
        return cls(
            countries=_strings(value.get("countries")),
            accommodation_choices=_strings(
                value.get("accommodationChoices",
                        value.get("accommodation_choices"))
            ),
            recommendation_filters=_filters(
                value.get("recommendationFilters",
                        value.get("recommendation_filters"))
            ),
            budget=_nonnegative(value.get("budget", 0)),
            budget_mode=str(
                value.get("budgetMode",
                         value.get("budget_mode", "personal"))
            ),
            adults=max(0, _integer(value.get("adults", 1))),
            children=max(0, _integer(value.get("children", 0))),
            traveler_names=_strings(value.get("travelerNames",
                                               value.get("traveler_names"))),
            individual_budgets=[
                _nonnegative(item)
                for item in (
                    value.get("individualBudgets",
                              value.get("individual_budgets")) or []
                )
            ],
            check_in=str(value.get("checkIn",
                                   value.get("check_in", "")) or ""),
            check_out=str(value.get("checkOut",
                                    value.get("check_out", "")) or ""),
            origin_country=str(value.get("originCountry",
                                         value.get("origin_country",
                                                   "United States"))),
            origin_city=str(value.get("originCity",
                                      value.get("origin_city", "Dallas"))),
            origin_state=str(value.get("originState",
                                       value.get("origin_state", "Texas"))),
        )

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @property
    def travelers(self) -> int:
        if self.budget_mode == "group-person":
            return max(
                1,
                len(self.traveler_names)
                or self.adults + self.children,
            )
        return max(1, self.adults + self.children)

    @property
    def nights(self) -> int:
        from datetime import date

        try:
            start = date.fromisoformat(self.check_in)
            end = date.fromisoformat(self.check_out)
        except ValueError:
            return 1
        return max(1, (end - start).days)


@dataclass(frozen=True)
class SourceRecord:
    source: str
    row_number: int
    row: dict[str, str]
    latitude: float | None
    longitude: float | None
    name: str
    country: str
    state: str
    city: str
    record_type: str
    search_text: str


@dataclass(frozen=True)
class RecommendationItem:
    id: str
    source: str
    name: str
    record_type: str
    country: str
    state: str
    city: str
    latitude: float
    longitude: float
    distance_km: float
    matched_filters: list[str]
    matched_filter_categories: list[str]
    source_row: dict[str, str]


@dataclass(frozen=True)
class RecommendationItinerary:
    rank: int
    budget_fit_percentage: float
    total_cost: float
    budget: float
    remaining_budget: float
    nights: int
    travelers: int
    accommodation_cost: float
    activity_cost: float
    transport_cost: float
    distance_km: float
    accommodation: RecommendationItem
    activities: list[RecommendationItem]
    child_recommendations: dict[str, list[RecommendationItem]]
    transport: RecommendationItem | None


@dataclass(frozen=True)
class RecommendationResponse:
    generated_at: str
    criteria: dict[str, Any]
    top10: list[RecommendationItinerary]
    first_recommendation: RecommendationItinerary | None
    data_sources: list[str]
    total_candidates: int

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _strings(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()]


def _filters(value: Any) -> dict[str, list[str]]:
    if not isinstance(value, dict):
        return {}
    return {
        str(key): _strings(options)
        for key, options in value.items()
        if _strings(options)
    }


def _nonnegative(value: Any) -> float:
    try:
        return max(0.0, float(value))
    except (TypeError, ValueError):
        return 0.0


def _integer(value: Any) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0
