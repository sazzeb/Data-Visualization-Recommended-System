import csv
from pathlib import Path

from python_recommendations.engine import RecommendationEngine
from python_recommendations.models import TravelPlan
from python_recommendations.store import TravelDataStore


def write_csv(path: Path, name: str, rows: list[dict[str, str]]) -> None:
    target = path / name
    with target.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def test_engine_returns_budget_ranked_complete_itineraries(
    tmp_path: Path,
) -> None:
    data = tmp_path / "data"
    data.mkdir()
    write_csv(
        data,
        "ES_Spain.csv",
        [
            {
                "fsq_place_id": "hotel-1",
                "name": "Hotel One",
                "latitude": "40.0",
                "longitude": "-3.0",
                "country": "Spain",
                "locality": "Madrid",
                "fsq_category_labels": "Hotel",
                "price_min": "100",
            },
            {
                "fsq_place_id": "park-1",
                "name": "Park One",
                "latitude": "40.01",
                "longitude": "-3.0",
                "country": "Spain",
                "locality": "Madrid",
                "fsq_category_labels": "Park and outdoor categories",
                "price_min": "25",
            },
            {
                "fsq_place_id": "museum-1",
                "name": "Museum One",
                "latitude": "40.02",
                "longitude": "-3.0",
                "country": "Spain",
                "locality": "Madrid",
                "fsq_category_labels": "Museum",
                "price_min": "25",
            },
        ],
    )
    write_csv(
        data,
        "Estimated_Round_Trip_Travel_Costs_20_Countries_ALL_CITY_ROUTES.csv",
        [
            {
                "route_id": "US-ES",
                "origin_country": "United States",
                "destination_country": "Spain",
                "destination_city": "Madrid",
                "recommended_standard_total_round_trip_transport_usd": "500",
                "origin_city": "Dallas",
            }
        ],
    )
    store = TravelDataStore(tmp_path / "index.sqlite")
    store.rebuild(data)
    result = RecommendationEngine(store).recommend(
        TravelPlan(
            countries=["Spain"],
            accommodation_choices=["Hotel"],
            recommendation_filters={
                "Activities and recreation": [
                    "Park and outdoor categories",
                ],
                "Culture and history": ["Museum"],
            },
            budget=1500,
            adults=1,
            check_in="2026-11-01",
            check_out="2026-11-03",
        )
    )
    assert len(result.top10) == 1
    itinerary = result.top10[0]
    assert itinerary.nights == 2
    assert itinerary.travelers == 1
    assert len(itinerary.activities) == 2
    assert len(itinerary.child_recommendations) == 2
    assert all(
        1 <= len(items) <= 15
        for items in itinerary.child_recommendations.values()
    )
    assert itinerary.transport is not None
    assert itinerary.accommodation.source_row["name"] == "Hotel One"
