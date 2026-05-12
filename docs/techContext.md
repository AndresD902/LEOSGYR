# Technology Context — CattlePro

> **Status:** Draft v1.0
> **Last updated:** 2026-05-02
> **Owner:** Architecture & DevOps
>
> This document is the **exhaustive list of every technology in the system**: language, framework, library, tool, service. For each item: the **exact version**, **purpose**, **why it is used**, and **integration notes**.
>
> If a technology is not in this document, it is **not approved** for use in the project. Adding a new dependency requires a PR titled `chore(deps): add <package> for <reason>` with maintainer approval.
>
> When this document conflicts with `decisions.md`, **`decisions.md` wins**. When a version drift is detected between this document and `package.json`, the package.json is updated to match this document, or this document is updated through an explicit PR.

---

## Table of Contents

1. [Conventions](#1-conventions)
2. [Languages and Runtimes](#2-languages-and-runtimes)
3. [Monorepo Tooling](#3-monorepo-tooling)
4. [Backend Stack](#4-backend-stack)
5. [Frontend Stack](#5-frontend-stack)
6. [Shared Packages](#6-shared-packages)
7. [Database and Persistence](#7-database-and-persistence)
8. [Authentication and Security](#8-authentication-and-security)
9. [Background Jobs and Cache](#9-background-jobs-and-cache)
10. [Object Storage](#10-object-storage)
11. [Email and Notifications](#11-email-and-notifications)
12. [Observability](#12-observability)
13. [Testing](#13-testing)
14. [Linting, Formatting, Quality Gates](#14-linting-formatting-quality-gates)
15. [CI / CD](#15-ci--cd)
16. [Containerization and Local Dev](#16-containerization-and-local-dev)
17. [Hosting and Infrastructure](#17-hosting-and-infrastructure)
18. [Development Tools](#18-development-tools)
19. [Version Pinning and Update Policy](#19-version-pinning-and-update-policy)
20. [Approved Dependencies Quick Reference](#20-approved-dependencies-quick-reference)

---

## 1. Conventions

### 1.1 Version pinning

- **Major.Minor.Patch** — exact versions are pinned in `package.json` (`"foo": "1.2.3"`, not `"^1.2.3"`).
- The single exception is dev-only typescript types (`@types/*`) which use caret ranges since they are stable.
- Lockfile (`pnpm-lock.yaml`) is committed and treated as source of truth.

### 1.2 Update cadence

- **Security patches:** within 7 days of disclosure (Dependabot + Snyk surface them).
- **Minor versions:** monthly review; only adopted if changelog confirms no breaking changes.
- **Major versions:** quarterly review; adoption is a deliberate task, not opportunistic.

### 1.3 Approval process for new dependencies

A new direct dependency is introduced only when:

1. The need is documented (a feature ticket or an architectural reason).
2. The package is actively maintained (commits in last 6 months, no critical open vulns).
3. License is compatible (MIT, Apache 2.0, BSD; LGPL acceptable case by case; never GPL/AGPL for backend code).
4. Bundle size impact is acceptable (front-end deps only).
5. A maintainer approves the PR.

---

## 2. Languages and Runtimes

| Item            | Version          | Purpose                                                       |
| --------------- | ---------------- | ------------------------------------------------------------- |
| **TypeScript**  | `5.6.2`          | Single language across backend, frontend, shared packages.    |
| **Node.js**     | `20.11.0` LTS    | Backend runtime; required minimum for the frontend tooling.   |
| **pnpm**        | `9.12.0`         | Package manager (via `corepack`).                             |

### 2.1 TypeScript configuration

- **Mode:** `strict: true`. The full strict suite enabled in `tsconfig.base.json`:
  - `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitThis`, `alwaysStrict`.
  - `noUnusedLocals`, `noUnusedParameters`, `exactOptionalPropertyTypes`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noPropertyAccessFromIndexSignature`.
- **Module:** `NodeNext`. ESM + CJS interop handled.
- **Target:** `ES2022` (modern Node + browsers we support).
- **`any` is forbidden** by ESLint (`@typescript-eslint/no-explicit-any: error`). Per `projectbrief.md` non-negotiable #4.

### 2.2 Node.js notes

- Locked via `.nvmrc` (`20.11.0`) and `engines.node` in every `package.json`.
- LTS chosen for stability; upgraded to the next LTS (Node 22) once production has been stable for 90 days on Node 20.
- The `--experimental-*` flags are forbidden in production startup.

### 2.3 pnpm notes

- Activated via `corepack enable && corepack prepare pnpm@9.12.0 --activate`.
- `.npmrc` enforces `engine-strict=true` so wrong Node versions fail loud.
- Workspaces declared in `pnpm-workspace.yaml`.

---

## 3. Monorepo Tooling

| Item             | Version  | Purpose                                                   |
| ---------------- | -------- | --------------------------------------------------------- |
| **Turborepo**    | `2.1.3`  | Build orchestration, task graph, remote caching.          |
| **pnpm workspaces** | (built-in to pnpm) | Workspace dependency management.                |

### 3.1 Turborepo configuration

`turbo.json` declares the task graph:

- `build`: depends on upstream `^build`, caches `dist/`, `.next/`.
- `dev`: persistent (no cache).
- `lint`: depends on upstream `^lint`.
- `type-check`: depends on upstream `^build` (so generated types are available).
- `test`: depends on upstream `^build`.
- `test:integration`, `test:e2e`: cache: false.

Remote caching is connected to Turborepo's hosted service (Vercel) when a `TURBO_TOKEN` is set in CI; locally each developer caches in `.turbo/`.

---

## 4. Backend Stack

The backend is a NestJS application running on Fastify, exposing a REST API documented with OpenAPI.

### 4.1 Core framework

| Item                              | Version    | Purpose                                                 |
| --------------------------------- | ---------- | ------------------------------------------------------- |
| **NestJS — `@nestjs/core`**       | `10.4.4`   | Framework; DI, modules, lifecycle.                      |
| **NestJS — `@nestjs/common`**     | `10.4.4`   | Decorators, pipes, guards, interceptors.                |
| **`@nestjs/platform-fastify`**    | `10.4.4`   | Fastify HTTP adapter (replaces Express).                |
| **`@nestjs/config`**              | `3.2.3`    | Configuration loader (we wrap it with Zod validation).  |
| **`@nestjs/swagger`**             | `7.4.2`    | OpenAPI / Swagger spec generation.                      |
| **`@nestjs/jwt`**                 | `10.2.0`   | JWT signing and verification.                           |
| **`@nestjs/passport`**            | `10.0.3`   | Passport integration for auth strategies.               |
| **`@nestjs/testing`**             | `10.4.4`   | Test utilities (DI overrides, mock modules).            |

### 4.2 Fastify ecosystem

| Item                              | Version  | Purpose                                                |
| --------------------------------- | -------- | ------------------------------------------------------ |
| **`fastify`**                     | (peer of `@nestjs/platform-fastify`) | HTTP server.                       |
| **`@fastify/helmet`**             | `11.1.1` | Security headers (CSP, HSTS, X-Frame-Options).         |
| **`@fastify/rate-limit`**         | `9.1.0`  | Per-IP and per-user rate limiting.                     |
| **`@fastify/cookie`**             | `9.4.0`  | Cookie parsing and signing (refresh tokens).           |
| **`@fastify/csrf-protection`**    | `6.4.1`  | CSRF tokens for cookie-authenticated endpoints.        |

### 4.3 Validation

| Item             | Version  | Purpose                                                    |
| ---------------- | -------- | ---------------------------------------------------------- |
| **`zod`**        | `3.23.8` | Schema validation, shared between backend and frontend.    |

`class-validator` is **not** used. Per `decisions.md` ADR-009.

### 4.4 Auth and crypto

| Item             | Version  | Purpose                                                          |
| ---------------- | -------- | ---------------------------------------------------------------- |
| **`argon2`**     | `0.41.1` | Argon2id password hashing (per ADR-011, OWASP 2024 baseline).    |
| **`passport`**   | `0.7.0`  | Auth middleware base.                                            |
| **`passport-jwt`** | `4.0.1` | JWT extraction strategy.                                         |
| **`otplib`**     | `12.0.1` | TOTP code generation/verification for MFA.                       |
| **`qrcode`**     | `1.5.4`  | QR code generation for TOTP setup.                               |

### 4.5 Logging

| Item               | Version  | Purpose                                                |
| ------------------ | -------- | ------------------------------------------------------ |
| **`pino`**         | `9.4.0`  | Structured JSON logging.                               |
| **`nestjs-pino`**  | `4.1.0`  | NestJS integration.                                    |
| **`pino-pretty`**  | `11.2.2` | Human-readable dev output (devDependency only).        |

### 4.6 Reactive utilities

| Item             | Version  | Purpose                                                       |
| ---------------- | -------- | ------------------------------------------------------------- |
| **`rxjs`**       | `7.8.1`  | Used by NestJS internally; observables in interceptors.       |
| **`reflect-metadata`** | `0.2.2` | Required for NestJS decorator metadata (DI, decorators). |

### 4.7 Time, IDs, parsing

| Item                 | Version  | Purpose                                                   |
| -------------------- | -------- | --------------------------------------------------------- |
| **`date-fns`**       | `3.6.0`  | Date arithmetic (gestation periods, ages, intervals).     |
| **`date-fns-tz`**    | `3.1.3`  | Timezone-aware date computations (per-farm timezone).     |

> **Why not Luxon or Day.js?** `date-fns` is tree-shakeable, immutable, and has the lightest type surface for our needs. Date math for cattle gestation, lactation cycles, and post-partum intervals is straightforward.

### 4.8 NodeJS built-ins used explicitly

- `node:crypto` — `randomUUID`, `createHash` (for refresh-token hashing, idempotency keys).
- `node:fs/promises` — file operations (PDF generation outputs).
- `node:path` — path manipulation.

No third-party shim packages for these.

---

## 5. Frontend Stack

The frontend is a Next.js 15 application using the App Router and React 19.

### 5.1 Core framework

| Item                | Version  | Purpose                                                  |
| ------------------- | -------- | -------------------------------------------------------- |
| **Next.js**         | `15.0.0` | React framework with App Router, RSC, streaming SSR.     |
| **React**           | `19.0.0` | UI library.                                              |
| **React DOM**       | `19.0.0` | DOM renderer.                                            |

### 5.2 Styling and UI

| Item                                  | Version  | Purpose                                                   |
| ------------------------------------- | -------- | --------------------------------------------------------- |
| **Tailwind CSS**                      | `3.4.13` | Utility-first CSS.                                        |
| **`@tailwindcss/forms`**              | `0.5.9`  | Form styling reset.                                       |
| **`@tailwindcss/typography`**         | `0.5.15` | Prose styling for long-form content.                      |
| **shadcn/ui**                         | (copy-in) | Component primitives (not a versioned npm package).      |
| **`@radix-ui/react-*`**               | (per-component) | Headless component primitives shadcn builds on.    |
| **`lucide-react`**                    | `0.453.0` | Icon set.                                                |
| **`class-variance-authority`**        | `0.7.0`  | Variant styling helper for shadcn components.             |
| **`tailwind-merge`**                  | `2.5.4`  | Tailwind class deduplication.                             |
| **`clsx`**                            | `2.1.1`  | Conditional class composition.                            |

### 5.3 Data fetching and state

| Item                          | Version  | Purpose                                                |
| ----------------------------- | -------- | ------------------------------------------------------ |
| **`@tanstack/react-query`**   | `5.59.16` | Server state, caching, optimistic updates.            |
| **`@tanstack/react-query-devtools`** | `5.59.16` | Dev-only query inspector.                       |
| **`zustand`**                 | `5.0.0`  | Local UI state (used sparingly, not for server data).  |

### 5.4 Forms

| Item                          | Version  | Purpose                                                  |
| ----------------------------- | -------- | -------------------------------------------------------- |
| **`react-hook-form`**         | `7.53.1` | Form state management.                                   |
| **`@hookform/resolvers`**     | `3.9.1`  | Bridge to Zod schemas.                                   |
| **`zod`**                     | `3.23.8` | Schemas (same version as backend, via `@cattlepro/validation`). |

### 5.5 Tables, charts, visualization

| Item                            | Version  | Purpose                                                  |
| ------------------------------- | -------- | -------------------------------------------------------- |
| **`@tanstack/react-table`**     | `8.20.5` | Headless table library (animals list, milk records).     |
| **`recharts`**                  | `2.13.0` | Charts (lactation curves, production trends).            |
| **`react-flow`**                | `11.11.4` | Genealogy tree visualization (interactive node graph).  |

### 5.6 PWA and offline

| Item                          | Version  | Purpose                                                  |
| ----------------------------- | -------- | -------------------------------------------------------- |
| **`@ducanh2912/next-pwa`**    | `10.2.9` | Service Worker generation for Next.js 15 App Router.     |
| **`workbox-window`**          | `7.1.0`  | Service Worker client-side helpers.                      |
| **`idb`**                     | `8.0.0`  | Promise-based IndexedDB wrapper for offline records.     |

> **Why `@ducanh2912/next-pwa` and not `next-pwa`?** `next-pwa` lacks proper App Router support; `@ducanh2912/next-pwa` is the maintained fork that does.

### 5.7 Internationalization

| Item                            | Version  | Purpose                                                  |
| ------------------------------- | -------- | -------------------------------------------------------- |
| **`next-intl`**                 | `3.21.1` | i18n for Next.js App Router (Spanish-only in v1, infra ready). |

### 5.8 HTTP client (frontend → backend)

We use the native `fetch` API wrapped in a thin `apiClient` that:

- Sends the access token from memory.
- Catches `401` and triggers refresh-token rotation transparently.
- Adds `Idempotency-Key` for write operations originating from offline-replay flows.

No third-party HTTP client library (`axios`, `ky`, etc.) — the wrapper is small enough and `fetch` is universal.

### 5.9 Utilities

| Item                | Version  | Purpose                                                  |
| ------------------- | -------- | -------------------------------------------------------- |
| **`date-fns`**      | `3.6.0`  | Date utilities (same version as backend).                |
| **`date-fns-tz`**   | `3.1.3`  | Timezone-aware date display per farm.                    |

### 5.10 Frontend testing

| Item                                | Version  | Purpose                                                  |
| ----------------------------------- | -------- | -------------------------------------------------------- |
| **Vitest**                          | `2.1.2`  | Unit and component tests.                                |
| **`@testing-library/react`**        | `16.0.1` | Component testing.                                       |
| **`@testing-library/user-event`**   | `14.5.2` | Realistic user interactions in tests.                    |
| **`@testing-library/jest-dom`**     | `6.6.3`  | DOM matchers (used with Vitest expect).                  |
| **Playwright**                      | `1.48.0` | End-to-end browser tests.                                |

---

## 6. Shared Packages

These live in `packages/` and are consumed by both `apps/api` and `apps/web`.

### 6.1 `@cattlepro/validation`

Holds every Zod schema used across the system. The schemas are imported by:

- `apps/api` controllers via `ZodValidationPipe`.
- `apps/web` forms via `@hookform/resolvers/zod`.

**Direct dependencies:** `zod 3.23.8`. No others.

### 6.2 `@cattlepro/shared-types`

Type definitions shared across the backend and frontend that are not directly inferrable from a Zod schema. Examples: enum unions matching Prisma's, response envelopes, error response shapes.

**Direct dependencies:** none (types-only package).

### 6.3 `@cattlepro/ui`

Reusable React components (the design system). Built on shadcn/ui primitives.

**Direct dependencies:** Radix UI primitives, `lucide-react`, `class-variance-authority`, `tailwind-merge`, `clsx`. React is a peer dependency.

### 6.4 `@cattlepro/config-eslint`

Shared ESLint configuration. See §14.

### 6.5 `@cattlepro/config-typescript`

Shared `tsconfig.json` base configurations:

- `base.json` — common compiler options.
- `node.json` — extends base, adds Node-specific settings.
- `nextjs.json` — extends base, adds Next.js settings.

### 6.6 `@cattlepro/config-tailwind`

Shared Tailwind preset (theme tokens, plugin set). Imported by `apps/web` and `packages/ui`.

---

## 7. Database and Persistence

### 7.1 PostgreSQL

| Item                  | Version  | Purpose                                                |
| --------------------- | -------- | ------------------------------------------------------ |
| **PostgreSQL**        | `16.x`   | Primary relational database.                           |
| **PostGIS**           | `3.4`    | Geospatial extension (deferred to Phase 4 for farm geolocation). |
| **`pgcrypto`**        | (built-in) | UUID generation, hashing.                            |
| **`citext`**          | (built-in) | Case-insensitive text (email columns).               |

> **Image used in dev:** `postgis/postgis:16-3.4-alpine` (includes PostGIS, pgcrypto, citext).

### 7.2 Prisma ORM

| Item                          | Version  | Purpose                                                |
| ----------------------------- | -------- | ------------------------------------------------------ |
| **`prisma`**                  | `5.20.0` | CLI: schema, migrations, studio.                       |
| **`@prisma/client`**          | `5.20.0` | Generated runtime client.                              |

### 7.3 Configuration notes

- `schema.prisma` declares `extensions = [pgcrypto, citext, postgis]`.
- `previewFeatures = ["postgresqlExtensions", "fullTextSearchPostgres"]`.
- Migrations live in `apps/api/prisma/migrations/`.
- Seed data (the 14 breeds in `dataModel.md` §5.1) lives in `apps/api/prisma/seed.ts`.
- Migration deployment uses `prisma migrate deploy` in CD; never `db push` in production.

---

## 8. Authentication and Security

This section catalogs everything security-related; some items already appear in §4.4 above. Listed here for completeness as a security reviewer's checklist.

### 8.1 Identity and credentials

- **Argon2id** (`argon2 0.41.1`) for password hashing.
  - Parameters: `memoryCost: 19456`, `timeCost: 2`, `parallelism: 1`. OWASP 2024 baseline.
- **TOTP** via `otplib 12.0.1`. 30-second window, ±1 step tolerance.
- **`qrcode 1.5.4`** for setup QR codes.
- **Refresh tokens**: opaque random 256-bit, SHA-256 hashed before storage (using `node:crypto`).

### 8.2 Tokens

- **JWT HS256** via `@nestjs/jwt 10.2.0`. Secret minimum 32 chars, validated at boot.
- Access token TTL: 900 seconds (15 minutes), configurable.
- Refresh token TTL: 2,592,000 seconds (30 days), configurable.

### 8.3 HTTP security

- **`@fastify/helmet 11.1.1`** for security headers.
- **`@fastify/rate-limit 9.1.0`** with multiple buckets per `features.md` `CROSS.06`.
- **`@fastify/cookie 9.4.0`** with signed cookies; secret is separate from JWT secret.
- **`@fastify/csrf-protection 6.4.1`** for endpoints that depend on cookie auth.
- **CORS**: configured in `main.ts` with allow-list from `CORS_ORIGIN` env var.

### 8.4 SAST and dependency scanning

| Item                       | Version    | Purpose                                                 |
| -------------------------- | ---------- | ------------------------------------------------------- |
| **GitHub CodeQL**          | (action)   | Static analysis on PRs and weekly.                       |
| **Dependabot**             | (built-in) | Dependency vulnerability alerts.                         |
| **Trivy**                  | (action)   | Filesystem vulnerability scan (CI weekly).               |
| **`pnpm audit`**           | (built-in) | High/critical vulnerability check on every CI run.       |

### 8.5 Secrets in environment

- **Local dev:** `.env` files (gitignored). `.env.example` committed with placeholders.
- **CI:** GitHub Actions secrets.
- **Production:** the hosting provider's secret store.
- Secrets rotated quarterly (process documented in `docs/security/rotation-runbook.md` — placeholder).

---

## 9. Background Jobs and Cache

### 9.1 Redis

| Item             | Version  | Purpose                                                   |
| ---------------- | -------- | --------------------------------------------------------- |
| **Redis**        | `7.x`    | Cache, rate-limit counters, BullMQ backing store.         |
| **`ioredis`**    | `5.4.1`  | Node Redis client (used by BullMQ and direct cache code). |

> **Image used in dev:** `redis:7-alpine`, with AOF persistence enabled.

### 9.2 BullMQ

| Item                          | Version  | Purpose                                                |
| ----------------------------- | -------- | ------------------------------------------------------ |
| **`bullmq`**                  | `5.21.2` | Queues, workers, scheduled jobs, repeatable jobs.      |
| **`@bull-board/api`**         | `5.23.0` | Admin UI core for queue inspection.                    |
| **`@bull-board/fastify`**     | `5.23.0` | Fastify integration for the admin UI.                  |

The Bull Board admin UI is mounted at `/admin/queues` behind OWNER-only auth.

---

## 10. Object Storage

| Item                                | Version  | Purpose                                              |
| ----------------------------------- | -------- | ---------------------------------------------------- |
| **MinIO (dev)**                     | latest   | S3-compatible local storage.                         |
| **`@aws-sdk/client-s3`**            | `3.670.0` | S3 client (works with AWS S3, R2, MinIO).            |
| **`@aws-sdk/s3-request-presigner`** | `3.670.0` | Presigned URL generation for direct uploads.         |

Production target options:

- **AWS S3** (default if hosting on AWS).
- **Cloudflare R2** (cost-effective, no egress fees).

The implementation is provider-agnostic via the AWS SDK with custom endpoint.

---

## 11. Email and Notifications

### 11.1 Email provider

The email provider is an open question (`projectbrief.md` §12 #4); to be decided in Phase 2. Candidates:

- **Resend** — modern, developer-friendly, generous free tier.
- **Postmark** — high deliverability, transactional focus.
- **AWS SES** — cheapest at scale, more setup work.

The system code is provider-agnostic via an `EmailProvider` interface. The actual implementation is loaded via `EMAIL_PROVIDER=resend|postmark|ses` env var.

### 11.2 Email templating

| Item                          | Version  | Purpose                                                  |
| ----------------------------- | -------- | -------------------------------------------------------- |
| **`@react-email/components`** | `0.0.25` | Build emails with React components.                      |
| **`@react-email/render`**     | `1.0.1`  | Server-side render React Email to HTML/text.             |

Templates live in `apps/api/src/modules/notifications/templates/`. Spanish copy.

### 11.3 SMS (deferred)

SMS is not in v1.0 scope. When added (post-v1), Twilio is the likely provider.

---

## 12. Observability

### 12.1 Logging (already in §4.5)

- **`pino 9.4.0`**, **`nestjs-pino 4.1.0`**, **`pino-pretty 11.2.2`**.

### 12.2 Tracing

| Item                                                     | Version  | Purpose                                  |
| -------------------------------------------------------- | -------- | ---------------------------------------- |
| **`@opentelemetry/api`**                                 | `1.9.0`  | Tracing API.                             |
| **`@opentelemetry/sdk-node`**                            | `0.54.0` | Auto-instrumentation SDK.                |
| **`@opentelemetry/auto-instrumentations-node`**          | `0.50.0` | Auto-instrumentation for HTTP, Prisma, ioredis. |
| **`@opentelemetry/exporter-trace-otlp-http`**            | `0.54.0` | OTLP exporter to Tempo / Honeycomb.      |

### 12.3 Error tracking

| Item                       | Version  | Purpose                                                   |
| -------------------------- | -------- | --------------------------------------------------------- |
| **`@sentry/nestjs`**       | `8.34.0` | Sentry SDK for NestJS.                                    |
| **`@sentry/nextjs`**       | `8.34.0` | Sentry SDK for Next.js.                                   |

### 12.4 Metrics

| Item                       | Version  | Purpose                                                   |
| -------------------------- | -------- | --------------------------------------------------------- |
| **`prom-client`**          | `15.1.3` | Prometheus metrics for the backend.                       |
| **`@willsoto/nestjs-prometheus`** | `6.0.1` | NestJS integration: `/metrics` endpoint.            |

### 12.5 Production monitoring backend

The actual SaaS for traces/logs/metrics is an open question (Honeycomb / Grafana Cloud / self-hosted Tempo+Loki+Prometheus). To be decided before pilot. The application is vendor-neutral via OpenTelemetry.

---

## 13. Testing

### 13.1 Backend testing

| Item                          | Version  | Purpose                                                |
| ----------------------------- | -------- | ------------------------------------------------------ |
| **Vitest**                    | `2.1.2`  | Test runner.                                           |
| **`@vitest/coverage-v8`**     | `2.1.2`  | V8-based coverage.                                     |
| **Supertest**                 | `7.0.0`  | HTTP assertions for integration tests.                 |
| **`@types/supertest`**        | `^6.0.0` | Type definitions.                                      |

### 13.2 Frontend testing

(Already listed in §5.10.)

| Item                                | Version  | Purpose                                                  |
| ----------------------------------- | -------- | -------------------------------------------------------- |
| **Vitest**                          | `2.1.2`  | Same runner as backend.                                  |
| **Playwright**                      | `1.48.0` | E2E browser tests.                                       |
| **`@testing-library/react`**        | `16.0.1` | Component tests.                                         |
| **`@testing-library/user-event`**   | `14.5.2` | Interaction simulation.                                  |
| **`@testing-library/jest-dom`**     | `6.6.3`  | DOM matchers.                                            |

### 13.3 Performance testing

| Item             | Version  | Purpose                                                  |
| ---------------- | -------- | -------------------------------------------------------- |
| **k6**           | `0.54.0` | Load tests against critical endpoints.                   |

k6 scripts live in `apps/api/test/load/`. Run on demand and before each major release.

### 13.4 Contract testing

OpenAPI spec validation: at CI we serialize the runtime OpenAPI spec from the running backend and compare with the committed `apps/api/openapi.json`. Drift fails the build.

---

## 14. Linting, Formatting, Quality Gates

### 14.1 ESLint

| Item                                                   | Version    | Purpose                                       |
| ------------------------------------------------------ | ---------- | --------------------------------------------- |
| **`eslint`**                                           | `9.12.0`   | Linter.                                       |
| **`@typescript-eslint/eslint-plugin`**                 | `8.10.0`   | TypeScript-specific rules.                    |
| **`@typescript-eslint/parser`**                        | `8.10.0`   | TypeScript parser for ESLint.                 |
| **`eslint-plugin-import`**                             | `2.31.0`   | Import order and module-boundary rules.       |
| **`eslint-plugin-unicorn`**                            | `56.0.0`   | Modern JS best practices.                     |
| **`eslint-plugin-security`**                           | `3.0.1`    | Detects unsafe patterns (eval, etc.).         |
| **`eslint-config-prettier`**                           | `9.1.0`    | Disables rules that conflict with Prettier.   |
| **`eslint-plugin-react`**                              | `7.37.1`   | React rules (frontend).                       |
| **`eslint-plugin-react-hooks`**                        | `5.0.0`    | Hook rules (frontend).                        |
| **`eslint-plugin-jsx-a11y`**                           | `6.10.0`   | Accessibility rules (frontend).               |

The shared config is `@cattlepro/config-eslint`. Strict mode: `@typescript-eslint/strict-type-checked` + `@typescript-eslint/stylistic-type-checked`.

### 14.2 Prettier

| Item             | Version  | Purpose                                                  |
| ---------------- | -------- | -------------------------------------------------------- |
| **`prettier`**   | `3.3.3`  | Code formatter; runs in pre-commit hook and in CI.       |

Configuration in `.prettierrc`:

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### 14.3 Git hooks

| Item                          | Version  | Purpose                                                  |
| ----------------------------- | -------- | -------------------------------------------------------- |
| **`husky`**                   | `9.1.6`  | Git hook manager.                                        |
| **`lint-staged`**             | `15.2.10` | Runs lint+format only on staged files.                  |
| **`@commitlint/cli`**         | `19.5.0` | Conventional Commits enforcement.                        |
| **`@commitlint/config-conventional`** | `19.5.0` | Standard Conventional Commits rules.             |

Hooks installed in `.husky/`:

- `pre-commit`: `lint-staged` (eslint --fix + prettier --write on staged files).
- `commit-msg`: `commitlint --edit $1` (validates message format).
- `pre-push`: `pnpm type-check && pnpm test` (full type check and unit tests).

---

## 15. CI / CD

### 15.1 GitHub Actions

CI/CD lives in `.github/workflows/`. Job summaries:

| Workflow                        | Trigger                          | Purpose                                                 |
| ------------------------------- | -------------------------------- | ------------------------------------------------------- |
| `ci.yml`                        | PR to `main` or `develop`; push to `develop` | Lint, type-check, unit tests, integration tests, E2E.   |
| `deploy-staging.yml`            | Merge to `develop`               | Build and deploy to staging environment.                |
| `deploy-production.yml`         | Merge to `main` (manual approval gate) | Build and deploy to production.                  |
| `security-scan.yml`             | Weekly (Mondays 06:00 UTC) + manual | CodeQL, Trivy, `pnpm audit`.                       |
| `release.yml`                   | Tag push (`v*.*.*`)              | Generate changelog, GitHub Release.                     |

### 15.2 GitHub Actions versions

Pinned by SHA where security-sensitive (e.g., `aquasecurity/trivy-action@<sha>`); pinned by major version otherwise (`actions/checkout@v4`).

### 15.3 Container registry

Production images are built and pushed to GitHub Container Registry (`ghcr.io/<org>/cattlepro-api`, `ghcr.io/<org>/cattlepro-web`). Tags: `<commit-sha>` and `latest` (latest only on `main`).

### 15.4 Branch protection

Configured per `decisions.md` ADR-021:

- `main` and `develop`: require PR, ≥1 approval, all checks green, no force push, no branch deletion.
- Admins are subject to the rules.

---

## 16. Containerization and Local Dev

### 16.1 Docker images (production)

| Image                  | Base                       | Purpose                       |
| ---------------------- | -------------------------- | ----------------------------- |
| `cattlepro-api`        | `node:20.11-alpine`        | NestJS backend.               |
| `cattlepro-web`        | `node:20.11-alpine`        | Next.js frontend.             |

Multi-stage builds: deps → builder → runner. Final images run as non-root user `nodejs` (UID 1001).

### 16.2 Docker Compose (local dev)

`docker/docker-compose.yml` brings up:

- `postgres` — `postgis/postgis:16-3.4-alpine`.
- `redis` — `redis:7-alpine` with AOF.
- `minio` — S3-compatible storage.

Volumes are named (`postgres-data`, `redis-data`, `minio-data`).

### 16.3 Why not Kubernetes locally

Local dev does not need K8s. Production deployment may use K8s (open question, see §17).

---

## 17. Hosting and Infrastructure

### 17.1 Hosting

The production hosting target is **Railway** (resolved 2026-05-07 via `decisions.md` ADR-023). For object storage, **Cloudflare R2** is used in production; **MinIO** is used in local development.

| Concern              | Provider           |
| -------------------- | ------------------ |
| Backend (NestJS)     | Railway            |
| Frontend (Next.js)   | Railway            |
| PostgreSQL 16        | Railway managed    |
| Redis 7              | Railway managed    |
| Object storage       | Cloudflare R2      |
| Local dev storage    | MinIO              |
| Email                | TBD (Phase 2 — Resend / Postmark / SES) |

> **Migration triggers:** the team revisits the hosting decision if (a) total tenants exceed 50 and Railway's monthly cost exceeds the hosting budget, (b) a regulatory requirement mandates Colombian data residency Railway cannot satisfy, or (c) operational incidents related to Railway availability exceed 2 in a quarter. Migration candidates: **Fly.io** (São Paulo region, multi-region failover) and **AWS ECS + RDS** (full control, explicit data residency in São Paulo).

### 17.2 Hosting requirements

The chosen provider satisfies these baseline requirements:

- ✅ Node.js 20.11+ runtime.
- ✅ Managed PostgreSQL 16 with PostGIS extension support.
- ✅ Managed Redis 7.
- ✅ HTTPS / TLS termination.
- ✅ Environment-variable secrets management.
- ✅ GitHub-integrated automated deployments.
- ✅ Preview environments per pull request.
- ✅ São Paulo region for low-latency LATAM access.

External (handled outside Railway):

- ✅ S3-compatible object storage — Cloudflare R2.
- ⬜ Backups (in-progress per §17.3 below — Railway provides daily snapshots; long-term WAL-shipping setup is pending).

### 17.3 Backup policy (operational target)

- PostgreSQL: continuous WAL-shipping + daily snapshots; 30-day retention.
- Object storage: versioning enabled on the bucket; lifecycle rules for cleanup.
- RTO target: 4 hours.
- RPO target: 1 hour.

---

## 18. Development Tools

### 18.1 Recommended IDE setup

- **VS Code** with extensions:
  - `dbaeumer.vscode-eslint`
  - `esbenp.prettier-vscode`
  - `Prisma.prisma`
  - `bradlc.vscode-tailwindcss`
  - `Vue.volar` (no — not used; ignore)
  - `ms-playwright.playwright`

`.vscode/settings.example.json` (committed) provides default workspace settings; copy to `.vscode/settings.json` (gitignored) and customize.

### 18.2 Database tools

- **Prisma Studio** (`pnpm prisma:studio`) — quick data inspection in dev.
- **TablePlus / DBeaver / pgAdmin** — for ad-hoc queries against staging/prod replicas (read-only roles).

### 18.3 API testing

- **Bruno** (recommended) or **Insomnia** for ad-hoc API testing. Postman acceptable but heavier.
- **Swagger UI** at `/docs` in dev/staging.

---

## 19. Version Pinning and Update Policy

### 19.1 Why exact versions

Wildcards (`^`, `~`) lead to silent drift. With exact versions:

- Reproducible builds across machines and time.
- Lockfile churn is explicit and reviewable.
- Vulnerability response is deterministic.

### 19.2 Renovate / Dependabot

Dependabot is enabled with weekly schedule:

- **Security updates:** auto-merged after CI passes (for non-major versions).
- **Patch updates:** opened as PRs, merged by maintainers.
- **Minor updates:** opened, reviewed, merged manually.
- **Major updates:** opened, queued for the quarterly review.

### 19.3 Adding a new dependency

A PR adding a new direct dependency must include:

- The reason for adding it (linked feature/bug).
- The package's last release date and active-maintenance evidence.
- The bundle-size impact (frontend) measured with `pnpm bundle-size` (configured to use `bundlejs` or `bundlephobia`).
- License confirmation.
- The exact version pinned.

### 19.4 Removing a dependency

When a dependency is no longer used, remove it the same week. Run `pnpm dlx depcheck` periodically to catch orphans.

---

## 20. Approved Dependencies Quick Reference

This table is a one-glance summary. Anything not here is **not approved**.

### Backend runtime

```
@nestjs/common         10.4.4
@nestjs/config         3.2.3
@nestjs/core           10.4.4
@nestjs/jwt            10.2.0
@nestjs/passport       10.0.3
@nestjs/platform-fastify  10.4.4
@nestjs/swagger        7.4.2

@fastify/cookie        9.4.0
@fastify/csrf-protection 6.4.1
@fastify/helmet        11.1.1
@fastify/rate-limit    9.1.0

@prisma/client         5.20.0
prisma                 5.20.0  (devDep)

argon2                 0.41.1
otplib                 12.0.1
qrcode                 1.5.4
passport               0.7.0
passport-jwt           4.0.1

zod                    3.23.8

bullmq                 5.21.2
ioredis                5.4.1
@bull-board/api        5.23.0
@bull-board/fastify    5.23.0

@aws-sdk/client-s3            3.670.0
@aws-sdk/s3-request-presigner 3.670.0

pino                   9.4.0
nestjs-pino            4.1.0
pino-pretty            11.2.2  (devDep)

@opentelemetry/api                            1.9.0
@opentelemetry/sdk-node                       0.54.0
@opentelemetry/auto-instrumentations-node     0.50.0
@opentelemetry/exporter-trace-otlp-http       0.54.0

@sentry/nestjs         8.34.0

prom-client                       15.1.3
@willsoto/nestjs-prometheus       6.0.1

@react-email/components 0.0.25
@react-email/render     1.0.1

date-fns               3.6.0
date-fns-tz            3.1.3
reflect-metadata       0.2.2
rxjs                   7.8.1
```

### Frontend runtime

```
next                   15.0.0
react                  19.0.0
react-dom              19.0.0

tailwindcss            3.4.13
@tailwindcss/forms     0.5.9
@tailwindcss/typography 0.5.15
class-variance-authority 0.7.0
clsx                   2.1.1
tailwind-merge         2.5.4
lucide-react           0.453.0

@tanstack/react-query  5.59.16
@tanstack/react-table  8.20.5
@tanstack/react-query-devtools 5.59.16  (devDep)
zustand                5.0.0

react-hook-form        7.53.1
@hookform/resolvers    3.9.1

recharts               2.13.0
react-flow             11.11.4

@ducanh2912/next-pwa   10.2.9
workbox-window         7.1.0
idb                    8.0.0

next-intl              3.21.1

@sentry/nextjs         8.34.0

date-fns               3.6.0
date-fns-tz            3.1.3
```

### Tooling (devDependencies, root or per-package)

```
typescript             5.6.2
turbo                  2.1.3
pnpm                   9.12.0  (engine)

eslint                                  9.12.0
@typescript-eslint/eslint-plugin        8.10.0
@typescript-eslint/parser               8.10.0
eslint-plugin-import                    2.31.0
eslint-plugin-unicorn                   56.0.0
eslint-plugin-security                  3.0.1
eslint-config-prettier                  9.1.0
eslint-plugin-react                     7.37.1
eslint-plugin-react-hooks               5.0.0
eslint-plugin-jsx-a11y                  6.10.0

prettier                       3.3.3
husky                          9.1.6
lint-staged                    15.2.10
@commitlint/cli                19.5.0
@commitlint/config-conventional 19.5.0

vitest                          2.1.2
@vitest/coverage-v8             2.1.2
supertest                       7.0.0
@testing-library/react          16.0.1
@testing-library/user-event     14.5.2
@testing-library/jest-dom       6.6.3
playwright                      1.48.0
@playwright/test                1.48.0

tsx                             4.19.1
```

### External services / images

```
PostgreSQL    16.x   (image: postgis/postgis:16-3.4-alpine)
Redis         7.x    (image: redis:7-alpine)
MinIO         latest (image: minio/minio:latest, dev only)
Node.js       20.11.0 (image: node:20.11-alpine for prod)
```

---

## Document Maintenance

This document is updated whenever:

- A dependency is added, removed, or version-bumped (in the same PR).
- A new external service is integrated.
- A hosting decision is finalized (resolves §17 open question).
- A tooling change happens (CI, hooks, IDE config).

Substantive additions or version bumps require a PR titled `chore(deps): <package> -> <version>` or `chore(infra): <change>` with maintainer approval.

When this document conflicts with `decisions.md`, **`decisions.md` wins**. When `package.json` and this document drift, the divergence triggers a PR to align them — usually the document is the source of intent and `package.json` is updated to match, but if a runtime constraint forced a different version, this document is updated to reflect reality.

When a dependency is found to have a critical CVE, the response is documented in `docs/security/incidents/<date>-<package>.md` (placeholder) and this document is updated as part of the patch.
