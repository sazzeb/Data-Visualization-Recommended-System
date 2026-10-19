"""Command-line entry point for index building and recommendations."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from .engine import RecommendationEngine
from .models import TravelPlan
from .store import TravelDataStore


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", required=True)
    parser.add_argument("--database", default=".travelwise/recommendations.sqlite")
    parser.add_argument("--plan", required=False)
    parser.add_argument("--output", required=False)
    parser.add_argument("--build-index-only", action="store_true")
    args = parser.parse_args()

    store = TravelDataStore(args.database)
    counts = store.rebuild(
        args.data_dir,
        progress=lambda percent, message: print(
            f"[{percent:3d}%] {message}"
        ),
    )
    if args.build_index_only:
        print(json.dumps({"sources": counts}, indent=2))
        return 0
    if not args.plan:
        parser.error("--plan is required unless --build-index-only is used")

    plan = TravelPlan.from_dict(
        json.loads(Path(args.plan).read_text(encoding="utf-8"))
    )
    result = RecommendationEngine(store).recommend(
        plan,
        progress=lambda percent, message: print(
            f"[{percent:3d}%] {message}"
        ),
    )
    output = json.dumps(result.to_dict(), indent=2, ensure_ascii=False)
    if args.output:
        Path(args.output).write_text(output, encoding="utf-8")
    else:
        print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
