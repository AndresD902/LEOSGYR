# System Patterns — CattlePro

> **Status:** Draft v1.0
> **Last updated:** 2026-05-02
> **Owner:** Architecture
>
> This document is the **playbook of architectural and design patterns** the system follows. Where `decisions.md` answers *which technologies* and *which top-level approach*, this document answers *how the code is structured*, *what patterns we use* and *what conventions every module follows*.
>
> Every pattern documented here is **mandatory** unless explicitly marked as a recommendation. New code must conform; existing code that drifts is brought back through refactoring PRs.
>
> When this document conflicts with `decisions.md`, **`decisions.md` wins**. When it conflicts with `dataModel.md` on database structure, **`dataModel.md` wins**. This document is the authority on *code* patterns.

---

## Table of Contents

1. [Pattern Conventions](#1-pattern-conventions)
2. [Monorepo Structure](#2-monorepo-structure)
3. [Modular Monolith Architecture](#3-modular-monolith-architecture)
4. [Layered Architecture (Per Module)](#4-layered-architecture-per-module)
5. [Repository Pattern](#5-repository-pattern)
6. [Service Layer Pattern](#6-service-layer-pattern)
7. [Controller Pattern](#7-controller-pattern)
8. [DTO and Validation Pattern](#8-dto-and-validation-pattern)
9. [Error Handling Pattern](#9-error-handling-pattern)
10. [Authentication Pattern](#10-authentication-pattern)
11. [Authorization Pattern (RBAC)](#11-authorization-pattern-rbac)
12. [Tenant Scoping Pattern](#12-tenant-scoping-pattern)
13. [Audit Logging Pattern](#13-audit-logging-pattern)
14. [Domain Event Pattern](#14-domain-event-pattern)
15. [Background Jobs Pattern](#15-background-jobs-pattern)
16. [Optimistic Locking Pattern](#16-optimistic-locking-pattern)
17. [Idempotency Pattern](#17-idempotency-pattern)
18. [Logging and Observability Pattern](#18-logging-and-observability-pattern)
19. [Configuration Pattern](#19-configuration-pattern)
20. [Testing Pattern](#20-testing-pattern)
21. [Frontend Patterns](#21-frontend-patterns)
22. [API Versioning and Contract Pattern](#22-api-versioning-and-contract-pattern)
23. [Security Patterns](#23-security-patterns)
24. [Anti-Patterns (Things We Do Not Do)](#24-anti-patterns-things-we-do-not-do)

---

## 1. Pattern Conventions

### 1.1 Why patterns matter for this project

CattlePro is a modular monolith with multiple independent feature modules (animals, reproduction, health, production, finance, etc.). Without consistent patterns, each module would drift in its own direction and the codebase would degrade in 6 months. Patterns are the contract between modules and the discipline that keeps the system extensible enough to extract microservices later (per `decisions.md` ADR-004).

### 1.2 How patterns are specified

Each pattern in this document includes:

- **What it is:** the pattern's purpose.
- **Where it applies:** which layers, modules, or contexts.
- **The canonical example:** a concrete code snippet from the system.
- **Rules:** invariants the pattern must respect.
- **Anti-patterns:** what *not* to do, with examples.

### 1.3 Authority chain

When documents conflict on a topic:

| Topic                              | Authoritative document |
| ---------------------------------- | ---------------------- |
| Domain rules (cattle biology, etc.) | `businessRules.md`     |
| Database structure & invariants    | `dataModel.md`         |
| What features exist                | `features.md`          |
| Top-level architectural choices    | `decisions.md`         |
| **Code patterns and conventions**  | **this document**      |
| Permission matrix                  | `projectbrief.md`      |

---

## 2. Monorepo Structure

### 2.1 Layout

```
cattlepro/
├── apps/
│   ├── api/              # NestJS backend
│   └── web/              # Next.js frontend
├── packages/
│   ├── shared-types/     # DTO interfaces shared API ↔ web
│   ├── validation/       # Zod schemas (the single source of validation truth)
│   ├── ui/               # Design system (shadcn/ui-based)
│   ├── config-eslint/    # Shared ESLint config
│   ├── config-typescript/ # Shared tsconfig
│   └── config-tailwind/  # Shared Tailwind preset
├── docker/
├── docs/                 # This documentation set lives here
├── .github/
└── turbo.json
```

### 2.2 Package boundaries

- `apps/*` import from `packages/*`. Never the reverse.
- `apps/api` does **not** import from `apps/web` and vice versa. Their only contact is via HTTP, the OpenAPI schema, or shared Zod schemas in `packages/validation`.
- `packages/*` may depend on each other only in one direction (no cycles). Allowed dependency edges:
  - `validation` → none.
  - `shared-types` → `validation` (types inferred from Zod).
  - `ui` → `shared-types`.
  - `config-*` → none.

### 2.3 Workspace dependencies

Inside the monorepo, packages depend on each other via the `workspace:*` protocol (pnpm). External dependencies are pinned to exact versions in each `package.json`; the monorepo root `package.json` has minimal dependencies (only tooling: `turbo`, `husky`, `commitlint`, `prettier`).

### 2.4 Per-package conventions

Every package has:

- `package.json` with `name = '@cattlepro/<package-name>'`.
- `tsconfig.json` extending `packages/config-typescript/base.json`.
- `.eslintrc.js` extending `packages/config-eslint`.
- `README.md` with one-paragraph purpose and how to add new code.

---

## 3. Modular Monolith Architecture

### 3.1 What it is

The backend (`apps/api`) is a single deployable application organized as **independent feature modules** with clear boundaries. Modules talk to each other through explicit interfaces — not by reaching into each other's internals. This preserves the path to extracting microservices later (per `decisions.md` ADR-004).

### 3.2 Module catalog

```
apps/api/src/modules/
├── auth/            # Authentication, refresh tokens, MFA
├── users/           # User and tenant administration
├── farms/           # Farm CRUD, settings
├── animals/         # Animals, breed compositions, photos, weights
├── genealogy/       # Recursive ancestry queries, kinship
├── reproduction/    # Pregnancies, heat events, post-partum logic
├── straws/          # Semen straw inventory
├── production/      # Milk production records
├── lactation/       # Lactation periods, dry-off, anomaly detection
├── health/          # Health events, mastitis tracking
├── withholding/     # Medication withholding periods
├── finance/         # Financial transactions, profitability
├── calf-cost/       # Calf rearing cost aggregation
├── notifications/   # Notification creation and delivery
├── reports/         # PDF and Excel exports
├── dashboard/       # Aggregated dashboard data
└── audit/           # Audit log
```

Plus cross-cutting infrastructure:

```
apps/api/src/
├── common/          # Decorators, filters, guards, interceptors, pipes, types
├── infrastructure/
│   ├── database/    # Prisma service, transaction helpers
│   ├── cache/       # Redis client
│   ├── queue/       # BullMQ queues
│   ├── storage/     # S3 client, presigned URL generation
│   ├── email/       # Email provider abstraction
│   └── events/      # In-process domain event bus
├── config/          # Configuration loading and validation
├── app.module.ts    # Wires every module together
└── main.ts          # Bootstrap
```

### 3.3 Module structure

Each module follows the exact same internal layout:

```
modules/<name>/
├── <name>.module.ts           # NestJS module wiring
├── <name>.controller.ts       # HTTP layer
├── services/
│   └── <name>.service.ts      # Business logic
├── repositories/
│   └── <name>.repository.ts   # Data access
├── events/
│   └── <event>.event.ts       # Domain events emitted by this module
├── errors/
│   └── <module>.errors.ts     # Typed domain errors
├── types/
│   └── <name>.types.ts        # Module-internal types
└── tests/
    └── unit/
        └── <name>.service.spec.ts
```

Integration tests for the module live in `apps/api/test/integration/modules/<name>/`.

### 3.4 Inter-module communication rules

Modules talk to each other through one of three sanctioned channels:

1. **Direct service injection** for synchronous read-only access. The consuming module imports the producing module and injects its public service. Example: the `reproduction` module injects `AnimalService` from `animals` to fetch parent data.
2. **Domain events** for asynchronous notification. Example: when `pregnancy.outcome = SUCCESSFUL`, the `reproduction` module emits `PregnancyClosedEvent`. The `production` module subscribes to create a new `LactationPeriod`. The producing module does *not* know the consumers.
3. **Repositories of *the calling* module's own entities only.** A module never reads or writes another module's tables directly. Cross-module data fetches go through the other module's service.

**Forbidden:**

- Reaching into another module's `repositories/` directly.
- Importing another module's internal types (those in `<module>/types/`). Cross-module types live in `packages/shared-types`.
- Circular module dependencies. ESLint rule `import/no-cycle` is enforced.

### 3.5 Module exports

Each `<name>.module.ts` declares what is exported to other modules via the NestJS `exports` array. Convention: only export the **service**. Never export repositories, controllers, or internal types.

```typescript
// apps/api/src/modules/animals/animal.module.ts
@Module({
  imports: [AuditModule, EventsModule],
  controllers: [AnimalController],
  providers: [AnimalService, AnimalRepository],
  exports: [AnimalService], // ← only the service is reachable externally
})
export class AnimalModule {}
```

---

## 4. Layered Architecture (Per Module)

Each module has three core layers plus auxiliary types:

```
HTTP Layer  →  Controller       (NestJS @Controller)
              ↓
Domain Layer →  Service          (business logic)
              ↓
Data Layer  →  Repository       (Prisma access)
              ↓
              PostgreSQL
```

### 4.1 Responsibility per layer

| Layer       | Responsibility                                                                  | Forbidden                                          |
| ----------- | ------------------------------------------------------------------------------- | -------------------------------------------------- |
| Controller  | HTTP routing, decorators, parsing, validation pipe invocation, status codes     | Business logic, direct DB access, domain rules     |
| Service     | Business rules, validation of invariants, orchestration, event emission, audit  | HTTP concerns, raw SQL, request/response shaping   |
| Repository  | Data access via Prisma, aggregate hydration, parameterized raw SQL when needed  | Business rules, throwing domain errors, side effects beyond DB |

### 4.2 Layer dependency direction

Strict downward flow: Controller → Service → Repository. **Repositories never call services.** **Services never call controllers.** Cross-module needs go through the producing module's service (per §3.4).

### 4.3 What goes where — examples

| Logic                                                       | Layer                  |
| ----------------------------------------------------------- | ---------------------- |
| `req.body` validation against Zod                           | Controller (via pipe)  |
| "An animal cannot be its own ancestor"                      | Service                |
| `animals.findUnique({ where: { id }})`                      | Repository             |
| Returning the appropriate HTTP status                       | Controller (or thrown by Service via DomainError) |
| Computing the calf's breed composition from parents         | Service                |
| Recursive CTE for genealogy                                 | Repository (raw SQL)   |
| Sending a notification email                                | Service (via event bus → notification module → queue) |
| Recording an audit log entry                                | Service (via AuditService) |

---

## 5. Repository Pattern

### 5.1 Purpose

Repositories abstract data access. They give services a **type-safe, intent-revealing API** over Prisma without hiding Prisma entirely (we don't pretend the database doesn't exist; we just give it a clean surface).

### 5.2 Canonical example

```typescript
// apps/api/src/modules/animals/repositories/animal.repository.ts
@Injectable()
export class AnimalRepository {
  public constructor(private readonly prisma: PrismaService) {}

  public async findById(tenantId: string, animalId: string): Promise<Animal | null> {
    return this.prisma.animal.findFirst({
      where: { id: animalId, tenantId },
      include: { breedCompositions: { include: { breed: true } } },
    });
  }

  public async create(tenantId: string, input: CreateAnimalInput): Promise<Animal> {
    return this.prisma.animal.create({
      data: { tenantId, /* ... */ },
    });
  }

  public async updateWithVersion(
    tenantId: string,
    animalId: string,
    expectedVersion: number,
    patch: Prisma.AnimalUpdateInput,
  ): Promise<Animal | null> {
    const result = await this.prisma.animal.updateMany({
      where: { id: animalId, tenantId, version: expectedVersion },
      data: { ...patch, version: { increment: 1 } },
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, animalId);
  }
}
```

### 5.3 Rules

1. **Every method receives `tenantId` as the first argument.** No exceptions. This is the data-access layer's contribution to tenant isolation.
2. **Every method that writes uses Prisma's parameterized API or `Prisma.sql` for raw queries.** Never `$queryRawUnsafe`.
3. **Repositories return entities or null.** They never throw `NotFoundException`. The service decides how to handle absence.
4. **Repositories may compose Prisma's `include`/`select`** to hydrate related data when efficient. They do not load the entire object graph speculatively.
5. **Repositories may use `$transaction`** for multi-step writes that must be atomic. The transaction client is the same `tx` passed to all repository calls within the transaction.
6. **Recursive or analytical queries use raw SQL** with `Prisma.sql` and explicit parameter binding. Example: genealogy CTE in `AnimalRepository.fetchAncestry`.
7. **Repositories are stateless.** They hold only the `PrismaService` instance.

### 5.4 Anti-patterns

- ❌ Calling another module's repository directly. Use the other module's service.
- ❌ Returning Prisma's `Prisma.AnimalGetPayload<...>` types in service-public signatures. Map to a domain type before crossing layer boundaries when the Prisma type would leak schema details.
- ❌ Throwing HTTP exceptions from a repository.
- ❌ Putting business logic ("if status is DRY, throw") in a repository.

---

## 6. Service Layer Pattern

### 6.1 Purpose

Services contain **all business logic**. They orchestrate repositories, validate domain invariants, emit events, and write audit log entries. They are the layer that the controller calls and the layer that other modules depend on.

### 6.2 Canonical example

```typescript
// apps/api/src/modules/animals/services/animal.service.ts
@Injectable()
export class AnimalService {
  public constructor(
    private readonly repository: AnimalRepository,
    private readonly auditLog: AuditLogService,
    private readonly eventBus: DomainEventBus,
    private readonly breedCompositionService: BreedCompositionService,
  ) {}

  public async create(
    tenantId: string,
    actorUserId: string,
    input: CreateAnimalInput,
  ): Promise<Animal> {
    await this.validateParentage(tenantId, input);
    this.breedCompositionService.validatePercentagesSumToHundred(input.breedComposition);

    return this.prisma.$transaction(async (tx) => {
      const animal = await this.repository.create(tenantId, input, tx);
      await this.breedCompositionService.persistFor(animal.id, input.breedComposition, tx);
      await this.auditLog.record({
        tenantId, userId: actorUserId,
        action: 'animal.create', entityType: 'Animal', entityId: animal.id,
        newValues: animal,
      }, tx);
      this.eventBus.publish(new AnimalCreatedEvent(animal));
      return animal;
    });
  }

  public async getById(tenantId: string, id: string): Promise<Animal> {
    const animal = await this.repository.findById(tenantId, id);
    if (animal === null) throw new AnimalNotFoundError(id);
    return animal;
  }

  private async validateParentage(tenantId: string, input: CreateAnimalInput): Promise<void> {
    if (input.motherId !== undefined) {
      const mother = await this.repository.findById(tenantId, input.motherId);
      if (mother === null) throw new InvalidParentageError(`Mother ${input.motherId} not found`);
      if (mother.sex !== 'FEMALE') throw new InvalidParentageError('Mother must be female');
      if (mother.birthDate >= new Date(input.birthDate)) {
        throw new InvalidParentageError('Mother must be older than offspring');
      }
    }
    // ... father validation
  }
}
```

### 6.3 Rules

1. **Services receive `tenantId` and `actorUserId`** as separate explicit arguments, not packed in a "context" object. This makes the contract obvious at the call site.
2. **Services throw typed domain errors** (`AnimalNotFoundError`, `InvalidParentageError`, etc.). Never throw raw `HttpException` instances; that's the exception filter's job to translate.
3. **Services emit domain events** via `DomainEventBus.publish(new SomeEvent(...))` after the database transaction commits. Events are fire-and-forget for the producer.
4. **Services write audit log entries** for every state-changing operation, *inside* the same transaction as the change.
5. **Services compose other services** when they need behavior owned by another module.
6. **Multi-step writes use Prisma transactions.** The service initiates the `$transaction` and passes the `tx` client down to every repository call inside.
7. **Validation of invariants happens here, not in the controller.** The controller validates *shape* (Zod); the service validates *meaning* (business rules).
8. **Services are stateless.** They hold only injected dependencies.

### 6.4 Anti-patterns

- ❌ A service that knows about HTTP (request, response, headers).
- ❌ A service that catches a Prisma error and decides the HTTP status. Domain errors carry an `httpStatus`; the filter translates.
- ❌ A service that emits an event before the transaction commits — consumers might run with data the database does not yet have. Emit *after* commit, or use a transactional outbox if eventually consistent delivery is needed (deferred to v1.1).
- ❌ A service that bypasses its repository to write directly via Prisma. The repository is the seam.

---

## 7. Controller Pattern

### 7.1 Purpose

Controllers expose HTTP endpoints. They translate HTTP requests into service calls, apply guards and pipes, and let the service do the work. Controllers are **thin** — typically 5–15 lines per handler.

### 7.2 Canonical example

```typescript
// apps/api/src/modules/animals/animal.controller.ts
@ApiTags('animals')
@ApiBearerAuth()
@Controller({ path: 'animals', version: '1' })
export class AnimalController {
  public constructor(private readonly animalService: AnimalService) {}

  @Get()
  @ApiOperation({ summary: 'List animals with filters and pagination' })
  public async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listAnimalsQuerySchema)) query: ListAnimalsQuery,
  ): Promise<PaginatedResult<Animal>> {
    return this.animalService.list(user.tenantId, query);
  }

  @Post()
  @Roles('OWNER', 'EMPLOYEE')
  @ApiOperation({ summary: 'Register a new animal' })
  public async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createAnimalSchema)) input: CreateAnimalInput,
  ): Promise<Animal> {
    return this.animalService.create(user.tenantId, user.id, input);
  }
}
```

### 7.3 Rules

1. **One controller per module**, named `<Module>Controller`. Always exposed at `/api/v1/<resource>`.
2. **Use `@Controller({ path, version })`** for URI versioning.
3. **Use `@ApiTags`, `@ApiOperation`, `@ApiResponse`** to populate the OpenAPI spec automatically.
4. **Apply `@Roles()`** explicitly on every endpoint that requires more than just authentication. The default global guard requires JWT; `@Roles()` adds RBAC.
5. **Use `@CurrentUser()`** to receive the `AuthenticatedUser` (id, tenantId, role, email) — never read it from `req.user` manually.
6. **Use Zod pipes for validation** (`@Body(new ZodValidationPipe(schema))`). Zod schemas live in `@cattlepro/validation`.
7. **Controllers never throw domain errors directly.** They call services; services throw; the global filter translates.
8. **Path parameters use `ParseUUIDPipe`** for UUID-shaped IDs.
9. **Controllers are stateless.**

### 7.4 Anti-patterns

- ❌ Business logic in a controller (more than ~3 lines of non-orchestration code).
- ❌ Direct repository injection in a controller. Always go through a service.
- ❌ Catching exceptions in a controller "to log and rethrow". The filter does that.
- ❌ Using NestJS's built-in `class-validator` instead of Zod. Decisión arquitectónica per ADR-009.

---

## 8. DTO and Validation Pattern

### 8.1 Single source of truth: Zod

Validation lives in `packages/validation`. Both the API (NestJS pipes) and the web (React Hook Form resolvers) import the same schemas. There is no separate DTO class with `class-validator` decorators (per `decisions.md` ADR-009).

### 8.2 Canonical example

```typescript
// packages/validation/src/animals.ts
import { z } from 'zod';

export const createAnimalSchema = z.object({
  farmId: z.string().uuid(),
  earTagNumber: z.string().trim().min(1).max(40)
    .regex(/^[A-Z0-9-]+$/i, 'Ear tag must contain only letters, digits, and hyphens'),
  name: z.string().trim().max(80).optional(),
  sex: z.enum(['MALE', 'FEMALE']),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  breedComposition: z.array(
    z.object({
      breedId: z.string().uuid(),
      percentage: z.number().positive().max(100),
      crossCategory: z.enum(['PURE', 'F1', /* ... */]).optional(),
    }),
  ).min(1),
  motherId: z.string().uuid().optional(),
  fatherId: z.string().uuid().optional(),
  // ...
}).strict();

export type CreateAnimalInput = z.infer<typeof createAnimalSchema>;
```

### 8.3 Rules

1. **Every input validated.** No endpoint accepts unvalidated input.
2. **Schemas are `.strict()`** so unknown fields are rejected (no silent ignoring).
3. **Types are inferred** with `z.infer<typeof schema>` and exported alongside the schema.
4. **Frontend uses the same schema** via `@hookform/resolvers/zod`.
5. **Coerce dates and numbers explicitly** using `z.coerce.date()` or `z.coerce.number()` when needed (only for query strings).
6. **Validation messages in error responses are in English in v1.0** (RFC 7807 `detail`); the frontend maps codes to localized Spanish strings. Future work: schema-side localization via Zod's `errorMap`.

### 8.4 Anti-patterns

- ❌ Two parallel validation systems (Zod on the frontend, class-validator on the backend) — guaranteed to drift.
- ❌ Custom validators that should be Zod refinements.
- ❌ Validating after the data hits the service layer.

---

## 9. Error Handling Pattern

### 9.1 Three error categories

| Category         | Source                                | Surface                              |
| ---------------- | ------------------------------------- | ------------------------------------ |
| Validation       | Zod, controller pipes                 | RFC 7807 `400` with `errors[]`       |
| Domain           | Services throwing typed domain errors | RFC 7807 with the error's `httpStatus` and `code` |
| Infrastructure   | Prisma, Redis, network, etc.          | RFC 7807 `500` (mapped) or specific 4xx where the filter recognizes the underlying code |

### 9.2 The DomainError base class

```typescript
// apps/api/src/common/errors/domain-error.ts
export abstract class DomainError extends Error {
  public abstract readonly code: string;       // e.g., 'ANIMAL_NOT_FOUND'
  public abstract readonly httpStatus: number; // e.g., 404
  public constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace?.(this, this.constructor);
  }
}
```

### 9.3 Module-specific errors

```typescript
// apps/api/src/modules/animals/errors/animal.errors.ts
export class AnimalNotFoundError extends DomainError {
  public readonly code = 'ANIMAL_NOT_FOUND';
  public readonly httpStatus = 404;
  public constructor(animalId: string) {
    super(`Animal with id ${animalId} not found`);
  }
}

export class InvalidParentageError extends DomainError {
  public readonly code = 'INVALID_PARENTAGE';
  public readonly httpStatus = 422;
  public constructor(message: string) { super(message); }
}
```

### 9.4 The global exception filter

Translates everything into the RFC 7807 `application/problem+json` shape. Already implemented in `apps/api/src/common/filters/global-exception.filter.ts` (covered in `decisions.md` ADR-016 and `features.md` §1.2).

### 9.5 Rules

1. **Every error a service throws is a `DomainError` subclass.** Never raw `Error`, never `HttpException`.
2. **Error codes match the convention `<MODULE>.<CODE>`** as documented in `features.md` (e.g., `REPRODUCTION.HEIFER_TOO_YOUNG`).
3. **Errors carry no internal details.** No stack traces, no Prisma error codes, no SQL fragments. The filter sanitizes; services don't even include them.
4. **Sensitive fields are never in error messages.** No password hashes, no MFA secrets, no raw refresh tokens.
5. **Validation errors include a structured `errors[]` array** with `path`, `message`, and `code` per failure.
6. **Try/catch is reserved for genuine recovery scenarios.** Empty catches are forbidden; CI rejects them.

### 9.6 Anti-patterns

- ❌ `catch (e) { throw new HttpException(...) }` in a service. The service should throw a domain error; the filter translates.
- ❌ Logging an error then swallowing it.
- ❌ Returning `{ success: false, error: '...' }` instead of a real HTTP error response.
- ❌ Exposing Prisma error messages directly.

---

## 10. Authentication Pattern

### 10.1 JWT + rotating refresh token

Per `decisions.md` ADR-010:

- **Access token**: short-lived (15 min), JWT, signed HS256, sent in `Authorization: Bearer`.
- **Refresh token**: 30-day, opaque random 256-bit string, hashed (SHA-256) before storage, in HTTP-only secure cookie.
- **Rotation**: every refresh issues new tokens; old is revoked with `replacedBy` link.
- **Reuse detection**: presenting an already-revoked token invalidates the entire family.

### 10.2 Token issuance flow

1. User authenticates (login or registration).
2. `TokenService.issueTokens(payload, context, family?)` is called.
3. Access token signed with `JwtService.signAsync`.
4. Refresh token generated as `randomUUID() + randomUUID()`, hashed, stored in `RefreshToken` row.
5. Both returned; refresh token set as cookie at the controller layer.

### 10.3 Refresh flow

1. Client presents refresh token in cookie.
2. `TokenService.rotateRefreshToken(presentedToken, context)`:
   - Hash + lookup.
   - If not found → `UnauthorizedException`.
   - If `revokedAt IS NOT NULL` → invalidate entire family + `UnauthorizedException` "reuse detected".
   - If `expiresAt < now()` → `UnauthorizedException` "expired".
   - Issue new pair; mark old as revoked with `replacedBy = newHash`.

### 10.4 Logout flow

`TokenService.revokeRefreshToken(token)` marks the token revoked. Other tokens in the same family stay valid.

### 10.5 Rules

1. **Passwords are hashed with Argon2id** using OWASP 2024 baseline parameters (per ADR-011).
2. **Raw refresh tokens are never stored** — only their SHA-256 hash.
3. **Token rotation is atomic** — old marked revoked + new inserted in the same transaction.
4. **Family-wide invalidation triggers on reuse**, no exceptions.
5. **Tokens never appear in logs.** Pino redactors are configured for `Authorization`, `Cookie`, `password`, `mfaCode`.

### 10.6 Anti-patterns

- ❌ Storing refresh tokens in localStorage on the frontend (XSS risk).
- ❌ Long-lived access tokens "to avoid the refresh ceremony".
- ❌ Skipping reuse detection because "it's complex". It's not — the SQL is one query.

---

## 11. Authorization Pattern (RBAC)

### 11.1 Two guards, one chain

```typescript
// apps/api/src/main.ts
app.useGlobalGuards(
  new JwtAuthGuard(reflector),  // 1. Authentication
  new RolesGuard(reflector),    // 2. RBAC
);
```

### 11.2 Decorators

```typescript
@Public()             // Skip JWT (registration, login, refresh)
@Roles('OWNER')       // Require role(s) — chained AFTER JWT
@CurrentUser()        // Inject AuthenticatedUser into the handler
```

### 11.3 The AuthenticatedUser type

```typescript
// apps/api/src/common/types/authenticated-user.ts
export interface AuthenticatedUser {
  readonly id: string;
  readonly tenantId: string;
  readonly email: string;
  readonly role: UserRole;
}
```

This is the *only* shape a handler ever receives for the authenticated principal. It is hydrated by the JWT strategy from the token's claims.

### 11.4 Rules

1. **Controllers default to authenticated.** Public endpoints must explicitly use `@Public()`.
2. **`@Roles()` enumerates allowed roles.** No "deny" decorator — the matrix in `projectbrief.md` §11.1 is positive only.
3. **`@CurrentUser()` is the only way to access the authenticated user.** Reading `req.user` directly is forbidden by ESLint.
4. **Roles match the permission matrix exactly.** When a feature's permissions change in `projectbrief.md` §11.1, the corresponding `@Roles()` decorators are updated in the same PR.

### 11.5 Farm-level role overrides

A user with tenant role `EMPLOYEE` may have a `FarmUserAssignment` granting them `VETERINARIAN` role on a specific farm. When evaluating permissions for an action scoped to a specific farm, the `RolesGuard` consults the assignment first and falls back to the tenant-wide role if none exists.

This is implemented as a custom guard `FarmRoleGuard` that runs after `RolesGuard` for endpoints with `:farmId` in the path.

### 11.6 Anti-patterns

- ❌ Hard-coding `if (user.role === 'OWNER')` checks inside services. Use `@Roles()` at the controller and tighten the matrix.
- ❌ Swallowing authorization failures into a generic 404 to "hide" the resource. We use `403 FORBIDDEN` at the action level and `404 NOT_FOUND` at the resource level — and tenant scoping returns `404` to avoid leaking existence (see §12).

---

## 12. Tenant Scoping Pattern

### 12.1 The most important pattern in the system

Per `projectbrief.md` non-negotiable #1: **tenant isolation is absolute**. A bug here is a P0 security incident.

### 12.2 Three layers of defense

1. **JWT carries `tenantId`** as a signed claim. The user cannot tamper with it.
2. **Every service method receives `tenantId` explicitly** as the first argument.
3. **Every repository method filters by `tenantId`** in its `where` clause.

### 12.3 Cross-tenant access returns `404`, not `403`

```typescript
// Correct
public async getById(tenantId: string, id: string): Promise<Animal> {
  const animal = await this.repository.findById(tenantId, id);
  if (animal === null) throw new AnimalNotFoundError(id);
  return animal;
}
```

Returning `404` (not `403`) when the resource exists in another tenant prevents tenant enumeration. The user cannot tell whether the ID exists "somewhere else" or "doesn't exist at all".

### 12.4 Defense in depth (future)

- PostgreSQL Row-Level Security policies as a final guardrail. Deferred to v1.1; documented in open questions.
- Integration tests that explicitly attempt cross-tenant access and verify `404`.

### 12.5 Rules

1. **No service or repository method exists without `tenantId`** as a parameter. ESLint custom rule (deferred) or code review enforces.
2. **The `tenantId` argument comes from the JWT**, never from request input.
3. **Every integration test for a list/get endpoint includes a "two tenants, one user" case** that verifies isolation.
4. **Bulk operations filter by `tenantId` in the same query**, never as a post-fetch in-memory filter.

### 12.6 Anti-patterns

- ❌ `prisma.animal.findUnique({ where: { id } })` without `tenantId`. Catastrophic.
- ❌ Trusting `req.body.tenantId` — even from authenticated requests.
- ❌ Reaching into a repository from a service that operates in a different tenant context (e.g., a "sysadmin" endpoint that lists everything across tenants — that endpoint should not exist in v1).

---

## 13. Audit Logging Pattern

### 13.1 What gets audited

Every state-changing operation. Concretely:

- All `create`, `update`, `delete`, status-change, mark-bull-candidate, acknowledge-warning operations on domain entities.
- All authentication events (login, logout, refresh-reuse-detected, mfa-enable, mfa-disable, password-reset).
- All financial transactions.
- All semen-straw inventory mutations.
- All export operations.

### 13.2 The AuditLogService

```typescript
// apps/api/src/modules/audit/services/audit-log.service.ts
@Injectable()
export class AuditLogService {
  public constructor(private readonly prisma: PrismaService) {}

  public async record(entry: AuditLogEntry, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;
    await client.auditLog.create({
      data: {
        tenantId: entry.tenantId,
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        oldValues: entry.oldValues ? this.redact(entry.oldValues) : null,
        newValues: entry.newValues ? this.redact(entry.newValues) : null,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
    });
  }

  private redact(values: Record<string, unknown>): Record<string, unknown> {
    const REDACTED_FIELDS = ['passwordHash', 'mfaSecret', 'tokenHash'] as const;
    return Object.fromEntries(
      Object.entries(values).map(([k, v]) =>
        REDACTED_FIELDS.includes(k as (typeof REDACTED_FIELDS)[number])
          ? [k, '***REDACTED***']
          : [k, v],
      ),
    );
  }
}
```

### 13.3 Rules

1. **Audit entries are written inside the same transaction** as the change they describe. If the change rolls back, the audit entry rolls back too.
2. **The application database role has `INSERT, SELECT` only** on `audit_logs` (per `dataModel.md` §11.2). `UPDATE` and `DELETE` are forbidden at the DB level.
3. **Sensitive fields are redacted** at the service level.
4. **`action` follows the closed verb vocabulary** in `dataModel.md` §11.2.
5. **Audit failure is not silently swallowed.** If the audit insert fails, the originating transaction rolls back. For low-criticality events (e.g., notification reads) this can be relaxed; for financial transactions and animal status changes, never.

### 13.4 Anti-patterns

- ❌ Writing the audit entry *before* the change "to be safe". A failed change with a logged audit is worse than no log.
- ❌ Using `console.log` or another logger as a substitute for `AuditLog`. Logs are not auditable; the `audit_logs` table is.
- ❌ Updating an audit entry. Forbidden. Corrections are new entries.

---

## 14. Domain Event Pattern

### 14.1 In-process event bus

The `DomainEventBus` is a NestJS-provided EventEmitter wrapper. Modules emit events; other modules subscribe via `@OnEvent('event.name')` handlers.

### 14.2 Canonical example

**Producer (reproduction module):**

```typescript
// On pregnancy close with SUCCESSFUL outcome
this.eventBus.publish(new PregnancyClosedEvent({
  pregnancyId, motherId, calves, outcome: 'SUCCESSFUL',
}));
```

**Consumer (lactation module):**

```typescript
@Injectable()
export class LactationEventHandler {
  public constructor(private readonly lactationService: LactationService) {}

  @OnEvent(PregnancyClosedEvent.EVENT_NAME)
  public async onPregnancyClosed(event: PregnancyClosedEvent): Promise<void> {
    if (event.outcome !== 'SUCCESSFUL') return;
    await this.lactationService.startLactationFor(event.motherId, /* ... */);
  }
}
```

### 14.3 Rules

1. **Events are immutable.** All fields `readonly`.
2. **Events carry IDs, not aggregates.** Consumers re-fetch what they need from the producing module's service. This avoids stale data in events.
3. **Events emit *after* the database transaction commits.** If the transaction rolls back, no event fires.
4. **Consumers handle errors gracefully.** A failing handler logs and emits a `Notification` of severity `WARNING` to the OWNER. It does not bubble back to the producer.
5. **Events have a static `EVENT_NAME`** for type-safe subscription.
6. **Events are documented** in `features.md` and the producing module's `events/` folder.

### 14.4 When NOT to use events

- For synchronous operations where the producer needs the consumer's result.
- For multi-step transactions that must atomic across modules — use a transactional unit instead.
- For data that other modules read on demand — those go through service injection.

### 14.5 Anti-patterns

- ❌ Mutating an event after publish.
- ❌ Letting a handler's failure roll back the producer's transaction.
- ❌ Synchronous event handlers that block the producer for long operations. Heavy work goes to BullMQ (next pattern).

---

## 15. Background Jobs Pattern

### 15.1 BullMQ on Redis

Per `decisions.md` ADR-019. Used for:

- Email delivery (transactional emails after notifications).
- Scheduled jobs (mastitis-risk monitor, lactation-overdue check, low-production detection, kinship pre-computation).
- Heavy report generation (PDF assembly).
- Tenant data export.
- Calf rearing cost recomputation.

### 15.2 Queue layout

One queue per concern:

```
queues/
├── notifications.queue.ts    # Email delivery
├── reports.queue.ts          # PDF/Excel generation
├── domain-jobs.queue.ts      # Mastitis monitor, lactation overdue, etc.
└── maintenance.queue.ts      # Token cleanup, audit retention
```

### 15.3 Job pattern

```typescript
// Producer (any service)
await this.notificationsQueue.add('send-email', { notificationId });

// Consumer (worker)
@Processor('notifications')
export class NotificationsProcessor extends WorkerHost {
  public async process(job: Job<{ notificationId: string }>): Promise<void> {
    const notification = await this.notificationService.getById(job.data.notificationId);
    await this.emailProvider.send(/* ... */);
  }
}
```

### 15.4 Rules

1. **Jobs are idempotent.** A job processed twice produces the same result.
2. **Jobs receive minimal payloads** (IDs, not full objects). The worker re-fetches.
3. **Jobs have explicit retry policies** (`attempts: 5, backoff: { type: 'exponential', delay: 1000 }`).
4. **Recurring jobs use repeatable `cron` patterns** with descriptive names.
5. **Failed jobs are visible** — Bull Board UI is exposed at `/admin/queues` (OWNER-only authentication).
6. **Jobs do not block on user requests.** Adding to the queue is fast; processing is asynchronous.

### 15.5 Scheduled jobs catalog

| Job                                  | Cron               | Purpose                                                |
| ------------------------------------ | ------------------ | ------------------------------------------------------ |
| `mastitis-risk-monitor`              | `0 * * * *` (hourly) | Check high-producers for missed sessions               |
| `lactation-overdue-check`            | `0 2 * * *` (daily 02:00) | Flag lactations > 305 days                       |
| `low-production-detection`           | `0 3 * * *` (daily 03:00) | 3-day moving avg vs. 7-day baseline              |
| `low-reproductive-efficiency`        | `0 4 * * *` (daily 04:00) | Cows > 400 days since last birth                  |
| `withholding-ended`                  | `0 5 * * *` (daily 05:00) | Notify when withholding ends                      |
| `upcoming-events-alerts`             | `0 6 * * *` (daily 06:00) | Births / vaccinations / heat — 30/15/7/5/1/0 day windows |
| `calf-rearing-cost-recompute`        | `0 2 * * *` (daily 02:00) | Update CalfRearingCost aggregates                 |
| `audit-retention-cleanup`            | `0 3 * * 0` (weekly Sun 03:00) | Archive old audit logs (after 7 years)         |
| `refresh-token-cleanup`              | `0 4 * * 0` (weekly) | Purge revoked tokens older than 90 days                |

---

## 16. Optimistic Locking Pattern

### 16.1 The version column

Entities that support concurrent edits carry an integer `version` column (per `dataModel.md` §16). Currently: `Animal`, `Pregnancy`, `SemenStraw`, `LactationPeriod`.

### 16.2 The flow

1. Client reads → receives `version: 5`.
2. Client submits update with `version: 5` in the body.
3. Server: `UPDATE … SET version = version + 1 WHERE id = ? AND version = 5`.
4. If `affected_rows = 0` → throw `OptimisticLockError` → filter returns `409 Conflict` with code `OPTIMISTIC_LOCK_CONFLICT`.

### 16.3 Frontend handling

When the frontend receives `OPTIMISTIC_LOCK_CONFLICT`:

1. Show a non-destructive banner: *"Otra persona modificó este registro. Cargando última versión..."*.
2. Re-fetch the entity.
3. Re-apply the user's pending changes on top of the fresh `version`.
4. Submit again.

If automatic re-application is unsafe (e.g., field conflicts), surface a side-by-side diff per `OFFLINE.04` in `features.md`.

### 16.4 Anti-patterns

- ❌ Updating without `version` on entities that have one.
- ❌ Silently overwriting on conflict.
- ❌ Pessimistic locking via `SELECT FOR UPDATE` for normal user flows. Reserve for narrow analytical transactions.

---

## 17. Idempotency Pattern

### 17.1 The Idempotency-Key header

Per `features.md` `CROSS.05`. Endpoints that create resources accept `Idempotency-Key: <uuid>`. The server stores `(idempotencyKey, response)` in Redis with 24h TTL. Duplicate requests with the same key return the cached response.

### 17.2 Why it matters

- The PWA can retry safely after network failure without creating duplicates.
- Bulk imports can re-run safely.
- Offline syncs are idempotent by design (every offline-created record has a `pendingId` reused as the idempotency key).

### 17.3 Implementation

```typescript
// Custom interceptor: IdempotencyInterceptor
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  public async intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();
    const key = req.headers['idempotency-key'];
    if (!key) return next.handle();
    const cached = await this.redis.get(`idem:${req.user.tenantId}:${key}`);
    if (cached !== null) return of(JSON.parse(cached));
    return next.handle().pipe(tap(async (result) => {
      await this.redis.setex(`idem:${req.user.tenantId}:${key}`, 86400, JSON.stringify(result));
    }));
  }
}
```

### 17.4 Rules

1. **Keys are scoped per tenant** to prevent cross-tenant collisions.
2. **TTL is 24h.** Longer is unnecessary; shorter risks duplicates during a slow retry.
3. **Failed responses are not cached.** A 500 retried after the bug is fixed should succeed.
4. **The interceptor is opt-in via `@Idempotent()` decorator** on endpoints that benefit (creates, financial transactions, milk bulk imports).

---

## 18. Logging and Observability Pattern

### 18.1 Pino structured logs

Per `decisions.md` ADR-018. JSON output, correlated with `traceId`.

### 18.2 Log levels

| Level   | Use                                                       |
| ------- | --------------------------------------------------------- |
| `fatal` | Process is about to terminate                             |
| `error` | Unhandled exceptions, failures requiring investigation    |
| `warn`  | Recoverable failures, suspicious patterns                 |
| `info`  | Significant business events (login, pregnancy registered) |
| `debug` | Developer-oriented diagnostics, off in production         |
| `trace` | Verbose flow tracing, never on in production              |

### 18.3 What goes in every log line

- `traceId` (correlates all logs of one request).
- `userId` and `tenantId` (when available).
- `module` (animals, reproduction, etc.).
- `operation` (the service method name).

### 18.4 Redactions

Pino is configured with paths to redact:

```typescript
redact: {
  paths: [
    'req.headers.authorization',
    'req.headers.cookie',
    '*.password',
    '*.passwordHash',
    '*.mfaSecret',
    '*.tokenHash',
    '*.refreshToken',
  ],
  censor: '***REDACTED***',
}
```

### 18.5 Tracing

OpenTelemetry auto-instrumentation for HTTP, Prisma, Redis. Traces exported to a backend (Tempo / Jaeger / Honeycomb). Custom spans for long-running domain operations (genealogy CTE, kinship computation, reports).

### 18.6 Metrics

Prometheus-compatible `/metrics` endpoint. Key metrics:

- HTTP request duration histogram per endpoint.
- Database query duration histogram.
- BullMQ queue depth and processing time.
- Active session count.
- Notification send success rate.

### 18.7 Errors to Sentry

Unhandled exceptions and `error`-level logs are forwarded to Sentry with the trace context. The frontend also reports errors to Sentry.

---

## 19. Configuration Pattern

### 19.1 Environment variables only

No hardcoded secrets, hosts, or feature flags in code. All configuration loads from environment variables, validated at startup with Zod.

### 19.2 Canonical example

```typescript
// apps/api/src/config/configuration.ts
const configSchema = z.object({
  app: z.object({
    environment: z.enum(['development', 'test', 'staging', 'production']),
    port: z.coerce.number().int().positive(),
  }),
  database: z.object({
    url: z.string().url(),
  }),
  auth: z.object({
    accessTtlSeconds: z.coerce.number().int().positive().default(900),
    refreshTtlSeconds: z.coerce.number().int().positive().default(2592000),
    jwtSecret: z.string().min(32),
  }),
  // ...
});

export type AppConfig = z.infer<typeof configSchema>;
```

### 19.3 Rules

1. **Config is validated at startup.** A missing or malformed env var aborts boot.
2. **Defaults exist only for non-secret values.** Secrets must be explicit.
3. **No magic strings throughout the code.** Constants live in module-local `<name>.constants.ts`.
4. **Config is read via `ConfigService.getOrThrow<T>(path)`** — never `process.env.X`.

---

## 20. Testing Pattern

### 20.1 The pyramid

Per `decisions.md` ADR-015 and `projectbrief.md`:

| Layer        | Tool                | Purpose                                           |
| ------------ | ------------------- | ------------------------------------------------- |
| Unit         | Vitest              | Pure functions, services with mocked deps         |
| Integration  | Vitest + Supertest  | HTTP → controller → service → real PG → response  |
| E2E          | Playwright          | Critical user flows in a real browser             |
| Performance  | k6                  | Load tests on critical endpoints                  |
| Contract     | OpenAPI validator   | Responses match published spec                    |

### 20.2 Coverage threshold

80% on critical business logic. CI fails below that.

### 20.3 Test naming convention

```
should <expected behavior> when <condition>
```

Examples:

- `should return AnimalNotFoundError when animal does not exist in tenant`
- `should reject when mother is younger than offspring`
- `should compute estimated birth date as 281 days after conception`

### 20.4 Test structure (AAA)

```typescript
describe('AnimalService', () => {
  describe('create', () => {
    it('should reject when mother is not female', async () => {
      // Arrange
      const maleParent = buildAnimalFixture({ sex: 'MALE' });
      repository.findById.mockResolvedValue(maleParent);

      // Act + Assert
      await expect(
        service.create(TENANT_ID, USER_ID, { ...validInput, motherId: maleParent.id }),
      ).rejects.toBeInstanceOf(InvalidParentageError);
    });
  });
});
```

### 20.5 Fixtures pattern

Every module exports `buildXFixture(overrides?)` factories from `test/fixtures/`. They produce valid-by-default entities with override-friendly signatures.

### 20.6 Integration tests use Docker PostgreSQL

The CI spins up a `postgres:16-alpine` service. Tests run migrations on a clean database, run their assertions, and tear down. Per-test isolation is via `BEGIN; ROLLBACK;` transactions.

### 20.7 Multi-tenancy tests

Every list/get integration test includes a "two tenants, one ID" case to verify isolation.

### 20.8 Rules

1. **Tests are independent.** Order doesn't matter.
2. **Tests are deterministic.** No flaky time-based assumptions; freeze time when needed.
3. **One assertion per concept.** Multiple `expect()` calls are fine if they verify one logical outcome.
4. **No conditionals in tests.** A test either tests the happy path or one specific edge case.
5. **Test names describe the behavior**, not the implementation.

### 20.9 Anti-patterns

- ❌ Testing private methods directly. Test through the public API.
- ❌ Mocks of mocks. If you need to mock a mock, the design is wrong.
- ❌ Snapshot tests of large JSON blobs. Brittle and uninformative.
- ❌ Tests that depend on previous tests' side effects.

---

## 21. Frontend Patterns

### 21.1 Architecture

`apps/web` is a Next.js 15 App Router application with React 19. Data fetching via TanStack Query; forms via React Hook Form + Zod resolvers; UI via shadcn/ui + Tailwind.

### 21.2 Folder structure

```
apps/web/src/
├── app/
│   ├── (auth)/                # Public routes: login, register
│   ├── (dashboard)/           # Authenticated routes
│   │   ├── animals/
│   │   ├── reproduction/
│   │   ├── ...
│   ├── api/                   # API route handlers (proxy / BFF if needed)
│   └── layout.tsx
├── components/
│   ├── ui/                    # shadcn/ui primitives
│   └── features/              # Feature-specific components
├── hooks/                     # Custom hooks
├── lib/                       # Utilities (api client, formatters)
├── stores/                    # Zustand stores (sparingly)
└── locales/
    └── es-CO.json
```

### 21.3 Feature folders mirror backend modules

For each backend module there is a `components/features/<module>/` folder with that module's React components. This makes navigation between front and back intuitive.

### 21.4 Server vs. client components

- **Server components (default):** read-only views, dashboards, lists.
- **Client components (`"use client"`):** anything with state, forms, mutation buttons, real-time data.
- Always server-render where possible to reduce client bundle.

### 21.5 Data fetching

- **Server components:** call backend with the user's session via Next's data fetching.
- **Client components:** use TanStack Query hooks (`useQuery`, `useMutation`).

### 21.6 Form pattern

```typescript
const form = useForm<CreateAnimalInput>({
  resolver: zodResolver(createAnimalSchema), // ← shared schema
  defaultValues: { /* ... */ },
});
const mutation = useMutation({
  mutationFn: (data: CreateAnimalInput) => api.post('/animals', data),
  onSuccess: () => { /* ... */ },
});
```

### 21.7 Internationalization

All user-facing strings come from `locales/es-CO.json`. No hardcoded Spanish strings in JSX. The architecture supports adding more locales in Year 2.

### 21.8 Offline support

- Service Worker generates via `next-pwa`.
- IndexedDB schema mirrors the API request payloads (per `features.md` OFFLINE.02).
- Optimistic UI: mutations succeed locally, then sync.

### 21.9 Design system

shadcn/ui as the primitive layer. `packages/ui` extends it with CattlePro-specific components: `<AnimalCard />`, `<MilkSessionInput />`, `<GenealogyTree />`, etc. Components live in `packages/ui` once they are reused in 2+ places.

### 21.10 Rules

1. **No hardcoded strings** — every user-facing string goes through `t('key')`.
2. **Forms always use Zod resolvers from `@cattlepro/validation`** — never reinvent schemas.
3. **Never use `localStorage` for sensitive data.** Refresh token cookies are set server-side; access tokens live in memory.
4. **Optimistic updates use TanStack Query's `onMutate`/`onError`** rollback pattern.

---

## 22. API Versioning and Contract Pattern

### 22.1 URI versioning

`/api/v1/<resource>`. Major versions only — no minor versions in the URL.

### 22.2 OpenAPI as contract

NestJS's `@nestjs/swagger` generates the OpenAPI 3 spec from the controllers. The spec is published to `/docs` (in non-production environments) and committed to the repo as `apps/api/openapi.json`.

### 22.3 Breaking changes

When v2 is needed:

1. New controllers under `version: '2'`.
2. v1 stays alive for one full release cycle (≥ 6 months).
3. Deprecation announced in release notes, in-app notification, email to users.
4. After deprecation period, v1 endpoints respond `410 Gone`.

### 22.4 Backward-compatible changes

These do not bump the version:

- Adding new optional fields to responses.
- Adding new optional query parameters.
- Adding new endpoints.

These do bump the version:

- Removing a field.
- Changing a field's type or semantics.
- Renaming.
- Tightening validation.

---

## 23. Security Patterns

### 23.1 Defense in depth

The system layers defenses so that any single failure does not compromise the system:

1. **HTTPS everywhere** (TLS 1.2+).
2. **Helmet** for security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options).
3. **Rate limiting** at multiple buckets (per `features.md` CROSS.06).
4. **Input validation** via Zod at every endpoint.
5. **JWT** for authentication; **RBAC** for authorization.
6. **Tenant scoping** at the data layer.
7. **Argon2id** for passwords; **MFA** for sensitive accounts.
8. **Refresh-token reuse detection** for session theft.
9. **Audit log** for forensics.
10. **Pino redactions** to prevent secret leakage in logs.
11. **`Idempotency-Key`** to prevent duplicate writes.
12. **CSRF protection** via SameSite cookies + CSRF token for non-idempotent endpoints (when cookie auth is used).
13. **CORS** strict allow-list of origins.

### 23.2 Secrets management

- **Local development:** `.env` files (gitignored).
- **CI:** GitHub Actions secrets.
- **Production:** the hosting provider's secret store (AWS Secrets Manager, Doppler, Vault).
- Secrets rotated quarterly.

### 23.3 SQL injection prevention

- Prisma's parameterized queries are the default.
- Raw SQL uses `Prisma.sql` template tag with explicit parameter binding.
- `$queryRawUnsafe` is **forbidden**. ESLint custom rule enforces (deferred; meanwhile, code review).

### 23.4 XSS prevention

- React's default escaping handles most cases.
- `dangerouslySetInnerHTML` is forbidden except in audited Markdown rendering with a sanitizer.
- CSP forbids inline scripts in production.

### 23.5 OWASP Top 10 coverage

Tracked in `decisions.md` Section 8 (Security Implementation). Each item has a concrete mitigation and a corresponding integration test.

---

## 24. Anti-Patterns (Things We Do Not Do)

A consolidated list of patterns rejected by this document. Each is forbidden and CI / code review enforces.

| Anti-pattern                                                                  | Why                                                              |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Reading `req.user` directly                                                   | Use `@CurrentUser()` decorator                                   |
| Reading `process.env.X` directly                                              | Use `ConfigService.getOrThrow`                                   |
| Throwing `HttpException` from a service                                       | Throw a `DomainError` subclass                                   |
| Catching errors in services to "log and rethrow"                              | Let the global filter handle them                                |
| Storing refresh tokens unhashed                                               | Always SHA-256 before persisting                                 |
| `prisma.x.findUnique({ where: { id } })` without `tenantId`                   | Catastrophic tenant-isolation breach                             |
| `$queryRawUnsafe`                                                             | SQL injection risk; use `Prisma.sql`                             |
| Cross-module repository imports                                               | Use the other module's service                                   |
| Circular module dependencies                                                  | Architecture smell                                               |
| Mocking with `any` types                                                      | Defeats type safety                                              |
| Snapshot tests of large response bodies                                       | Brittle and uninformative                                        |
| Hardcoded user-facing strings in JSX                                          | Use the i18n hook                                                |
| `localStorage` for tokens                                                     | XSS risk                                                         |
| Boolean parameters with positional usage (`createUser(true, false)`)          | Use named arguments / option objects                             |
| `any` anywhere                                                                | Forbidden by ESLint and `tsconfig`                               |
| Magic numbers (`if (count > 5)`)                                              | Extract to a named constant                                      |
| Overwriting an audit entry                                                    | DB role denies it; code never tries                              |
| Letting an event handler's failure roll back the producer                     | Event handlers are decoupled                                     |
| Holding a Prisma transaction across HTTP boundaries                           | Transactions are short-lived, server-side                        |
| Trusting client-supplied `tenantId`                                           | Always derive from JWT                                           |

---

## Document Maintenance

This document is updated whenever:

- A new architectural pattern is introduced and adopted by the team.
- An existing pattern proves insufficient and is revised.
- A pattern is deprecated in favor of a new approach (mark old as **Superseded**).

Substantive additions require a PR titled `docs(patterns): <pattern name> - <short description>` with reviewers from architecture and engineering.

When this document conflicts with `decisions.md`, **`decisions.md` wins** and this document is updated to reflect the new direction. When it conflicts with `dataModel.md` on database structure, **`dataModel.md` wins**.
