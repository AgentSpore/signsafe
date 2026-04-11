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
    "elder_care",
    "other",
]


COMMERCIAL_INDUSTRIES: set[str] = {
    "restaurant",
    "retail",
    "office",
    "medical",
    "salon",
    "fitness",
    "warehouse",
    "other",
}

ELDER_CARE_INDUSTRIES: set[str] = {"elder_care"}


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
    "elder_care": (
        "ASSISTED LIVING / SENIOR CARE CONTRACT. This is NOT a commercial lease — "
        "this is a residency and services agreement for a senior moving into an assisted "
        "living facility, memory care, or CCRC. The resident's adult child is usually the "
        "decision-maker and emotionally pressured. Pay extra attention to:\n"
        "- CARE LEVEL ESCALATION: facility unilaterally raises 'level of care' and fees "
        "without independent assessment; often doubles base rate over 12-24 months.\n"
        "- COMMUNITY FEE / ENTRANCE FEE: non-refundable $3k-$10k+ 'community fee' charged "
        "at move-in even if resident leaves within 30 days.\n"
        "- MEDICATION MANAGEMENT FEES: $500-$2000/mo add-on for basic pill handling, often "
        "forced after initial lease period.\n"
        "- 30-DAY NOTICE + LAST MONTH PAID: forces family to pay full month even after "
        "resident dies or is hospitalized permanently.\n"
        "- TRANSFER TO MEMORY CARE: forced move to higher-cost unit at facility's sole "
        "discretion with minimal notice.\n"
        "- MEDICAID SPEND-DOWN TRAPS: contract refuses Medicaid after private-pay period; "
        "forces eviction when savings exhausted.\n"
        "- THIRD-PARTY PROVIDER RESTRICTIONS: bans outside hospice, home health, or "
        "physical therapy, locking resident to facility's preferred vendors.\n"
        "- ARBITRATION CLAUSE: waives right to sue for neglect, abuse, or wrongful death; "
        "forces private arbitration which favors facility.\n"
        "- RESPONSIBLE PARTY / FINANCIAL GUARANTY: adult child personally guarantees payment, "
        "putting their own assets at risk if parent cannot pay.\n"
        "- PRICE INCREASE NOTICE: only 30-day notice for rent hikes; no cap, no formula.\n"
        "- LIMITATION OF LIABILITY: caps facility's liability for falls, infections, "
        "elopement, medication errors to trivial amounts.\n"
        "- DISCHARGE RIGHTS: broad grounds for facility to evict resident (behavior, "
        "care needs beyond license, non-payment) with minimal appeal rights.\n"
        "- HOLDING / DEPOSIT FEE: charges daily rate to 'hold' bed during hospitalization "
        "even though resident is not using services.\n"
        "- POA / CONSERVATORSHIP REQUIREMENTS: requires family to obtain POA or pay "
        "facility's preferred attorney.\n"
        "- CARE PLAN CHANGES: facility can modify care plan unilaterally without family sign-off.\n"
        "Use plain, direct language an adult child (not lawyer) can understand. Express "
        "dollar impact clearly. This family is scared and overwhelmed — be their advocate."
    ),
    "other": "General commercial tenant. Apply standard forensic review.",
}


def get_focus(industry: str | None) -> str:
    if not industry:
        return INDUSTRY_FOCUS["other"]
    return INDUSTRY_FOCUS.get(industry.lower(), INDUSTRY_FOCUS["other"])


def is_elder_care(industry: str | None) -> bool:
    return (industry or "").lower() in ELDER_CARE_INDUSTRIES
