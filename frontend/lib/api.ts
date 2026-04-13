export type Severity = 1 | 2 | 3 | 4 | 5;

export type ClauseType =
  // Commercial lease
  | "personal_guarantee" | "auto_renewal" | "cam_charges" | "holdover_penalty"
  | "relocation_clause" | "exclusive_use" | "assignment_ban" | "indemnification"
  | "early_termination" | "security_deposit" | "rent_escalation" | "maintenance_shift"
  // Elder care
  | "care_escalation" | "community_fee" | "med_management" | "move_out_notice"
  | "medicaid_spend_down" | "third_party_restriction" | "arbitration_waiver"
  | "responsible_party" | "liability_cap" | "discharge_rights" | "holding_fee"
  | "care_plan_change"
  // Medical bill
  | "balance_billing" | "duplicate_charge" | "upcoding" | "unbundling"
  | "facility_fee" | "missing_adjustment" | "stale_billing" | "collection_markup"
  | "phantom_charge" | "modifier_abuse" | "surprise_provider" | "or_surcharge"
  // Employment
  | "probation_violation" | "non_compete" | "ip_overreach" | "termination_penalty"
  | "overtime_abuse" | "liability_shift" | "unilateral_change"
  // Loan
  | "hidden_commission" | "effective_rate_trap" | "prepayment_penalty"
  | "variable_rate" | "cross_default" | "auto_debit" | "disproportionate_collateral"
  // Insurance
  | "coverage_exclusion" | "hidden_deductible" | "notification_trap"
  | "depreciation_trap" | "auto_renewal_increase"
  // Purchase
  | "hidden_encumbrance" | "warranty_waiver" | "deposit_forfeiture" | "risk_transfer"
  // Service
  | "scope_ambiguity" | "cancellation_penalty" | "price_escalation"
  | "data_lock_in" | "forced_addon"
  // Auto dealer
  | "forced_insurance" | "overpriced_addon" | "dealer_markup"
  | "tradein_lowball" | "doc_fee_inflated"
  // HOA
  | "special_assessment" | "excessive_fine" | "lien_on_property"
  | "rental_ban" | "pet_restriction" | "architectural_control"
  | "reserve_deficit" | "selective_enforcement" | "transfer_fee"
  | "other";

export interface RiskClause {
  clause_type: ClauseType;
  severity: Severity;
  title: string;
  original_text: string;
  page_number: number;
  plain_english: string;
  why_risky: string;
  negotiation_counter: string;
  benchmark: string | null;
}

export type Recommendation =
  | "SAFE_TO_SIGN" | "NEGOTIATE_FIRST" | "WALK_AWAY"
  | "LOOKS_FAIR" | "REVIEW_CAREFULLY" | "DISPUTE_NOW";

export interface ExtractedPage {
  page_number: number;
  text: string;
}

export interface AnalysisData {
  filename: string;
  num_pages: number;
  industry?: string | null;
  used_ocr?: boolean;
  extracted_pages?: ExtractedPage[];
  overall_risk_score: number;
  recommendation: Recommendation;
  summary: string;
  top_3_concerns: string[];
  risk_clauses: RiskClause[];
}

export interface StreamEvent {
  stage: "extracting" | "analyzing" | "done" | "error";
  progress: number;
  message: string;
  data?: AnalysisData;
}

export async function* streamAnalysis(
  file: File,
  industry?: string | null,
): AsyncGenerator<StreamEvent> {
  const form = new FormData();
  form.append("file", file);
  if (industry) form.append("industry", industry);

  const res = await fetch("/api/analyze", { method: "POST", body: form });
  if (!res.ok || !res.body) throw new Error(`Upload failed: ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        yield JSON.parse(line.slice(6)) as StreamEvent;
      } catch {}
    }
  }
}

export interface NegotiationEmail {
  subject: string;
  body: string;
}

export async function generateNegotiationEmail(
  clauses: RiskClause[],
  tone: "professional" | "firm" | "friendly" = "professional",
): Promise<NegotiationEmail> {
  const res = await fetch("/api/negotiate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clauses, tone }),
  });
  if (!res.ok) throw new Error(`Negotiate failed: ${res.status}`);
  return res.json();
}
