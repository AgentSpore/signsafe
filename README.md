# SignSafe — Lease Forensics

AI co-pilot for first-time commercial tenants. Finds predatory clauses in 60 seconds, explains them in plain English, generates negotiation counter-language.

## Stack
- Backend: FastAPI + pydantic-ai (Gemini 2.0 Flash) + PyMuPDF + aiosqlite
- Frontend: Next.js 16 + React 19 + Tailwind v4 + TypeScript
- Design: Legal Brutalism — Fraunces + Newsreader + JetBrains Mono, dark-first

## Run
```bash
make install
OPENROUTER_API_KEY=... make dev
```
Backend: :8894 · Frontend: :3004

## Knowledge base
40 seeded predatory patterns in `src/signsafe/knowledge/predatory_patterns.json` covering personal guarantees, auto-renewals, CAM charges, holdover penalties, relocation, exclusive use, assignment bans, indemnification, early termination, security deposits, rent escalation, maintenance shifts and more.
