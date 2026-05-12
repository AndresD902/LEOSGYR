# Active Context — CattlePro

> **Status:** Phase 0 unblocked — hosting resolved, ready for monorepo initialization
> **Last updated:** 2026-05-07
> **Updated by:** Architecture (after agent feedback and three blocking decisions)
>
> **This is the first document you read when retaking a session.** It captures **where the work is right now, what just happened, what is next, and what context to load before doing anything**. Everything else in the documentation describes the project; this describes *the moment*.
>
> **Operational rule:** every PR that changes the active state of work updates this document in the same commit. A stale `activeContext.md` is a critical bug — it sends agents and humans down the wrong path.

---

## Table of Contents

1. [How to Use This Document](#1-how-to-use-this-document)
2. [Snapshot — Right Now](#2-snapshot--right-now)
3. [Recently Completed](#3-recently-completed)
4. [In Progress](#4-in-progress)
5. [Up Next (Immediate Queue)](#5-up-next-immediate-queue)
6. [Active Decisions and Open Questions](#6-active-decisions-and-open-questions)
7. [Context to Load Before Working](#7-context-to-load-before-working)
8. [Working Conventions in Force](#8-working-conventions-in-force)
9. [Environment Status](#9-environment-status)
10. [Recent Notes and Reasoning](#10-recent-notes-and-reasoning)
11. [Handoff Checklist](#11-handoff-checklist)
12. [Update Protocol](#12-update-protocol)

---

## 1. How to Use This Document

### 1.1 If you are an agent (AI coder) starting a new session

Read sections in this exact order, top to bottom, before writing any code:

1. **§2 Snapshot — Right Now**: understand the current phase, sprint, and active focus.
2. **§3 Recently Completed**: know what already exists so you don't rebuild it.
3. **§4 In Progress**: know what is mid-flight; do not duplicate or interfere.
4. **§5 Up Next**: know what to pick up.
5. **§7 Context to Load Before Working**: open the documents and files listed there before generating code.
6. **§8 Working Conventions in Force**: follow these without exception.
7. **§11 Handoff Checklist**: if you are the *previous* agent ending a session, fill this before you stop.

### 1.2 If you are a human developer

Same order. The document was written for both.

### 1.3 What this document is *not*

- Not a specification — that's `features.md`, `dataModel.md`, `businessRules.md`.
- Not a roadmap — that's `progress.md`.
- Not a design rationale — that's `decisions.md`.
- Not a permanent record — sections 3, 4, 5, 9, 10 churn weekly. The file's value is **freshness**, not history.

### 1.4 Document scope

`activeContext.md` covers a **rolling 1–2 week window** of work. Anything older than ~2 weeks moves out — completed work goes to `progress.md` history, abandoned work is documented as tech debt or open questions.

---

## 2. Snapshot — Right Now

| Field                      | Value                                                                                  |
| -------------------------- | -------------------------------------------------------------------------------------- |
| **Current phase**          | Phase 0 — Foundations                                                                  |
| **Current sprint**         | N/A — sprint 1 not started                                                             |
| **Active focus**           | Hosting resolved (Railway). Three doc inconsistencies fixed. **Ready to initialize the monorepo.** |
| **Codebase status**        | Empty — no `apps/` or `packages/` directories yet                                       |
| **Pilot farms onboarded**  | 0 (target Phase 1: 1; Phase 2: 3)                                                       |
| **Production deployments** | 0                                                                                       |
| **Staging deployments**    | 0 (Railway target chosen; provisioning pending)                                         |
| **Open P0/P1 incidents**   | 0                                                                                       |
| **Last CI green commit**   | n/a                                                                                     |

> **Where we are in plain language:** the documentation is complete and internally consistent. The hosting decision is resolved (Railway + Cloudflare R2 — `decisions.md` ADR-023). Three documentation inconsistencies surfaced by the IA agent during plan review have been fixed: `CANCELLED_CORRECTION` and `ANIMAL_DEATH_LOSS` are now first-class enum values in `dataModel.md`, and all references across `features.md` and `useCases.md` are aligned. **The next step is to initialize the monorepo (Phase 0 §3.1).**

---

## 3. Recently Completed

> What has been finished in roughly the last week. Items here are also reflected in `progress.md` if they involve code; this section is broader and includes documentation, decisions, and operational tasks.

### Resolutions (2026-05-07)

After the IA programming agent reviewed the documentation and proposed a development plan, three blocking items surfaced. All three were resolved by the owner:

- ✅ **ADR-023: Hosting target = Railway + Cloudflare R2** — added to `decisions.md`. Resolves `projectbrief.md` open question #2 and unblocks the staging deployment workflow. Migration triggers documented.
- ✅ **`CANCELLED_CORRECTION` added to `PregnancyOutcome` enum** in `dataModel.md` §12.6. Aligns with `features.md` REPRODUCTION.04 which had been referencing this value without it being formally defined.
- ✅ **`ANIMAL_DEATH_LOSS` added as a first-class value in `FinancialTransactionType`** in `dataModel.md` §12.8. Replaces the v1.1 pattern of `OTHER_EXPENSE + metadata.deathLoss = true`. All references updated in `features.md` (FINANCE.01, FINANCE.02, ANIMALS.06) and `useCases.md` (UC.OWNER.06, UC.CROSS.04). `dataModel.md` is now v1.2.

### Documentation foundation (2026-05-02)

- ✅ `decisions.md` v1.0 — 22 ADRs covering all top-level architectural decisions.
- ✅ `projectbrief.md` v1.1 — vision, scope, target market (Colombia/LATAM, COP), permission matrix, non-negotiables. **Updated to v1.1 to align with `businessRules.md`.**
- ✅ `productContext.md` v1.0 — personas, jobs-to-be-done, day-in-the-life, experience principles, anti-patterns.
- ✅ `dataModel.md` v1.1 — full schema, invariants, lifecycle rules, cross-cutting invariants. **Updated to v1.1 incorporating all `businessRules.md` rules + 11 additional rules (inbreeding, primiparous flagging, lactation curves, mastitis history, calf rearing cost, etc.).**
- ✅ `features.md` v1.0 — 100+ features across 20 modules with business rules, edge cases, errors, audit.
- ✅ `useCases.md` v1.0 — 40+ use cases organized by role, plus 6 cross-role scenarios.
- ✅ `systemPatterns.md` v1.0 — 24 patterns covering monorepo, modular monolith, layered architecture, repository/service/controller, error handling, auth, RBAC, tenant scoping, audit, events, jobs, locking, idempotency, observability, testing, frontend, security, anti-patterns.
- ✅ `techContext.md` v1.0 — exhaustive stack with exact versions across backend, frontend, shared packages, DB, Redis, storage, observability, testing, tooling, CI/CD.
- ✅ `progress.md` v1.0 — phase-by-phase task tracker with 5-state markers; initial state with no tasks marked Done.

### `businessRules.md` (provided 2026-05-02 by owner)

- ✅ Owner-authored business rules document covering animal status transitions, gestation, post-partum intervals, breed composition, milk production rules, semen straw inventory, valuation factors, alerts, and roles. **Treated as authoritative on domain matters.**

### Validation against business rules

- ✅ Cross-referenced `decisions.md`, `projectbrief.md`, `dataModel.md` against `businessRules.md`.
- ✅ Identified and corrected 9 conflicts and 5 omissions in `dataModel.md` (now v1.1).
- ✅ Identified and corrected 3 alignment issues in `projectbrief.md` (now v1.1) — currency default to COP, EMPLOYEE pregnancy permission, breed list.
- ✅ Confirmed `decisions.md` had no conflicts.

---

## 4. In Progress

> Work that is currently mid-flight. Each item lists owner, expected completion, and what the next step is.

| Item | Owner | Status | Next step |
| ---- | ----- | ------ | --------- |
| (None) | — | — | — |

> **No code work is in flight right now.** The team has just completed the documentation foundation and has not yet started Phase 0 implementation.

---

## 5. Up Next (Immediate Queue)

> The next 1–3 things to pick up. Items are listed in **priority order**. The top item is what the next agent or developer should start with unless instructed otherwise.

### Priority 1 — Initialize the monorepo

**Why now:** Phase 0 §3.1 is the prerequisite for everything. With the hosting decision resolved (Railway + Cloudflare R2), the monorepo can be initialized and CI workflows can target Railway in the same PR if desired.

**What to do:**

1. Initialize `pnpm` workspace with the directory layout in `systemPatterns.md` §2.1.
2. Wire up Turborepo with `turbo.json` per `techContext.md` §3.1.
3. Configure `tsconfig.base.json` with the strict-mode set per `techContext.md` §2.1.
4. Create the four shared config packages: `@cattlepro/config-typescript`, `@cattlepro/config-eslint`, `@cattlepro/config-tailwind`, `@cattlepro/validation` (placeholder, schemas added per module).
5. Configure Prettier `.prettierrc` and `.editorconfig` and `.nvmrc`.
6. Set up Husky + Commitlint per `techContext.md` §14.3.
7. Verify `pnpm install` and `pnpm lint && pnpm type-check` pass on the empty workspace.
8. Commit with conventional commit messages; flip the corresponding `progress.md` checkboxes.

**Estimated effort:** 1 day for an experienced engineer.

**Owner:** First Phase 0 developer.

### Priority 2 — Docker compose + database baseline

**Why now:** With the monorepo in place, the next blocker is having a runnable PostgreSQL+PostGIS, Redis, and MinIO. Without these, no integration tests can run.

**What to do:**

1. Create `docker/docker-compose.yml` (postgres+postgis, redis, minio with named volumes, healthchecks).
2. In `apps/api/prisma/schema.prisma`, transcribe the entities defined in `dataModel.md` Phase 0+1 scope:
   - `Tenant`, `User`, `RefreshToken`, `Farm`, `FarmUserAssignment`, `Breed`, `Animal`, `BreedComposition`, `CowProfile`, `BullProfile`, `CalfProfile`, `WeightRecord`, `AnimalPhoto`, `AuditLog`, `Notification`.
   - Use the exact column names, types, and constraints documented (including the new enum values from v1.2).
3. Run `prisma migrate dev --name init` to generate the first migration.
4. Author `apps/api/prisma/seed.ts` with the 14 seeded breeds (12 named + Mestizo + Cruce per `dataModel.md` §5.1).
5. Verify `pnpm prisma:generate && pnpm prisma:migrate && pnpm prisma:seed` work end-to-end against Docker postgres.

**Estimated effort:** 1–2 days.

**Owner:** First Phase 0 developer.

### Priority 3 — Provision Railway staging environment

**Why now:** Once the monorepo and schema are in place, having a deployed staging environment validates the deployment pipeline early. Railway makes this a same-day task once the project is wired up.

**What to do:**

1. Create a Railway project; provision PostgreSQL and Redis services.
2. Wire the GitHub repo to Railway with auto-deploy on `develop`.
3. Create a Cloudflare R2 bucket for animal photos; generate access keys.
4. Configure environment variables on Railway: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `COOKIE_SECRET`, `R2_*`, `CORS_ORIGIN`, etc.
5. Verify `pnpm prisma migrate deploy` runs successfully on the staging database.
6. Smoke test: a `GET /health` endpoint returns 200 from the deployed staging.

**Estimated effort:** 0.5–1 day.

**Owner:** DevOps / first Phase 0 developer.

---

## 6. Active Decisions and Open Questions

> Decisions that are pending, or recent decisions that are still affecting work.

### Open questions blocking Phase 0

> **None remaining.** Hosting decision was resolved (see Recent decisions below). Phase 0 can proceed.

### Open questions not blocking Phase 0

1. **Email provider** — Resend / Postmark / SES. Blocks Phase 2 completion. Decision can be deferred to early Phase 2.
2. **Pricing tiers in COP** — needed for Phase 1 launch.
3. **Payment processor** — needed for Phase 3 (MercadoPago for COP, Stripe international, both?).
4. **Vet-facing landing page** — Phase 1 design decision.
5. **Minimum supported Android version** — Phase 1 design decision.
6. **Conflict resolution UX** — Phase 4.
7. **Breed-composition UI shape** — Phase 1 design decision.
8. **Pilot success manager** — Phase 1.
9. **Open-source posture** — Year 2 decision.
10. **Milking-mode switchability** — Phase 1 design decision (default per `dataModel.md`: locked once milk records exist).
11. **Withholding catalog: built-in vs. tenant-editable** — Phase 2 product decision.

> All open questions also live in `projectbrief.md` §12 with their target-resolution phase. The list above is a snapshot for quick scanning.

### Recent decisions (kept here briefly until they fully integrate into the docs)

- **2026-05-07 — Hosting target: Railway + Cloudflare R2** (ADR-023). Resolves `projectbrief.md` open question #2. Migration triggers documented in the ADR for revisiting when scale demands it.
- **2026-05-07 — `CANCELLED_CORRECTION` is a formal `PregnancyOutcome` value** in `dataModel.md` §12.6. Used by REPRODUCTION.04 for record corrections; excluded from the post-adverse-event acknowledgement check.
- **2026-05-07 — `ANIMAL_DEATH_LOSS` is a first-class `FinancialTransactionType`** in `dataModel.md` §12.8. Replaces the v1.1 `OTHER_EXPENSE + metadata.deathLoss` pattern. Cleaner reports; death losses are no longer hidden under "Other".
- **2026-05-02 — `businessRules.md` is authoritative on domain matters.** When this document conflicts with code or with structural docs, `businessRules.md` wins. Documented as non-negotiable #11 in `projectbrief.md`.
- **2026-05-02 — Default currency is COP.** `Tenant.defaultCurrency` defaults to `'COP'`; `Farm.currency` and `Animal.currency` inherit from tenant.
- **2026-05-02 — Primary market is Colombia/LATAM.** Spanish-only UI in v1.0; Brazilian Portuguese pilot in Year 2.
- **2026-05-02 — Veterinary advisor sign-off required before v1.0 release.** Goal #6 in Year 1.

---

## 7. Context to Load Before Working

> Before generating code, an agent loads these documents into context. The list is task-aware: only what's needed for the immediate work, to keep prompts focused.

### For *any* code work

Always load:

- `systemPatterns.md` — code patterns, anti-patterns.
- `techContext.md` — approved versions of every dependency.
- This file — current state.

### For database / schema work

Add:

- `dataModel.md` — entity specs and invariants.
- `businessRules.md` — domain rules.
- The current `apps/api/prisma/schema.prisma` if it exists.

### For backend feature work

Add:

- `features.md` — the relevant module section.
- `useCases.md` — the relevant role/scenario.
- `dataModel.md` — affected entities.
- `businessRules.md` — domain rules in scope.

### For frontend feature work

Add:

- `features.md` — the relevant module section.
- `useCases.md` — relevant flows.
- `productContext.md` — UX principles, the "field-first" mindset.

### For authentication / authorization work

Add:

- `decisions.md` ADR-010, ADR-011, ADR-012, ADR-013.
- `dataModel.md` §3 (Tenancy & Identity).
- `features.md` modules `AUTH` and `USERS`.
- `systemPatterns.md` §10–§12 (Auth, RBAC, Tenant Scoping).
- `projectbrief.md` §11.1 (RBAC matrix).

### For finance / reporting work

Add:

- `features.md` modules `FINANCE`, `CALF_COST`, `REPORTS`.
- `dataModel.md` §10 (Finance Domain).
- `businessRules.md` §7 (Valuation).

### For test work

Add:

- `systemPatterns.md` §20 (Testing Pattern).
- The features and entities being tested.

> **Rule of thumb:** load *enough* context to make correct decisions, but not so much that the agent loses focus. Five focused documents is better than ten unfocused ones.

---

## 8. Working Conventions in Force

> Things that are decided and **must not be questioned in the current session**. If an agent thinks one of these is wrong, the answer is to flag it as an open question — not to deviate.

### Code

- TypeScript strict mode. **`any` is forbidden.** ESLint enforces.
- All input validation goes through Zod schemas in `@cattlepro/validation`.
- Repositories receive `tenantId` as the first argument. Always.
- Services throw `DomainError` subclasses. Never `HttpException`.
- Controllers are thin (5–15 lines per handler). Business logic in services.
- Cross-tenant access returns **`404`**, not `403`.

### Naming

- Code in English: variables, functions, classes, files, branches, commits.
- User-facing strings in Spanish (`es-CO`).
- Database tables: `snake_case` plural (`animals`).
- Database columns: `camelCase` (Prisma maps to whatever PostgreSQL prefers).

### Git

- Conventional Commits enforced by Commitlint.
- Branch names: `feature/<short>`, `fix/<short>`, `chore/<short>`.
- PRs must pass CI green and have ≥ 1 review approval.
- Squash-merge to keep `develop` history clean.
- Direct push to `main` and `develop` is forbidden.

### Documentation

- Every PR that changes a feature, the schema, or the active state updates the corresponding doc in the **same PR**.
- A feature is not Done until its checkbox in `progress.md` is flipped *and* its description in `features.md` reflects reality.

### Authority chain

When two documents disagree:

1. `businessRules.md` wins on domain matters.
2. `dataModel.md` wins on database structure.
3. `decisions.md` wins on top-level architecture.
4. `projectbrief.md` wins on scope, target market, permissions matrix, non-negotiables.
5. `systemPatterns.md` wins on code organization patterns.
6. `features.md` wins on what an endpoint does.
7. `useCases.md` wins on user flows.
8. `techContext.md` wins on dependency versions.
9. `progress.md` wins on what is built.
10. `activeContext.md` wins on what is happening *right now*.

---

## 9. Environment Status

> Health of the environments. Updated whenever an environment changes state.

| Environment    | Status            | URL  | Last deploy  | Notes |
| -------------- | ----------------- | ---- | ------------ | ----- |
| **Local dev**  | Not yet runnable  | n/a  | n/a          | Awaiting Phase 0 §3.1, §3.2 |
| **CI**         | Not configured    | n/a  | n/a          | Awaiting Phase 0 §3.10 |
| **Staging**    | Not provisioned   | n/a  | n/a          | Awaiting hosting decision (Priority 1) |
| **Production** | Not provisioned   | n/a  | n/a          | Phase 1 minimum |

### Outage / incident log

| Date | Environment | Severity | Summary | Resolution |
| ---- | ----------- | -------- | ------- | ---------- |
| —    | —           | —        | —       | —          |

> Empty until something happens. When an incident occurs: log here briefly, link to a full post-mortem in `docs/security/incidents/<date>-<short>.md` (placeholder).

---

## 10. Recent Notes and Reasoning

> Free-form section for notes, hypotheses, and reasoning that doesn't fit elsewhere. Bullets, not prose. Anything older than ~2 weeks moves out (to `decisions.md` if structural, to a tech-debt entry if not, or is deleted if irrelevant).

### Notes from documentation kickoff (2026-05-02)

- The owner provided a substantial, knowledgeable `businessRules.md`. Treating it as **authoritative on domain matters** removed friction from data-model decisions: rules like the 281-day gestation, post-partum waiting periods, and mastitis-risk thresholds came directly from it.
- The data model grew significantly (v1.0 → v1.1) to absorb domain reality: `BreedComposition` (replacing a single `breedId`), `SemenStraw`, `MedicationWithholdingPeriod`, `LactationPeriod`, `CalfRearingCost`. Each addition is justified by a documented rule.
- Eleven additional cross-cutting rules were proposed and accepted: inbreeding detection at 6.25%, birth interval > 400 days, low-fertility detection at <30% with ≥10 services, 305-day standard lactation, 14-day colostrum window, 3+ mastitis cases as risk indicator, primiparous flagging, lactation-curve anomaly detection, etc. These came from common dairy-management knowledge and have been documented as such; they require veterinary sign-off (Goal #6) before v1.0 release.
- The permission matrix in `projectbrief.md` §11.1 is now the single source of truth across all docs. Initial drafts had EMPLOYEE not allowed to register pregnancy; `businessRules.md` corrected this. The rest of the matrix matches.
- The **non-negotiables** in `projectbrief.md` §11 grew from 10 to 12 to encode (a) `businessRules.md` is authoritative, (b) medication withholding periods are inviolable. These prevent shortcuts under future pressure.

### Hypotheses to verify in Phase 1

- The 3-tap milking flow (open app → tap cow → tap liters → tap done) will be intuitive on a mid-tier Android phone with gloves on. Test with pilot farm #1 in Sprint 4.
- The breed-composition picker (sliders or numeric inputs) will be usable for non-technical owners. Open question #8 in `projectbrief.md`. Prototype required before deciding.
- The kinship coefficient calculation (simplified estimate, not Wright's coefficient) will be "good enough" for inbreeding warnings up to 6.25%. If the simplified version produces too many false positives or negatives, upgrade in Phase 2.

### Reasoning anchors

- **Why we did not generate `decisions.md` ADR-023 (hosting) yet:** the decision should be made by the team that will operate the system, with cost numbers in hand. Generating it during the documentation phase would be premature.
- **Why we kept v1.0 simple on multi-currency:** every additional dimension (multi-currency, multi-locale, multi-jurisdiction) compounds tenant-isolation testing and migration risk. We start single-currency per tenant; add when at least 5 tenants demand it.

---

## 11. Handoff Checklist

> Fill this section out **before ending a session**. The next agent picks up cleanly only if you do.

- [ ] **§2 Snapshot updated** with current phase / sprint / focus.
- [ ] **§3 Recently Completed** updated with what you finished this session.
- [ ] **§4 In Progress** reflects exactly what is mid-flight; if nothing is, the table says "(None)".
- [ ] **§5 Up Next** is correct and ordered by priority.
- [ ] **§9 Environment Status** updated if you deployed or broke anything.
- [ ] **§10 Recent Notes** has any reasoning or hypotheses worth preserving.
- [ ] All in-flight code is committed (or stashed with a clear branch name).
- [ ] All in-flight test failures are noted in `§4 In Progress` so they're not surprises.
- [ ] If you flipped any `progress.md` checkbox, you also updated `features.md` if behavior changed.
- [ ] Date at the top of this document is updated.

> **A clean handoff is the difference between the next session starting in 5 minutes and 50 minutes.** Take the 5 minutes.

---

## 12. Update Protocol

### 12.1 Who updates this document

Anyone who is the **active worker** at a given moment. There is no central documentarian — the worker writes the truth as they observe it.

### 12.2 When to update

| Event                                                | Update           |
| ---------------------------------------------------- | ---------------- |
| Starting a session                                   | Skim, don't edit |
| Beginning a new task                                 | Move task from §5 to §4 |
| Completing a task                                    | Move task from §4 to §3; flip checkboxes in `progress.md` |
| Discovering a new open question                      | Add to §6 |
| Resolving an open question                           | Move resolution to §6 "Recent decisions" + update `projectbrief.md` §12 |
| Environment state change (deploy, outage, recovery)  | Update §9 |
| End of session                                       | Run §11 Handoff Checklist |

### 12.3 What lives here vs. elsewhere

| Type of content                                      | Lives here? |
| ---------------------------------------------------- | ----------- |
| What is currently being worked on                    | ✅ Yes (§4) |
| What is next in priority order                       | ✅ Yes (§5) |
| Notes on reasoning during a session                  | ✅ Yes (§10) |
| The full project roadmap                             | ❌ `progress.md` |
| Permanent architecture decisions                     | ❌ `decisions.md` |
| Permission matrix                                    | ❌ `projectbrief.md` §11.1 |
| Schema specification                                 | ❌ `dataModel.md` |
| Feature spec                                         | ❌ `features.md` |
| Use cases by role                                    | ❌ `useCases.md` |

### 12.4 How long content stays

| Section          | Retention                                                          |
| ---------------- | ------------------------------------------------------------------ |
| §2 Snapshot      | Always current (fully replaced as state changes)                  |
| §3 Recently Completed | Last ~2 weeks; older items removed                            |
| §4 In Progress   | Always current                                                    |
| §5 Up Next       | Always current; items move to §4 when started                     |
| §6 Open Questions | Until resolved; resolved questions briefly noted under "Recent decisions" then removed after ~2 weeks |
| §9 Environment Status | Always current                                                |
| §10 Recent Notes | Last ~2 weeks; older content moves to `decisions.md` (if structural), tech debt log (if action item), or is deleted |

> The point of `activeContext.md` is **freshness**, not history. A doc full of 6-month-old notes is useless. Trim aggressively.

---

## Document Maintenance

This document is updated **every working session** — both when starting and when ending. It is the only document with a strict freshness expectation.

When the document and reality disagree: **fix the document immediately**, even if it's just a one-line update. A stale `activeContext.md` is treated as a critical bug.

The format itself is stable; the content churns. Sections 1, 7, 8, 11, 12 (the "instructions") rarely change. Sections 2, 3, 4, 5, 6, 9, 10 (the "state") change constantly.
