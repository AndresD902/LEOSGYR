# Data Model — CattlePro

> **Status:** Draft v1.1
> **Last updated:** 2026-05-02
> **Owner:** Architecture & Backend
>
> This document is the **canonical specification of the data model**. It defines every entity, every attribute, every relationship, every index, and every business invariant that the system must enforce. Any code that touches the database — schemas, migrations, repositories, services — must conform to this document. If reality and this document diverge, this document is updated first; code follows.
>
> The companion file `apps/api/prisma/schema.prisma` is the executable form of this specification. Both must stay in sync.
>
> **Changelog v1.1:** Aligned with `businessRules.md`. Default currency changed to COP. Added `BreedComposition`, `SemenStraw`, `LactationPeriod`, `MedicationWithholdingPeriod`, `MastitisHistory`, `BirthInterval`, and `CalfRearingCost` entities. Animal status transitions expanded (`PREGNANT → DRY` allowed). Pregnancy gestation refined to 279–283 days. `PregnancyOutcome` simplified to three values. CalfProfile renamed `TRANSITIONED_TO_ADULT` to `PROMOTED` and added `isBullCandidate`. MilkProductionRecord gained `isFitForCommercial`, `withholdingPeriodId`, and milking-mode awareness. Farm gained `milkingMode` and `timezone`. Reproductive efficiency, lactation, and mastitis tracking added.

---

## Table of Contents

