# Architecture Decision Records (ADRs)

> This document consolidates the key architectural decisions made for **CattlePro**. Each decision follows a lightweight ADR format: **Context**, **Decision**, **Alternatives Considered**, **Consequences**, and **Status**.
>
> Decisions are immutable once accepted. To revise a decision, mark it as **Superseded** and add a new ADR referencing it.

---

## Index

| ID      | Title                                                  | Status   |
| ------- | ------------------------------------------------------ | -------- |
| ADR-001 | Programming language: TypeScript across the stack      | Accepted |
| ADR-002 | Database engine: PostgreSQL                            | Accepted |
| ADR-003 | ORM: Prisma                                            | Accepted |
| ADR-004 | System architecture: Modular Monolith                  | Accepted |
| ADR-005 | Deployment model: Multi-tenant SaaS with offline PWA   | Accepted |
| ADR-006 | Backend framework: NestJS over Fastify adapter         | Accepted |
| ADR-007 | Frontend framework: Next.js 15 with App Router         | Accepted |
| ADR-008 | API style: REST + OpenAPI as primary, tRPC internal    | Accepted |
| ADR-009 | Validation: Zod shared between frontend and backend    | Accepted |
| ADR-010 | Authentication: JWT with rotating refresh tokens       | Accepted |
| ADR-011 | Password hashing: Argon2id                             | Accepted |
| ADR-012 | Authorization model: RBAC with four roles              | Accepted |
| ADR-013 | Multi-tenancy strategy: shared database, shared schema | Accepted |
| ADR-014 | Monorepo tooling: pnpm workspaces + Turborepo          | Accepted |
| ADR-015 | Testing strategy: Vitest + Supertest + Playwright + k6 | Accepted |
| ADR-016 | Error handling: typed domain errors + RFC 7807         | Accepted |
| ADR-017 | Concurrency control: optimistic locking with version   | Accepted |
| ADR-018 | Observability: Pino + OpenTelemetry + Sentry           | Accepted |
| ADR-019 | Background jobs: BullMQ on Redis                       | Accepted |
| ADR-020 | File storage: S3-compatible with presigned URLs        | Accepted |
| ADR-021 | Git workflow: Git Flow adapted + Conventional Commits  | Accepted |
| ADR-022 | Genealogy queries: PostgreSQL recursive CTEs           | Accepted |

---

## ADR-001 — Programming language: TypeScript across the stack

### Context

The project requires a single language for frontend, backend, and shared packages to maximize code reuse (validation schemas, DTOs, types) and developer productivity.

### Decision

Use **TypeScript 5.6+ in `strict` mode** across the entire monorepo. The use of `any` is prohibited; all values must be explicitly typed or correctly inferred.

### Alternatives Considered

- **JavaScript only**: rejected. Loss of type safety unacceptable for a system handling financial data and business invariants.
- **Different languages per layer (e.g., Go backend + TypeScript frontend)**: rejected. Code duplication of validation logic and DTOs, plus team friction.

### Consequences

- ✅ End-to-end type safety, including shared Zod schemas.
- ✅ Single language reduces hiring complexity.
- ✅ Tooling (ESLint, Prettier, Vitest) is uniform.
- ⚠️ Requires strict ESLint configuration and `tsconfig.base.json` enforcement.
- ⚠️ Build times must be managed via Turborepo caching.

---

## ADR-002 — Database engine: PostgreSQL

### Context

The system needs a relational database that supports complex genealogy queries (recursive ancestry), JSON metadata, geospatial data (farm locations), full-text search, and a mature TypeScript ecosystem. License costs must be zero or minimal for SaaS economics.

### Decision

Use **PostgreSQL 16+** with the extensions `pgcrypto`, `citext`, and `postgis`.

### Alternatives Considered

- **SQL Server**: rejected. Commercial licensing costs are prohibitive for a SaaS targeting small/medium farms.
- **MySQL**: rejected. Weaker support for recursive CTEs, JSON, and arrays compared to PostgreSQL.
- **MongoDB**: rejected. Genealogy and financial reporting require relational integrity and ACID transactions across multiple entities; modeling cattle breeding flows in a document store would be a poor fit.
- **SQLite**: rejected for production (no concurrent writes at scale), but considered for local-first PWA cache via IndexedDB instead.

