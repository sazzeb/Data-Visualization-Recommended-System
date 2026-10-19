from python_recommendations.geo import haversine_km, valid_point


def test_haversine_zero_distance() -> None:
    assert haversine_km((32.7767, -96.7970), (32.7767, -96.7970)) == 0


def test_valid_point_rejects_invalid_latitude() -> None:
    assert not valid_point(91, -96)
