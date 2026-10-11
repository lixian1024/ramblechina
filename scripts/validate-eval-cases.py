#!/usr/bin/env python3
"""Validate the machine-readable eval case catalog.

This does NOT judge itinerary quality. It only prevents the eval catalog itself
from silently becoming malformed while the actual product harness is still evolving.
"""
from __future__ import annotations

import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "evals" / "cases.json"
REQUIRED = {"id", "name", "type", "priority", "hard_constraints"}


def main() -> int:
    data = json.loads(PATH.read_text(encoding="utf-8"))
    cases = data.get("cases")
    if not isinstance(cases, list) or not cases:
        print("FAIL: cases must be a non-empty list")
        return 1

    seen = set()
    errors = []
    for index, case in enumerate(cases, start=1):
        missing = REQUIRED - set(case)
        if missing:
            errors.append(f"case #{index}: missing {sorted(missing)}")
            continue
        case_id = case["id"]
        if case_id in seen:
            errors.append(f"duplicate id: {case_id}")
        seen.add(case_id)
        if not isinstance(case["hard_constraints"], list) or not case["hard_constraints"]:
            errors.append(f"{case_id}: hard_constraints must be non-empty list")

    if errors:
        print("FAIL")
        for error in errors:
            print(f"- {error}")
        return 1

    print(f"OK: {len(cases)} eval cases validated")
    return 0


if __name__ == "__main__":
    sys.exit(main())