1. [Conventions](#1-conventions)
2. [Entity Map](#2-entity-map)
3. [Tenancy & Identity](#3-tenancy--identity)
   - 3.1 [Tenant](#31-tenant)
   - 3.2 [User](#32-user)
   - 3.3 [RefreshToken](#33-refreshtoken)
4. [Farm Domain](#4-farm-domain)
   - 4.1 [Farm](#41-farm)
   - 4.2 [FarmUserAssignment](#42-farmuserassignment)
5. [Catalog](#5-catalog)
   - 5.1 [Breed](#51-breed)
6. [Animal Domain](#6-animal-domain)
   - 6.1 [Animal](#61-animal)
   - 6.2 [BreedComposition](#62-breedcomposition)
   - 6.3 [CowProfile](#63-cowprofile)
   - 6.4 [BullProfile](#64-bullprofile)
   - 6.5 [CalfProfile](#65-calfprofile)
   - 6.6 [WeightRecord](#66-weightrecord)
   - 6.7 [AnimalPhoto](#67-animalphoto)
7. [Reproduction Domain](#7-reproduction-domain)
   - 7.1 [Pregnancy](#71-pregnancy)
   - 7.2 [SemenStraw](#72-semenstraw)
   - 7.3 [BirthInterval (derived view)](#73-birthinterval-derived-view)
8. [Production Domain](#8-production-domain)
   - 8.1 [MilkProductionRecord](#81-milkproductionrecord)
   - 8.2 [LactationPeriod](#82-lactationperiod)
9. [Health Domain](#9-health-domain)
   - 9.1 [HealthEvent](#91-healthevent)
   - 9.2 [MedicationWithholdingPeriod](#92-medicationwithholdingperiod)
   - 9.3 [MastitisHistory (derived view)](#93-mastitishistory-derived-view)
10. [Finance Domain](#10-finance-domain)
    - 10.1 [FinancialTransaction](#101-financialtransaction)
    - 10.2 [CalfRearingCost](#102-calfrearingcost)
11. [Notifications & Audit](#11-notifications--audit)
    - 11.1 [Notification](#111-notification)
    - 11.2 [AuditLog](#112-auditlog)
12. [Enumerations](#12-enumerations)
13. [Cross-Cutting Invariants](#13-cross-cutting-invariants)
14. [Indexing Strategy](#14-indexing-strategy)
15. [Soft Deletion & Lifecycle Rules](#15-soft-deletion--lifecycle-rules)
16. [Optimistic Concurrency Control](#16-optimistic-concurrency-control)
17. [Data Retention & Privacy](#17-data-retention--privacy)
18. [Migration Policy](#18-migration-policy)

---

## 1. Conventions

### 1.1 Naming

- **Tables**: `snake_case`, plural (`animals`, `health_events`).
- **Columns**: `camelCase` in Prisma schema, mapped to `camelCase` in PostgreSQL via `@@map` and `@map`.
- **Foreign key columns**: `<entity>Id` (e.g., `farmId`, `motherId`).
- **Boolean columns**: prefixed with `is`, `has`, `was` (`isActive`, `hasMfaEnabled`, `isFitForCommercial`).
- **Timestamp columns**: suffixed with `At` (`createdAt`, `revokedAt`, `confirmedAt`).
- **Date-only columns**: suffixed with `Date` (`birthDate`, `eventDate`).

### 1.2 Types

- **Identifiers**: `UUID v4` generated server-side via `uuid()` Prisma default. Never expose autoincrement integer IDs.
- **Money**: `DECIMAL(p, s)` — exact arithmetic, never floating point. See [§13.5](#135-money-rules).
- **Currency**: ISO 4217 three-letter code. **Default is `COP`** (Colombian Peso), configurable per tenant.
- **Timestamps**: `TIMESTAMPTZ` with millisecond precision, always UTC at the database level. Conversion to local time happens at the presentation layer using the farm's configured timezone.
- **Dates**: `DATE` for calendar dates without time-of-day. No timezone applies.
- **Enums**: PostgreSQL native enums via Prisma `enum`. See [§12](#12-enumerations).
- **JSON**: `JSONB` (binary, indexable) — never `JSON`. Always defaults to `'{}'` or `'[]'`.
- **Strings**: `VARCHAR(n)` with explicit length limits — never unbounded `TEXT` for short fields. `TEXT` is only used for free-form prose.
- **Email**: `CITEXT` (case-insensitive).
- **IP address**: `INET` — native PostgreSQL type.
- **Percentages**: `DECIMAL(5, 2)` for values 0.00–100.00.

### 1.3 Required vs. optional

A field is **required** unless explicitly marked *(nullable)*. Optional fields use `?` in Prisma and `NULL` in PostgreSQL.

### 1.4 Tenant scoping

Every domain entity carries `tenantId` and is filtered by it in every query. The only exception is the `breeds` catalog (global, shared across tenants).

### 1.5 Audit columns

Every mutable entity has `createdAt` and `updatedAt`. Every entity that supports concurrent edits has `version` (integer, optimistic lock).

### 1.6 Domain authority

When this document conflicts with `businessRules.md` on a domain matter (gestation length, lactation rules, withholding periods, breed composition, etc.), **`businessRules.md` wins**. This document is then updated to match.

---

## 2. Entity Map

```
                        ┌──────────┐
                        │  Tenant  │
                        └────┬─────┘
                             │ 1..N
        ┌────────────────────┼────────────────────────────────┐
        │                    │                                │
   ┌────▼────┐          ┌────▼────┐                    ┌──────▼─────┐
   │  User   │          │  Farm   │                    │ AuditLog   │
   └────┬────┘          └────┬────┘                    └────────────┘
        │ 1..N               │ 1..N
   ┌────▼─────────┐    ┌─────▼──────┐    ┌──────────────┐
   │ RefreshToken │    │   Animal   │◀──┤  SemenStraw  │
   └──────────────┘    └────┬───────┘   └──────────────┘
                            │
        ┌───────────────────┼─────────────────────────────────────────┐
        │                   │                                         │
        │             ┌─────┼─────┬───────────┬────────────┬──────────┤
        │             │     │     │           │            │          │
        │       ┌─────▼─┐ ┌─▼──┐ ┌▼───┐  ┌────▼────┐  ┌────▼────┐ ┌───▼──────┐
        │       │ Cow   │ │Bull│ │Calf│  │ Weight  │  │ Health  │ │  Milk    │
        │       │Profile│ │Prof│ │Prof│  │ Record  │  │ Event   │ │ Record   │
        │       └───────┘ └────┘ └─┬──┘  └─────────┘  └────┬────┘ └────┬─────┘
        │                          │                       │           │
        │                    ┌─────▼─────┐         ┌───────▼────────┐ │
        │                    │ Pregnancy │         │ Withholding    │ │
        │                    └───────────┘         │ Period         │─┘
        │                                          └────────────────┘
        │                                                ▲
        │                                                │
        │                                          ┌─────┴──────┐
        │                                          │ Lactation  │
        │                                          │  Period    │
        │                                          └────────────┘
        │
        └─ BreedComposition ⟶ joins Animal × Breed with percentage
        └─ FarmUserAssignment ⟶ joins User × Farm with role
        └─ AnimalPhoto ⟶ files attached to Animal
        └─ FinancialTransaction ⟶ tied to Tenant + Farm (+ optional Animal)
        └─ CalfRearingCost ⟶ aggregated cost per calf
        └─ Notification ⟶ tied to Tenant + optional User
```

---

## 3. Tenancy & Identity

### 3.1 `Tenant`

Represents a customer organization. All domain data is partitioned by tenant.

| Column            | Type           | Constraints                  | Description                             |
| ----------------- | -------------- | ---------------------------- | --------------------------------------- |
| `id`              | `UUID`         | PK                           | Internal identifier                     |
| `name`            | `VARCHAR(120)` | NOT NULL                     | Display name                            |
| `slug`            | `VARCHAR(60)`  | NOT NULL, UNIQUE             | URL-safe identifier                     |
| `defaultCurrency` | `VARCHAR(3)`   | NOT NULL, DEFAULT `'COP'`    | ISO 4217. Default Colombian Peso        |
| `defaultTimezone` | `VARCHAR(60)`  | NOT NULL, DEFAULT `'America/Bogota'` | IANA timezone                   |
| `defaultLocale`   | `VARCHAR(10)`  | NOT NULL, DEFAULT `'es-CO'`  | BCP-47 locale                           |
| `isActive`        | `BOOLEAN`      | NOT NULL, DEFAULT TRUE       | Soft-disable for billing suspension     |
| `createdAt`       | `TIMESTAMPTZ`  | NOT NULL, DEFAULT now()      |                                         |
| `updatedAt`       | `TIMESTAMPTZ`  | NOT NULL, auto-updated       |                                         |

**Indexes:** PK on `id`; UNIQUE on `slug`.

**Invariants:**
- `slug` is immutable after creation.
- `slug` matches `^[a-z0-9-]{3,60}$`.
- An inactive tenant's users cannot authenticate.
- A tenant operates in a single currency in v1.0.

### 3.2 `User`

A human who can authenticate to the system. Belongs to exactly one tenant.

| Column                | Type           | Constraints                                | Description                                 |
| --------------------- | -------------- | ------------------------------------------ | ------------------------------------------- |
| `id`                  | `UUID`         | PK                                         |                                             |
| `tenantId`            | `UUID`         | NOT NULL, FK → `tenants.id` ON DELETE CASCADE |                                          |
| `email`               | `CITEXT`       | NOT NULL                                   | Case-insensitive email                      |
| `passwordHash`        | `VARCHAR(255)` | NOT NULL                                   | Argon2id hash; never returned by any API    |
| `fullName`            | `VARCHAR(120)` | NOT NULL                                   |                                             |
| `role`                | `UserRole`     | NOT NULL                                   | See [§12.1](#121-userrole)                  |
| `isActive`            | `BOOLEAN`      | NOT NULL, DEFAULT TRUE                     |                                             |
| `emailVerifiedAt`     | `TIMESTAMPTZ`  | *(nullable)*                               | Set when email ownership is verified        |
| `mfaEnabled`          | `BOOLEAN`      | NOT NULL, DEFAULT FALSE                    |                                             |
| `mfaSecret`           | `VARCHAR(255)` | *(nullable)*                               | TOTP secret, encrypted at rest              |
| `lastLoginAt`         | `TIMESTAMPTZ`  | *(nullable)*                               |                                             |
| `failedLoginAttempts` | `INT`          | NOT NULL, DEFAULT 0                        | Counter for lockout                         |
| `lockedUntil`         | `TIMESTAMPTZ`  | *(nullable)*                               | Set during temporary lockout                |
| `createdAt`           | `TIMESTAMPTZ`  | NOT NULL, DEFAULT now()                    |                                             |
| `updatedAt`           | `TIMESTAMPTZ`  | NOT NULL, auto-updated                     |                                             |

**Indexes:** PK; UNIQUE composite `(tenantId, email)`; index on `tenantId`.

**Invariants:**
- `email` is unique *within a tenant*. The same email may exist in two different tenants.
- `passwordHash` is **never** returned by any API or log.
- When `mfaEnabled = true`, `mfaSecret` must be present.
- When `isActive = false`, all refresh tokens are immediately revoked.
- `failedLoginAttempts` resets to 0 on successful login.
- Lockout: `LOGIN_LOCKOUT_THRESHOLD = 5` failures triggers `LOGIN_LOCKOUT_DURATION_MINUTES = 15`.

### 3.3 `RefreshToken`

Long-lived authentication tokens with rotation and reuse detection.

| Column       | Type           | Constraints                                  | Description                                  |
| ------------ | -------------- | -------------------------------------------- | -------------------------------------------- |
| `id`         | `UUID`         | PK                                           |                                              |
| `userId`     | `UUID`         | NOT NULL, FK → `users.id` ON DELETE CASCADE  |                                              |
| `tokenHash`  | `VARCHAR(255)` | NOT NULL, UNIQUE                             | SHA-256 of the raw token                     |
| `family`     | `UUID`         | NOT NULL                                     | Identifies a rotation chain                  |
| `expiresAt`  | `TIMESTAMPTZ`  | NOT NULL                                     |                                              |
| `revokedAt`  | `TIMESTAMPTZ`  | *(nullable)*                                 |                                              |
| `replacedBy` | `UUID`         | *(nullable)*                                 |                                              |
| `ipAddress`  | `INET`         | *(nullable)*                                 |                                              |
| `userAgent`  | `VARCHAR(500)` | *(nullable)*                                 |                                              |
| `createdAt`  | `TIMESTAMPTZ`  | NOT NULL, DEFAULT now()                      |                                              |

**Indexes:** PK; UNIQUE on `tokenHash`; index on `userId`; index on `family`.

**Invariants:**
- Raw refresh tokens are never stored — only their SHA-256 hash.
- Presenting an already-revoked token of an active family invalidates the entire family.
- An expired token cannot be rotated.
- Revoked tokens are retained 90 days for audit, then purged.

---

## 4. Farm Domain

### 4.1 `Farm`

A physical or logical farming operation belonging to a tenant.

| Column        | Type           | Constraints                                | Description                                  |
| ------------- | -------------- | ------------------------------------------ | -------------------------------------------- |
| `id`          | `UUID`         | PK                                         |                                              |
| `tenantId`    | `UUID`         | NOT NULL, FK → `tenants.id` ON DELETE CASCADE |                                           |
| `ownerId`     | `UUID`         | NOT NULL, FK → `users.id`                  | The OWNER user                               |
| `name`        | `VARCHAR(120)` | NOT NULL                                   |                                              |
| `description` | `TEXT`         | *(nullable)*                               |                                              |
| `capacity`    | `INT`          | *(nullable)*                               | Maximum head count                           |
| `addressLine` | `VARCHAR(255)` | *(nullable)*                               |                                              |
| `city`        | `VARCHAR(120)` | *(nullable)*                               |                                              |
| `region`      | `VARCHAR(120)` | *(nullable)*                               | Department/state/province                    |
| `country`     | `VARCHAR(2)`   | NOT NULL, DEFAULT `'CO'`                   | ISO 3166-1 alpha-2; default Colombia         |
| `timezone`    | `VARCHAR(60)`  | NOT NULL, DEFAULT `'America/Bogota'`       | IANA timezone, inherited from tenant         |
| `currency`    | `VARCHAR(3)`   | NOT NULL, DEFAULT `'COP'`                  | ISO 4217, inherited from tenant              |
| `milkingMode` | `MilkingMode`  | NOT NULL, DEFAULT `PER_SESSION`            | See [§12.11](#1211-milkingmode)              |
| `metadata`    | `JSONB`        | NOT NULL, DEFAULT `'{}'`                   |                                              |
| `isActive`    | `BOOLEAN`      | NOT NULL, DEFAULT TRUE                     |                                              |
| `createdAt`   | `TIMESTAMPTZ`  | NOT NULL, DEFAULT now()                    |                                              |
| `updatedAt`   | `TIMESTAMPTZ`  | NOT NULL, auto-updated                     |                                              |

**Indexes:** PK; index on `tenantId`; index on `ownerId`.

**Invariants:**
- `ownerId` must reference a user in the same `tenantId`.
- `country` is a valid ISO 3166-1 alpha-2 code.
- `capacity > 0` when set.
- `timezone` must be a valid IANA timezone.
- `milkingMode` cannot be changed if the farm has any milk records (open question #11 in `projectbrief.md`; current behavior: locked once chosen). Until resolved, switching is restricted to OWNER and requires confirming there are no records or that records will be migrated.
- A farm cannot be hard-deleted while it has active animals; set `isActive = false`.

### 4.2 `FarmUserAssignment`

Many-to-many relation between users and farms with a role qualifier.

| Column      | Type          | Constraints                                  | Description                       |
| ----------- | ------------- | -------------------------------------------- | --------------------------------- |
| `id`        | `UUID`        | PK                                           |                                   |
| `farmId`    | `UUID`        | NOT NULL, FK → `farms.id` ON DELETE CASCADE  |                                   |
| `userId`    | `UUID`        | NOT NULL, FK → `users.id` ON DELETE CASCADE  |                                   |
| `role`      | `UserRole`    | NOT NULL                                     | Role *for this farm specifically* |
| `createdAt` | `TIMESTAMPTZ` | NOT NULL, DEFAULT now()                      |                                   |

**Indexes:** PK; UNIQUE composite `(farmId, userId)`; index on `userId`.

**Invariants:**
- `farmId` and `userId` belong to the same tenant.

---

## 5. Catalog

### 5.1 `Breed`

Global catalog of cattle breeds, shared across all tenants.

| Column          | Type           | Constraints              | Description                                  |
| --------------- | -------------- | ------------------------ | -------------------------------------------- |
| `id`            | `UUID`         | PK                       |                                              |
| `name`          | `VARCHAR(80)`  | NOT NULL, UNIQUE         | e.g., "Holstein", "Brahman", "Romosinuano"   |
| `category`      | `BreedCategory`| NOT NULL                 | See [§12.12](#1212-breedcategory)            |
| `originCountry` | `VARCHAR(2)`   | *(nullable)*             | ISO 3166-1 alpha-2                           |
| `description`   | `TEXT`         | *(nullable)*             |                                              |
| `isCustom`      | `BOOLEAN`      | NOT NULL, DEFAULT FALSE  | TRUE if added by an admin, FALSE if seeded   |
| `createdAt`     | `TIMESTAMPTZ`  | NOT NULL, DEFAULT now()  |                                              |

**Indexes:** PK; UNIQUE on `name`; index on `category`.

**Invariants:**
- A breed referenced by any `BreedComposition` cannot be deleted.
- Custom breeds (`isCustom = true`) can be added by an OWNER user.

**Mandatory seed list (per `businessRules.md` §4.1):**

The system is seeded at deployment with at least these 12 breeds, each with the appropriate `category`:

| Name          | Category        | Origin |
| ------------- | --------------- | ------ |
| Brahman       | BEEF            | IN     |
| Holstein      | DAIRY           | NL     |
| Gyr           | DAIRY           | IN     |
| Girolando     | DAIRY           | BR     |
| Nelore        | BEEF            | BR     |
| Guzerat       | DUAL_PURPOSE    | BR     |
| Cebú          | BEEF            | IN     |
| Angus         | BEEF            | UK     |
| Jersey        | DAIRY           | UK     |
| Simmental     | DUAL_PURPOSE    | CH     |
| Hereford      | BEEF            | UK     |
| Romosinuano   | DUAL_PURPOSE    | CO     |

Two additional system entries are also seeded for animals of unknown or mixed origin without registered percentages:

| Name           | Category | Notes                                        |
| -------------- | -------- | -------------------------------------------- |
| Mestizo        | MIXED    | Generic mixed-breed without known percentages |
| Cruce          | MIXED    | Cross between unidentified breeds             |

---

## 6. Animal Domain

### 6.1 `Animal`

The central entity of the system. Every cow, bull, and calf is an `Animal`. Category-specific data lives in companion profile tables ([§6.3](#63-cowprofile)–[§6.5](#65-calfprofile)). Breed composition lives in [§6.2 BreedComposition](#62-breedcomposition).

| Column            | Type             | Constraints                                                  | Description                                |
| ----------------- | ---------------- | ------------------------------------------------------------ | ------------------------------------------ |
| `id`              | `UUID`           | PK                                                           |                                            |
| `tenantId`        | `UUID`           | NOT NULL, FK → `tenants.id`                                  |                                            |
| `farmId`          | `UUID`           | NOT NULL, FK → `farms.id`                                    |                                            |
| `earTagNumber`    | `VARCHAR(40)`    | NOT NULL                                                     | The ear tag printed on the animal          |
| `name`            | `VARCHAR(80)`    | *(nullable)*                                                 | Optional given name                        |
| `sex`             | `AnimalSex`      | NOT NULL                                                     | `MALE` or `FEMALE`                         |
| `birthDate`       | `DATE`           | NOT NULL                                                     |                                            |
| `status`          | `AnimalStatus`   | NOT NULL, DEFAULT `ACTIVE`                                   | See [§12.3](#123-animalstatus)             |
| `previousStatus`  | `AnimalStatus`   | *(nullable)*                                                 | For audit/return-to-status logic           |
| `estimatedValue`  | `DECIMAL(14, 2)` | *(nullable)*                                                 | Latest valuation                           |
| `currency`        | `VARCHAR(3)`     | NOT NULL, DEFAULT `'COP'`                                    | ISO 4217                                   |
| `motherId`        | `UUID`           | *(nullable)*, FK → `animals.id`                              | Self-reference                             |
| `fatherId`        | `UUID`           | *(nullable)*, FK → `animals.id`                              | Self-reference                             |
| `acquisitionDate` | `DATE`           | *(nullable)*                                                 | Date the animal entered the farm           |
| `acquisitionCost` | `DECIMAL(14, 2)` | *(nullable)*                                                 |                                            |
| `exitDate`        | `DATE`           | *(nullable)*                                                 | Date of sale or death                      |
| `exitReason`      | `VARCHAR(255)`   | *(nullable)*                                                 |                                            |
| `notes`           | `TEXT`           | *(nullable)*                                                 |                                            |
| `metadata`        | `JSONB`          | NOT NULL, DEFAULT `'{}'`                                     |                                            |
| `version`         | `INT`            | NOT NULL, DEFAULT 1                                          | Optimistic lock                            |
| `createdAt`       | `TIMESTAMPTZ`    | NOT NULL, DEFAULT now()                                      |                                            |
| `updatedAt`       | `TIMESTAMPTZ`    | NOT NULL, auto-updated                                       |                                            |

**Indexes:**
- PK on `id`.
- UNIQUE composite `(tenantId, earTagNumber)`.
- Index on `farmId`, `tenantId`, `motherId`, `fatherId`, `status`, `(tenantId, status)`.

**Invariants:**
- `birthDate` ≤ today.
- `birthDate` ≥ today − 30 years (sanity bound).
- `motherId`, when present: `sex = FEMALE`, `birthDate < this.birthDate`, same `tenantId`.
- `fatherId`, when present: `sex = MALE`, `birthDate < this.birthDate`, same `tenantId`.
- An animal cannot be its own ancestor (cycle prevention enforced at write via the genealogy CTE).
- `farmId` belongs to the same `tenantId`.
- `exitDate ≥ acquisitionDate` (or ≥ `birthDate` if born on the farm).
- When `status ∈ { SOLD, DECEASED }`, `exitDate` must be set.
- `acquisitionCost ≥ 0`, `estimatedValue ≥ 0` when present.
- The composite key `(tenantId, earTagNumber)` enforces ear-tag uniqueness within a tenant. Reusing a sold/deceased animal's tag is forbidden — historical records must remain queryable by tag.
- An animal must have at least one `BreedComposition` row whose percentages sum to exactly 100.00 (see [§6.2](#62-breedcomposition)).

**Status transitions** (per `businessRules.md` §1.2):

```
ACTIVE      → PREGNANT       (pregnancy confirmed)
ACTIVE      → DRY            (owner or vet decision)
ACTIVE      → QUARANTINED    (vet decision)
ACTIVE      → SOLD           (terminal)
ACTIVE      → DECEASED       (terminal)

PREGNANT    → ACTIVE         (pregnancy closed: birth, abortion, or complications)
PREGNANT    → DRY            (allowed — pregnant + dry can coexist)

DRY         → ACTIVE         (milking resumed)
DRY         → PREGNANT       (pregnancy confirmed while dry)

QUARANTINED → ACTIVE         (vet clearance)

SOLD        → (none — terminal)
DECEASED    → (none — terminal)
```

**Status-driven business rules:**

- `SOLD` and `DECEASED` are terminal: no new milk, pregnancy, or health events.
- `DRY` cows **cannot** register milk production (hard block at the service layer).
- `QUARANTINED` cows **may** register milk production, but each record's `isFitForCommercial` is automatically set to `false` (see [§8.1](#81-milkproductionrecord)).
- When `OWNER` triggers `ACTIVE → DRY`, the system surfaces a recommendation: *"Se recomienda confirmar este cambio con el veterinario antes de proceder."* The transition still proceeds; the recommendation is logged in `metadata.dryConfirmationNotice = true`.
- Closing a `PENDING` pregnancy automatically transitions the mother back to `ACTIVE` (or to `DRY` if she was previously `DRY` and `previousStatus` reflects that).

### 6.2 `BreedComposition`

Many-to-many relation between an animal and one or more breeds, with a percentage per breed. Replaces the simple `breedId` column from v1.0 of this document.

| Column         | Type             | Constraints                                          | Description                                |
| -------------- | ---------------- | ---------------------------------------------------- | ------------------------------------------ |
| `id`           | `UUID`           | PK                                                   |                                            |
| `animalId`     | `UUID`           | NOT NULL, FK → `animals.id` ON DELETE CASCADE        |                                            |
| `breedId`      | `UUID`           | NOT NULL, FK → `breeds.id`                           |                                            |
| `percentage`   | `DECIMAL(5, 2)`  | NOT NULL                                             | 0.00–100.00                                |
| `crossCategory`| `CrossCategory`  | *(nullable)*                                         | F1, F2, BACKCROSS, etc. See [§12.13](#1213-crosscategory) |
| `createdAt`    | `TIMESTAMPTZ`    | NOT NULL, DEFAULT now()                              |                                            |

**Indexes:** PK; UNIQUE composite `(animalId, breedId)`; index on `breedId`.

**Invariants:**
- `percentage > 0` and `percentage ≤ 100`.
- For any animal, `SUM(percentage) = 100.00` exactly across all `BreedComposition` rows. Enforced at the service layer in a single transaction; integration test mandatory.
- An animal cannot have two rows referencing the same breed.
- If `crossCategory = F1`, the animal must have exactly two `BreedComposition` rows of 50.00 each.
- If `crossCategory = BACKCROSS_75_25`, the animal must have exactly two rows of 75.00 and 25.00.
- If `crossCategory = PURE`, the animal must have exactly one `BreedComposition` row of 100.00.
- For mestizos/cruces of unknown composition, a single row of 100.00 referencing the seeded `Mestizo` or `Cruce` breed is used; `crossCategory` is left null.

**Calf inheritance rule:**
When a calf is created from a successful pregnancy, the system automatically computes the calf's `BreedComposition` as the average of mother's and father's compositions, weighted 50/50. The user may override the computed composition before saving.

Example:
- Mother: 100% Holstein.
- Father: 50% Brahman + 50% Gyr.
- Calf (auto): 50% Holstein + 25% Brahman + 25% Gyr.

### 6.3 `CowProfile`

Female-specific data. One-to-one with `Animal` where `sex = FEMALE`.

| Column                    | Type            | Constraints                                          | Description                                  |
| ------------------------- | --------------- | ---------------------------------------------------- | -------------------------------------------- |
| `animalId`                | `UUID`          | PK, FK → `animals.id` ON DELETE CASCADE              |                                              |
| `firstCalvingDate`        | `DATE`          | *(nullable)*                                         | First time she gave birth                    |
| `lactationCount`          | `INT`           | NOT NULL, DEFAULT 0                                  | Number of completed lactation cycles         |
| `averageDailyMilkLiters`  | `DECIMAL(6, 2)` | *(nullable)*                                         | Rolling 30-day average                       |
| `peakDailyMilkLiters`     | `DECIMAL(6, 2)` | *(nullable)*                                         | Maximum recorded daily yield                 |
| `isCurrentlyLactating`    | `BOOLEAN`       | NOT NULL, DEFAULT FALSE                              |                                              |
| `lastCalvingDate`         | `DATE`          | *(nullable)*                                         | Most recent successful birth                 |
| `mastitisCaseCount`       | `INT`           | NOT NULL, DEFAULT 0                                  | Cumulative count                             |
| `lastMastitisDate`        | `DATE`          | *(nullable)*                                         |                                              |

**Invariants:**
- `lactationCount ≥ 0`, `mastitisCaseCount ≥ 0`.
- `averageDailyMilkLiters`, `peakDailyMilkLiters ≥ 0` when present.
- The associated `Animal.sex` must be `FEMALE`.
- A cow with `isCurrentlyLactating = true` should have at least one milk record in the last 14 days; soft warning, not a hard constraint.
- A primiparous cow (first pregnancy) is identified by `lactationCount = 0 AND firstCalvingDate IS NULL`. Reproductive flows surface special warnings for primiparous cows.
- A cow with `mastitisCaseCount ≥ 3` triggers a "high mastitis risk" indicator on her profile, considered for culling decisions.

### 6.4 `BullProfile`

Male-specific data. One-to-one with `Animal` where `sex = MALE`.

| Column                | Type             | Constraints                                          | Description                                  |
| --------------------- | ---------------- | ---------------------------------------------------- | -------------------------------------------- |
| `animalId`            | `UUID`           | PK, FK → `animals.id` ON DELETE CASCADE              |                                              |
| `bullType`            | `BullType`       | NOT NULL                                             | `LIVE_ON_FARM` or `SEMEN_DONOR`              |
| `totalMatings`        | `INT`            | NOT NULL, DEFAULT 0                                  | Counter, updated by reproduction events      |
| `successfulMatings`   | `INT`            | NOT NULL, DEFAULT 0                                  |                                              |
| `lowFertilityFlagged` | `BOOLEAN`        | NOT NULL, DEFAULT FALSE                              | Auto-flagged when low conception rate        |

**Invariants:**
- The associated `Animal.sex` must be `MALE`.
- `successfulMatings ≤ totalMatings`.
- Counters non-negative.
- When a bull has `totalMatings ≥ 10` AND `successfulMatings / totalMatings < 0.30`, the system sets `lowFertilityFlagged = true` and emits a `LOW_FERTILITY` notification (per added rule).
- `BullProfile` does not store semen straw data — that lives in [§7.2 SemenStraw](#72-semenstraw). A bull may donate to many semen straws.

### 6.5 `CalfProfile`

Calf-specific data. Applies until the calf is promoted to adult (status `PROMOTED`).

| Column            | Type            | Constraints                                          | Description                                  |
| ----------------- | --------------- | ---------------------------------------------------- | -------------------------------------------- |
| `animalId`        | `UUID`          | PK, FK → `animals.id` ON DELETE CASCADE              |                                              |
| `birthWeightKg`   | `DECIMAL(6, 2)` | *(nullable)*                                         | Weight at birth                              |
| `weaningDate`     | `DATE`          | *(nullable)*                                         | Date of weaning                              |
| `weaningWeightKg` | `DECIMAL(6, 2)` | *(nullable)*                                         |                                              |
| `status`          | `CalfStatus`    | NOT NULL, DEFAULT `NURSING`                          | See [§12.5](#125-calfstatus)                 |
| `pregnancyId`     | `UUID`          | *(nullable)*, FK → `pregnancies.id`                  | The pregnancy that produced this calf        |
| `isBullCandidate` | `BOOLEAN`       | NOT NULL, DEFAULT FALSE                              | Marked manually by OWNER or VETERINARIAN     |
| `bullCandidateNotes` | `TEXT`       | *(nullable)*                                         | Reason for marking                           |
| `bullCandidateMarkedAt` | `TIMESTAMPTZ` | *(nullable)*                                       |                                              |
| `bullCandidateMarkedBy` | `UUID`     | *(nullable)*, FK → `users.id`                        |                                              |

**Invariants:**
- `birthWeightKg`, `weaningWeightKg` ∈ `(0, 100]` kg (sanity bounds for cattle calves).
- `weaningDate ≥ Animal.birthDate`.
- Status transition `NURSING → WEANED` requires `weaningDate` and `weaningWeightKg`.
- Status transition to `PROMOTED` is performed when the calf is registered as adult cow/bull (creates `CowProfile` or `BullProfile`). Triggered automatically when the calf reaches 18 months, manually possible earlier with OWNER/VET role.
- `isBullCandidate = true` is permitted only when `Animal.sex = MALE`.
- Setting `isBullCandidate = true` requires OWNER or VETERINARIAN role; the system enriches `estimatedValue` of the parent `Animal` with a configurable bull-candidate premium (default +20% over breed/weight baseline). The premium is computed at read time, not stored.
- Marking a calf as bull candidate emits an `AuditLog` entry with `action = 'calf.mark_bull_candidate'`.

### 6.6 `WeightRecord`

Individual weight measurements over an animal's lifetime.

| Column       | Type            | Constraints                                          | Description                            |
| ------------ | --------------- | ---------------------------------------------------- | -------------------------------------- |
| `id`         | `UUID`          | PK                                                   |                                        |
| `animalId`   | `UUID`          | NOT NULL, FK → `animals.id` ON DELETE CASCADE        |                                        |
| `weightKg`   | `DECIMAL(7, 2)` | NOT NULL                                             |                                        |
| `measuredAt` | `DATE`          | NOT NULL                                             | Date of measurement                    |
| `recordedBy` | `UUID`          | NOT NULL, FK → `users.id`                            |                                        |
| `notes`      | `VARCHAR(500)`  | *(nullable)*                                         |                                        |
| `createdAt`  | `TIMESTAMPTZ`   | NOT NULL, DEFAULT now()                              |                                        |

**Indexes:** PK; composite index on `(animalId, measuredAt)`.

**Invariants:**
- `weightKg ∈ (0, 2000]`.
- `measuredAt ≥ animal.birthDate`, `measuredAt ≤ today`.
- Append-only.

### 6.7 `AnimalPhoto`

Photo attachments. Files live in S3-compatible storage; this table stores metadata.

| Column        | Type           | Constraints                                          | Description                            |
| ------------- | -------------- | ---------------------------------------------------- | -------------------------------------- |
| `id`          | `UUID`         | PK                                                   |                                        |
| `animalId`    | `UUID`         | NOT NULL, FK → `animals.id` ON DELETE CASCADE        |                                        |
| `storageKey`  | `VARCHAR(500)` | NOT NULL                                             | S3 object key                          |
| `contentType` | `VARCHAR(60)`  | NOT NULL                                             | MIME type                              |
| `sizeBytes`   | `INT`          | NOT NULL                                             |                                        |
| `caption`     | `VARCHAR(255)` | *(nullable)*                                         |                                        |
| `uploadedBy`  | `UUID`         | NOT NULL, FK → `users.id`                            |                                        |
| `createdAt`   | `TIMESTAMPTZ`  | NOT NULL, DEFAULT now()                              |                                        |

**Indexes:** PK; index on `animalId`.

**Invariants:**
- `contentType ∈ { image/jpeg, image/png, image/webp }`.
- `sizeBytes ≤ 10 MiB` (10,485,760 bytes).
- On hard-delete (privacy request), the S3 object must also be deleted.


---

## 7. Reproduction Domain

### 7.1 `Pregnancy`

A pregnancy lifecycle from conception confirmation through outcome.

| Column                 | Type                | Constraints                                          | Description                                 |
| ---------------------- | ------------------- | ---------------------------------------------------- | ------------------------------------------- |
| `id`                   | `UUID`              | PK                                                   |                                             |
| `tenantId`             | `UUID`              | NOT NULL                                             |                                             |
| `motherId`             | `UUID`              | NOT NULL, FK → `animals.id`                          |                                             |
| `fatherId`             | `UUID`              | *(nullable)*, FK → `animals.id`                      | Bull on farm (natural) or registered donor  |
| `semenStrawId`         | `UUID`              | *(nullable)*, FK → `semen_straws.id`                 | Set when AI uses an inventory straw         |
| `conceptionMethod`     | `ConceptionMethod`  | NOT NULL                                             | See [§12.4](#124-conceptionmethod)          |
| `conceptionDate`       | `DATE`              | NOT NULL                                             |                                             |
| `confirmedAt`          | `DATE`              | *(nullable)*                                         | Date of veterinary confirmation             |
| `estimatedBirthDate`   | `DATE`              | NOT NULL                                             | conceptionDate + 281 days                   |
| `estimatedBirthDateMin`| `DATE`              | NOT NULL                                             | conceptionDate + 279 days                   |
| `estimatedBirthDateMax`| `DATE`              | NOT NULL                                             | conceptionDate + 283 days                   |
| `actualBirthDate`      | `DATE`              | *(nullable)*                                         | Set when outcome reaches a terminal state   |
| `outcome`              | `PregnancyOutcome`  | NOT NULL, DEFAULT `PENDING`                          | See [§12.6](#126-pregnancyoutcome)          |
| `isPrimiparous`        | `BOOLEAN`           | NOT NULL                                             | Computed at creation: cow's first pregnancy |
| `notes`                | `TEXT`              | *(nullable)*                                         |                                             |
| `version`              | `INT`               | NOT NULL, DEFAULT 1                                  | Optimistic lock                             |
| `createdAt`            | `TIMESTAMPTZ`       | NOT NULL, DEFAULT now()                              |                                             |
| `updatedAt`            | `TIMESTAMPTZ`       | NOT NULL, auto-updated                               |                                             |

**Indexes:** PK; index on `motherId`; index on `fatherId`; index on `semenStrawId`; composite index on `(tenantId, outcome)`.

**Invariants (per `businessRules.md` §2):**

- `mother.sex = FEMALE`. Enforced at write time.
- `mother.status ∉ { SOLD, DECEASED }`. A sold or deceased cow cannot be registered as pregnant.
- `father.sex = MALE` when `fatherId` is set.
- `conceptionDate ≤ today`.
- `conceptionDate ≥ mother.birthDate + 12 months` (heifer must be ≥ 12 months old). Hard-reject if `< 9 months`; soft-warning if between 9 and 12 months.
- **Gestation calculation:**
  - `estimatedBirthDate = conceptionDate + 281 days` (central value).
  - `estimatedBirthDateMin = conceptionDate + 279 days`.
  - `estimatedBirthDateMax = conceptionDate + 283 days`.
  - The UI displays the central date with the ±2 days range; alerts use the central date.
- **Conception method requirements:**
  - `NATURAL_MATING`: `fatherId` required (bull on the farm).
  - `ARTIFICIAL_INSEMINATION`: either `semenStrawId` OR (`fatherId` if the donor bull is registered as `BullProfile.bullType = SEMEN_DONOR`). At least one must be set.
  - `EMBRYO_TRANSFER`: at minimum the donor cow's identity should be referenced in `notes`; future iterations may add an `embryoTransferDetails` JSONB field.
- **One active pregnancy per mother:** A cow cannot have two pregnancies with `outcome = PENDING` simultaneously. Enforced via partial unique index:

  ```sql
  CREATE UNIQUE INDEX uniq_active_pregnancy_per_mother
    ON pregnancies("motherId")
    WHERE outcome = 'PENDING';
  ```

- **Post-partum minimum interval (per `businessRules.md` §2.3):** When attempting to register a new pregnancy, if the mother's last successful birth (`Pregnancy.outcome = SUCCESSFUL` ordered by `actualBirthDate DESC LIMIT 1`) was less than **45 days** before the new `conceptionDate`, the system shows a **soft warning**: *"Han pasado menos de 45 días desde el último parto. Se recomienda evaluación veterinaria antes de proceder."* Registration proceeds; the warning is logged in `metadata.postPartumWarning = true`.
- **Post-abortion / post-complications mandatory warning:** When the mother's previous pregnancy ended in `ABORTION` or `COMPLICATIONS`, the system displays a **mandatory acknowledgement**: *"El último evento reproductivo fue un aborto o tuvo complicaciones. Es obligatorio que el veterinario evalúe a la vaca antes de registrar una nueva preñez."* Registration only proceeds after explicit acknowledgement; recorded in `metadata.postAdverseEventAcknowledged = true` and `metadata.acknowledgedBy = userId`.
- **`isPrimiparous` computation:** at creation, `isPrimiparous = (mother.cowProfile.lactationCount = 0 AND mother.cowProfile.firstCalvingDate IS NULL)`. Primiparous pregnancies receive special primary-attention markers in alerts.
- `outcome ≠ PENDING` is terminal. Corrections are made via audit-logged events.
- When `outcome = SUCCESSFUL`: `actualBirthDate` required, at least one `CalfProfile` must reference this pregnancy. The mother's status returns to `ACTIVE` (or `DRY` if `previousStatus = DRY`); her `CowProfile.lactationCount` increments by 1; `CowProfile.lastCalvingDate = actualBirthDate`; `firstCalvingDate` is set if previously null.
- When `outcome = ABORTION` or `COMPLICATIONS`: no calf is auto-created; mother returns to `ACTIVE`; the next pregnancy attempt triggers the mandatory acknowledgement above.

**State machine** (per `businessRules.md` §2.5):

```
PENDING ──► SUCCESSFUL    (auto-create calf; mother → ACTIVE; lactation++)
        ──► ABORTION       (no calf; mother → ACTIVE; warn next pregnancy)
        ──► COMPLICATIONS  (no auto-calf; mother → ACTIVE; warn next pregnancy)
```

> Note: the v1.0 draft previously included `STILLBIRTH` as a separate outcome. Per `businessRules.md`, this is folded into `COMPLICATIONS`; users may describe specifics in `notes`.

### 7.2 `SemenStraw`

Inventory of semen straws stored in the farm's nitrogen tank. A pregnancy with `conceptionMethod = ARTIFICIAL_INSEMINATION` may reference a straw from this catalog.

| Column                  | Type             | Constraints                                          | Description                                  |
| ----------------------- | ---------------- | ---------------------------------------------------- | -------------------------------------------- |
| `id`                    | `UUID`           | PK                                                   |                                              |
| `tenantId`              | `UUID`           | NOT NULL                                             |                                              |
| `farmId`                | `UUID`           | NOT NULL, FK → `farms.id`                            | Tank physically located on this farm         |
| `donorBullId`           | `UUID`           | *(nullable)*, FK → `animals.id`                      | Linked iff donor is registered as BullProfile |
| `donorBullName`         | `VARCHAR(120)`   | NOT NULL                                             | Even when no internal record exists          |
| `donorBreedId`          | `UUID`           | *(nullable)*, FK → `breeds.id`                       |                                              |
| `donorBreedName`        | `VARCHAR(80)`    | NOT NULL                                             | Free-text fallback when not in catalog       |
| `registrationCode`      | `VARCHAR(80)`    | NOT NULL                                             | Unique commercial / pedigree code            |
| `productionCenter`      | `VARCHAR(120)`   | NOT NULL                                             | Lab / company that produced the straw        |
| `originCountry`         | `VARCHAR(2)`     | *(nullable)*                                         | ISO 3166-1 alpha-2                           |
| `semenType`             | `SemenType`      | NOT NULL                                             | `CONVENTIONAL` or `SEXED`                    |
| `batchNumber`           | `VARCHAR(80)`    | *(nullable)*                                         |                                              |
| `pedigree`              | `JSONB`          | NOT NULL, DEFAULT `'{}'`                             | Structured ancestry data                     |
| `productiveIndices`     | `JSONB`          | NOT NULL, DEFAULT `'{}'`                             | PTA, DEP, etc.                               |
| `sanitaryTests`         | `JSONB`          | NOT NULL, DEFAULT `'{}'`                             | Disease-screening test results               |
| `freezingDate`          | `DATE`           | *(nullable)*                                         | Production / cryo-preservation date          |
| `pricePerStraw`         | `DECIMAL(12, 2)` | NOT NULL                                             |                                              |
| `currency`              | `VARCHAR(3)`     | NOT NULL, DEFAULT `'COP'`                            |                                              |
| `tankColorCode`         | `VARCHAR(40)`    | *(nullable)*                                         | Physical identifier on tank                  |
| `quantityAvailable`     | `INT`            | NOT NULL, DEFAULT 0                                  | Straws remaining                             |
| `isUsable`              | `BOOLEAN`        | NOT NULL, DEFAULT TRUE                               | False if cold-chain broken or thawed         |
| `unusableReason`        | `VARCHAR(255)`   | *(nullable)*                                         |                                              |
| `notes`                 | `TEXT`           | *(nullable)*                                         |                                              |
| `createdAt`             | `TIMESTAMPTZ`    | NOT NULL, DEFAULT now()                              |                                              |
| `updatedAt`             | `TIMESTAMPTZ`    | NOT NULL, auto-updated                               |                                              |

**Indexes:** PK; UNIQUE composite `(tenantId, registrationCode)`; index on `farmId`; index on `donorBullId`.

**Invariants (per `businessRules.md` §6):**

- `pricePerStraw > 0`, `quantityAvailable ≥ 0`.
- `semenType ∈ { CONVENTIONAL, SEXED }`.
- Required fields: `donorBullName`, `donorBreedName`, `registrationCode`, `productionCenter`, `semenType`, `pricePerStraw`. Optional: `originCountry`, `batchNumber`, `pedigree`, `productiveIndices`, `sanitaryTests`, `freezingDate`, `tankColorCode`.
- **Straws have no strict expiration date** when stored at -196°C in liquid nitrogen. The `freezingDate` is a reference, not an expiration.
- A straw can be marked `isUsable = false` with `unusableReason` (e.g., "Accidental thawing on 2026-04-12", "Cold-chain broken during transport"). Unusable straws cannot be assigned to new pregnancies.
- When a pregnancy referencing this straw is registered, `quantityAvailable` decrements by 1 in the same transaction. If `quantityAvailable = 0`, no further pregnancies may reference the straw until restocked.
- A `SemenStraw` referenced by any `Pregnancy` cannot be deleted; set `quantityAvailable = 0` and `isUsable = false` instead.

### 7.3 `BirthInterval` (derived view)

This is **not a table**; it is a **derived metric** computed at read time from `Pregnancy` records to support reproductive efficiency reporting.

For each cow with at least two successful pregnancies:

```
birth_interval_days = current_pregnancy.actualBirthDate - previous_pregnancy.actualBirthDate
```

**Business rule (added):**

- The **ideal birth interval** in dairy operations is **365–400 days** (12–13 months).
- When a cow's most recent successful birth is more than **400 days** ago and she has no active `PENDING` pregnancy, the system emits a `LOW_REPRODUCTIVE_EFFICIENCY` notification.
- A scheduled job (daily, BullMQ) computes this metric per cow and creates notifications.

---

## 8. Production Domain

### 8.1 `MilkProductionRecord`

Daily milk production per cow. The fundamental high-frequency record of the system. The exact fields used depend on the farm's `milkingMode` (per `businessRules.md` §5.1).

| Column                 | Type             | Constraints                                          | Description                                  |
| ---------------------- | ---------------- | ---------------------------------------------------- | -------------------------------------------- |
| `id`                   | `UUID`           | PK                                                   |                                              |
| `tenantId`             | `UUID`           | NOT NULL                                             |                                              |
| `farmId`               | `UUID`           | NOT NULL, FK → `farms.id`                            |                                              |
| `animalId`             | `UUID`           | NOT NULL, FK → `animals.id` ON DELETE CASCADE        |                                              |
| `productionDate`       | `DATE`           | NOT NULL                                             | Calendar date of production                  |
| `milkingModeAtRecord`  | `MilkingMode`    | NOT NULL                                             | Snapshot of farm's mode at write time        |
| `morningLiters`        | `DECIMAL(6, 2)`  | NOT NULL, DEFAULT 0                                  | Used in PER_SESSION mode                     |
| `morningRecordedAt`    | `TIMESTAMPTZ`    | *(nullable)*                                         | Optional timestamp of morning session        |
| `afternoonLiters`      | `DECIMAL(6, 2)`  | NOT NULL, DEFAULT 0                                  | Used in PER_SESSION mode                     |
| `afternoonRecordedAt`  | `TIMESTAMPTZ`    | *(nullable)*                                         |                                              |
| `eveningLiters`        | `DECIMAL(6, 2)`  | NOT NULL, DEFAULT 0                                  | Used in PER_SESSION mode (third session)     |
| `eveningRecordedAt`    | `TIMESTAMPTZ`    | *(nullable)*                                         |                                              |
| `dailyTotalLiters`     | `DECIMAL(7, 2)`  | NOT NULL                                             | Computed: sum of session liters, OR direct entry in DAILY_TOTAL mode |
| `fatPercentage`        | `DECIMAL(4, 2)`  | *(nullable)*                                         | 0–10                                         |
| `proteinPercentage`    | `DECIMAL(4, 2)`  | *(nullable)*                                         | 0–10                                         |
| `isFitForCommercial`   | `BOOLEAN`        | NOT NULL, DEFAULT TRUE                               | False if cow is QUARANTINED or in withholding |
| `unfitReason`          | `UnfitMilkReason`| *(nullable)*                                         | See [§12.14](#1214-unfitmilkreason)          |
| `withholdingPeriodId`  | `UUID`           | *(nullable)*, FK → `medication_withholding_periods.id` | When unfit due to medication              |
| `recordedBy`           | `UUID`           | NOT NULL, FK → `users.id`                            |                                              |
| `notes`                | `VARCHAR(500)`   | *(nullable)*                                         |                                              |
| `createdAt`            | `TIMESTAMPTZ`    | NOT NULL, DEFAULT now()                              |                                              |

**Indexes:**
- PK.
- UNIQUE composite `(animalId, productionDate)` — one record per cow per day.
- Composite index on `(tenantId, productionDate)` — for tenant-wide reports.
- Composite index on `(animalId, productionDate)` — for per-cow time series.
- Composite index on `(farmId, productionDate, isFitForCommercial)` — for commercial-yield reports.

**Invariants (per `businessRules.md` §5):**

- `animalId` references an animal with `sex = FEMALE`.
- The animal must be ≥ 18 months old on `productionDate`.
- The animal's `status ∈ { ACTIVE, PREGNANT, QUARANTINED }`. **`DRY`, `SOLD`, and `DECEASED` are blocked at the service layer** — the system rejects the record with a domain error.
- All liter fields ≥ 0.
- Per-session sanity bound: each of `morningLiters`, `afternoonLiters`, `eveningLiters` ≤ 60 (warns above; allows after explicit confirmation).
- Daily-total sanity bound: `dailyTotalLiters` ≤ 120 (warns above).
- **`dailyTotalLiters` is always computed**, never trusted from input:
  - If `milkingModeAtRecord = PER_SESSION`: `dailyTotalLiters = morningLiters + afternoonLiters + eveningLiters`.
  - If `milkingModeAtRecord = DAILY_TOTAL`: `dailyTotalLiters` is taken from a single input field; session fields are 0.
- `fatPercentage`, `proteinPercentage`, when set, ∈ `[0, 10]`.
- `productionDate ≤ today`.
- **Quarantine handling:** if `animal.status = QUARANTINED` at `productionDate`, the system automatically sets `isFitForCommercial = false` and `unfitReason = QUARANTINED_ANIMAL`. The user cannot override this.
- **Medication withholding handling:** if a `MedicationWithholdingPeriod` covers `productionDate` for the cow, `isFitForCommercial = false`, `unfitReason = MEDICATION_WITHHOLDING`, and `withholdingPeriodId` is populated. **No UI override is exposed** (per `projectbrief.md` non-negotiable #12).
- **Mastitis-risk calculation:** a daily background job inspects each lactating cow with `averageDailyMilkLiters ≥ 15`. If the time since the last recorded session for that cow exceeds 14–16 hours, a `MASTITIS_RISK` notification is emitted (per `businessRules.md` §8.4).
- A record may be edited within 7 days of creation by the original recorder; after that, edits are restricted to OWNER + audit log entry.
- **Lactation-curve anomaly detection** (added rule): a daily job inspects each cow's last 3 days of `dailyTotalLiters`. If the moving average drops more than **20%** vs. the previous 7-day baseline (excluding the early-lactation 14-day transition window), a `LOW_PRODUCTION` notification is emitted.

### 8.2 `LactationPeriod`

Tracks a single lactation cycle from calving to drying-off.

| Column                  | Type             | Constraints                                          | Description                                  |
| ----------------------- | ---------------- | ---------------------------------------------------- | -------------------------------------------- |
| `id`                    | `UUID`           | PK                                                   |                                              |
| `tenantId`              | `UUID`           | NOT NULL                                             |                                              |
| `cowId`                 | `UUID`           | NOT NULL, FK → `animals.id` ON DELETE CASCADE        |                                              |
| `pregnancyId`           | `UUID`           | *(nullable)*, FK → `pregnancies.id`                  | The pregnancy that initiated this lactation  |
| `startDate`             | `DATE`           | NOT NULL                                             | Day after successful birth                   |
| `dryOffDate`            | `DATE`           | *(nullable)*                                         | Day the cow was dried off                    |
| `lactationNumber`       | `INT`            | NOT NULL                                             | 1, 2, 3, … per cow                           |
| `peakDailyLiters`       | `DECIMAL(6, 2)`  | *(nullable)*                                         | Highest daily yield in the period            |
| `peakDayOffset`         | `INT`            | *(nullable)*                                         | Days from `startDate` to peak                |
| `totalCommercialLiters` | `DECIMAL(12, 2)` | NOT NULL, DEFAULT 0                                  | Sum of `dailyTotalLiters WHERE isFit = true` |
| `transitionEndDate`     | `DATE`           | NOT NULL                                             | startDate + 14 days; pre-commercial period   |
| `notes`                 | `TEXT`           | *(nullable)*                                         |                                              |
| `createdAt`             | `TIMESTAMPTZ`    | NOT NULL, DEFAULT now()                              |                                              |
| `updatedAt`             | `TIMESTAMPTZ`    | NOT NULL, auto-updated                               |                                              |

**Indexes:** PK; UNIQUE composite `(cowId, lactationNumber)`; index on `(tenantId, startDate)`.

**Invariants (added domain rules):**

- `lactationNumber > 0`. Auto-incremented per cow on creation.
- A new `LactationPeriod` is auto-created when a pregnancy with `outcome = SUCCESSFUL` is closed; `startDate = actualBirthDate + 1 day`, `lactationNumber = cowProfile.lactationCount` (after increment).
- `transitionEndDate = startDate + 14 days` — milk in this window is colostrum/transition milk, automatically marked `isFitForCommercial = false` with `unfitReason = COLOSTRUM_PERIOD`.
- `dryOffDate ≥ startDate`. When `dryOffDate` is set, the system automatically transitions the cow's status `ACTIVE → DRY`.
- **Standard lactation length is 305 days.** When `dryOffDate IS NULL` and `today - startDate > 305 days`, the system emits a `LACTATION_OVERDUE` notification.
- `totalCommercialLiters` is recomputed nightly by a scheduled job summing `MilkProductionRecord.dailyTotalLiters WHERE isFitForCommercial = true` for the period.
- `peakDailyLiters` and `peakDayOffset` are recomputed nightly.
- A cow can have only one open `LactationPeriod` (`dryOffDate IS NULL`) at a time. Enforced via partial unique index:

  ```sql
  CREATE UNIQUE INDEX uniq_open_lactation_per_cow
    ON lactation_periods("cowId")
    WHERE "dryOffDate" IS NULL;
  ```

---

## 9. Health Domain

### 9.1 `HealthEvent`

A vaccination, treatment, illness observation, or other health-related event.

| Column                  | Type              | Constraints                                          | Description                                |
| ----------------------- | ----------------- | ---------------------------------------------------- | ------------------------------------------ |
| `id`                    | `UUID`            | PK                                                   |                                            |
| `tenantId`              | `UUID`            | NOT NULL                                             |                                            |
| `animalId`              | `UUID`            | NOT NULL, FK → `animals.id` ON DELETE CASCADE        |                                            |
| `eventType`             | `HealthEventType` | NOT NULL                                             | See [§12.7](#127-healtheventtype)          |
| `eventDate`             | `DATE`            | NOT NULL                                             |                                            |
| `description`           | `TEXT`            | NOT NULL                                             |                                            |
| `veterinarianId`        | `UUID`            | *(nullable)*, FK → `users.id`                        | The vet who performed the action           |
| `productName`           | `VARCHAR(120)`    | *(nullable)*                                         | Vaccine, medication, etc.                  |
| `dosage`                | `VARCHAR(80)`     | *(nullable)*                                         | "5 ml IM"                                  |
| `cost`                  | `DECIMAL(12, 2)`  | *(nullable)*                                         |                                            |
| `nextDueDate`           | `DATE`            | *(nullable)*                                         | When the next event is due                 |
| `withholdingPeriodId`   | `UUID`            | *(nullable)*, FK → `medication_withholding_periods.id` | Auto-created when applicable           |
| `attachments`           | `JSONB`           | NOT NULL, DEFAULT `'[]'`                             | Array of S3 keys                           |
| `recordedBy`            | `UUID`            | NOT NULL, FK → `users.id`                            |                                            |
| `createdAt`             | `TIMESTAMPTZ`     | NOT NULL, DEFAULT now()                              |                                            |

**Indexes:** PK; composite index on `(animalId, eventDate)`; composite index on `(tenantId, nextDueDate)` for upcoming-events reports.

**Invariants:**

- `eventDate ≥ animal.birthDate`, `eventDate ≤ today`.
- `cost ≥ 0` when set.
- `nextDueDate > eventDate` when set.
- `description` not empty after trim.
- Health events are append-only. Corrections create a new event marked as a correction in `attachments` metadata.
- **When `eventType = TREATMENT` AND `productName` is provided AND the product has a known withholding period:** a `MedicationWithholdingPeriod` is auto-created and linked via `withholdingPeriodId`.
- **When `eventType = ILLNESS` AND `description` includes mastitis indicators** (the system maintains a keyword catalog including "mastitis"): the cow's `CowProfile.mastitisCaseCount` increments and `lastMastitisDate` updates; a `MastitisHistory` view entry is reflected.

### 9.2 `MedicationWithholdingPeriod`

Tracks the milk-withholding window after medication. Milk produced during this period is automatically flagged "unfit" (per `projectbrief.md` non-negotiable #12).

| Column           | Type             | Constraints                                          | Description                                  |
| ---------------- | ---------------- | ---------------------------------------------------- | -------------------------------------------- |
| `id`             | `UUID`           | PK                                                   |                                              |
| `tenantId`       | `UUID`           | NOT NULL                                             |                                              |
| `animalId`       | `UUID`           | NOT NULL, FK → `animals.id` ON DELETE CASCADE        |                                              |
| `healthEventId`  | `UUID`           | *(nullable)*, FK → `health_events.id`                | The triggering event                         |
| `productName`    | `VARCHAR(120)`   | NOT NULL                                             |                                              |
| `startDate`      | `DATE`           | NOT NULL                                             | Treatment date                               |
| `endDate`        | `DATE`           | NOT NULL                                             | Last day milk is unfit                       |
| `withholdingDays`| `INT`            | NOT NULL                                             | endDate - startDate                          |
| `source`         | `WithholdingSource` | NOT NULL                                          | How the period was determined                |
| `notes`          | `TEXT`           | *(nullable)*                                         |                                              |
| `createdAt`      | `TIMESTAMPTZ`    | NOT NULL, DEFAULT now()                              |                                              |

**Indexes:** PK; composite index on `(animalId, startDate, endDate)`; composite index on `(tenantId, endDate)`.

**Invariants:**

- `endDate ≥ startDate`.
- `withholdingDays = endDate - startDate` (computed at write).
- `source ∈ { CATALOG_LOOKUP, MANUAL_OVERRIDE, VET_PRESCRIBED }`. `CATALOG_LOOKUP` indicates the system found the product in the medication catalog; `MANUAL_OVERRIDE` requires OWNER or VET role and a non-empty `notes`; `VET_PRESCRIBED` is set when `healthEventId.veterinarianId IS NOT NULL`.
- A query helper `isMilkUnfitOnDate(animalId, date)` returns true iff any withholding period satisfies `startDate ≤ date ≤ endDate`.
- The withholding catalog (medication name → days) lives outside the database in a versioned configuration file referenced at write time. Open question #12 in `projectbrief.md` will determine whether this becomes a database table.

### 9.3 `MastitisHistory` (derived view)

Computed read-time aggregation, not a table. For each cow:

```
mastitis_count       = COUNT(HealthEvent WHERE eventType = ILLNESS AND description matches mastitis catalog)
last_mastitis_date   = MAX(HealthEvent.eventDate matching above)
mastitis_risk_score  = mastitis_count tier:
                         0     → LOW
                         1–2   → MODERATE
                         ≥ 3   → HIGH (consider for culling per §1.5 added rule)
```

`HIGH` risk surfaces a "considerar para descarte" indicator on the cow's profile.

---

## 10. Finance Domain

### 10.1 `FinancialTransaction`

A monetary movement attributed to the tenant, optionally to a specific farm and animal.

| Column        | Type                       | Constraints                                          | Description                                |
| ------------- | -------------------------- | ---------------------------------------------------- | ------------------------------------------ |
| `id`          | `UUID`                     | PK                                                   |                                            |
| `tenantId`    | `UUID`                     | NOT NULL                                             |                                            |
| `farmId`      | `UUID`                     | NOT NULL, FK → `farms.id`                            |                                            |
| `type`        | `FinancialTransactionType` | NOT NULL                                             | See [§12.8](#128-financialtransactiontype) |
| `direction`   | `TransactionDirection`     | NOT NULL                                             | `INCOME` or `EXPENSE`                      |
| `amount`      | `DECIMAL(14, 2)`           | NOT NULL                                             | Always positive                            |
| `currency`    | `VARCHAR(3)`               | NOT NULL, DEFAULT `'COP'`                            |                                            |
| `description` | `VARCHAR(500)`             | NOT NULL                                             |                                            |
| `occurredOn`  | `DATE`                     | NOT NULL                                             |                                            |
| `animalId`    | `UUID`                     | *(nullable)*, FK → `animals.id`                      |                                            |
| `metadata`    | `JSONB`                    | NOT NULL, DEFAULT `'{}'`                             |                                            |
| `recordedBy`  | `UUID`                     | NOT NULL, FK → `users.id`                            |                                            |
| `createdAt`   | `TIMESTAMPTZ`              | NOT NULL, DEFAULT now()                              |                                            |

**Indexes:** PK; composite on `(tenantId, occurredOn)`; composite on `(farmId, type)`; composite on `(animalId, type)`.

**Invariants:**

- `amount > 0`.
- `currency` is a valid ISO 4217 code; default `COP`.
- `occurredOn ≤ today`.
- `direction` is derived from `type` at validation time:
  - INCOME types: `ANIMAL_SALE`, `MILK_SALE`, `OTHER_INCOME`.
  - EXPENSE types: `ANIMAL_PURCHASE`, `FEED_PURCHASE`, `MEDICATION_PURCHASE`, `VETERINARY_SERVICE`, `SEMEN_PURCHASE`, `OTHER_EXPENSE`.
- A tenant operates in a single currency in v1.0.
- When `type ∈ { ANIMAL_PURCHASE, ANIMAL_SALE }`, `animalId` should be set.
- **Sale vs. death distinction (per `businessRules.md` §7.2):**
  - `ANIMAL_SALE`: `direction = INCOME`. Triggered when an OWNER sets `Animal.status = SOLD` and provides a sale amount.
  - `ANIMAL_DEATH_LOSS` (added type): `direction = EXPENSE`. Auto-suggested when `Animal.status = DECEASED`, with `amount = animal.estimatedValue` (override permitted). Recorded as `OTHER_EXPENSE` with `metadata.deathLoss = true`.
- Reversals are new transactions with opposite `direction` and a `metadata.reverses` field referencing the original.

### 10.2 `CalfRearingCost`

Aggregated rearing cost per calf from birth to weaning (per added rule). Not a table of individual cost entries — those live in `FinancialTransaction`. This is a denormalized aggregate refreshed nightly.

| Column                | Type             | Constraints                                          | Description                                  |
| --------------------- | ---------------- | ---------------------------------------------------- | -------------------------------------------- |
| `id`                  | `UUID`           | PK                                                   |                                              |
| `tenantId`            | `UUID`           | NOT NULL                                             |                                              |
| `calfId`              | `UUID`           | NOT NULL, UNIQUE, FK → `animals.id` ON DELETE CASCADE |                                             |
| `milkConsumedLiters`  | `DECIMAL(10, 2)` | NOT NULL, DEFAULT 0                                  | Mother's milk consumed by the calf           |
| `milkConsumedValue`   | `DECIMAL(14, 2)` | NOT NULL, DEFAULT 0                                  | Opportunity-cost valuation                   |
| `feedCost`            | `DECIMAL(14, 2)` | NOT NULL, DEFAULT 0                                  | From `FinancialTransaction.FEED_PURCHASE`    |
| `medicationCost`      | `DECIMAL(14, 2)` | NOT NULL, DEFAULT 0                                  | From medication transactions                 |
| `veterinaryCost`      | `DECIMAL(14, 2)` | NOT NULL, DEFAULT 0                                  |                                              |
| `laborEstimateValue`  | `DECIMAL(14, 2)` | NOT NULL, DEFAULT 0                                  | Estimated, configurable per tenant           |
| `totalCost`           | `DECIMAL(14, 2)` | NOT NULL, DEFAULT 0                                  | Sum of components                            |
| `currency`            | `VARCHAR(3)`     | NOT NULL, DEFAULT `'COP'`                            |                                              |
| `lastComputedAt`      | `TIMESTAMPTZ`    | NOT NULL, DEFAULT now()                              |                                              |

**Invariants:**

- One row per calf; UNIQUE on `calfId`.
- All cost components ≥ 0.
- `totalCost = milkConsumedValue + feedCost + medicationCost + veterinaryCost + laborEstimateValue`.
- Computed nightly by a scheduled job; on demand recompute is allowed for OWNER role.
- A calf reaching `CalfStatus = PROMOTED` or `WEANED` freezes its `CalfRearingCost`; subsequent transactions tagged to this animal accrue under adult cost tracking.

---

## 11. Notifications & Audit

### 11.1 `Notification`

In-app and email notifications.

| Column        | Type               | Constraints                                          | Description                                |
| ------------- | ------------------ | ---------------------------------------------------- | ------------------------------------------ |
| `id`          | `UUID`             | PK                                                   |                                            |
| `tenantId`    | `UUID`             | NOT NULL, FK → `tenants.id` ON DELETE CASCADE        |                                            |
| `userId`      | `UUID`             | *(nullable)*                                         | Null = broadcast to all tenant users       |
| `type`        | `NotificationType` | NOT NULL                                             | See [§12.9](#129-notificationtype)         |
| `severity`    | `NotificationSeverity` | NOT NULL, DEFAULT `INFO`                         | INFO / WARNING / URGENT                    |
| `title`       | `VARCHAR(200)`     | NOT NULL                                             |                                            |
| `body`        | `TEXT`             | NOT NULL                                             |                                            |
| `payload`     | `JSONB`            | NOT NULL, DEFAULT `'{}'`                             | Structured data for the UI                 |
| `relatedAnimalId` | `UUID`         | *(nullable)*, FK → `animals.id`                      | For deep-link navigation                   |
| `readAt`      | `TIMESTAMPTZ`      | *(nullable)*                                         |                                            |
| `scheduledAt` | `TIMESTAMPTZ`      | *(nullable)*                                         | If null, deliver immediately               |
| `createdAt`   | `TIMESTAMPTZ`      | NOT NULL, DEFAULT now()                              |                                            |

**Indexes:** PK; composite on `(userId, readAt)`; composite on `(tenantId, type)`; index on `relatedAnimalId`.

**Invariants:**
- `payload` schema depends on `type` and is documented in `features.md`.
- Retention: 90 days, then archived.

### 11.2 `AuditLog`

**Append-only**, immutable record of every critical mutation in the system.

| Column        | Type           | Constraints                                          | Description                                |
| ------------- | -------------- | ---------------------------------------------------- | ------------------------------------------ |
| `id`          | `UUID`         | PK                                                   |                                            |
| `tenantId`    | `UUID`         | NOT NULL, FK → `tenants.id` ON DELETE CASCADE        |                                            |
| `userId`      | `UUID`         | *(nullable)*, FK → `users.id`                        |                                            |
| `action`      | `VARCHAR(80)`  | NOT NULL                                             | `<entity>.<verb>` e.g., `animal.create`    |
| `entityType`  | `VARCHAR(60)`  | NOT NULL                                             |                                            |
| `entityId`    | `UUID`         | *(nullable)*                                         |                                            |
| `oldValues`   | `JSONB`        | *(nullable)*                                         |                                            |
| `newValues`   | `JSONB`        | *(nullable)*                                         |                                            |
| `ipAddress`   | `INET`         | *(nullable)*                                         |                                            |
| `userAgent`   | `VARCHAR(500)` | *(nullable)*                                         |                                            |
| `createdAt`   | `TIMESTAMPTZ`  | NOT NULL, DEFAULT now()                              |                                            |

**Indexes:** PK; composite on `(tenantId, createdAt)`; composite on `(entityType, entityId)`; index on `userId`.

**Invariants:**

- **No `UPDATE` or `DELETE`** is permitted. Application role has `INSERT, SELECT` only.
- `action` follows `<entity>.<verb>`. Verb vocabulary (closed): `create`, `update`, `delete`, `restore`, `confirm`, `cancel`, `login`, `logout`, `mfa_enable`, `mfa_disable`, `mark_bull_candidate`, `unmark_bull_candidate`, `acknowledge_warning`.
- Sensitive fields (`passwordHash`, `mfaSecret`) are redacted to `"***REDACTED***"`.
- Retention: 7 years.

---

## 12. Enumerations

### 12.1 `UserRole`

```
OWNER          - Full access within their tenant.
VETERINARIAN   - Read all animals; write health, pregnancies, semen straws, animal status, bull candidates.
EMPLOYEE       - Read animals; write animals, milk, weights, pregnancies.
AUDITOR        - Read-only, including audit logs and finances.
```

### 12.2 `AnimalSex`

```
MALE
FEMALE
```

### 12.3 `AnimalStatus`

```
ACTIVE         - Operational, available for normal flows.
PREGNANT       - Has a confirmed pregnancy with outcome = PENDING.
DRY            - Lactation paused intentionally; no milk records permitted.
QUARANTINED    - Isolated for health reasons; milk auto-flagged unfit.
SOLD           - Terminal. Generates ANIMAL_SALE income.
DECEASED       - Terminal. Generates ANIMAL_DEATH_LOSS expense.
```

### 12.4 `ConceptionMethod`

```
NATURAL_MATING
ARTIFICIAL_INSEMINATION
EMBRYO_TRANSFER
```

### 12.5 `CalfStatus`

```
NURSING    - Pre-weaning.
WEANED     - Weaned, still in calf phase.
SOLD       - Terminal.
DECEASED   - Terminal.
PROMOTED   - Promoted to adult; CowProfile or BullProfile created.
```

### 12.6 `PregnancyOutcome`

```
PENDING        - In progress.
SUCCESSFUL     - Live birth, calf created.
ABORTION       - Pregnancy lost.
COMPLICATIONS  - Medical complications without successful birth (includes stillbirth).
```

### 12.7 `HealthEventType`

```
VACCINATION
TREATMENT
ILLNESS
CHECKUP
DEWORMING
INJURY
SURGERY
```

### 12.8 `FinancialTransactionType`

Income types:
```
ANIMAL_SALE
MILK_SALE
OTHER_INCOME
```

Expense types:
```
ANIMAL_PURCHASE
FEED_PURCHASE
MEDICATION_PURCHASE
VETERINARY_SERVICE
SEMEN_PURCHASE
OTHER_EXPENSE
```

### 12.9 `NotificationType`

```
UPCOMING_BIRTH                - Estimated birth date approaching (30/15/7 days).
VACCINATION_DUE               - HealthEvent.nextDueDate approaching (7/1/0 days).
HEAT_DETECTION                - Predicted estrus window (5 days).
MASTITIS_RISK                 - High-producer cow without recent milking session.
LACTATION_OVERDUE             - Lactation > 305 days without dry-off.
LOW_PRODUCTION                - Per-cow production drop ≥ 20% off baseline.
INBREEDING_WARNING            - Proposed mating with > 6.25% estimated kinship.
LOW_REPRODUCTIVE_EFFICIENCY   - Cow > 400 days since last birth, no active pregnancy.
LOW_FERTILITY                 - Bull conception rate < 30% with ≥ 10 services.
PRIMIPAROUS_ATTENTION         - Primiparous cow approaching first calving.
WITHHOLDING_ENDED             - Medication withholding period over; milk fit again.
GENERAL                       - System messages, billing, etc.
```

### 12.10 `BullType`

```
LIVE_ON_FARM     - Physically present on the farm.
SEMEN_DONOR      - External; physical bull not on the farm.
```

### 12.11 `MilkingMode`

```
PER_SESSION    - Records individual milking sessions (morning/afternoon/evening) with optional times.
DAILY_TOTAL    - Records a single daily total per cow.
```

### 12.12 `BreedCategory`

```
DAIRY
BEEF
DUAL_PURPOSE
MIXED            - For Mestizo / Cruce catalog entries only.
```

### 12.13 `CrossCategory`

```
PURE             - 100% one breed.
F1               - 50% / 50% (first-generation cross).
F2               - Second-generation cross.
BACKCROSS_75_25  - 75% / 25%.
BACKCROSS_87_13  - 87.5% / 12.5%.
COMPLEX          - Three or more breeds with arbitrary percentages.
UNKNOWN          - Mestizo / Cruce — no known composition.
```

### 12.14 `UnfitMilkReason`

```
QUARANTINED_ANIMAL      - Cow's status is QUARANTINED.
MEDICATION_WITHHOLDING  - Cow is in a withholding period.
COLOSTRUM_PERIOD        - Within 14 days of calving (transition milk).
MASTITIS_ACTIVE         - Active mastitis case ongoing.
OTHER                   - Manually flagged with notes.
```

### 12.15 `WithholdingSource`

```
CATALOG_LOOKUP    - System found the product in the medication catalog.
MANUAL_OVERRIDE   - User entered a custom withholding period.
VET_PRESCRIBED    - Set by a VET when recording the treatment.
```

### 12.16 `SemenType`

```
CONVENTIONAL
SEXED
```

### 12.17 `TransactionDirection`

```
INCOME
EXPENSE
```

### 12.18 `NotificationSeverity`

```
INFO       - Routine, informational.
WARNING    - Attention recommended.
URGENT     - Immediate action required.
```

---

## 13. Cross-Cutting Invariants

These rules apply across multiple entities and are enforced by service-layer logic, validated by integration tests.

### 13.1 Tenant isolation

Every domain query filters by `tenantId`. The `tenantId` is derived from the authenticated user's JWT, never from request input. Violating this rule is a P0 security incident.

### 13.2 Genealogy validity

- Parent must exist in the same tenant.
- Parent must be older than the offspring.
- Parent must have the correct sex.
- An animal must not appear as its own ancestor at any depth.
- **Inbreeding check (added rule):** When registering a new pregnancy, the system computes an estimated kinship coefficient between mother and father using the genealogy CTE up to 4 generations. If the coefficient exceeds **6.25%** (great-grandparents in common), an `INBREEDING_WARNING` notification is created and a soft-warning is shown at registration. The user may proceed with explicit acknowledgement.

### 13.3 Pregnancy lifecycle

- One `PENDING` pregnancy per mother at any time.
- Closing with `SUCCESSFUL` requires creating at least one `CalfProfile` referencing it.
- Closing automatically updates mother's `Animal.status` (`PREGNANT → ACTIVE` or `→ DRY` if `previousStatus = DRY`).
- Mother age ≥ 12 months at conception (hard reject below 9 months).
- Post-partum < 45 days: soft warning on new pregnancy.
- Post-abortion / post-complications: mandatory acknowledgement.
- A new `LactationPeriod` is created on `SUCCESSFUL` outcome.

### 13.4 Production validity

- A cow producing milk must be female and ≥ 18 months old at the production date.
- One milk record per cow per date (uniqueness enforced).
- `dailyTotalLiters` is always computed; never trusted from input.
- `DRY` cows are blocked; `QUARANTINED` cows produce auto-unfit milk; medication withholding produces auto-unfit milk.
- Lactation length warning at > 305 days.
- Mastitis-risk alert for high-producers without recent session (14–16 hours).
- Lactation-curve anomaly: 3-day moving average drop > 20% off baseline.

### 13.5 Money rules

- All monetary values use `DECIMAL`. No floats. Ever.
- Amounts are positive; direction lives in `direction`/`type`.
- All transactions of a tenant share a single currency in v1.0. Default `COP`.
- `ANIMAL_SALE` is income; animal death is recorded as `OTHER_EXPENSE` with `metadata.deathLoss = true`.

### 13.6 Soft-delete & terminal states

- An animal in a terminal state (`SOLD`, `DECEASED`) is excluded from operational lists by default but remains queryable.
- Inactive users cannot authenticate; tokens revoked.
- Inactive tenants block all logins.

### 13.7 Time consistency

- All `*At` timestamps stored in UTC.
- All `*Date` columns are local-calendar dates with no timezone applied.
- The frontend converts to the **farm's** configured timezone (default `America/Bogota`).

### 13.8 PII protection

- `passwordHash`, `mfaSecret`, raw refresh tokens never returned, never logged, redacted in audit.
- Email addresses must not appear in logs at WARN level or below.

### 13.9 Breed composition integrity

- Every `Animal` has at least one `BreedComposition` row.
- Sum of `BreedComposition.percentage` per `animalId` = exactly 100.00.
- Calf composition is auto-computed at birth (50/50 weighted average of parents); user may override.

### 13.10 Withholding inviolability

- Milk produced during a `MedicationWithholdingPeriod` is **automatically** flagged unfit.
- The UI exposes **no override**.
- Even OWNER cannot mark such milk fit retroactively.

### 13.11 Domain-rule traceability

- Every soft-warning shown to a user is logged with `acknowledged_by`, `acknowledged_at` in the affected entity's `metadata` and emitted as an `AuditLog` entry with `action = '<entity>.acknowledge_warning'`.

---

## 14. Indexing Strategy

The system optimizes for these access patterns:

| Pattern                                              | Required indexes                                              |
| ---------------------------------------------------- | ------------------------------------------------------------- |
| Authenticate user by tenant + email                  | UNIQUE `(tenantId, email)` on `users`                         |
| List animals of a tenant with filters                | Indexes on `tenantId`, `farmId`, `status`, `(tenantId, status)` on `animals` |
| Find an animal by ear tag                            | UNIQUE `(tenantId, earTagNumber)` on `animals`                |
| Walk genealogy upward                                | Indexes on `motherId`, `fatherId` on `animals`                |
| Daily milk for a cow                                 | UNIQUE `(animalId, productionDate)` on `milk_production_records` |
| Tenant-wide milk reports                             | Composite `(tenantId, productionDate)` on `milk_production_records` |
| Commercial-yield reports                             | Composite `(farmId, productionDate, isFitForCommercial)`      |
| Animal health timeline                               | Composite `(animalId, eventDate)` on `health_events`          |
| Upcoming due events                                  | Composite `(tenantId, nextDueDate)` on `health_events`        |
| Withholding window check for a cow on a date         | Composite `(animalId, startDate, endDate)` on `medication_withholding_periods` |
| User's unread notifications                          | Composite `(userId, readAt)` on `notifications`               |
| Audit lookup by entity                               | Composite `(entityType, entityId)` on `audit_logs`            |
| Audit lookup by tenant + time                        | Composite `(tenantId, createdAt)` on `audit_logs`             |
| Active pregnancy uniqueness                          | Partial UNIQUE on `pregnancies("motherId") WHERE outcome = 'PENDING'` |
| Open lactation uniqueness                            | Partial UNIQUE on `lactation_periods("cowId") WHERE "dryOffDate" IS NULL` |
| Semen straw lookup by code                           | UNIQUE `(tenantId, registrationCode)` on `semen_straws`       |
| Breed composition per animal                         | UNIQUE `(animalId, breedId)` on `breed_compositions`          |

**Performance rule:** any new query on a high-cardinality column without an index is rejected in code review. EXPLAIN ANALYZE is reviewed for any query expected to run more than 100 times per minute.

---

## 15. Soft Deletion & Lifecycle Rules

The system **does not hard-delete domain data** under normal operation.

### 15.1 Soft-delete patterns by entity

| Entity                          | Soft-delete mechanism                                   |
| ------------------------------- | ------------------------------------------------------- |
| `Tenant`                        | `isActive = false`                                      |
| `User`                          | `isActive = false` + revoke all refresh tokens          |
| `Farm`                          | `isActive = false`                                      |
| `Animal`                        | `status ∈ { SOLD, DECEASED }` + `exitDate` set          |
| `RefreshToken`                  | `revokedAt` set                                         |
| `Pregnancy`                     | Outcome moves out of `PENDING`                          |
| `MilkProductionRecord`          | Append-only; corrections are new records                |
| `HealthEvent`                   | Append-only                                             |
| `WeightRecord`                  | Append-only                                             |
| `FinancialTransaction`          | Append-only; reversals are new transactions             |
| `MedicationWithholdingPeriod`   | Append-only                                             |
| `LactationPeriod`               | Closed via `dryOffDate`                                 |
| `SemenStraw`                    | `quantityAvailable = 0` + `isUsable = false`            |
| `BreedComposition`              | Updated via full replacement in a transaction           |
| `AuditLog`                      | Permanent. No deletion path.                            |

### 15.2 Cascade rules

`ON DELETE CASCADE` is configured only where the parent entity controls the child's existence:

- `tenants → users, farms, notifications, audit_logs`
- `users → refresh_tokens, farm_user_assignments`
- `animals → cow_profiles, bull_profiles, calf_profiles, breed_compositions, weight_records, animal_photos, milk_production_records, health_events, medication_withholding_periods, lactation_periods, calf_rearing_costs`
- `farms → farm_user_assignments`

For all other relationships, `ON DELETE` is `RESTRICT` or `SET NULL` to preserve history.

---

## 16. Optimistic Concurrency Control

Entities that support concurrent edits carry a `version` integer column.

Pattern:

1. Client reads → receives `version: 5`.
2. Client submits update with `version: 5`.
3. Server `UPDATE … SET version = version + 1 WHERE id = ? AND version = 5`.
4. If `affected_rows = 0`, server returns `409 Conflict` with code `OPTIMISTIC_LOCK_CONFLICT`.

Entities currently using optimistic locking:

- `Animal`
- `Pregnancy`
- `SemenStraw`
- `LactationPeriod`

Entities that **do not** use optimistic locking (append-only or single-actor):

- `WeightRecord`, `MilkProductionRecord`, `HealthEvent`, `FinancialTransaction`, `MedicationWithholdingPeriod`, `AuditLog`, `RefreshToken`, `Notification`, `BreedComposition`, `CalfRearingCost`.

---

## 17. Data Retention & Privacy

### 17.1 Retention periods

| Data                   | Retention                                                 |
| ---------------------- | --------------------------------------------------------- |
| Active tenant data     | While `isActive = true`                                   |
| Inactive tenant data   | 90 days post-deactivation (export window), then archived  |
| Refresh tokens         | 90 days post-revocation                                   |
| Audit logs             | 7 years (regulatory baseline)                             |
| Notifications          | 90 days                                                   |
| Soft-deleted users     | 90 days, then anonymized                                  |

### 17.2 Right to data export

- Available at any time to the OWNER via the platform.
- ZIP archive: JSON files per entity + manifest.
- Includes everything except other tenants' data.

### 17.3 Right to deletion

- Triggered by an owner request through a verified channel (per Colombian Ley 1581).
- Hard-deletion cascades from the tenant.
- `AuditLog` entries retained but anonymized: `userId = NULL`, sensitive fields redacted.

---

## 18. Migration Policy

### 18.1 Source of truth

`schema.prisma` is the executable source of truth. This document is its specification: every field defined here must exist in `schema.prisma`, and every field in `schema.prisma` must be documented here. **In domain matters, `businessRules.md` overrides this document.**

### 18.2 Adding a column

1. Update this document first — entity table + invariants + index strategy.
2. Update `schema.prisma`.
3. `pnpm prisma migrate dev --name <descriptive-name>`.
4. Review generated SQL.
5. Add or update integration tests.

### 18.3 Modifying a column

- Type changes require a multi-step migration (add new column, backfill, dual-write, switch reads, drop old). Single-step changes forbidden in production.
- Adding constraints requires backfill scripts validated against staging.
- Renaming is multi-step with both names coexisting until all readers update.

### 18.4 Removing data

- Removing a column requires a deprecation period of at least one full release cycle.
- Dropped columns are first excluded from API responses for that period.

### 18.5 Migration safety

- Migrations run in a transaction unless `CONCURRENTLY` is required.
- Migrations run on deploy via `prisma migrate deploy` after CI passes.
- Every migration has a tested down-migration or documented manual rollback.

---

## Document Maintenance

This document is the contract between product, design, and engineering for what the system **knows** about the world.

- **In domain matters** (cattle biology, breeding rules, lactation, withholding, etc.), `businessRules.md` is the authority.
- **In structural matters** (column names, indexes, cascade rules, lifecycle), this document is the authority.

When this document and code disagree, this document is updated first, then code is aligned.

Substantive changes (new entity, new invariant, type change) require a PR titled `docs(data-model): <short description>` with reviewers from backend, architecture, and (for domain rules) the veterinary advisor.
