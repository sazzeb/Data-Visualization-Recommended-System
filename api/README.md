# TravelWise recommendation engine

This package prepares the CSV files in `public/datasets/csv_file` into a
SQLite index and calculates complete trip recommendations.

The engine considers:

- selected countries;
- the user's budget mode, budget, travelers, and dates;
- round-trip transport from the default Dallas, Texas origin;
- accommodation type and stay duration;
- all selected personalization filters;
- one to fifteen nearby recommendations for every selected personalization
  child, measured from the itinerary accommodation;
- two representative activities used for the displayed trip-cost estimate;
- budget-fit percentage sorted highest first, with proximity used as a
  tie-breaker between equal fits.

The raw source row is retained in the result for every accommodation,
activity, and route. The route dataset does not contain Dallas, so the engine
uses the closest available United States origin route for the selected
destination.

## Usage

From the repository root:

```bash
python3 -m api.cli \
  --data-dir public/datasets/csv_file \
  --plan plan.json \
  --output recommendations.json
```

Build only the SQLite index:

```bash
python3 -m api.cli \
  --data-dir public/datasets/csv_file \
  --database .travelwise/recommendations.sqlite \
  --build-index-only
```

The implementation uses only the Python standard library.