### Consequences

- ✅ `WITH RECURSIVE` makes genealogy queries trivial.
- ✅ JSONB with GIN indexes supports flexible metadata without sacrificing relational integrity.
- ✅ PostGIS enables farm geolocation and trazability features.
- ✅ Mature replication, partitioning, and HA story.
- ⚠️ Requires a hosting provider with managed PostgreSQL (RDS, Neon, Supabase, Railway, etc.).

---

## ADR-003 — ORM: Prisma

### Context

We need an ORM that gives end-to-end type safety, supports PostgreSQL features (JSONB, arrays, enums, recursive CTEs via raw queries), enables safe migrations, and integrates cleanly with NestJS.

### Decision

Use **Prisma 5+** as the primary ORM. For complex queries (genealogy, aggregated reports) use `prisma.$queryRaw` with the `Prisma.sql` tagged template — never `$queryRawUnsafe`.

### Alternatives Considered

- **Drizzle ORM**: strong contender. Better raw SQL feel and slightly better runtime performance. Rejected because Prisma's schema-first approach, migration tooling, and Prisma Studio reduce friction more than Drizzle's marginal performance gains in our context.
- **TypeORM**: rejected. Decorator-based but with weaker type inference and a history of breaking changes.
- **MikroORM**: rejected. Smaller ecosystem and steeper learning curve.
- **Raw SQL with Kysely**: rejected as primary, but Kysely-style raw queries are acceptable inside repositories when needed.

### Consequences

- ✅ Single source of truth: `schema.prisma`.
- ✅ Generated client gives exact types per query.
- ✅ Migrations are versioned and reviewable.
- ⚠️ Some complex queries are easier in raw SQL — accepted, with `Prisma.sql` parametrization mandatory.
- ⚠️ Prisma's bundle size on serverless can be a concern; mitigated by deploying to long-running containers.

---

## ADR-004 — System architecture: Modular Monolith

### Context

The product targets small and medium-sized farms initially but must support growth. Microservices would introduce operational complexity (service mesh, distributed tracing, eventual consistency, sagas) that does not pay off at the current scale. A traditional monolith risks devolving into a tangled codebase.

### Decision

Adopt a **modular monolith**: a single deployable backend organized into bounded modules (`auth`, `farms`, `animals`, `reproduction`, `health`, `production`, `finance`, `notifications`, `audit`). Modules communicate through explicit interfaces and in-process domain events. Direct cross-module access to internal services or repositories is prohibited.

### Alternatives Considered

- **Microservices from day one**: rejected. Premature optimization. Adds 5-10x infrastructure cost and operational burden without delivering value at MVP scale.
- **Traditional monolith (no module boundaries)**: rejected. Poor long-term maintainability; refactoring later is painful.
- **Hybrid (modular monolith + a few microservices for specialized concerns)**: deferred. May extract specific modules (e.g., notifications, IoT ingestion) if independent scaling becomes necessary.

### Consequences

- ✅ Single deployment, simple operations.
- ✅ Cross-module transactions are trivial (single database transaction).
- ✅ Module boundaries enable future extraction without total rewrite.
- ⚠️ Discipline required to keep modules decoupled — enforced via ESLint import rules and code review.
- ⚠️ When a module needs independent scaling, extraction work is non-zero but bounded.

---

## ADR-005 — Deployment model: Multi-tenant SaaS with offline PWA

### Context

Farms often operate in areas with limited or unreliable connectivity. Field workers (milking, tagging, weighing) need the app to work without internet during the activity. At the same time, the business model is SaaS to keep customer acquisition cost low.

### Decision

- Backend: **multi-tenant SaaS** hosted in the cloud, accessible via HTTPS.
- Frontend: **Progressive Web App (PWA)** with Service Workers and IndexedDB for offline support.
- Offline-capable flows: animal registration, weight recording, milk production logging, health event logging.
- Synchronization: automatic when connectivity is restored, with conflict resolution via `updated_at` timestamps and the `version` optimistic-lock field.

### Alternatives Considered

