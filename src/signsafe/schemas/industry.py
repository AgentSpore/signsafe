"""Industry presets."""

from __future__ import annotations

from typing import Literal

Industry = Literal[
    "restaurant",
    "retail",
    "office",
    "medical",
    "salon",
    "fitness",
    "warehouse",
    "other",
]


INDUSTRY_FOCUS: dict[str, str] = {
    "restaurant": (
        "Restaurant/food service tenant. Pay extra attention to: exclusive use radius, "
        "operating hours restrictions, grease trap and ventilation maintenance, "
        "HVAC replacement cost (critical for food service), CAM charges (often high in malls), "
        "hold-over penalties (location-critical), permits and code compliance for food prep."
    ),
    "retail": (
        "Retail tenant. Pay extra attention to: exclusive use clause and co-tenancy, "
        "radius restrictions on new locations, percentage rent clauses, signage rights, "
        "operating hours, CAM (often inflated in shopping centers), relocation rights, "
        "kick-out clauses tied to anchor tenant leaving."
    ),
    "office": (
        "Office tenant. Pay extra attention to: build-out allowances (TI), "
        "subletting and assignment flexibility (for hybrid work), after-hours HVAC charges, "
        "operating expense escalations, parking ratios, right of first refusal on adjacent space."
    ),
    "medical": (
        "Medical/healthcare tenant. Pay extra attention to: build-out requirements "
        "(plumbing, electrical for exam rooms), ADA compliance, medical waste disposal, "
        "HIPAA-compliant space access, exclusive use for specialty, patient parking, "
        "extended hours operation rights, insurance requirements (malpractice coverage)."
    ),
    "salon": (
        "Salon/beauty tenant. Pay extra attention to: water usage and plumbing upgrades, "
        "ventilation for chemical fumes, exclusive use (no competing salon), "
        "signage and window display rights, operating hours flexibility."
    ),
    "fitness": (
        "Fitness/gym tenant. Pay extra attention to: noise and vibration clauses, "
        "floor load capacity for heavy equipment, HVAC for high occupancy, "
        "extended hours operation, exclusive use for fitness category, "
        "flexible cancellation if membership drops."
    ),
    "warehouse": (
        "Warehouse/industrial tenant. Pay extra attention to: loading dock rights, "
        "floor load capacity, ceiling height, column spacing, 24/7 access, "
        "triple-net maintenance obligations, environmental compliance, "
        "heavy machinery installation rights."
    ),
    "other": "General commercial tenant. Apply standard forensic review.",
}


def get_focus(industry: str | None) -> str:
    if not industry:
        return INDUSTRY_FOCUS["other"]
    return INDUSTRY_FOCUS.get(industry.lower(), INDUSTRY_FOCUS["other"])
