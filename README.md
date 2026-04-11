# SignSafe — Contract Forensics for First-Timers

AI co-pilot that reads the scary fine print for people who cannot afford a lawyer.
Two verticals from one engine:

1. **Commercial Lease** — first-time SMB tenants (restaurants, retail, office, salons,
   gyms, medical, warehouse). `/`
2. **Assisted Living** — families placing a parent in senior care. `/elder-care`

Both flows: upload PDF → in-memory parse → free LLM cross-references patterns →
risk score, plain-English explanation, counter-language, negotiation email draft.

## Stack
- Backend: FastAPI + pydantic-ai (free OpenRouter cascade) + PyMuPDF + Tesseract OCR
- Frontend: Next.js 16 + React 19 + Tailwind v4 + TypeScript, PWA installable
- Privacy: stateless analysis. Results live only in your browser. Optional E2E
  encrypted cloud sync (AES-GCM, key derived from email via PBKDF2).
- i18n: EN / RU / ZH / ES / DE / FR via Google Translate API

## Run
```bash
make install
OPENROUTER_API_KEY=... make dev
```
Backend: `:8894` · Frontend: `:3004`

## Knowledge base
**74 seeded predatory patterns** in `src/signsafe/knowledge/predatory_patterns.json`:

### Commercial lease (40)
personal guarantees, auto-renewals, CAM charges, holdover penalties, relocation,
exclusive use, assignment bans, indemnification, early termination, security
deposits, rent escalation, maintenance shifts, estoppel traps, insurance
overreach, use restrictions.

### Elder care / assisted living (34)
care level escalation, non-refundable community fees, mandatory medication
management fees, 30-day-after-death rent, forced memory care transfer, Medicaid
spend-down evictions, third-party hospice restrictions, arbitration waivers for
neglect/abuse, adult child personal guaranty, liability caps for falls, broad
discharge rights, bed-hold fees, unilateral care plan changes, unlimited annual
price increases, transfer trauma waivers, couples separation, personal property
limits, outside food bans, rent-until-re-rented traps.

## Elder care vertical — why now
800k US seniors move into assisted living each year. Contracts run 30-60 pages,
bury $40k/yr fee escalations behind friendly tours. AARP warns but no dedicated
tool exists — just blog articles. SignSafe's engine reads these contracts and
tells adult children exactly what to push back on before move-in day.

Reddit signal that drove this (r/eldercare, Apr 2026):
> "Assisted living suddenly trying to force $1,200/month med management after
> allowing our process for a year."

## Routes
- `/` — commercial lease landing
- `/elder-care` — assisted living landing
- `/analyze/[id]` — analysis view (shared by both)
- `/history` — local history
- `/sync` — optional E2E sync
- `/shared` — shareable read-only view

## Architecture
Layered Python backend:
```
src/signsafe/
├── api/            # FastAPI routers (documents, translate, sync, negotiate)
├── services/       # business logic (pdf, analysis, agents, translate, sync)
├── schemas/        # Pydantic DTOs (document, clause, industry, sync)
├── knowledge/      # predatory_patterns.json (74)
├── core/           # config, database, deps
└── main.py         # app factory
```

Next.js frontend:
```
frontend/
├── app/            # /, /elder-care, /analyze/[id], /history, /sync, /shared
├── components/     # analysis-view, clause-card, industry-selector, etc.
├── lib/            # api, storage, crypto, sync, translate, i18n, industry
└── public/         # manifest, sw.js, icons
```

## Disclaimer
Educational tool — not legal advice. Consult a licensed attorney for critical
decisions. Especially true for elder care contracts involving irrevocable
entrance fees or long-term financial commitments.