- **Pure web SaaS without offline support**: rejected. Field usability suffers in rural areas.
- **Electron desktop app**: rejected. Adds packaging overhead per OS, no real offline benefit over PWA, and excludes mobile.
- **Native mobile (React Native/iOS/Android)**: deferred. PWA covers 90% of needs at much lower cost. Native could be a future addition for specialized features (camera-based ear tag scanning, BLE scale integration).

### Consequences

- ✅ Single codebase, three target form factors (mobile, tablet, desktop).
- ✅ Offline-capable for critical field operations.
- ✅ Lower operational cost than maintaining native apps.
- ⚠️ Conflict resolution logic for offline writes requires careful design.
- ⚠️ Service Worker debugging adds complexity; mitigated by testing strategy.

---

## ADR-006 — Backend framework: NestJS over Fastify adapter

### Context

The backend needs a framework with first-class TypeScript support, dependency injection (for testability), modular organization, and high HTTP performance.

### Decision

Use **NestJS 10** with the **Fastify adapter** (`@nestjs/platform-fastify`).

### Alternatives Considered

- **Fastify standalone**: rejected. Faster to start but lacks DI, modular structure, and built-in validation/guards. We would reinvent NestJS.
- **Express standalone**: rejected. Slower than Fastify, less type-friendly.
- **Hono**: interesting (edge-friendly, fast) but ecosystem is too young for a production system requiring battle-tested integrations (Passport, Swagger, Bull).
- **NestJS with Express adapter (default)**: rejected in favor of Fastify for ~2x throughput on JSON workloads.

### Consequences

- ✅ DI container makes unit testing trivial (services are mocked via DI).
- ✅ Guards, Interceptors, Pipes provide a clean separation of concerns.
- ✅ Auto-generated OpenAPI documentation via `@nestjs/swagger`.
- ✅ Fastify's performance benefits without losing NestJS ergonomics.
- ⚠️ Some Express-specific middleware needs Fastify equivalents (Helmet, rate-limit) — already addressed.

---

## ADR-007 — Frontend framework: Next.js 15 with App Router

### Context

The frontend must support SSR for SEO and fast TTFB on slow connections, image optimization for animal photos, PWA capabilities, and a modern React component model.

### Decision

Use **Next.js 15** with the **App Router** and **React 19**.

### Alternatives Considered

- **Remix**: rejected. Strong nested-routing model but smaller ecosystem and less PWA tooling than Next.js.
- **Vite + React Router**: rejected. Faster dev server but no SSR/RSC out of the box; would require manual setup of features Next.js provides.
- **TanStack Start**: deferred. Promising but not yet at 1.0 at the time of decision.
- **SvelteKit**: rejected. Different language ecosystem; would split team focus from React/TypeScript.

### Consequences

- ✅ React Server Components reduce JavaScript bundle for read-heavy pages.
- ✅ Streaming SSR improves perceived performance.
- ✅ `next-pwa` integrates Service Worker generation cleanly.
- ✅ Built-in `Image` component handles responsive animal photos.
- ⚠️ App Router has a steeper learning curve than Pages Router; mitigated by team training.

---

## ADR-008 — API style: REST + OpenAPI as primary, tRPC internal

### Context

The API has two consumer profiles: external integrations (veterinarians, accountants, government compliance) and the internal Next.js frontend. External consumers expect REST + OpenAPI for compatibility. Internal consumers benefit from end-to-end type safety without code generation.

### Decision

- **Primary public API: REST** with OpenAPI 3 specification, versioned via URI (`/api/v1/...`).
- **Internal frontend ↔ backend: REST** as well, consumed via TanStack Query + a generated TypeScript client.
- **tRPC**: not adopted in v1 to keep one consistent API style. Re-evaluate if internal-only complex queries justify it.

### Alternatives Considered

- **GraphQL**: rejected for v1. Adds query complexity, N+1 risks, and access-control granularity headaches. May be added later as a federated layer if needed.
- **tRPC for everything**: rejected. Excellent for full-stack TypeScript apps but lacks language-agnostic compatibility for external integrations.

### Consequences

