"""Negotiation email generator."""

from __future__ import annotations

from loguru import logger

from signsafe.schemas.clause import RiskClause
from signsafe.schemas.negotiation import NegotiationEmailResponse
from signsafe.services.agents import negotiation_agent


class NegotiationService:
    async def generate(
        self, clauses: list[RiskClause], tone: str = "professional"
    ) -> NegotiationEmailResponse:
        clause_summary = "\n\n".join(
            f"- {c.title} (severity {int(c.severity)}): "
            f'"{c.original_text[:200]}" → counter: {c.negotiation_counter}'
            for c in clauses
        )
        prompt = (
            f"Draft a {tone} negotiation email to the landlord addressing these flagged clauses:\n\n"
            f"{clause_summary}\n\n"
            f"Return subject and body."
        )
        logger.info("Generating negotiation email for {} clauses", len(clauses))
        result = await negotiation_agent.run(prompt)
        return result.output
