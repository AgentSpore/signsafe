import type { AnalysisData } from "./api";

/** Pre-computed demo analysis — no backend call, instant display. */
export const DEMO_ANALYSIS: AnalysisData = {
  filename: "demo-retail-lease.pdf",
  num_pages: 12,
  industry: "retail",
  used_ocr: false,
  overall_risk_score: 82,
  recommendation: "NEGOTIATE_FIRST",
  summary:
    "This retail lease contains several aggressive clauses that disproportionately favor the landlord. The unlimited personal guarantee, 200% holdover penalty, and landlord convenience termination are serious red flags that could expose the tenant to significant financial risk. The CAM provisions lack caps and audit rights, creating unpredictable ongoing costs.\n\nWhile not a complete deal-breaker, the tenant should push back firmly on the top 3 concerns before signing. Most landlords will concede on 1-2 of these points if tenant holds firm.\n\nRecommendation: Do not sign as-is. Negotiate the personal guarantee cap, holdover reduction, and CAM audit rights at minimum.",
  top_3_concerns: [
    "Unlimited personal guarantee with spousal consent exposes personal assets to unlimited liability.",
    "200% holdover rent plus consequential damages could bankrupt the business on a single missed deadline.",
    "Landlord can terminate at convenience with only 60 days notice, eliminating tenant security.",
  ],
  risk_clauses: [
    {
      clause_type: "personal_guarantee",
      severity: 5,
      title: "Unlimited Personal Guarantee",
      original_text:
        "Tenant's officers personally guarantee all obligations under this Lease without limitation, jointly and severally. Spousal consent required.",
      page_number: 3,
      plain_english:
        "You and your spouse are personally liable for the entire lease. If the business fails, creditors can come after your home, savings, and joint assets.",
      why_risky:
        "Unlimited guarantees are the #1 cause of founder bankruptcy after lease defaults. Most LLCs protect owners — this clause voids that protection entirely.",
      negotiation_counter:
        "Cap guarantee at 6 months rent OR convert to 'Good Guy Guarantee' — liable only for unpaid rent until lawful vacating. Remove spousal consent entirely.",
      benchmark: "Capped 12-month guarantee is market standard",
    },
    {
      clause_type: "holdover_penalty",
      severity: 5,
      title: "200% Holdover With Consequential Damages",
      original_text:
        "If Tenant remains after lease end, rent shall be 200% of base rent plus all consequential damages including lost profits.",
      page_number: 7,
      plain_english:
        "Stay one day past lease expiration and rent doubles, plus you owe landlord for any future deal that fell through.",
      why_risky:
        "Construction delays, permit issues, or a slow new-space buildout are common — this clause makes those ordinary delays catastrophic.",
      negotiation_counter:
        "Reduce to 125% for first 60 days. Remove consequential damages entirely — cap at actual additional rent only.",
      benchmark: "125-150% is typical holdover rate",
    },
    {
      clause_type: "early_termination",
      severity: 5,
      title: "Landlord Termination At Convenience",
      original_text:
        "Landlord may terminate this Lease at Landlord's convenience with 60 days notice.",
      page_number: 9,
      plain_english:
        "Landlord can kick you out for any reason with 60 days notice, destroying all your build-out investment.",
      why_risky:
        "After spending $100K on tenant improvements, being evicted in 60 days is catastrophic. This clause makes the lease effectively month-to-month for the landlord.",
      negotiation_counter:
        "Remove entirely. Landlord may terminate only for tenant's uncured material default after 30-day notice.",
      benchmark: "Termination only for cause is standard",
    },
    {
      clause_type: "cam_charges",
      severity: 4,
      title: "Uncapped CAM With No Audit Rights",
      original_text:
        "Tenant shall pay its pro rata share of all common area maintenance, operating expenses, capital improvements, and management fees without limitation. Landlord's determination shall be final.",
      page_number: 5,
      plain_english:
        "Landlord can charge unlimited extra fees beyond rent, and you can't verify the numbers.",
      why_risky:
        "CAM charges routinely double or triple over the lease term. Without audit rights, landlord can include improper expenses like their own salaries or building upgrades.",
      negotiation_counter:
        "Cap CAM increases at 5% annually. Exclude capital improvements. Add annual audit right with 60-day window.",
      benchmark: "Audit rights are standard in 2026 market",
    },
    {
      clause_type: "relocation_clause",
      severity: 4,
      title: "Relocation At Tenant's Expense",
      original_text:
        "Landlord may relocate Tenant to comparable space at Tenant's expense upon 30 days notice.",
      page_number: 8,
      plain_english:
        "Landlord can force you into a different space and make you pay for the move.",
      why_risky:
        "For retail, location is everything. A forced move to a worse location can destroy foot traffic. Moving costs $20-50K for buildout rebuild.",
      negotiation_counter:
        "Landlord covers 100% of moving costs, TI rebuild, and signage. Tenant must consent in writing. Rent abated during move.",
      benchmark: "Landlord-paid relocation is standard",
    },
    {
      clause_type: "assignment_ban",
      severity: 3,
      title: "Assignment With Recapture Right",
      original_text:
        "Tenant shall not assign or sublease without Landlord's consent, which may be withheld in sole discretion. Landlord may recapture the premises upon any proposed assignment.",
      page_number: 6,
      plain_english:
        "Landlord can block any sale of your business and take the space back instead.",
      why_risky:
        "Kills your exit strategy — if you want to sell the business, the buyer needs lease assignment. Landlord can sabotage any deal.",
      negotiation_counter:
        "Landlord consent 'not unreasonably withheld'. Remove recapture or limit to significant use changes only.",
      benchmark: null,
    },
    {
      clause_type: "rent_escalation",
      severity: 3,
      title: "5% Fixed Annual Escalation",
      original_text: "Annual increase of 5% each year.",
      page_number: 4,
      plain_english:
        "Rent increases 5% every year, regardless of market conditions or inflation.",
      why_risky:
        "Over 5 years, compounds to 27.6% higher rent. Far exceeds typical 2-3% market escalation.",
      negotiation_counter: "Reduce to 3% annual OR CPI-linked with 3% cap.",
      benchmark: "2.5-3% annual is typical for retail",
    },
    {
      clause_type: "maintenance_shift",
      severity: 3,
      title: "Tenant Responsible For Structural",
      original_text:
        "Tenant is responsible for all repairs including structural, roof, HVAC replacement, and ADA compliance.",
      page_number: 10,
      plain_english:
        "You pay for major building repairs that the landlord should own — roof, foundation, HVAC, code compliance.",
      why_risky:
        "HVAC replacement: $15-40K. Roof repair: $50K+. ADA retrofit: up to $100K. These are landlord responsibilities, not operational expenses.",
      negotiation_counter:
        "Tenant responsible for routine maintenance only. Landlord covers structural, roof, and HVAC replacement.",
      benchmark: "Landlord owns structural in 95% of commercial leases",
    },
  ],
};
