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
  // Residential lease (tenant)
  | "landlord_termination"
  | "other";

export type Legality = "void" | "disputable" | "ok";

// Free-model honesty layer: the model self-reports confidence and abstains
// ("insufficient" + severity null) instead of forcing a verdict colour.
export type Confidence = "high" | "medium" | "insufficient";

export interface RiskClause {
  clause_type: ClauseType;
  // Nullable: null = the model abstained (see `confidence`). Never render a colour for it.
  severity: Severity | null;
  confidence?: Confidence | null;
  title: string;
  original_text: string;
  page_number: number;
  plain_english: string;
  why_risky: string;
  negotiation_counter: string;
  benchmark: string | null;
  // Tenant-lease legality layer — present only for the residential-lease profile.
  legality?: Legality | null;
  legality_gloss?: string | null;
  norm_ref?: string | null;
}

/** True when the model declined to assign a verdict for this clause. */
export function isAbstained(clause: RiskClause): boolean {
  return clause.severity === null || clause.severity === undefined;
}

export type Recommendation =
  | "SAFE_TO_SIGN" | "NEGOTIATE_FIRST" | "WALK_AWAY"
  | "LOOKS_FAIR" | "REVIEW_CAREFULLY" | "DISPUTE_NOW";

export interface ExtractedPage {
  page_number: number;
  text: string;
}

/** Severity counts — replaces the removed 0-100 score (it conveyed false precision). */
export interface SeveritySummary {
  critical: number;
  disputable: number;
  info: number;
  abstained: number;
}

export interface AnalysisData {
  filename: string;
  num_pages: number;
  industry?: string | null;
  used_ocr?: boolean;
  ocr_quality_low?: boolean;
  /** RU category labels of the PII masked locally before the text left for the LLM. */
  redacted_categories?: string[];
  extracted_pages?: ExtractedPage[];
  /** DEPRECATED — the backend no longer emits a score. Kept nullable for stored analyses. */
  overall_risk_score?: number | null;
  recommendation?: Recommendation | null;
  summary: string;
  top_3_concerns: string[];
  risk_clauses: RiskClause[];
  severity_summary?: SeveritySummary;
}

/** Typed non-analysis outcomes — the backend refuses rather than fabricating a result. */
export interface BlockedResult {
  status: "unsupported_mode" | "not_contract";
  industry?: string;
  message: string;
}

export interface StreamEvent {
  stage: "extracting" | "analyzing" | "done" | "blocked" | "error";
  progress: number;
  message?: string;
  data?: AnalysisData | BlockedResult;
}

/**
 * Consent version sent with every analyze request. MUST be one of the backend's
 * `accepted_consent_versions` (see src/signsafe/core/config.py) — the endpoint rejects
 * the upload with 400/422 otherwise.
 */
export const CONSENT_VERSION = "ru-v1";

/**
 * An analyze request that failed before streaming started.
 *
 * `serverMessage` is the backend's own RU copy (it already localizes its refusals);
 * `code` is the fallback the UI translates via the `err.*` i18n keys when the server
 * said nothing useful (network drop, proxy error, non-JSON body).
 */
export class AnalyzeError extends Error {
  constructor(
    public readonly code: string,
    public readonly serverMessage?: string,
  ) {
    super(serverMessage || code);
    this.name = "AnalyzeError";
  }
}

async function describeHttpError(res: Response): Promise<AnalyzeError> {
  // FastAPI shape: {"detail": {"code": "...", "message": "<RU>"}}
  try {
    const body = await res.json();
    const detail = body?.detail;
    if (detail && typeof detail === "object" && typeof detail.message === "string") {
      return new AnalyzeError(detail.code ?? "unknown", detail.message);
    }
  } catch {
    // non-JSON body — fall through to a status-derived code
  }
  const byStatus: Record<number, string> = {
    400: "bad_request",
    413: "file_too_large",
    422: "consent_version_unknown",
    429: "rate_limited",
    502: "upstream",
    503: "upstream",
    504: "upstream",
  };
  return new AnalyzeError(byStatus[res.status] ?? "unknown");
}

/**
 * Derive severity counts client-side for analyses stored before the backend computed
 * them (the field is a backend computed_field; older localStorage records lack it).
 */
export function deriveSeveritySummary(clauses: RiskClause[]): SeveritySummary {
  const summary: SeveritySummary = { critical: 0, disputable: 0, info: 0, abstained: 0 };
  for (const c of clauses) {
    if (isAbstained(c)) summary.abstained += 1;
    else if (c.severity! >= 4) summary.critical += 1;
    else if (c.severity! >= 2) summary.disputable += 1;
    else summary.info += 1;
  }
  return summary;
}

export async function* streamAnalysis(
  file: File,
  industry?: string | null,
  // Required, not defaulted: the 152-ФЗ consent gate is enforced by the backend, and a
  // default here would let a caller skip the checkbox and still analyze.
  consentVersion: string = CONSENT_VERSION,
): AsyncGenerator<StreamEvent> {
  const form = new FormData();
  form.append("file", file);
  if (industry) form.append("industry", industry);
  form.append("consent_version", consentVersion);

  const res = await fetch("/api/analyze", { method: "POST", body: form });
  if (!res.ok || !res.body) throw await describeHttpError(res);
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
