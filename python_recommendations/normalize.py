"""Normalization rules shared by ingestion and recommendation queries."""

from __future__ import annotations

import json
from typing import Iterable

from .geo import parse_coordinate, valid_point
from .models import SourceRecord


def first_value(row: dict[str, str], keys: Iterable[str]) -> str:
    for key in keys:
        value = str(row.get(key, "") or "").strip()
        if value:
            return value
    return ""


def coordinates(row: dict[str, str]) -> tuple[float, float] | None:
    latitude = parse_coordinate(
        first_value(
            row,
            (
                "latitude",
                "property_representative_latitude",
                "destination_latitude",
                "origin_latitude",
            ),
        )
    )
    longitude = parse_coordinate(
        first_value(
            row,
            (
                "longitude",
                "property_representative_longitude",
                "destination_longitude",
                "origin_longitude",
            ),
        )
    )
    return (latitude, longitude) if valid_point(latitude, longitude) else None


def record_type(source: str, row: dict[str, str]) -> str:
    lower_source = source.lower()
    if "ticketmaster" in lower_source:
        return "event"
    if "unesco" in lower_source:
        return "heritage"
    if "estimated_" in lower_source:
        return "transport"
    if row.get("fsq_category_labels"):
        return "place"
    return "destination"


def name(row: dict[str, str], source: str) -> str:
    return first_value(
        row,
        (
            "name",
            "site_name",
            "name_en",
            "event_name",
            "venue_name",
            "destination_city",
            "city_town",
        ),
    ) or source.rsplit("/", 1)[-1].removesuffix(".csv")


def to_source_record(
    source: str,
    row_number: int,
    row: dict[str, str],
) -> SourceRecord:
    point = coordinates(row)
    return SourceRecord(
        source=source,
        row_number=row_number,
        row=dict(row),
        latitude=point[0] if point else None,
        longitude=point[1] if point else None,
        name=name(row, source),
        country=first_value(
            row,
            ("country", "destination_country", "venue_country"),
        ),
        state=first_value(
            row,
            ("state_region", "region", "venue_region",
             "destination_state_region"),
        ),
        city=first_value(
            row,
            ("city_town", "locality", "venue_city", "destination_city"),
        ),
        record_type=record_type(source, row),
        search_text=" ".join(row.values()).lower(),
    )


def json_row(row: dict[str, str]) -> str:
    return json.dumps(row, ensure_ascii=False, separators=(",", ":"))
