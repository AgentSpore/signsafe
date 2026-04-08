export type Severity = 1 | 2 | 3 | 4 | 5;

export type ClauseType =
  | "personal_guarantee"
  | "auto_renewal"
  | "cam_charges"
  | "holdover_penalty"
  | "relocation_clause"
  | "exclusive_use"
  | "assignment_ban"
  | "indemnification"
  | "early_termination"
  | "security_deposit"
  | "rent_escalation"
  | "maintenance_shift"
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

export type Recommendation = "SAFE_TO_SIGN" | "NEGOTIATE_FIRST" | "WALK_AWAY";

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
