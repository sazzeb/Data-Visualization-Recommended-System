from python_recommendations.models import TravelPlan


def test_plan_accepts_frontend_camel_case_contract() -> None:
    plan = TravelPlan.from_dict(
        {
            "countries": ["Spain"],
            "budgetMode": "group-person",
            "travelerNames": ["A", "B"],
            "checkIn": "2026-11-01",
            "checkOut": "2026-11-08",
        }
    )
    assert plan.travelers == 2
    assert plan.nights == 7
