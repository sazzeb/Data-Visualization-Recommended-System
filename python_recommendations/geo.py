"""Geographic normalization and distance helpers."""

from __future__ import annotations

from math import atan2, cos, floor, radians, sin, sqrt

EARTH_RADIUS_KM = 6371.0


def parse_coordinate(value: str | None) -> float | None:
    try:
        result = float(value or "")
    except (TypeError, ValueError):
        return None
    return result if -180 <= result <= 180 else None


def valid_point(latitude: float | None, longitude: float | None) -> bool:
    return (
        latitude is not None
        and longitude is not None
        and -90 <= latitude <= 90
        and -180 <= longitude <= 180
    )


def haversine_km(
    first: tuple[float, float],
    second: tuple[float, float],
) -> float:
    latitude_one, longitude_one = first
    latitude_two, longitude_two = second
    delta_latitude = radians(latitude_two - latitude_one)
    delta_longitude = radians(longitude_two - longitude_one)
    value = (
        sin(delta_latitude / 2) ** 2
        + cos(radians(latitude_one))
        * cos(radians(latitude_two))
        * sin(delta_longitude / 2) ** 2
    )
    return EARTH_RADIUS_KM * 2 * atan2(sqrt(value), sqrt(1 - value))


def grid_key(latitude: float, longitude: float) -> str:
    return f"{floor(latitude)}:{floor(longitude)}"
