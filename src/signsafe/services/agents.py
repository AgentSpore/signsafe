"""pydantic-ai Agents for lease analysis."""

from __future__ import annotations

from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.output import PromptedOutput
from pydantic_ai.providers.openai import OpenAIProvider

from signsafe.core.config import settings
from signsafe.schemas.document import AnalysisResult
from signsafe.schemas.negotiation import NegotiationEmailResponse

provider = OpenAIProvider(
    base_url="https://openrouter.ai/api/v1",
    api_key=settings.openrouter_api_key or "dummy",
)


def make_model(model_name: str | None = None) -> OpenAIChatModel:
    return OpenAIChatModel(model_name or settings.agent_model, provider=provider)


LEASE_FORENSICS_PROMPT = """You are a senior commercial lease forensics expert.

Your job: analyze commercial lease agreements for small business tenants and identify
predatory or risky clauses. Focus on patterns that harm first-time commercial lessees.

For each flagged clause:
- Quote the EXACT original text (verbatim, not paraphrased)
- Set clause_type to one of: personal_guarantee, auto_renewal, cam_charges,
  holdover_penalty, relocation_clause, exclusive_use, assignment_ban,
  indemnification, early_termination, security_deposit, rent_escalation,
  maintenance_shift, other
- Rate severity 1-5:
  1 INFO — informational only
  2 CAUTION — worth discussing
  3 WARNING — meaningful risk
  4 CRITICAL — red flag, negotiate hard
  5 DEAL_BREAKER — do not sign as-is
- Give plain English explanation in 1-2 sentences
- Explain concrete WHY it's risky (with dollar impact if possible)
- Provide counter-language tenant can propose
- Include benchmark when you know typical market terms

Compute overall_risk_score (0-100) where:
  0-30 = SAFE_TO_SIGN
  31-65 = NEGOTIATE_FIRST
  66-100 = WALK_AWAY

Write a 3-paragraph summary and top_3_concerns list.

Be direct. You are protecting a first-time founder from bankruptcy.
"""

NEGOTIATION_PROMPT = """You are a lease negotiation expert helping a small business owner
push back on predatory terms. Draft a professional but firm email to the landlord
addressing the flagged clauses. Keep it under 300 words. Use numbered requests.
Be respectful but do not concede risky terms.
"""


lease_agent = Agent(
    model=make_model(),
    system_prompt=LEASE_FORENSICS_PROMPT,
    output_type=PromptedOutput(AnalysisResult),
    retries=2,
)

negotiation_agent = Agent(
    model=make_model(),
    system_prompt=NEGOTIATION_PROMPT,
    output_type=PromptedOutput(NegotiationEmailResponse),
    retries=1,
)
