# Progress — CattlePro

> **Status:** Initial state — Phase 0 not yet started
> **Last updated:** 2026-05-02
> **Owner:** Tech Lead
>
> This document tracks **what has been built, what is in progress, and what is pending** across every phase and module. It is the **dynamic counterpart** of `projectbrief.md` and `features.md`: those describe the goal; this describes the reality.
>
> **An agent retaking work on the project reads this document first** to know what already exists and what to build next. A feature is **not Done** until it is checked off here, and the corresponding tests pass in CI.
>
> When this document and the actual codebase disagree, the **codebase wins** and this document is updated to reflect reality. Out-of-date progress reports are treated as a documentation bug and fixed in the next commit.

---

## Table of Contents

1. [Status Conventions](#1-status-conventions)
2. [Phase Overview](#2-phase-overview)
3. [Phase 0 — Foundations](#3-phase-0--foundations)
4. [Phase 1 — MVP Core](#4-phase-1--mvp-core)
5. [Phase 2 — Reproduction & Health](#5-phase-2--reproduction--health)
6. [Phase 3 — Finance & Reports](#6-phase-3--finance--reports)
7. [Phase 4 — Field Readiness (Offline & PWA)](#7-phase-4--field-readiness-offline--pwa)
8. [Phase 5 — Public API & Integrations](#8-phase-5--public-api--integrations)
9. [Phase 6 — Scale & Advanced (Year 2)](#9-phase-6--scale--advanced-year-2)
10. [Cross-Cutting Quality Gates](#10-cross-cutting-quality-gates)
11. [Documentation Status](#11-documentation-status)
12. [Known Issues and Tech Debt](#12-known-issues-and-tech-debt)
13. [Velocity and Health Metrics](#13-velocity-and-health-metrics)

---

## 1. Status Conventions

Each task carries one of five status markers:

| Marker  | Meaning                                                                                |
| ------- | -------------------------------------------------------------------------------------- |
| ⬜       | **Not started.** No code, no design.                                                   |
| 🟦      | **Designed.** Decision documented (in `decisions.md`, `dataModel.md`, `features.md`); no code yet. |
| 🟨      | **In progress.** Code is being written or reviewed; not yet merged to `develop`.       |
| 🟩      | **Done.** Merged to `develop`, tests pass in CI, documented.                           |
| 🟪      | **Done & deployed.** Live in staging or production.                                    |

**Strict rule:** a task moves from 🟨 to 🟩 only when:

1. Code is merged to `develop`.
2. CI is green (lint, type-check, unit, integration).
3. Coverage threshold is met.
4. Documentation reflecting the change is also merged.

A task moves from 🟩 to 🟪 only when the deployment workflow has run successfully and a smoke test in the target environment passed.

### 1.1 Updating this document

When a developer finishes a task:

1. Flip its checkbox / marker.
2. Update the date at the top of the document.
3. Commit with the same PR that delivers the task: `docs(progress): mark <task> as done`.

When a task is split or a new sub-task emerges:

1. Add a row with status ⬜.
2. Reference the parent task or feature ID.

### 1.2 Cross-references

Every task references a feature ID from `features.md` when applicable (e.g., `→ ANIMALS.01`). Tasks without a feature ID are typically infrastructure or quality work.

---

## 2. Phase Overview

| Phase | Name                                | Status | Target           |
| ----- | ----------------------------------- | ------ | ---------------- |
| 0     | Foundations                         | ⬜     | Sprints 1–2      |
| 1     | MVP Core                            | ⬜     | Sprints 3–6      |
| 2     | Reproduction & Health               | ⬜     | Sprints 7–9      |
| 3     | Finance & Reports                   | ⬜     | Sprints 10–12    |
| 4     | Field Readiness (Offline & PWA)     | ⬜     | Sprints 13–15    |
| 5     | Public API & Integrations           | ⬜     | Sprints 16–18    |
| 6     | Scale & Advanced                    | ⬜     | Year 2           |

**Current phase:** Phase 0. **Current sprint:** N/A (not started).

> The exit criterion of Phase 1 is the strictest gate: *"a real Colombian dairy can run daily operations on the system."* Per `projectbrief.md` §10.

---

## 3. Phase 0 — Foundations

> **Goal:** A production-ready skeleton — every cross-cutting concern wired up, no domain features yet. When Phase 0 ends, every subsequent module is a matter of "fill in the pattern."
>
> **Exit criterion:** A new developer can clone the repo, run `pnpm install && docker compose up && pnpm dev`, and have a running API + Web with auth, RBAC, audit log, and a healthy CI.

### 3.1 Monorepo and tooling

- ⬜ Initialize pnpm workspace with `apps/api`, `apps/web`, and `packages/*` skeletons.
- ⬜ Configure Turborepo with the task graph from `techContext.md` §3.1.
- ⬜ Set up `tsconfig.base.json` with strict mode (per `techContext.md` §2.1).
- ⬜ Set up `@cattlepro/config-typescript` package with `base.json`, `node.json`, `nextjs.json`.
- ⬜ Set up `@cattlepro/config-eslint` with the rule set from `systemPatterns.md` §14.
- ⬜ Set up `@cattlepro/config-tailwind` package.
- ⬜ Configure Prettier `.prettierrc`.
- ⬜ Set up Husky + Commitlint per `techContext.md` §14.3.
- ⬜ Create root `package.json` with the lint/test/build scripts.
- ⬜ Configure `.gitignore`, `.editorconfig`, `.nvmrc`.

### 3.2 Docker and local dev

- ⬜ `docker/docker-compose.yml` with PostgreSQL+PostGIS, Redis, MinIO.
- ⬜ Document `pnpm dev` starting both apps.
- ⬜ Write a `docs/development/setup.md` runbook (deferred).

### 3.3 Backend skeleton

- ⬜ Bootstrap NestJS with Fastify adapter (per `decisions.md` ADR-006).
- ⬜ Configure Pino logging with redactions (per `systemPatterns.md` §18).
- ⬜ Configure Helmet, rate limit, cookies, CSRF.
- ⬜ Configure CORS from env.
- ⬜ Configure Swagger at `/docs` in non-prod.
- ⬜ Configure URI versioning at `/api/v1`.
- ⬜ Implement `GlobalExceptionFilter` translating to RFC 7807.
- ⬜ Implement `DomainError` base class in `common/errors/`.
- ⬜ Implement `ZodValidationPipe`.
- ⬜ Implement `@Public()`, `@Roles()`, `@CurrentUser()` decorators.
- ⬜ Implement `JwtAuthGuard` and `RolesGuard` global.
- ⬜ Implement `IdempotencyInterceptor` (per `systemPatterns.md` §17).
- ⬜ Implement `PrismaService` and Prisma module.
- ⬜ Implement `RedisService` and Redis module.
- ⬜ Implement `DomainEventBus` (per `systemPatterns.md` §14).
- ⬜ Implement `AuditLogService` (per `systemPatterns.md` §13).
- ⬜ Implement configuration loader with Zod-validated env (per `systemPatterns.md` §19).

### 3.4 Frontend skeleton

- ⬜ Bootstrap Next.js 15 App Router project.
- ⬜ Configure Tailwind, shadcn/ui base components.
- ⬜ Configure `@cattlepro/ui` package skeleton.
- ⬜ Configure TanStack Query provider.
- ⬜ Configure i18n with `next-intl` and `es-CO` locale.
- ⬜ Implement `apiClient` wrapper (fetch + token refresh).
- ⬜ Implement `(auth)` route group with login + register pages.
- ⬜ Implement `(dashboard)` route group with protected layout.
- ⬜ Configure Sentry for the frontend.

### 3.5 Database — initial migration

- ⬜ Author `apps/api/prisma/schema.prisma` covering the entities in Phase 0 + 1: `Tenant`, `User`, `RefreshToken`, `Farm`, `FarmUserAssignment`, `Breed`, `Animal`, `BreedComposition`, `CowProfile`, `BullProfile`, `CalfProfile`, `WeightRecord`, `AnimalPhoto`, `AuditLog`, `Notification`.
- ⬜ Run `prisma migrate dev --name init` to generate the first migration.
- ⬜ Author `apps/api/prisma/seed.ts` with the 12 mandatory breeds + `Mestizo` + `Cruce` (per `dataModel.md` §5.1).
- ⬜ Verify `pnpm prisma:generate && pnpm prisma:migrate && pnpm prisma:seed` all succeed.

### 3.6 Authentication module

- ⬜ Implement `AuthModule`, `AuthController`, `AuthService`.
- ⬜ Implement `PasswordService` (Argon2id) (→ already drafted as scaffold).
- ⬜ Implement `TokenService` with rotation + reuse detection (→ already drafted).
- ⬜ Implement `MfaService` with TOTP and recovery codes.
- ⬜ Implement `AUTH.01 — Register tenant and owner`.
- ⬜ Implement `AUTH.02 — Login`.
- ⬜ Implement `AUTH.03 — Refresh access token`.
- ⬜ Implement `AUTH.04 — Logout`.
- ⬜ Implement `AUTH.05 — Logout all devices`.
- ⬜ Implement `AUTH.06 — Enable MFA`.
- ⬜ Implement `AUTH.07 — Disable MFA`.
- ⬜ Implement `AUTH.08 — Request password reset`.
- ⬜ Implement `AUTH.09 — Reset password with token`.
- ⬜ Unit tests for `PasswordService`, `TokenService`, `MfaService`.
- ⬜ Integration tests for every auth endpoint, including reuse-detection and lockout.

### 3.7 Users and Tenants

- ⬜ Implement `UsersModule`, controller, service, repository.
- ⬜ Implement `USERS.01 — List users`.
- ⬜ Implement `USERS.02 — Invite a new user`.
- ⬜ Implement `USERS.03 — Accept invitation`.
- ⬜ Implement `USERS.04 — Update user`.
- ⬜ Implement `USERS.05 — Change role`.
- ⬜ Implement `USERS.06 — Activate / deactivate`.
- ⬜ Implement `USERS.07 — View self profile`.
- ⬜ Frontend: invitation acceptance page.
- ⬜ Integration tests covering tenant isolation per endpoint.

### 3.8 Farms

- ⬜ Implement `FarmsModule`, controller, service, repository.
- ⬜ Implement `FARMS.01–07` per `features.md`.
- ⬜ Frontend: farms list, farm detail, farm settings page.
- ⬜ Integration tests including the milking-mode lock and currency lock.

### 3.9 Audit log

- ⬜ Implement `AuditModule` exposing `AuditLogService` globally.
- ⬜ Implement `AUDIT.01 — List audit entries`.
- ⬜ Implement `AUDIT.02 — View audit entry detail`.
- ⬜ Configure DB role to deny `UPDATE` and `DELETE` on `audit_logs`.
- ⬜ Integration tests verifying immutability.

### 3.10 CI / CD

- ⬜ `.github/workflows/ci.yml` with lint, type-check, unit, integration, E2E.
- ⬜ `.github/workflows/security-scan.yml` with CodeQL, Trivy, pnpm audit.
- ⬜ `.github/PULL_REQUEST_TEMPLATE.md`.
- ⬜ `.github/ISSUE_TEMPLATE/bug_report.md`.
- ⬜ `.github/ISSUE_TEMPLATE/feature_request.md`.
- ⬜ `.github/CODEOWNERS`.
- ⬜ Configure branch protection on `main` and `develop` (manual GitHub config).
- ⬜ Configure Codecov / Coveralls integration (decide which).
- ⬜ Configure Dependabot.

### 3.11 Observability skeleton

- ⬜ Configure OpenTelemetry SDK with auto-instrumentation.
- ⬜ Configure Sentry integration on backend.
- ⬜ Configure Prometheus `/metrics` endpoint.
- ⬜ Document local OTel collector setup (deferred to Phase 2 if not needed sooner).

### 3.12 Hosting decision

- ⬜ Resolve `projectbrief.md` open question #2 (managed PostgreSQL provider).
- ⬜ Resolve hosting target (Railway / Fly.io / AWS — see `techContext.md` §17).
- ⬜ Provision staging environment.

**Phase 0 Done When:**

- [ ] `pnpm install && docker compose up && pnpm dev` works on a fresh clone.
- [ ] Auth + Users + Farms + Audit fully implemented with integration tests.
- [ ] CI green; coverage > 80% on the implemented services.
- [ ] Staging deployed and reachable.

---

## 4. Phase 1 — MVP Core

> **Goal:** A real farm can run daily operations on the system.
>
> **Exit criterion:** Pilot farm #1 records a full week of milk production, registers ≥10 animals (with breed compositions), and uses the dashboard daily.

### 4.1 Animals module

- ⬜ Implement `AnimalsModule`, controller, service, repository.
- ⬜ Implement `BreedCompositionService` (validate sum-to-100, F1/Backcross categories).
- ⬜ Implement `ANIMALS.01 — Register a new animal` with full parentage validation.
- ⬜ Implement `ANIMALS.02 — List animals with filters`.
- ⬜ Implement `ANIMALS.03 — View animal detail`.
- ⬜ Implement `ANIMALS.05 — Update animal` (with optimistic locking).
- ⬜ Implement `ANIMALS.06 — Change animal status` with all transition rules from `dataModel.md` §6.1.
- ⬜ Implement `ANIMALS.07 — Mark calf as bull candidate`.
- ⬜ Implement `ANIMALS.08 — Record weight measurement`.
- ⬜ Implement `ANIMALS.09 — Upload animal photo` (presigned URL flow).
- ⬜ Implement `ANIMALS.10 — Delete animal photo`.
- ⬜ Implement `ANIMALS.11 — Compute estimated value`.
- ⬜ Frontend: herd list, animal detail page, register-animal form, status-change modal.
- ⬜ Frontend: breed-composition picker (sliders or inputs that sum to 100).
- ⬜ Integration tests for every endpoint, including status transitions.
- ⬜ Cross-tenant isolation tests.

### 4.2 Genealogy module

- ⬜ Implement `GenealogyModule`, controller, service, repository.
- ⬜ Implement `GENEALOGY.01 — Get ancestry tree` with recursive CTE.
- ⬜ Implement `GENEALOGY.02 — Get descendants`.
- ⬜ Implement `GENEALOGY.03 — Compute kinship coefficient`.
- ⬜ Implement `GENEALOGY.04 — Find siblings`.
- ⬜ Frontend: react-flow tree visualization in animal profile.
- ⬜ Performance test: ancestry of an 8-generation deep cow.

### 4.3 Milk production (basic, no offline yet)

- ⬜ Implement `ProductionModule`.
- ⬜ Implement `PRODUCTION.01 — Record per-session` with all status/quarantine/colostrum auto-flagging.
- ⬜ Implement `PRODUCTION.02 — Record daily total`.
- ⬜ Implement `PRODUCTION.04 — Record quality metrics` (fat/protein).
- ⬜ Implement `PRODUCTION.05 — Production report` (per cow / period).
- ⬜ Frontend: milking session UI optimized for fast tap entry (3-tap rule per `productContext.md` §6.1).
- ⬜ Frontend: production charts on the cow profile.

### 4.4 Lactation tracking (Phase 1 scope: open lactation only)

- ⬜ Implement `LactationModule`.
- ⬜ Implement auto-creation of `LactationPeriod` on successful pregnancy close (placeholder; full pregnancy lifecycle is Phase 2).
- ⬜ Implement `LACTATION.01 — View open lactation`.
- ⬜ Implement `LACTATION.02 — Dry off cow`.

### 4.5 Dashboard (basic)

- ⬜ Implement `DashboardModule`, service.
- ⬜ Implement `DASHBOARD.01 — Owner dashboard` tiles for: production today, herd quick stats, recent activity.
- ⬜ Implement `DASHBOARD.03 — Employee dashboard`.
- ⬜ Frontend pages.

### 4.6 Pilot onboarding

- ⬜ Recruit pilot farm #1.
- ⬜ Onboard the farm: tenant creation, breeds verified, first 50 animals migrated from spreadsheet.
- ⬜ Train OWNER and 1 EMPLOYEE on the system (1-hour session).
- ⬜ Establish weekly check-in for 4 weeks.

**Phase 1 Done When:**

- [ ] All feature checkboxes above are 🟩.
- [ ] Pilot farm #1 has been live for at least 7 consecutive days, recording milk daily.
- [ ] Coverage > 80%; all integration and E2E tests green.
- [ ] No P0/P1 bugs open.

---

## 5. Phase 2 — Reproduction & Health

> **Goal:** Close the reproductive and health loops. The system goes from "data registry" to "operational decision support."
>
> **Exit criterion:** Pilot farm #1 has registered ≥3 pregnancies, ≥1 successful birth via the system, and uses health-event alerts.

### 5.1 Reproduction

- ⬜ Implement `ReproductionModule`.
- ⬜ Implement `REPRODUCTION.01 — Register a pregnancy` with all warnings and acknowledgements.
- ⬜ Implement `REPRODUCTION.02 — Confirm a pregnancy`.
- ⬜ Implement `REPRODUCTION.03 — Close a pregnancy with outcome` (with auto-calf creation, lactation start, status transitions).
- ⬜ Implement `REPRODUCTION.04 — Cancel a pregnancy (correction)`.
- ⬜ Implement `REPRODUCTION.05 — List upcoming births`.
- ⬜ Implement `REPRODUCTION.06 — Heat-window estimation`.
- ⬜ Implement `REPRODUCTION.07 — Record observed heat`.
- ⬜ Frontend: reproduction tab on cow profile, pregnancy registration form, close-pregnancy flow with multi-calf support.

### 5.2 Semen straws inventory

- ⬜ Implement `StrawsModule`.
- ⬜ Implement `STRAWS.01–07` per `features.md`.
- ⬜ Frontend: straws inventory list, straw detail, mark-unusable flow, restock flow.

### 5.3 Health module

- ⬜ Implement `HealthModule`.
- ⬜ Implement `HEALTH.01 — Record a health event` (with mastitis detection, withholding auto-creation).
- ⬜ Implement `HEALTH.02 — Health timeline`.
- ⬜ Implement `HEALTH.03 — Upcoming due events`.
- ⬜ Implement `HEALTH.04 — Update / correct a health event`.
- ⬜ Implement `HEALTH.05 — Mastitis history view`.
- ⬜ Frontend: health tab on cow profile, event registration form, upcoming-events list.

### 5.4 Withholding module

- ⬜ Implement `WithholdingModule`.
- ⬜ Implement `WITHHOLDING.01–05` per `features.md`.
- ⬜ Build the medication catalog file (initial set of common Colombian veterinary products with their withholding days).
- ⬜ Verify `MilkProductionRecord.isFitForCommercial` and `unfitReason` set correctly across all paths.

### 5.5 Notifications and background jobs

- ⬜ Implement `NotificationsModule`.
- ⬜ Implement `NOTIFICATIONS.01 — List notifications`.
- ⬜ Implement `NOTIFICATIONS.02 — Mark as read`.
- ⬜ Implement `NOTIFICATIONS.04 — User preferences`.
- ⬜ Wire BullMQ; configure each scheduled job per `systemPatterns.md` §15.5:
  - ⬜ `mastitis-risk-monitor` (hourly).
  - ⬜ `lactation-overdue-check` (daily).
  - ⬜ `low-production-detection` (daily).
  - ⬜ `low-reproductive-efficiency` (daily).
  - ⬜ `withholding-ended` (daily).
  - ⬜ `upcoming-events-alerts` (daily, 30/15/7/5/1/0 windows).
- ⬜ Implement notification dispatch with the 12-type catalog from `features.md` NOTIFICATIONS.03.
- ⬜ Choose email provider (resolve `projectbrief.md` open question #4) and integrate.
- ⬜ Build email templates with `@react-email/components` for each `URGENT`-severity notification type.

### 5.6 Dashboard refinements

- ⬜ Implement `DASHBOARD.02 — Veterinarian dashboard`.
- ⬜ Update `DASHBOARD.01 — Owner dashboard` with active alerts, upcoming events, active pregnancies tiles.

### 5.7 Pilot expansion

- ⬜ Onboard pilot farm #2 and #3.
- ⬜ Run a "vet day" with Dr. Ramírez on a pilot farm to validate the VET workflows.

**Phase 2 Done When:**

- [ ] All feature checkboxes above are 🟩.
- [ ] At least one pregnancy has been registered, confirmed, and closed via the system end-to-end.
- [ ] At least one mastitis case has been recorded, flagged, treated, and the withholding period enforced through to "WITHHOLDING_ENDED" notification.
- [ ] Veterinarian advisor has signed off on breeding, lactation, and health rules (per `projectbrief.md` §6.1 goal #6).

---

## 6. Phase 3 — Finance & Reports

> **Goal:** The owner can answer "is my farm profitable?" with system-generated reports.
>
> **Exit criterion:** Pilot farms have closed at least one full month of finances in the system, and produced an end-of-month profitability report.

### 6.1 Finance

- ⬜ Implement `FinanceModule`.
- ⬜ Implement `FINANCE.01 — Record a financial transaction`.
- ⬜ Implement `FINANCE.02 — List transactions`.
- ⬜ Implement `FINANCE.03 — Reverse a transaction`.
- ⬜ Implement `FINANCE.04 — Profitability report`.
- ⬜ Implement `FINANCE.05 — Cost basis per animal`.
- ⬜ Implement `FINANCE.06 — Configure farm milk price`.
- ⬜ Wire `ANIMAL_SALE` and `ANIMAL_DEATH_LOSS` auto-suggestions on status changes.
- ⬜ Frontend: finance dashboard, transactions list, reverse-transaction flow.

### 6.2 Calf rearing cost

- ⬜ Implement `CalfCostModule`.
- ⬜ Implement `CALF_COST.01–03` per `features.md`.
- ⬜ Schedule the nightly recompute job.

### 6.3 Reports

- ⬜ Implement `ReportsModule`.
- ⬜ Implement `REPORTS.01 — Animal profile PDF` (Playwright-based generation).
- ⬜ Implement `REPORTS.02 — Herd inventory export` (Excel via `exceljs` — pin version when added).
- ⬜ Implement `REPORTS.03 — Production report export`.
- ⬜ Implement `REPORTS.04 — Profitability report export`.
- ⬜ Implement `REPORTS.05 — Tenant data export` (full ZIP archive).
- ⬜ Frontend: report-generation buttons on each relevant page; downloaded files area.

### 6.4 Dashboard for AUDITOR

- ⬜ Implement `DASHBOARD.04 — Auditor dashboard` with data-quality tile.

### 6.5 Payment and billing

- ⬜ Resolve `projectbrief.md` open question #1 (pricing tiers in COP).
- ⬜ Resolve open question #3 (MercadoPago vs. Stripe).
- ⬜ Integrate the chosen payment processor.
- ⬜ Implement subscription management (free trial, paid tiers, suspension).

**Phase 3 Done When:**

- [ ] All feature checkboxes above are 🟩.
- [ ] One full month of financials has been processed for at least one pilot farm.
- [ ] At least one tenant export has been generated and downloaded successfully.
- [ ] Pricing model is in effect for new sign-ups.

---

## 7. Phase 4 — Field Readiness (Offline & PWA)

> **Goal:** The PWA works offline for the critical field flows. Sync conflict resolution is robust.
>
> **Exit criterion:** ≥80% of pilot users report being able to record data offline without issues (per `projectbrief.md` §6.1 goal #4).

### 7.1 PWA shell

- ⬜ Configure `@ducanh2912/next-pwa` Service Worker generation.
- ⬜ Implement install prompt and "add to home screen" UX.
- ⬜ Implement offline status indicator (per `features.md` OFFLINE.05).

### 7.2 IndexedDB layer

- ⬜ Schema design for offline queue (`pendingId`, `syncStatus`, `lastSyncAttemptAt`, `syncError`).
- ⬜ Implement `idb`-based queue manager.
- ⬜ Conflict-resolution data model (per `features.md` OFFLINE.04).

### 7.3 Offline-capable features

- ⬜ `OFFLINE.01 PRODUCTION.01 / PRODUCTION.02` — milk session offline.
- ⬜ `OFFLINE.01 ANIMALS.08` — weight offline.
- ⬜ `OFFLINE.01 HEALTH.01` — health event offline (deferred withholding creation until sync).
- ⬜ `OFFLINE.01 ANIMALS.01` — animal registration offline (limited fields).
- ⬜ `OFFLINE.01 REPRODUCTION.07` — observed heat offline.

### 7.4 Sync algorithm

- ⬜ Implement Service Worker background sync trigger.
- ⬜ Implement dependency-ordered sync (animals before milk, etc.).
- ⬜ Implement `Idempotency-Key` end-to-end use.
- ⬜ Implement exponential backoff for transient errors.
- ⬜ Implement conflict surfacing UI.

### 7.5 Bulk import

- ⬜ Implement `PRODUCTION.03 — Bulk record (CSV/Excel)` with template, preview, validation, error report.

### 7.6 Performance tuning

- ⬜ Run k6 load tests against critical endpoints; ensure p95 < 500 ms.
- ⬜ Add database indexes uncovered by EXPLAIN ANALYZE in production.
- ⬜ Optimize bundle size (frontend) — target < 200 KB on the critical entry route.

**Phase 4 Done When:**

- [ ] All offline-whitelisted flows work without connectivity in real conditions on a pilot farm.
- [ ] Sync conflicts have been demonstrated and resolved successfully.
- [ ] No P0/P1 perf or sync bugs open.

---

## 8. Phase 5 — Public API & Integrations

> **Goal:** Third parties can integrate. The platform becomes a hub.

### 8.1 Public API tier

- ⬜ Design API key model (per-tenant, per-purpose, scoped permissions).
- ⬜ Implement API key management (CRUD).
- ⬜ Implement rate limiting per API key.
- ⬜ Implement `POST /api/v1/api-keys` and friends.

### 8.2 Webhooks

- ⬜ Webhook subscription model.
- ⬜ Webhook delivery worker (BullMQ) with signing (HMAC).
- ⬜ Initial events to deliver: `animal.created`, `pregnancy.closed`, `health_event.created`, `financial_transaction.created`.

### 8.3 First integrations

- ⬜ Identify 3 candidate integration partners (vet practice management, accounting, milk-buyer portal).
- ⬜ Build at least 1 reference integration end-to-end.

**Phase 5 Done When:**

- [ ] At least 3 third-party integrations are live (per `projectbrief.md` §6.2 year-2 goal #3, brought forward).

---

## 9. Phase 6 — Scale & Advanced (Year 2)

These items are scoped at a high level only; detailed planning happens at the start of Year 2.

- ⬜ IoT integrations (BLE scales, milk meters, RFID readers).
- ⬜ Advanced reproduction analytics (BLUP, EPDs).
- ⬜ Cooperatives view (multi-farm consolidation).
- ⬜ English UI.
- ⬜ Brazilian Portuguese UI (pilot).
- ⬜ Native mobile apps (iOS / Android), if PWA proves insufficient.

---

## 10. Cross-Cutting Quality Gates

These apply at all phases. Status reflects the most recent CI run on `develop`.

| Gate                                              | Target           | Current  |
| ------------------------------------------------- | ---------------- | -------- |
| Unit + integration coverage                       | ≥ 80% on critical business logic | n/a |
| ESLint                                            | 0 errors, 0 warnings | n/a   |
| Type-check                                        | 0 errors         | n/a      |
| Bundle size (web critical route)                  | < 200 KB         | n/a      |
| API p95 latency (load test, normal traffic)       | < 500 ms         | n/a      |
| Lighthouse mobile score (key pages)               | ≥ 90             | n/a      |
| OWASP Top 10 — explicit mitigations               | All present      | n/a      |
| Cross-tenant isolation tests                      | All endpoints with list/get | n/a |
| Secrets in repo                                   | Zero (gitleaks scan) | n/a  |

---

## 11. Documentation Status

This documentation set is the foundation. Status of each:

| Document            | Status | Last reviewed |
| ------------------- | ------ | ------------- |
| `projectbrief.md`   | 🟩 v1.1 | 2026-05-02    |
| `productContext.md` | 🟩 v1.0 | 2026-05-02    |
| `decisions.md`      | 🟩 v1.0 | 2026-05-02    |
| `dataModel.md`      | 🟩 v1.1 | 2026-05-02    |
| `businessRules.md`  | 🟩 v1.0 | 2026-05-02 (provided by owner) |
| `features.md`       | 🟩 v1.0 | 2026-05-02    |
| `useCases.md`       | 🟩 v1.0 | 2026-05-02    |
| `systemPatterns.md` | 🟩 v1.0 | 2026-05-02    |
| `techContext.md`    | 🟩 v1.0 | 2026-05-02    |
| `progress.md`       | 🟩 v1.0 | 2026-05-02 (this document) |
| `activeContext.md`  | ⬜      | next          |

> **Operational rule:** every Done feature checkbox in this file must be paired with up-to-date documentation in `features.md` and (where structural) in `dataModel.md`. A PR that flips a checkbox without updating the corresponding docs is rejected in code review.

---

## 12. Known Issues and Tech Debt

> Logged here as it accumulates. None at project start.

| ID    | Title                                                             | Severity | Created    | Status |
| ----- | ----------------------------------------------------------------- | -------- | ---------- | ------ |
| —     | (No items yet)                                                    | —        | —          | —      |

When tech debt is identified during a phase, log it here with:

- An ID (`DEBT-NNN`).
- Title.
- Severity (Low / Medium / High / Critical).
- Created date.
- Status (Open / Scheduled / In Progress / Resolved).
- Remediation plan or links to issues.

---

## 13. Velocity and Health Metrics

> Filled in once the team is producing. Targets per `projectbrief.md` §6.4.

| Metric                                  | Target           | Current trend |
| --------------------------------------- | ---------------- | ------------- |
| Lead time for changes                   | < 2 days         | n/a           |
| Deployment frequency                    | ≥ 5 deploys/week | n/a           |
| Change failure rate                     | < 10%            | n/a           |
| MTTR                                    | < 1 hour         | n/a           |
| Test execution time (unit)              | < 30 s           | n/a           |
| Test execution time (integration)       | < 5 min          | n/a           |
| Test execution time (E2E)               | < 10 min         | n/a           |

These are reviewed monthly. If a metric is below target for 2 consecutive months, a remediation plan is added to a sprint.

---

## Document Maintenance

This document is updated **continuously**. Every PR that flips a checkbox or adds a task must update this document in the same PR.

When a phase completes:

1. Confirm every "Phase X Done When" checkbox is satisfied.
2. Add a "Phase X — Closed on YYYY-MM-DD" line at the top of that section.
3. Tag the release.
4. Open the next phase formally.

When this document and reality diverge: **reality wins**, and the document is fixed in the next commit. Stale progress reports are a documentation bug, not a feature; they are treated as such.
