#!/usr/bin/env python3
"""Guard firmware modal code against repeated row allocation and ad hoc shells."""

from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FIRMWARE_DIR = ROOT / "components" / "espcontrol"
FORBIDDEN_ALLOCATIONS = (
    "ClimateOptionClick",
    "FanPresetClick",
    "OptionSelectOptionClick",
)
LAYER_TOP_ALLOWLIST = {
    "button_grid_modal.h",
    "button_grid_alarm.h",
}


def main() -> int:
    allocation_pattern = re.compile(r"\bnew\s+(" + "|".join(FORBIDDEN_ALLOCATIONS) + r")\b")
    layer_top_pattern = re.compile(r"\blv_obj_create\s*\(\s*lv_layer_top\s*\(\s*\)\s*\)")
    errors: list[str] = []

    for path in sorted(FIRMWARE_DIR.glob("button_grid*.h")):
        for line_no, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
            match = allocation_pattern.search(line)
            if match:
                rel = path.relative_to(ROOT)
                errors.append(
                    f"{rel}:{line_no}: avoid per-row heap allocation for {match.group(1)}"
                )
            if path.name not in LAYER_TOP_ALLOWLIST and layer_top_pattern.search(line):
                rel = path.relative_to(ROOT)
                errors.append(
                    f"{rel}:{line_no}: open modal overlays through button_grid_modal.h helpers"
                )

    if errors:
        print("Firmware modal allocation check failed:")
        for error in errors:
            print(f"  {error}")
        return 1

    print("Firmware modal allocation checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
