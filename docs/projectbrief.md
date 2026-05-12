# Project Brief — CattlePro

> **Status:** Draft v1.1
> **Last updated:** 2026-05-02
> **Owner:** Product & Architecture
>
> This document is the **single source of truth for the project's vision and scope**. It answers *what* we are building, *for whom*, *why*, and *how we will measure success*. It does **not** describe how the system is implemented — that lives in `systemPatterns.md`, `techContext.md`, and `decisions.md`.
>
> **Changelog v1.1:** Aligned with `businessRules.md`. Default currency changed to COP (Colombian Peso). Primary market clarified as Colombia/LATAM. EMPLOYEE permissions adjusted to allow pregnancy registration. Breed list updated to include the 12 breeds required by the business rules. New non-negotiables added for domain authority and medication withholding periods.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Vision & Mission](#3-vision--mission)
4. [Target Users](#4-target-users)
5. [Scope](#5-scope)
6. [Goals & Success Metrics](#6-goals--success-metrics)
7. [Key Constraints](#7-key-constraints)
8. [Assumptions & Risks](#8-assumptions--risks)
9. [Stakeholders](#9-stakeholders)
10. [High-Level Roadmap](#10-high-level-roadmap)
11. [Non-Negotiables](#11-non-negotiables)
12. [Open Questions](#12-open-questions)

---

## 1. Executive Summary

**CattlePro** is a professional-grade livestock management platform for small and medium-sized cattle farms in **Colombia and Latin America**. It centralizes the day-to-day operational data of a dairy or beef operation — animals, breeding, milk production, health, genealogy, semen straws inventory, and finances — into a single multi-tenant SaaS, with a Progressive Web App that works offline for use in the field.

The product replaces the spreadsheets, paper notebooks, and disconnected local apps that small farms typically rely on, while costing far less than the enterprise-grade systems built for industrial operations.

The system is built with a TypeScript-first stack (Next.js + NestJS + PostgreSQL + Prisma) and follows a modular monolith architecture designed to scale into microservices if and when growth justifies it.

The platform is grounded in **real cattle-management knowledge**: validated business rules around breed composition, gestation cycles, lactation curves, milk withholding periods, mastitis risk, inbreeding prevention, and the operational realities of milking twice a day in rural Colombia.

---

## 2. Problem Statement

### 2.1 The pain we solve

Small and medium cattle farms operate critical business data in fragmented and unreliable ways:

- **Production records** live in paper notebooks or generic spreadsheets, prone to loss, illegibility, and double-entry.
- **Genealogy and breed composition** is reconstructed from memory or scattered records, making selection and breeding decisions guesswork — and inbreeding risk goes undetected.
- **Health events** (vaccinations, treatments, illnesses) are tracked inconsistently, causing missed booster doses, regulatory non-compliance, undetected herd-wide issues, and contaminated milk reaching the market because medication withholding periods are forgotten.
- **Reproduction tracking** (heat detection, AI events, expected birth dates, post-partum waiting periods) is manual and error-prone, leading to lost productive cycles and premature breeding attempts.
- **Semen straw inventory** is rarely catalogued — farmers lose track of what they have in the nitrogen tank, the price they paid, and the genetic pedigree associated with each straw.
- **Financial visibility** at the per-animal level is virtually nonexistent, so farmers cannot answer basic questions like "is this cow profitable?", "what is the ROI of this bull's semen?", or "how much did it cost to raise this calf to weaning?".
- **Connectivity is unreliable** in rural areas, and existing cloud-only tools become useless precisely when the data is being generated (during milking, weighing, calving).

### 2.2 Why existing solutions fall short

| Category                                         | Limitation                                                                          |
| ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Spreadsheets                                     | No data integrity, no genealogy, no alerts, no multi-user, no offline sync          |
| Local desktop software (legacy)                  | Single-user, no backups, dated UX, Windows-only                                     |
| Enterprise herd-management systems               | Priced for industrial farms; complex onboarding; no SMB-friendly tier; English-only |
| Generic farm-management apps                     | Surface-level cattle features; weak genealogy, reproduction, and breed composition  |
| Custom-built per-farm tools                      | Unmaintained, fragile, undocumented                                                 |
| International products (PCDart, DairyComp, etc.) | Designed for industrial dairies; assume reliable connectivity; not Spanish-native   |

### 2.3 The opportunity

There is a clear market gap for a **modern, affordable, mobile-friendly, offline-capable** cattle management platform built specifically for operations between **20 and 500 head** of cattle in **Spanish-speaking markets** — large enough to need real software, small enough that enterprise solutions do not fit, and culturally and linguistically aligned with how Colombian and Latin American farmers actually run their operations.

---

## 3. Vision & Mission

### 3.1 Vision

> *Every cattle farm, regardless of size, runs on data it can trust.*

A world where the small farmer has the same operational visibility as the industrial producer — where breeding decisions, health interventions, and financial choices are driven by clear, current, accurate data rather than memory and intuition.

### 3.2 Mission

To deliver a livestock management platform that is:

- **Affordable** for farms of 20+ head.
- **Usable in the field** without reliable connectivity.
- **Trusted** with mission-critical data (auditable, secure, backed up).
- **Extensible** as the farm grows in size and sophistication.
- **Native to the region** — Spanish-first, Colombian-default, with breeds, terminology, and workflows that reflect how local farmers actually operate.

### 3.3 Product principles

1. **Field-first usability.** Every flow must work on a phone, with one hand, in bright sunlight, with gloves on.
2. **Data integrity over feature breadth.** A small set of features that always work correctly beats a long feature list that occasionally corrupts data.
3. **Offline is not an edge case.** Offline support is a primary capability, not an afterthought.
4. **Transparency by default.** The farmer owns their data. Export must be one click away.
5. **Progressive disclosure.** Show advanced features only when the user is ready.
6. **Boring technology where it counts.** Battle-tested foundations; novelty only where it earns its place.
7. **Domain-correct by default.** Every default value, every alert, every calculation reflects validated cattle-management knowledge — not engineering convenience.

---

## 4. Target Users

### 4.1 Primary persona — *The Farm Owner-Operator*

- **Profile:** Owns a dairy or mixed-purpose cattle farm with 20–500 head in Colombia or another Latin American country. Manages day-to-day operations directly or with 1–5 employees. Age range typically 30–60. Not a technologist, but uses a smartphone daily. Speaks Spanish.
- **Goals:** Increase milk yield per animal, reduce reproductive losses, control veterinary costs, prove herd health for buyers, manage semen straw inventory.
- **Frustrations:** Cannot trust paper records; spends hours each week on bookkeeping; cannot quickly answer questions from buyers, lenders, or auditors; loses track of straws in the nitrogen tank.
- **Tech comfort:** Moderate. Uses WhatsApp, banking apps, and basic spreadsheets. Will not tolerate a steep learning curve.

### 4.2 Secondary persona — *The Field Veterinarian*

- **Profile:** Independent or contracted vet servicing multiple farms. Visits each farm 1–4 times per month.
- **Goals:** Quickly view an animal's full medical history; record interventions efficiently; coordinate vaccination schedules across visits; track medication withholding periods.
- **Frustrations:** Each farm has different (or no) record-keeping; rebuilds context every visit; medication tracking is inconsistent; gets blamed when withholding periods are forgotten.
- **Tech comfort:** High. Comfortable with mobile apps and basic APIs.

### 4.3 Tertiary persona — *The Farm Employee / Field Worker*

- **Profile:** Performs daily operational tasks — milking, feeding, weighing, ear-tagging, observing heat, registering pregnancies. May rotate between farms.
- **Goals:** Record what they did, quickly, without disrupting their physical work.
- **Frustrations:** Forms with too many fields; apps that require connectivity; small touch targets.
- **Tech comfort:** Low to moderate. Uses smartphones for messaging and entertainment.

### 4.4 Quaternary persona — *The Auditor / Accountant / Buyer*

- **Profile:** External party who needs read-only access to verify herd composition, production history, or financial transactions.
- **Goals:** Verify data quickly; export reports in standard formats (PDF, Excel).
- **Frustrations:** Poor or absent audit trails; no way to verify data has not been altered.
- **Tech comfort:** High in their domain (accounting, finance), moderate with new platforms.

### 4.5 User segments we are *not* targeting (in v1)

- Industrial feedlots with thousands of head (different feature set: pen-level management, ration optimization, RFID chutes).
- Beef ranching operations with extensive grazing where individual animal tracking is impractical.
- Cooperatives requiring federated, multi-farm consolidation across legal entities.
- Government regulatory authorities (data exchange may be added later via API).
- English-first markets — internationalization is a Year 2+ initiative.

---

## 5. Scope

### 5.1 In scope (v1.0 — first stable release)

#### Core domain features

- **Farms:** registry, location, capacity, owner, configurable milking mode (per-session vs. daily total), configurable timezone.
- **Animals:** cows, bulls, calves with full lifecycle tracking, photos, weight history, breed composition (mixed breeds with percentages summing to 100%).
- **Genealogy:** maternal and paternal ancestry, recursive tree visualization up to 8 generations, automatic inbreeding-risk detection.
- **Reproduction:** pregnancy registration (natural mating, artificial insemination, embryo transfer), gestation calculation (279-283 days, 281 central), expected birth date with ±2 days range, outcome tracking, post-partum waiting period warnings, primiparous-cow flagging.
- **Semen straw inventory:** dedicated catalog with 14 trackable fields per straw (donor bull, breed, code, supplier, semen type — conventional/sexed, batch, country of origin, pedigree, productive indices, sanitary tests, freezing date, price, tank color, usability status).
- **Milk production:** per-cow daily records (configurable mode: per-session or daily total), quality metrics, period totals, mastitis-risk alerts for high-producers without recent milking, "unfit milk" flag for quarantined animals, withholding-period tracking after medication.
- **Health:** vaccinations, treatments, illnesses, automatic upcoming-event alerts, medication withholding periods, mastitis history tracking.
- **Finances:** transactions (purchases, sales, services), per-animal cost basis, calf rearing cost tracking, profitability reports. Default currency: **COP (Colombian Peso)**, configurable per tenant.
- **Notifications:** in-app + email for upcoming births (30/15/7 days), due vaccinations (7/1/0 days), heat detection (5 days), mastitis risk, inbreeding warnings, low reproductive efficiency.
- **Audit log:** immutable record of every critical mutation.

#### Cross-cutting platform features

- Multi-tenant SaaS with isolation guarantees.
- RBAC with four roles (Owner, Veterinarian, Employee, Auditor) — see permission matrix in §11.
- Authentication: email/password + TOTP MFA + OAuth2 (Google, planned).
- PWA with offline support for field-critical flows.
- Reports and exports: PDF and Excel.
- Image upload for animals.
- REST API documented with OpenAPI, available for third-party integrations.
- **Spanish UI** as the only supported language in v1.0.

#### Quality attributes

- 80%+ test coverage on critical business logic.
- p95 API latency < 500 ms under normal load.
- 99.5% uptime SLO for the SaaS deployment.
- Full data export available to the farm owner at any time.

### 5.2 Out of scope (v1.0)

- Native mobile apps (iOS/Android) — PWA covers the need.
- IoT integrations (smart scales, milk meters, RFID readers) — planned post-v1.
- Multi-currency conversion in finance reports — single-currency per tenant in v1.
- Government regulatory submissions (ICA, INVIMA in Colombia) — API hooks only.
- Pasture rotation and grazing management — out of domain.
- Feed inventory and ration formulation — out of domain.
- Marketplace or animal trading platform — out of domain.
- Genetic analysis (BLUP, EPDs, genomic predictions) — out of domain.
- Multi-farm consolidation across legal entities — single-tenant view in v1.
- English UI — Year 2+.

### 5.3 Out of scope (forever)

- Slaughter management and meat processing.
- Veterinary diagnostic AI (image recognition for diseases).
- Replacing official government identification systems.

---

## 6. Goals & Success Metrics

Goals are categorized by horizon. Each goal has a **specific, measurable target** and an **owner**.

### 6.1 Year 1 — Foundation goals

| # | Goal                                                                                | Target metric                                                          | Owner       |
| - | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------- |
| 1 | Ship a stable v1.0 covering the in-scope feature set                                | All Phase 0–3 features marked Done in `progress.md`                    | Engineering |
| 2 | Onboard and retain pilot farms in Colombia                                          | 25 paying farms, 80% month-3 retention                                 | Product     |
| 3 | Achieve operational reliability                                                     | 99.5% uptime; zero critical data-loss incidents                        | Engineering |
| 4 | Deliver field-usable mobile experience                                              | 80% of pilot users report being able to record data offline in field   | Product     |
| 5 | Establish security & compliance baseline                                            | OWASP Top 10 compliance verified; pen-test passed; SOC2-ready audit trail | Security  |
| 6 | Validate domain correctness                                                         | Veterinary advisor sign-off on breeding, lactation, and health rules   | Product     |

### 6.2 Year 2 — Growth goals

| # | Goal                                                              | Target metric                                                      |
| - | ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| 1 | Expand to 250 paying farms across LATAM                           | 250 active tenants, MRR target per business plan                   |
| 2 | Launch advanced features                                          | IoT integration MVP, advanced reproduction analytics, cooperatives |
| 3 | Open public API tier                                              | At least 3 third-party integrations live                           |
| 4 | Reach < 1% monthly churn                                          | Tracked from active subscriptions                                  |
| 5 | Internationalization                                              | English UI shipped; Brazilian Portuguese in pilot                  |

### 6.3 Product KPIs (tracked from day one)

- **Activation rate:** % of new tenants who register their first animal within 7 days of signup.
- **Daily active operators:** users who log production or health data on a given day.
- **Data completeness:** % of cows with at least one milk record per week.
- **Time-to-first-record:** median seconds from open app to first saved record (offline path).
- **Conflict rate:** offline-edits-resulting-in-conflict / total offline edits (target < 0.5%).
- **API error rate:** 5xx responses / total requests (target < 0.1%).
- **Domain-rule trigger rate:** how often safety alerts (mastitis risk, inbreeding warning, premature breeding) fire and how often users heed them.

### 6.4 Engineering KPIs

- **Lead time for changes:** PR open → production. Target < 2 days.
- **Deployment frequency:** Target ≥ 5 deploys/week to production.
- **Change failure rate:** % of deploys causing rollback or hotfix. Target < 10%.
- **Mean time to recovery (MTTR):** Target < 1 hour for production incidents.
- **Test execution time:** unit suite < 30 s, integration < 5 min, E2E < 10 min.

---

## 7. Key Constraints

### 7.1 Technical constraints

- **TypeScript everywhere** — no exceptions, frontend and backend.
- **Multi-tenant from day one** — no single-tenant deployments. Tenant isolation is a core requirement, not a feature.
- **Offline-capable** — Service Worker + IndexedDB for the critical field-data flows.
- **PostgreSQL only** — no second database engine for primary domain data. Redis is allowed for queues and caching.
- **REST + OpenAPI** as the public API contract. Internal tRPC explicitly deferred.
- **Default currency: COP** — Colombian Peso. Configurable per tenant.

### 7.2 Business constraints

- **Pricing must support farms of 20+ head** — the price ceiling is what such a farm can absorb. Targeted price band: 30,000 – 250,000 COP/month per tenant (≈ 7–60 USD).
- **Spanish UI from launch** — primary market is Spanish-speaking. English UI is planned but not v1.
- **Independent of any single cloud vendor** — deployable to any provider that supports Node, PostgreSQL, Redis, and S3-compatible storage.
- **Domain validation by a working veterinarian** — every breeding, health, and lactation rule must be reviewed and signed off by a practicing cattle veterinarian before v1.0 release.

### 7.3 Regulatory & compliance constraints

- **Data residency** — for tenants in jurisdictions with data residency requirements (Colombia's Ley 1581 de Protección de Datos Personales, applicable LATAM equivalents), deployment must be possible in-region.
- **Auditable history** — every critical mutation must be recorded in `audit_logs`, immutable.
- **Right to data portability** — full per-tenant data export in standard formats (JSON + CSV) at any time.
- **Right to deletion** — soft-delete with cryptographic erasure of personal data on request, in compliance with Ley 1581.
- **Medication withholding tracking** — relevant to milk-quality regulation. The system must surface withholding periods so that contaminated milk does not reach the market.

### 7.4 Resource constraints

- **Small initial team** — assume 2–4 engineers + 1 product + 1 designer + 1 veterinary advisor (consulting) for v1.0 delivery.
- **Limited operational headcount** — favor managed services (managed PostgreSQL, managed Redis) over self-hosted infra during the first year.

---

## 8. Assumptions & Risks

### 8.1 Assumptions

- Target farms have at least intermittent connectivity (3G or better, even if not continuous).
- Field workers carry smartphones capable of running modern PWAs (Android 9+, iOS 14+).
- Farm owners are willing to pay a monthly subscription for software (validated via pilot interviews).
- Spanish-speaking markets — beginning with Colombia — are the entry point; localization to other languages is feasible later.
- Veterinarians will adopt a shared platform if invited by farms they already work with (no separate vet-side acquisition needed in v1).
- A practicing cattle veterinarian is available as a domain advisor for the project's lifetime.

### 8.2 Risks

| Risk                                                                            | Likelihood | Impact   | Mitigation                                                                           |
| ------------------------------------------------------------------------------- | ---------- | -------- | ------------------------------------------------------------------------------------ |
| Pilot farms reject the product because of UX friction                           | Medium     | High     | Continuous user testing during Phase 1; weekly check-ins with pilot users           |
| Offline sync conflicts cause perceived data loss                                | Medium     | High     | Conservative conflict-resolution strategy; clear in-app messaging; integration tests |
| Underestimated complexity of genealogy, breed composition, and reproduction logic | Medium   | Medium   | Veterinary advisor on retainer; reference real veterinary publications; `businessRules.md` reviewed before each phase |
| Scaling challenges at 1,000+ tenants on the modular monolith                    | Low (year 1) | Medium  | Architecture is extraction-ready; monitor metrics from day one                       |
| Regulatory changes introduce mandatory animal traceability formats (ICA)        | Medium     | Medium   | Decouple internal IDs from external IDs; design for mappable identifiers             |
| Security incident (data breach, account takeover)                               | Low        | Critical | Defense-in-depth: MFA, audit logs, rate limiting, pen-tests, incident response plan |
| Pricing model does not match Colombian farmer willingness-to-pay                | Medium     | High     | Pricing experiments during pilot; tiered model with a free trial                     |
| Competitor releases a similar offering with deeper pockets                      | Low        | High     | Focus on UX excellence and Colombian-market fit; build community moats               |
| Key technical dependency (Prisma, NestJS) introduces breaking changes           | Low        | Medium   | Pin major versions; track upstream roadmaps; maintain abstraction layers             |
| Domain rules drift over time as veterinary knowledge evolves                    | Low        | Medium   | Quarterly review of `businessRules.md` with veterinary advisor                       |

---

## 9. Stakeholders

### 9.1 Internal stakeholders

| Role             | Responsibility                                                |
| ---------------- | ------------------------------------------------------------- |
| Product Owner    | Vision, prioritization, roadmap                               |
| Tech Lead        | Architecture decisions, technical quality, hiring             |
| Backend Engineers | API, data model, integrations                                 |
| Frontend Engineers | PWA, design system, offline sync                              |
| Designer         | UX flows, design system, accessibility                        |
| QA / SDET        | Test strategy, automation, release sign-off                   |
| DevOps / SRE     | Infrastructure, observability, incident response              |
| Veterinary Advisor | Domain validation; sign-off on breeding, health, lactation rules |

### 9.2 External stakeholders

| Role                  | Relationship                                                    |
| --------------------- | --------------------------------------------------------------- |
| Pilot farms           | Primary feedback loop during v1.0 development                   |
| Veterinary advisors   | Domain expertise on reproduction, health, genealogy             |
| Hosting provider      | Managed PostgreSQL, Redis, object storage                       |
| Payment processor     | Subscription billing for SaaS — MercadoPago for COP/LATAM, Stripe for international |
| Email / SMS provider  | Transactional notifications                                     |
| Security auditor      | Annual penetration testing and code review                      |

---

## 10. High-Level Roadmap

> **Detailed status lives in `progress.md`.** This section gives the strategic shape of the work.

### Phase 0 — Foundations *(Sprints 1–2)*

Project scaffolding, CI/CD, Docker, database baseline, authentication, RBAC, audit log, exception handling. The "production-ready skeleton".

### Phase 1 — MVP core *(Sprints 3–6)*

Farms (with milking-mode configuration), animals (with photos, weights, breed composition), breeds catalog (12 Colombian/LATAM breeds), genealogy basic view, milk production daily logging (both modes), basic dashboard. **Exit criterion:** a real Colombian dairy can run daily operations on the system.

### Phase 2 — Reproduction & health *(Sprints 7–9)*

Pregnancy lifecycle (with 281-day gestation, post-partum warnings), semen straw inventory, health events (with medication withholding periods), alerts (births at 30/15/7 days, vaccinations at 7/1/0 days, heat detection at 5 days, mastitis risk), in-app + email notifications, scheduled background jobs.

### Phase 3 — Finance & reports *(Sprints 10–12)*

Financial transactions (COP-native), profitability reports, calf rearing cost tracking, PDF/Excel exports, period-based production reports.

### Phase 4 — Field readiness *(Sprints 13–15)*

PWA offline sync hardening, bulk milk import (CSV/Excel), conflict resolution UI, performance tuning.

### Phase 5 — Public API & integrations *(Sprints 16–18)*

Public API tier, API key management, webhooks, first third-party integrations.

### Phase 6 — Scale & advanced features *(Year 2)*

IoT integrations, advanced analytics, cooperatives, multi-language (English + Brazilian Portuguese), native mobile if justified.

---

## 11. Non-Negotiables

These are commitments that override any conflicting decision:

1. **Tenant isolation is absolute.** No code path may return data across tenants. Ever.
2. **Audit log is append-only.** No update or delete operations on `audit_logs`, even by superusers.
3. **Passwords are never logged, returned, or exposed.** Even in error responses, even in development.
4. **Strict TypeScript.** `any` is forbidden. CI fails on type errors.
5. **Tests must pass before merge.** No bypass. No exceptions.
6. **Refresh-token reuse triggers full family invalidation.** Token theft must be detectable and contained.
7. **The farm owner owns their data.** Export must work in any state, including after subscription cancellation, for at least 90 days.
8. **Offline-capable flows must never silently lose data.** Conflicts surface to the user.
9. **Conventional Commits and protected branches.** Direct pushes to `main` and `develop` are disabled.
10. **Documentation is part of the deliverable.** A feature is not Done until its documentation is updated.
11. **Domain rules in `businessRules.md` are authoritative.** Engineering does not invent or override rules. Disagreement triggers veterinary review, not unilateral change.
12. **Medication withholding periods are inviolable.** Milk produced during a withholding period is automatically flagged "unfit"; no override is exposed in the UI.

### 11.1 RBAC permission matrix (v1.0)

This matrix is the authoritative source for role permissions. Implementation in `RolesGuard` must match it exactly. It is consistent with `businessRules.md` §9.

| Action                                       | OWNER | VETERINARIAN | EMPLOYEE | AUDITOR |
| -------------------------------------------- | :---: | :----------: | :------: | :-----: |
| View all animals                             |  ✅   |      ✅      |    ✅    |   ✅    |
| Create / edit animals                        |  ✅   |      ❌      |    ✅    |   ❌    |
| Change animal status                         |  ✅   |      ✅      |    ❌    |   ❌    |
| Register milk production                     |  ✅   |      ❌      |    ✅    |   ❌    |
| Register pregnancy                           |  ✅   |      ✅      |    ✅    |   ❌    |
| Register health events                       |  ✅   |      ✅      |    ❌    |   ❌    |
| View finances                                |  ✅   |      ❌      |    ❌    |   ✅    |
| Register financial transactions              |  ✅   |      ❌      |    ❌    |   ❌    |
| Mark calf as bull candidate                  |  ✅   |      ✅      |    ❌    |   ❌    |
| Manage farm users                            |  ✅   |      ❌      |    ❌    |   ❌    |
| View reports                                 |  ✅   |      ✅      |    ❌    |   ✅    |
| View audit log                               |  ✅   |      ❌      |    ❌    |   ✅    |
| Manage semen straws inventory                |  ✅   |      ✅      |    ❌    |   ❌    |
| Configure farm settings (milking mode, etc.) |  ✅   |      ❌      |    ❌    |   ❌    |

---

## 12. Open Questions

> Questions raised during planning that must be resolved before or during the relevant phase. Each carries an owner and a target resolution date.

| #  | Question                                                                       | Phase to resolve | Owner    |
| -- | ------------------------------------------------------------------------------ | ---------------- | -------- |
| 1  | Final pricing tiers in COP and free-trial duration                             | Phase 1          | Product  |
| 2  | ~~Hosting provider for managed PostgreSQL (Neon, Supabase, RDS, Railway)~~ ✅ **Resolved 2026-05-07: Railway + Cloudflare R2 (see ADR-023)** | Resolved | DevOps   |
| 3  | Payment processor — MercadoPago for COP, Stripe for international, both?       | Phase 3          | Product  |
| 4  | Email provider (Resend, Postmark, SES)                                         | Phase 2          | DevOps   |
| 5  | Should we expose a separate vet-facing landing experience or share the same UI? | Phase 1          | Design   |
| 6  | What is the minimum supported Android version for the PWA?                     | Phase 1          | Frontend |
| 7  | Conflict resolution policy: last-write-wins per field vs. user-merge dialog?   | Phase 4          | Product + Engineering |
| 8  | How do we structure the breed-composition UI (sliders, percentages, presets)?  | Phase 1          | Design   |
| 9  | Do pilot farms get a dedicated success manager?                                | Phase 1          | Product  |
| 10 | Open-source posture: keep proprietary, or open-source the core?                | Year 2 review    | Founders |
| 11 | Should milking-mode be switchable mid-life of a farm, or locked once chosen?   | Phase 1          | Product  |
| 12 | Withholding-period catalog — built-in for common medications, or fully manual? | Phase 2          | Product + Vet |

---

## Document Maintenance

This document is reviewed at the start of every phase and after every major business event (funding round, pivot, market expansion). Substantive changes require a PR titled `docs(brief): <short description>` with maintainer approval. Minor edits (typos, link fixes) can be made directly.

The **single owner** of this document is the Product Owner. Disputes about scope, target users, or success metrics are resolved by referencing this document; if the document does not answer, this document is updated.

When this document and `businessRules.md` disagree on a domain matter, **`businessRules.md` wins** and this document is updated to reflect it.
