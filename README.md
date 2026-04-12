# SignSafe — Document Forensics for First-Timers

AI co-pilot that reads the scary fine print for people who cannot afford a lawyer —
or a medical billing specialist.

Three verticals from one engine:

1. **Commercial Lease** — first-time SMB tenants (restaurants, retail, office, salons,
   gyms, medical, warehouse). `/lease`
2. **Assisted Living** — families placing a parent in senior care. `/elder-care`
3. **Medical Bill** — patients overwhelmed by hospital bills, EOBs, and provider
   invoices. `/medical-bill`

All flows: upload PDF → in-memory parse → free LLM cross-references patterns →
risk score, plain-English explanation, counter-language / dispute letter.

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
**98 seeded predatory patterns** in `src/signsafe/knowledge/predatory_patterns.json`:

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

### Medical bill / EOB (24)
duplicate charges (E&M, facility, delivery), upcoded visit levels (office, ER),
unbundled lab panels (CMP, CBC), balance billing (emergency, ancillary providers),
facility fees for outpatient visits, phantom charges (anesthesia time, consults,
supplies), missing insurance adjustments (credit, copay), stale billing (12mo+,
collection first notice), collection markup, modifier abuse (-25, -59),
OR surcharge for exam room procedures, surprise providers (assistant surgeon,
out-of-network anesthesiologist), chargemaster billing without adjustment.

## Medical bill vertical — why now
30% of US medical bills contain errors (McKinsey). A patient used Claude AI to
negotiate $163K off a $195K hospital bill (Feb 2026). AARP warns about billing
errors but no free automated tool exists — just paid services ($49-$299/case).
SignSafe's engine reads bills and tells patients exactly what to dispute.

Reddit signal that drove this (r/personalfinance, Apr 2026):
> "Billed $1,440 for 20 min urgent care visit"

## Elder care vertical — why now
800k US seniors move into assisted living each year. Contracts run 30-60 pages,
bury $40k/yr fee escalations behind friendly tours. AARP warns but no dedicated
tool exists — just blog articles. SignSafe's engine reads these contracts and
tells adult children exactly what to push back on before move-in day.

Reddit signal (r/eldercare, Apr 2026):
> "Assisted living suddenly trying to force $1,200/month med management after
> allowing our process for a year."

## Routes
- `/` — hub page (all three verticals)
- `/lease` — commercial lease landing
- `/elder-care` — assisted living landing
- `/medical-bill` — medical bill landing
- `/analyze/[id]` — analysis view (shared by all)
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
├── knowledge/      # predatory_patterns.json (98)
├── core/           # config, database, deps
└── main.py         # app factory
```

Next.js frontend:
```
frontend/
├── app/            # /, /lease, /elder-care, /medical-bill, /analyze/[id], /history, /sync, /shared
├── components/     # analysis-view, clause-card, industry-selector, etc.
├── lib/            # api, storage, crypto, sync, translate, i18n, industry
└── public/         # manifest, sw.js, icons
```

## Disclaimer
Educational tool — not legal or medical advice. Consult a licensed attorney for
contract decisions, and verify medical billing disputes with your insurance
company. Especially true for elder care contracts involving irrevocable entrance
fees and medical bills involving active treatment coverage.