- ✅ Single API style is simpler to document, test, and audit.
- ✅ Public OpenAPI spec enables third-party integrations.
- ✅ Standard tooling: Swagger UI, Postman collections, curl examples.
- ⚠️ Internal frontend gives up some type-safety benefits compared to tRPC, mitigated by Zod schemas shared via `@cattlepro/validation`.

---

## ADR-009 — Validation: Zod shared between frontend and backend

### Context

Validation must happen on both the client (UX) and the server (security). Duplicating schemas leads to drift. Inputs include date ranges, ear tag formats, ranges of weights and milk production, and parentage rules.

### Decision

Use **Zod** for all input validation. Schemas live in the shared `@cattlepro/validation` package and are imported by both `apps/api` (NestJS pipes) and `apps/web` (React Hook Form resolvers).

### Alternatives Considered

- **class-validator (NestJS default)**: rejected. Decorator-based, less ergonomic, hard to share with the frontend, and weaker inference.
- **Yup**: rejected. Smaller ecosystem and weaker TypeScript inference than Zod.
- **Valibot**: considered. Smaller bundle, but Zod's ecosystem (React Hook Form, tRPC, Prisma generators) is more mature.

### Consequences

- ✅ Single source of truth for validation rules.
- ✅ Identical error messages on client and server.
- ✅ Type inference from Zod schemas eliminates duplicate type definitions.
- ⚠️ Zod runtime cost is non-trivial; not used inside hot paths (uses inferred TS types instead).

---

## ADR-010 — Authentication: JWT with rotating refresh tokens

### Context

Sessions must work in browsers, on mobile (PWA), and across offline/online cycles. Long-lived sessions must be revocable. Stolen refresh tokens must be detectable.

### Decision

- **Access token**: JWT (HS256), short-lived (15 minutes), sent via `Authorization: Bearer`.
- **Refresh token**: opaque random string (256 bits), long-lived (30 days), stored hashed (SHA-256) in PostgreSQL.
- **Rotation**: every refresh issues a new refresh token; the old one is marked revoked and linked via `replacedBy`.
- **Reuse detection**: if a revoked refresh token is presented, the entire token *family* is invalidated immediately — this catches token theft.
- **Storage on client**: refresh tokens in HTTP-only secure cookies; access tokens in memory only.

### Alternatives Considered

- **Session cookies only**: simpler but harder to integrate with potential native mobile clients later.
- **Long-lived JWTs without refresh**: rejected. Cannot revoke a stolen token before expiry.
- **Stateful sessions in Redis**: viable but adds Redis as a hard authentication dependency (still used for rate limiting and queues, but not on the critical auth path).

### Consequences

- ✅ Access tokens are stateless and fast.
- ✅ Refresh tokens can be revoked individually or per family.
- ✅ Reuse detection catches refresh-token theft.
- ⚠️ Token rotation logic is more complex; covered by integration tests.

---

## ADR-011 — Password hashing: Argon2id

### Context

Passwords must be hashed using a modern, memory-hard algorithm resistant to GPU and ASIC attacks. The OWASP Password Storage Cheat Sheet (2024) recommends Argon2id as the first choice.

### Decision

Use **Argon2id** with parameters: `memoryCost: 19456` (19 MiB), `timeCost: 2`, `parallelism: 1`. These are the OWASP 2024 baseline. Parameters are reviewed annually.

### Alternatives Considered

- **bcrypt**: still acceptable but vulnerable to GPU attacks at low work factors. Argon2id is the modern best practice.
- **scrypt**: acceptable, but Argon2id has stronger sidechannel resistance.
- **PBKDF2**: rejected. Not memory-hard.

### Consequences

- ✅ Future-proof password storage.
- ✅ `argon2.needsRehash` allows seamless parameter upgrades.
- ⚠️ Higher CPU/memory cost per login; mitigated by rate limiting and the fact that login is not a hot path.

---

## ADR-012 — Authorization model: RBAC with four roles

### Context

The system needs role-based access control. Permission requirements are coarse-grained (an owner can do everything in their farm; a vet can write health records; an employee can record milk and animal data; an auditor can read everything but write nothing).

### Decision

Implement **RBAC** with four roles defined in the `UserRole` enum:

- `OWNER` — full access within their tenant.
- `VETERINARIAN` — read all animals; write health events, pregnancies, treatments.
- `EMPLOYEE` — read animals; write daily milk records, weights, animal registrations.
- `AUDITOR` — read-only access, including audit logs.

Authorization is enforced at the controller level via the `@Roles()` decorator and the `RolesGuard`. Tenant isolation is enforced at the data-access layer (every query filters by `tenantId` derived from the JWT).

### Alternatives Considered

- **ABAC (attribute-based)**: rejected for v1. Overkill for current requirements. Could be added later if customers need fine-grained permissions per farm or per animal.
- **No roles, just owner/staff**: rejected. Too coarse to satisfy the veterinarian and auditor use cases.

### Consequences

- ✅ Simple to reason about and audit.
- ✅ Easy to test (one test per role per endpoint).
- ⚠️ Adding a new role requires code changes (acceptable trade-off; roles change rarely).

---

## ADR-013 — Multi-tenancy strategy: shared database, shared schema

### Context

Multiple customer farms (tenants) will use the platform. Tenants must not see each other's data. The number of tenants is expected to grow into the thousands. Operational simplicity is critical.

### Decision

Use **shared database, shared schema** multi-tenancy: every domain table has a `tenantId` column, and every query is filtered by `tenantId` from the authenticated user's JWT claim.

Enforcement layers:

1. JWT contains `tenantId` claim, signed by the server.
2. Repositories accept `tenantId` as a required parameter — never derived from request input.
3. Database indexes are composite, leading with `tenantId` where appropriate.
4. (Future) PostgreSQL Row-Level Security policies as defense-in-depth.

### Alternatives Considered

- **Database per tenant**: rejected. Operationally expensive at scale (migrations, backups, monitoring).
- **Schema per tenant**: rejected. Same operational issues as database per tenant.
- **Sharded by tenant**: deferred. Premature for current scale.

### Consequences

- ✅ Single database, single migration path, single backup.
- ✅ Cheap to onboard new tenants.
- ⚠️ A bug that omits `tenantId` filtering is catastrophic — mitigated by code review, lint rules, and integration tests that verify tenant isolation.

---

## ADR-014 — Monorepo tooling: pnpm workspaces + Turborepo

### Context

The project has multiple packages: `apps/api`, `apps/web`, and shared packages (`@cattlepro/validation`, `@cattlepro/shared-types`, `@cattlepro/ui`, ESLint/TS configs). Dependencies must be hoisted efficiently and builds must be cached and parallelized.

### Decision

Use **pnpm workspaces** for dependency management and **Turborepo** for task orchestration.

### Alternatives Considered

- **npm workspaces + Nx**: Nx is powerful but heavier and more opinionated than needed.
- **Yarn workspaces + Lerna**: Lerna is in maintenance mode; Turborepo is the modern equivalent.
- **Bun workspaces**: too new for production at the time of this decision.

### Consequences

- ✅ Disk-efficient (pnpm content-addressable storage).
- ✅ Fast incremental builds (Turborepo cache).
- ✅ Strict dependency boundaries (pnpm doesn't hoist by default).
- ⚠️ Some npm-only tools have edge cases with pnpm; documented in the README.

---

## ADR-015 — Testing strategy: Vitest + Supertest + Playwright + k6

### Context

The system must be tested at multiple levels: pure logic (unit), HTTP flows with the database (integration), full user journeys (E2E), and load (performance). A consistent test runner reduces tooling sprawl.

### Decision

| Layer            | Tool                              | Purpose                                                        |
| ---------------- | --------------------------------- | -------------------------------------------------------------- |
| Unit             | **Vitest**                        | Pure functions, services with mocked deps                      |
| Integration      | **Vitest + Supertest**            | HTTP → controller → service → real PostgreSQL → response       |
| E2E              | **Playwright**                    | Critical user flows in a real browser                          |
| Load/performance | **k6**                            | Critical endpoints (genealogy, monthly reports, dashboard)     |
| Contract         | **OpenAPI schema validation**     | Verify responses match the published spec                      |

Coverage threshold: **80% on critical business logic**, enforced in CI. PRs that drop below the threshold are blocked.

### Alternatives Considered

- **Jest**: rejected. Slower than Vitest and configuration is heavier.
- **Cypress**: rejected for E2E. Playwright supports multiple browsers natively, runs faster, and has better debugging.

### Consequences

- ✅ Consistent runner (Vitest) across unit and integration tests.
- ✅ Realistic integration tests with PostgreSQL in Docker.
- ✅ Performance regressions caught in CI before production.
- ⚠️ Integration and E2E tests are slower; run on PRs but not on every commit.

---

## ADR-016 — Error handling: typed domain errors + RFC 7807 Problem Details

### Context

Errors must be informative for clients, safe for production (no stack traces leaked), and machine-readable for retry logic. Multiple error origins exist: validation, domain rules, database constraints, third-party services.

### Decision

- All domain errors extend the abstract `DomainError` class with a `code` (machine-readable string) and `httpStatus`.
- A global `GlobalExceptionFilter` translates errors to **RFC 7807 Problem Details** JSON responses with `Content-Type: application/problem+json`.
- Stack traces are never sent to clients in any environment.
- Validation errors include a structured `errors[]` array with field paths and messages.

### Alternatives Considered

- **Plain HTTP exceptions everywhere**: rejected. Too coupled to HTTP layer; harder to test.
- **Custom error format**: rejected. RFC 7807 is a standard, well-supported by clients and tooling.

### Consequences

- ✅ Clients can branch on stable `code` strings.
- ✅ No leakage of internal details.
- ✅ Domain layer is independent of HTTP.
- ⚠️ Slightly more boilerplate per error type (acceptable).

---

## ADR-017 — Concurrency control: optimistic locking with `version` column

### Context

Multiple users (owner, employee, vet) may edit the same animal concurrently. Last-write-wins causes silent data loss. Pessimistic locking would harm UX (users blocked).

### Decision

Use **optimistic locking** on mutable domain entities (`animals`, `pregnancies`, etc.) via an integer `version` column. Updates include the expected version; on conflict, the server returns `409 Conflict` with code `OPTIMISTIC_LOCK_CONFLICT` and the client must refetch and retry.

### Alternatives Considered

- **Pessimistic locking**: rejected. Hurts UX; offline scenarios cannot hold a lock.
- **Last-write-wins**: rejected. Silent data corruption.
- **CRDTs**: rejected for v1. Overkill for the data model.

### Consequences

- ✅ Concurrent edits are detected and surfaced cleanly.
- ✅ Compatible with offline-then-sync flows.
- ⚠️ Frontend must handle the conflict response gracefully (retry with merged values).

---

## ADR-018 — Observability: Pino + OpenTelemetry + Sentry

### Context

We need structured logs, distributed traces (in case modules are extracted later), and exception tracking with rich context for production debugging.

### Decision

- **Logs**: **Pino** with `nestjs-pino`, JSON output, correlated with `traceId`.
- **Traces**: **OpenTelemetry** auto-instrumentation for HTTP, Prisma, and Redis. Exported to a backend (Tempo, Jaeger, or a SaaS).
- **Errors**: **Sentry** for unhandled exceptions in both API and Web.
- **Metrics**: Prometheus-compatible endpoint exposed by NestJS.

### Alternatives Considered

- **Winston**: rejected. Slower than Pino.
- **Datadog/New Relic only**: viable, but vendor-locked. OpenTelemetry is vendor-neutral.

### Consequences

- ✅ Structured logs are queryable.
- ✅ Distributed tracing ready before microservice extraction.
- ⚠️ Operational complexity of running OTel collectors; mitigated by SaaS options (Honeycomb, Grafana Cloud).

---

## ADR-019 — Background jobs: BullMQ on Redis

### Context

The system needs scheduled and asynchronous work: sending notification emails, computing daily alerts (vaccinations due, expected births), generating reports, processing image uploads.

### Decision

Use **BullMQ** on **Redis 7+** for queues, scheduled jobs, and recurring tasks.

### Alternatives Considered

- **PostgreSQL-based job queues (pg-boss, graphile-worker)**: rejected. Acceptable but Redis is already required for rate limiting; reusing it for queues avoids adding PostgreSQL load.
- **Cloud queues (SQS, Cloud Tasks)**: rejected for v1. Vendor-locked. Can be added later.

### Consequences

- ✅ Battle-tested, scalable queue system.
- ✅ Built-in retries, delays, repeat patterns.
- ⚠️ Adds Redis as a hard dependency for queue operations.

---

## ADR-020 — File storage: S3-compatible with presigned URLs

### Context

Animal photos and document attachments must be stored efficiently, served with CDN caching, and never proxied through the API.

### Decision

Use an **S3-compatible** object store (AWS S3, Cloudflare R2, MinIO for dev). Uploads use **presigned URLs**: the API issues a short-lived signed URL, the client uploads directly to the bucket, then notifies the API of the new object key.

### Alternatives Considered

- **Storing files in PostgreSQL (BYTEA)**: rejected. Bloats the database, harms backup/restore times.
- **Proxying uploads through the API**: rejected. Wastes bandwidth and CPU.

### Consequences

- ✅ Scalable file handling without API bottleneck.
- ✅ CDN-friendly (signed download URLs or public + cache-control).
- ⚠️ Frontend code must handle the two-phase upload flow.

---

## ADR-021 — Git workflow: Git Flow adapted + Conventional Commits

### Context

The team needs a predictable branching model, automated changelog generation, and protection of release branches.

### Decision

Branches:

- `main` — production. Protected. Only receives merges from `release/*` and `hotfix/*`.
- `develop` — integration. Protected. Receives merges from feature branches.
- `feature/<short-name>` — new features, branched from `develop`.
- `fix/<short-name>` — bug fixes, branched from `develop`.
- `hotfix/<short-name>` — urgent production fixes, branched from `main`.
- `release/v<x.y.z>` — release preparation.
- `chore/<short-name>` — tooling, dependencies.

Commits follow the **Conventional Commits** specification, enforced by **Commitlint + Husky**. Versioning follows **Semantic Versioning**. Changelogs are generated automatically.

### Consequences

- ✅ Clear, predictable history.
- ✅ Automated changelog and release notes.
- ⚠️ Requires team training on the convention; mitigated by Commitlint blocking non-conforming commits.

---

## ADR-022 — Genealogy queries: PostgreSQL recursive CTEs

### Context

Animal genealogy can be 6-8 generations deep. Recursive lookups using N+1 queries are unacceptable. The data is naturally a directed acyclic graph (each animal has up to two parents).

### Decision

Use PostgreSQL **`WITH RECURSIVE`** CTEs in raw SQL (parameterized via `Prisma.sql`) to fetch ancestors up to a configurable depth (default 4, max 8). The query is encapsulated in `AnimalRepository.fetchGenealogy`.

### Alternatives Considered

- **Application-level recursion with N queries**: rejected. Catastrophic performance.
- **Materialized path or nested set models**: rejected. Updates are expensive and the data is graph-shaped, not tree-shaped (an animal can be both maternal grandparent and paternal great-grandparent).
- **Closure tables**: viable for very deep, frequently queried trees, but adds write overhead for every birth. Reconsider if read load on genealogy becomes the bottleneck.

### Consequences

- ✅ Single database round-trip for an entire ancestry tree.
- ✅ Bounded query depth prevents runaway recursion.
- ⚠️ Raw SQL must be carefully parametrized to prevent injection — `Prisma.sql` mandatory.
- ⚠️ Indexes on `motherId` and `fatherId` are mandatory for performance.

---

## Decision Log

| Date       | ADR     | Author     | Notes                                       |
| ---------- | ------- | ---------- | ------------------------------------------- |
| 2026-05-02 | 001-022 | Architect  | Initial set of decisions for project kickoff |

---

## How to Add a New Decision

1. Copy the ADR template (Context / Decision / Alternatives / Consequences / Status).
2. Assign the next sequential ID.
3. Open a PR titled `docs(adr): ADR-NNN <short title>`.
4. Require at least one review from a maintainer.
5. Once merged, update the index table at the top.
6. To revise an existing ADR, do **not** edit it. Add a new ADR with status `Accepted` and mark the old one as `Superseded by ADR-NNN`.
