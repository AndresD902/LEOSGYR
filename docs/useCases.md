# Use Cases — CattlePro

> **Status:** Draft v1.0
> **Last updated:** 2026-05-02
> **Owner:** Product & Engineering
>
> This document describes **who does what in the system, organized by role**. Where `features.md` describes *what each capability does* one feature at a time, this document describes *how a real person uses the system* — which capabilities they invoke, in which order, with what triggers and outcomes.
>
> The use cases here directly inform the **RBAC implementation** in `RolesGuard` and the navigation structure of the UI. Every use case maps to one or more features in `features.md` and to specific permissions in the matrix in `projectbrief.md` §11.1.

---

## Table of Contents

1. [Conventions](#1-conventions)
2. [Actor Catalog](#2-actor-catalog)
3. [Use Cases — OWNER](#3-use-cases--owner)
4. [Use Cases — VETERINARIAN](#4-use-cases--veterinarian)
5. [Use Cases — EMPLOYEE](#5-use-cases--employee)
6. [Use Cases — AUDITOR](#6-use-cases--auditor)
7. [Cross-Role Scenarios](#7-cross-role-scenarios)
8. [Permission Summary](#8-permission-summary)

---

## 1. Conventions

### 1.1 Use case template

Each use case follows the same structure:

- **ID:** `UC.<ROLE>.<NUMBER>` (e.g., `UC.OWNER.05`).
- **Name:** short imperative phrase.
- **Goal:** what the actor wants to achieve.
- **Primary actor:** the role driving the flow.
- **Secondary actors:** other roles or system jobs involved.
- **Preconditions:** state that must be true before the flow starts.
- **Trigger:** what initiates the use case.
- **Main flow:** numbered steps of the happy path.
- **Alternative flows:** numbered branches for edge cases or errors.
- **Postconditions:** state guaranteed to be true after success.
- **Features used:** references to `features.md` features.
- **Frequency:** rough estimate (daily / weekly / monthly / occasional).

### 1.2 What this document is *not*

- **Not a feature catalog.** That is `features.md`.
- **Not a requirements list.** That is `projectbrief.md`.
- **Not a UX specification.** That comes later, per use case, when the design phase begins.
- **Not exhaustive.** It covers the high-value flows that drive 90% of daily usage. Edge cases that exist only in features are not duplicated here.

### 1.3 Role abbreviations

| Abbrev | Full name      |
| ------ | -------------- |
| O      | OWNER          |
| V      | VETERINARIAN   |
| E      | EMPLOYEE       |
| A      | AUDITOR        |

### 1.4 Notation for steps

- **System** = the CattlePro backend + frontend.
- Steps that mention a feature use the format `(→ FEATURE.ID)`.
- A step like *"System emits notification X"* refers to `NOTIFICATIONS.03` background dispatching.

---

## 2. Actor Catalog

The four roles, mapped to the personas in `productContext.md`:

| Role           | Persona               | Typical user                                                                   |
| -------------- | --------------------- | ------------------------------------------------------------------------------ |
| `OWNER`        | Farm Owner-Operator   | Maria, who owns a 90-head dairy farm in Antioquia and runs day-to-day decisions |
| `VETERINARIAN` | Field Veterinarian    | Dr. Ramírez, who services 8 farms across the region and visits each 1–4 times/month |
| `EMPLOYEE`     | Farm Employee         | Luis, who handles morning milking and weighs calves under Maria's instruction  |
| `AUDITOR`      | Auditor / Accountant  | Sandra, the external accountant who prepares the farm's tax filings annually   |

Each role's permission set is the authoritative matrix in `projectbrief.md` §11.1. This document elaborates *how those permissions are exercised in practice*.

---

## 3. Use Cases — OWNER

The OWNER has the broadest access: full read and write on the operational, financial, and administrative surfaces of their tenant.

---

### UC.OWNER.01 — Sign up and create the farm

| | |
| --- | --- |
| **Goal** | Get from "I heard about CattlePro" to a working tenant with a registered farm. |
| **Primary actor** | OWNER (becoming one) |
| **Preconditions** | The user has an email and a password they can remember. |
| **Trigger** | The user clicks "Crear cuenta" on the marketing site. |

**Main flow:**

1. The user fills in tenant name, slug, owner full name, email, and password.
2. The user accepts the terms and Ley 1581 data-processing notice.
3. The system creates the tenant and OWNER user (→ `AUTH.01`).
4. The system sends a verification email; the user clicks the link and verifies.
5. The system redirects to the onboarding wizard:
   - Step A: create the first farm — name, location, capacity, milking mode, timezone (→ `FARMS.01`).
   - Step B: optional: register the first 1–3 animals to seed the dashboard (→ `ANIMALS.01`).
6. The user lands on the dashboard with a guided tour overlay.

**Alternative flows:**

- *3a. Slug already taken:* the system prompts a different slug; the user retries.
- *4a. Email never verified within 24 h:* the user can request a resend; the account remains usable but flagged "verifica tu email" in the UI.
- *5b. User skips animal registration:* the dashboard shows an empty state with a clear "Registrar tu primer animal" CTA.

**Postconditions:**

- One `Tenant` exists with `defaultCurrency = 'COP'` and `defaultTimezone = 'America/Bogota'`.
- One `User` with `role = OWNER`, `isActive = true`.
- One `Farm` linked to the user as `ownerId`.

**Features used:** `AUTH.01`, `FARMS.01`, optionally `ANIMALS.01`.

**Frequency:** once per tenant.

---

### UC.OWNER.02 — Log in daily

| | |
| --- | --- |
| **Goal** | Access the system to start the working day. |
| **Trigger** | Opening the app on phone or laptop. |

**Main flow:**

1. The user lands on the login page (or the app remembers them via a refresh token).
2. The user enters email + password (and TOTP if MFA is enabled).
3. The system issues access + refresh tokens (→ `AUTH.02`).
4. The user lands on the OWNER dashboard (→ `DASHBOARD.01`).

**Alternative flows:**

- *2a. Wrong password 5 times:* account locks for 15 minutes.
- *2b. Forgot password:* the user clicks "Olvidé mi contraseña" → `AUTH.08` → `AUTH.09`.
- *2c. MFA code wrong:* counts as a failed login.

**Postconditions:** Active session; refresh token cookie set.

**Frequency:** daily, often multiple times.

---

### UC.OWNER.03 — Review the morning dashboard

| | |
| --- | --- |
| **Goal** | Understand the state of the farm before starting daily decisions. |
| **Trigger** | Just logged in, or app opened mid-day. |

**Main flow:**

1. The OWNER lands on the dashboard (→ `DASHBOARD.01`).
2. The OWNER scans:
   - Today's milking session in progress (if applicable).
   - Active alerts: mastitis-risk, low-production cows, withholding endings.
   - Upcoming events in the next 7 days: births, vaccinations, heats.
   - Yesterday vs. today milk total trend.
   - Active pregnancies count and the next 3 expected births.
3. The OWNER taps any tile to drill in.

**Alternative flows:**

- *2a. Mastitis-risk alert is shown:* the OWNER opens it, sees the cow, decides to call the vet or check the cow personally.
- *2b. Low-production alert (>20% drop):* the OWNER opens the cow's profile to inspect.
- *2c. No alerts:* the dashboard shows a calm state — the OWNER continues to the herd view.

**Postconditions:** None — read-only flow.

**Features used:** `DASHBOARD.01`, `NOTIFICATIONS.01`.

**Frequency:** multiple times per day.

---

### UC.OWNER.04 — Register a new animal (purchased)

| | |
| --- | --- |
| **Goal** | Add a newly bought cow to the herd with full information. |
| **Preconditions** | The animal is physically on the farm and has a readable ear tag. |
| **Trigger** | The OWNER buys a cow at a livestock fair. |

**Main flow:**

1. The OWNER opens the herd view → "+ Nuevo animal".
2. Fills required fields: ear tag, sex, breed composition (single breed at 100% if pure), birth date.
3. Optional: name, photo, parents (selectable from existing animals or skipped if unknown), acquisition date and cost (records a `FinancialTransaction` of type `ANIMAL_PURCHASE` automatically).
4. The system validates parentage and breed-percentage rules (→ `ANIMALS.01`).
5. The animal appears in the herd list. The system creates the appropriate profile (Cow / Bull / Calf) based on age and sex.

**Alternative flows:**

- *2a. Mixed breed:* the OWNER taps "Cruce" and adjusts percentages with sliders that auto-validate the sum-to-100 rule.
- *2b. Ear tag already used:* the system blocks with `ANIMALS.EAR_TAG_REUSE_FORBIDDEN` and suggests a different one.
- *4a. Mother ID provided but mother is not female:* the system blocks with `ANIMALS.PARENT_WRONG_SEX`.

**Postconditions:**

- One `Animal` row with `status = ACTIVE`.
- One profile row (`CowProfile` / `BullProfile` / `CalfProfile`).
- One or more `BreedComposition` rows summing to 100.00.
- Optionally one `FinancialTransaction` of type `ANIMAL_PURCHASE`.

**Features used:** `ANIMALS.01`, `FINANCE.01` (optional).

**Frequency:** weekly (varies by farm growth).

---

### UC.OWNER.05 — Inspect an animal's full profile

| | |
| --- | --- |
| **Goal** | See everything about a specific cow — production, reproduction, health, genealogy, finances. |
| **Trigger** | A buyer asks about a specific cow, or a vet calls about her, or the OWNER notices something unusual. |

**Main flow:**

1. From the herd view, the OWNER searches by ear tag or name (→ `CROSS.07`).
2. Taps the result. The animal detail page loads.
3. The OWNER navigates tabs: Overview / Production / Reproduction / Health / Genealogy / Photos / Finance / Notes.
4. The OWNER may take action from the profile:
   - Generate a profile PDF for the buyer (→ `REPORTS.01`).
   - Add a photo (→ `ANIMALS.09`).
   - Record a weight (→ `ANIMALS.08`).
   - Edit metadata (→ `ANIMALS.05`).

**Postconditions:** None for read; mutations follow their own postconditions.

**Features used:** `ANIMALS.03`, `REPORTS.01`, `ANIMALS.08`, `ANIMALS.09`, `ANIMALS.05`.

**Frequency:** several times per week.

---

### UC.OWNER.06 — Change an animal's status

| | |
| --- | --- |
| **Goal** | Move an animal between operational states (e.g., to `DRY` before parturition, to `QUARANTINED` due to suspected illness, to `SOLD` after a sale). |
| **Trigger** | An operational decision has been made. |

**Main flow:**

1. From the animal detail, the OWNER taps "Cambiar estado".
2. The system shows the allowed transitions for the current status (per `dataModel.md` §6.1).
3. The OWNER picks the new status and provides any required fields:
   - To `DRY` → `effectiveDate` (defaults to today).
   - To `QUARANTINED` → `reason`.
   - To `SOLD` → sale amount → triggers `FinancialTransaction` of type `ANIMAL_SALE`.
   - To `DECEASED` → `exitReason` → auto-suggests `OTHER_EXPENSE` of `metadata.deathLoss = true` with `amount = estimatedValue` (override permitted).
4. The system performs the transition (→ `ANIMALS.06`).

**Alternative flows:**

- *3a. The OWNER picks `DRY` (without VETERINARIAN role):* the system shows the recommendation *"Se recomienda confirmar este cambio con el veterinario antes de proceder."* The OWNER can dismiss and proceed; the recommendation is logged.
- *3b. The OWNER picks `SOLD` but does not provide a sale amount:* the system blocks with `ANIMALS.SOLD_REQUIRES_SALE_TX`.
- *3c. Trying to transition out of a terminal state (`SOLD` or `DECEASED`):* not possible; the dropdown excludes such options.

**Postconditions:**

- `Animal.status` updated; `previousStatus` captured for return-to-status logic.
- Audit log entry `animal.status_change`.
- For `SOLD` / `DECEASED`: `FinancialTransaction` created.
- For `DRY`: open `LactationPeriod.dryOffDate` set to the effective date.

**Features used:** `ANIMALS.06`, `FINANCE.01`, `LACTATION.02` (when going to `DRY`).

**Frequency:** weekly.

---

### UC.OWNER.07 — Review and act on alerts

| | |
| --- | --- |
| **Goal** | Stay on top of automatic system alerts (mastitis-risk, low production, vaccinations due, upcoming births, withholding ending). |
| **Trigger** | A notification arrives in-app or via email; or the OWNER opens the notifications panel. |

**Main flow:**

1. The OWNER opens the notifications panel from the dashboard or app shell.
2. The system shows unread notifications grouped by severity (→ `NOTIFICATIONS.01`).
3. The OWNER taps one. The system navigates to the relevant entity (animal, lactation period, etc.).
4. The OWNER takes corrective action — usually one of:
   - Call the vet (no system action).
   - Record a milk session that was missed (→ `PRODUCTION.01`).
   - Mark a vaccination as completed (→ `HEALTH.01`).
   - Dry off a cow (→ `LACTATION.02`).
5. The OWNER marks the notification as read (→ `NOTIFICATIONS.02`).

**Postconditions:** Notifications read; corrective actions recorded.

**Features used:** `NOTIFICATIONS.01`, `NOTIFICATIONS.02`, varies by action.

**Frequency:** several times per day.

---

### UC.OWNER.08 — Sell a cow to a buyer

| | |
| --- | --- |
| **Goal** | Document the sale, hand off a professional report, transition the animal to `SOLD`, and record the income. |
| **Trigger** | A buyer agrees to purchase a specific cow at an agreed price. |

**Main flow:**

1. Before the buyer arrives, the OWNER opens the cow's profile (→ `UC.OWNER.05`).
2. Taps "Generar reporte PDF" (→ `REPORTS.01`). The system produces the PDF, emails it, and links it in-app.
3. The OWNER shares the PDF with the buyer (email, WhatsApp, etc.).
4. After agreement, the OWNER changes the cow's status to `SOLD` (→ `UC.OWNER.06`).
5. The system requires the sale amount; the OWNER enters it. A `FinancialTransaction` of type `ANIMAL_SALE` is created.
6. The OWNER closes the deal physically; the system reflects the cow with `status = SOLD`, `exitDate = today`.

**Postconditions:**

- `Animal.status = SOLD`, `exitDate` set.
- `FinancialTransaction` of `ANIMAL_SALE` recorded.
- The cow remains queryable for genealogy and history.

**Features used:** `REPORTS.01`, `ANIMALS.06`, `FINANCE.01`.

**Frequency:** monthly, varies by herd dynamics.

---

### UC.OWNER.09 — Mark a male calf as a future bull

| | |
| --- | --- |
| **Goal** | Flag a calf the OWNER is considering keeping as a breeding bull, increasing his estimated value. |
| **Trigger** | The OWNER notices a calf with strong physical traits, or the vet recommends him after an inspection. |

**Main flow:**

1. The OWNER opens the calf's profile.
2. Taps "Marcar como candidato a padrote" (→ `ANIMALS.07`).
3. Optional: writes notes explaining why ("Buen tamaño, padre 100% Brahman, madre alta producción").
4. The system records `isBullCandidate = true`, marks `bullCandidateMarkedAt`, `bullCandidateMarkedBy`.
5. The system recomputes the calf's estimated value with the bull-candidate premium (default +20%, configurable per farm).

**Alternative flows:**

- *2a. The animal is not a male calf:* the system blocks with `ANIMALS.NOT_MALE_CALF`.
- *6a. The OWNER changes their mind later:* unmark via the same screen (→ `ANIMALS.07` with `isBullCandidate = false`).

**Postconditions:**

- `CalfProfile.isBullCandidate = true`.
- Audit log entry `calf.mark_bull_candidate`.
- Profile reflects the increased estimated value.

**Features used:** `ANIMALS.07`, `ANIMALS.11` (value recomputation).

**Frequency:** occasional, per calf at the right age.

---

### UC.OWNER.10 — Decide on breeding (and avoid inbreeding)

| | |
| --- | --- |
| **Goal** | Pick the right bull or semen straw for a cow ready to breed, while avoiding inbreeding. |
| **Trigger** | A heat detection alert fires for a specific cow, or the OWNER plans the breeding season. |

**Main flow:**

1. The OWNER opens the cow's reproduction tab.
2. Reviews the cow's status, last calving date, lactation history, breed composition.
3. Taps "Planificar monta" or proceeds directly to register the pregnancy.
4. Picks the conception method: natural mating or AI.
   - *Natural:* selects the bull from the farm's bulls.
   - *AI:* selects a semen straw from the inventory (→ `STRAWS.02` for browsing, then references the chosen straw).
5. The system computes the kinship coefficient between mother and father (→ `GENEALOGY.03`).
6. If kinship > 6.25%, the system shows a soft warning *"Riesgo de consanguinidad elevado. Considere otro toro / pajilla."* The OWNER can proceed with explicit acknowledgement.
7. The pregnancy is registered (→ `REPRODUCTION.01`); the cow's status becomes `PREGNANT`.

**Alternative flows:**

- *6a. The OWNER chooses to abort the breeding decision:* picks a different bull/straw, returns to step 4.
- *7a. Mother had a recent abortion or complications:* the system requires explicit acknowledgement of the post-adverse-event warning.

**Postconditions:**

- `Pregnancy` row with `outcome = PENDING`, `estimatedBirthDate = conceptionDate + 281 days`.
- Cow's status: `PREGNANT`.
- If a straw was used: `SemenStraw.quantityAvailable -= 1`.
- Bull's `BullProfile.totalMatings += 1`.

**Features used:** `STRAWS.02`, `GENEALOGY.03`, `REPRODUCTION.01`.

**Frequency:** weekly during breeding season; otherwise monthly.

---

### UC.OWNER.11 — Manage the semen straw inventory

| | |
| --- | --- |
| **Goal** | Keep the nitrogen tank's contents accurately catalogued so the right straws are used at the right times. |
| **Trigger** | New straws arrive, or the OWNER does a quarterly inventory check. |

**Main flow:**

1. The OWNER opens the "Pajillas" module.
2. To add a new entry: taps "+ Nueva pajilla" → fills donor bull name, breed, registration code, production center, semen type, price, quantity, optional pedigree and tank color (→ `STRAWS.01`).
3. To restock an existing entry: opens the entry → "Recibir más" → enters new quantity received (→ `STRAWS.05`).
4. To inspect: opens any entry to see total used, success rate, linked pregnancies (→ `STRAWS.07`).

**Alternative flows:**

- *Cold-chain breach happened:* the OWNER opens the affected entry → "Marcar como inutilizable" → provides reason → `isUsable = false` (→ `STRAWS.04`).
- *Inventory audit reveals discrepancy:* the OWNER taps "Ajustar cantidad" with a mandatory reason (→ `STRAWS.06`). Heavily audited.

**Postconditions:** Inventory reflects reality.

**Features used:** `STRAWS.01`, `STRAWS.04`, `STRAWS.05`, `STRAWS.06`, `STRAWS.07`.

**Frequency:** weekly to monthly.

---

### UC.OWNER.12 — Record a financial transaction

| | |
| --- | --- |
| **Goal** | Capture an income or expense for the farm. |
| **Trigger** | A milk payment is received, a feed bill is paid, a vet service is invoiced, etc. |

**Main flow:**

1. The OWNER opens the Finance module → "+ Nueva transacción".
2. Selects the type (e.g., `MILK_SALE`, `FEED_PURCHASE`, `VETERINARY_SERVICE`).
3. Enters amount in COP (or the farm's configured currency), description, date, and optional `animalId` if it ties to a specific animal.
4. Saves (→ `FINANCE.01`).

**Alternative flows:**

- *3a. Animal sale or purchase:* the system suggests linking to a specific animal.
- *4a. Wrong amount entered later:* the OWNER reverses the transaction (→ `FINANCE.03`); a compensating transaction is created. The original is preserved.

**Postconditions:** New `FinancialTransaction` with computed `direction`.

**Features used:** `FINANCE.01`, `FINANCE.03`.

**Frequency:** several times per week.

---

### UC.OWNER.13 — Run a profitability report

| | |
| --- | --- |
| **Goal** | Understand which animals are profitable, where money is going, and how the month compares to last month. |
| **Trigger** | Monthly review, or before a major decision (selling, buying, expanding). |

**Main flow:**

1. The OWNER opens Finance → "Reportes" → "Rentabilidad".
2. Selects period (last month, last quarter, last year, custom range), grouping (by month, by animal, by farm).
3. The system computes income, expense, net per group (→ `FINANCE.04`).
4. The OWNER drills into specific animals: "¿Cuál vaca es la más rentable?", "¿Cuál cuesta más de lo que produce?".
5. Optional: exports the report to PDF or Excel (→ `REPORTS.04`).

**Postconditions:** None — read-only.

**Features used:** `FINANCE.04`, `FINANCE.05`, `REPORTS.04`.

**Frequency:** monthly.

---

### UC.OWNER.14 — Invite an employee or vet to the platform

| | |
| --- | --- |
| **Goal** | Give a new team member access to the system. |
| **Trigger** | A new hire, or signing on a vet to the platform. |

**Main flow:**

1. The OWNER opens "Usuarios" → "+ Invitar".
2. Enters email, full name, role (`VETERINARIAN`, `EMPLOYEE`, `AUDITOR`).
3. The system sends an invitation email with a 24-hour acceptance link (→ `USERS.02`).
4. If the invitee is a VET or EMPLOYEE, the OWNER also assigns them to specific farms (→ `FARMS.04`).
5. The invitee accepts, sets a password, optionally enables MFA (→ `USERS.03`).

**Alternative flows:**

- *3a. Invitee email already exists in this tenant:* the system blocks with `USERS.EMAIL_TAKEN_IN_TENANT`.
- *5a. Invitee never accepts within 24h:* the OWNER reinvites.

**Postconditions:**

- `User` row with `isActive = true`, `emailVerifiedAt` set.
- For VET/EMPLOYEE: one or more `FarmUserAssignment` rows.

**Features used:** `USERS.02`, `FARMS.04`, `USERS.03`.

**Frequency:** rare, but happens during team changes.

---

### UC.OWNER.15 — Configure farm settings

| | |
| --- | --- |
| **Goal** | Adjust farm-specific defaults like high-production threshold for mastitis alerts, milk price per liter, or the bull-candidate premium. |
| **Trigger** | The OWNER realizes a default doesn't fit their operation. |

**Main flow:**

1. The OWNER opens Farms → selects a farm → "Configuración".
2. Adjusts settings stored in `Farm.metadata` (→ `FARMS.06`):
   - High-production threshold (default 15 L).
   - Mastitis gap hours (default 14).
   - Lactation standard days (default 305).
   - Calostrum window days (default 14).
   - Inbreeding warning threshold (default 6.25%).
   - Bull-candidate premium (default 20%).
   - Milk price per liter.
   - Calf daily milk consumption estimate (default 4 L).
   - First milking session hour range (default 4–6 AM).
3. Saves; future computations use the new values.

**Alternative flows:**

- *Switching milking mode mid-life:* if the farm has milk records, the system blocks (`FARMS.MILKING_MODE_LOCKED`). The OWNER must contact support for migration.
- *Switching currency:* if the farm has financial transactions, the system blocks (`FARMS.CURRENCY_LOCKED`).

**Postconditions:** Updated `Farm.metadata`; future computations reflect the change.

**Features used:** `FARMS.06`.

**Frequency:** rare; once at onboarding, occasionally for tuning.

---

### UC.OWNER.16 — Export all farm data (right to portability)

| | |
| --- | --- |
| **Goal** | Get a complete copy of the tenant's data, in compliance with Ley 1581 and `projectbrief.md` non-negotiable #7. |
| **Trigger** | Migration to another platform, regulatory request, or just owner curiosity. |

**Main flow:**

1. The OWNER opens "Configuración" → "Exportar todos los datos".
2. Confirms the request.
3. The system queues a background job (→ `REPORTS.05`).
4. When the archive is ready (typically minutes), the OWNER receives an email and an in-app notification with a presigned download link (TTL 24 h).
5. The OWNER downloads the ZIP archive containing JSON files per entity + manifest.

**Postconditions:** Audit log entry `tenant.data_export`. Archive available for 24 h.

**Features used:** `REPORTS.05`.

**Frequency:** rare.

---

### UC.OWNER.17 — Review the audit log

| | |
| --- | --- |
| **Goal** | Verify who made what changes and when. |
| **Trigger** | A discrepancy is noticed (e.g., a value changed unexpectedly), or a periodic compliance check. |

**Main flow:**

1. The OWNER opens "Configuración" → "Historial de cambios".
2. Filters by entity type, entity ID, user, action, date range (→ `AUDIT.01`).
3. Inspects entries; opens detail to see old vs. new values (→ `AUDIT.02`).

**Postconditions:** None — read-only.

**Features used:** `AUDIT.01`, `AUDIT.02`.

**Frequency:** monthly to quarterly.

---

## 4. Use Cases — VETERINARIAN

The VET has read-all access on animals and write access on health, reproduction, semen straws, and animal status. The VET typically services multiple farms and switches contexts often.

---

### UC.VET.01 — Switch between farms

| | |
| --- | --- |
| **Goal** | Move between the multiple farms the vet services. |
| **Trigger** | Visiting a different farm, or reviewing a remote case. |

**Main flow:**

1. After logging in, the VET sees a farm switcher in the dashboard header.
2. The system lists farms the VET has `FarmUserAssignment` rows for.
3. The VET picks a farm; the system scopes all subsequent views to that farm.

**Postconditions:** Active farm context.

**Features used:** `FARMS.02`.

**Frequency:** several times per day for active vets.

---

### UC.VET.02 — Review an animal before a visit

| | |
| --- | --- |
| **Goal** | Walk into the farm with full context on the animals to inspect. |
| **Trigger** | The VET drives to the farm; uses time on the road or upon arrival to prep. |

**Main flow:**

1. The VET opens the farm's herd view.
2. Filters by criteria relevant to the visit (e.g., `hasActivePregnancy = true` for pregnancy checks, `mastitisRiskTier = HIGH` for mastitis follow-ups).
3. Opens each relevant animal's profile, focusing on the Health and Reproduction tabs.
4. Notes anything that needs in-person verification.

**Postconditions:** None — read-only.

**Features used:** `ANIMALS.02`, `ANIMALS.03`, `HEALTH.02`.

**Frequency:** before each farm visit.

---

### UC.VET.03 — Confirm a pregnancy

| | |
| --- | --- |
| **Goal** | Officially confirm a pregnancy that the OWNER or EMPLOYEE registered speculatively. |
| **Trigger** | The VET performs an ultrasound or palpation that confirms gestation. |

**Main flow:**

1. The VET opens the cow's reproduction tab.
2. Sees the active `Pregnancy` with `confirmedAt = null`.
3. Taps "Confirmar preñez" → enters confirmation date (default today) → saves (→ `REPRODUCTION.02`).

**Alternative flows:**

- *2a. No active pregnancy exists, but the cow is pregnant:* the VET registers a new pregnancy directly (→ `UC.VET.04`).
- *2b. Pregnancy was registered with the wrong date or wrong father:* the VET cancels it as a correction (→ `REPRODUCTION.04`) and registers a new one with the right data.

**Postconditions:** `Pregnancy.confirmedAt` set.

**Features used:** `REPRODUCTION.02`.

**Frequency:** weekly.

---

### UC.VET.04 — Register a pregnancy on the spot

| | |
| --- | --- |
| **Goal** | Capture a confirmed pregnancy directly from the field. |
| **Trigger** | During a visit, the VET confirms a pregnancy not yet in the system. |

**Main flow:**

1. The VET opens the cow's profile → reproduction tab → "+ Nueva preñez".
2. Selects the conception method (natural / AI / embryo transfer).
3. Provides conception date (estimated from the gestation stage observed) and the father (bull on farm or registered semen donor).
4. The system performs all validations: heifer age, post-partum interval, post-adverse acknowledgement, kinship check.
5. Soft warnings are surfaced; the VET acknowledges them with the `acknowledgedBy = vet.id`.
6. The pregnancy is created with `confirmedAt = today` (since the VET is confirming on the spot).

**Postconditions:** Same as `UC.OWNER.10`.

**Features used:** `REPRODUCTION.01`.

**Frequency:** weekly.

---

### UC.VET.05 — Close a pregnancy with outcome

| | |
| --- | --- |
| **Goal** | Record the result of a pregnancy: a live birth, an abortion, or complications. |
| **Trigger** | The vet attended the parturition or an adverse event. |

**Main flow:**

1. The VET opens the cow's profile → reproduction tab.
2. Taps the active pregnancy → "Cerrar preñez".
3. Selects the outcome:
   - *Successful birth:* enters birth date, then for each calf: sex, ear tag, birth weight, optional name. The system auto-creates each calf as an `Animal` with `CalfProfile` and proposed breed composition (50/50 average from parents — VET may override).
   - *Abortion / complications:* notes a brief description.
4. The system processes the closure (→ `REPRODUCTION.03`).
5. Cow's status returns to `previousStatus` (typically `ACTIVE` or `DRY`).
6. For successful births: a new `LactationPeriod` is created.

**Alternative flows:**

- *3a. Twins:* the VET adds two calves in the same flow.
- *3b. Stillborn calf in a multiple birth:* one calf may be registered with `Animal.status = DECEASED` and `exitReason = "Stillborn"`.
- *3c. Mother dies during birth:* the VET separately changes the mother's status to `DECEASED` after closing the pregnancy.

**Postconditions:** Documented in `UC.OWNER.06` and `REPRODUCTION.03`.

**Features used:** `REPRODUCTION.03`.

**Frequency:** weekly.

---

### UC.VET.06 — Record a vaccination

| | |
| --- | --- |
| **Goal** | Document a vaccine applied to an animal, including the next due date. |
| **Trigger** | The VET applies the vaccine. |

**Main flow:**

1. The VET opens the animal's profile → health tab → "+ Nuevo evento".
2. Selects `VACCINATION` as the event type.
3. Enters product name, dosage, date (default today), next due date (auto-suggested based on the product if known), cost (optional).
4. Saves (→ `HEALTH.01`).

**Postconditions:** New `HealthEvent` row. If `nextDueDate` set, the system schedules `VACCINATION_DUE` notifications at 7/1/0 days before.

**Features used:** `HEALTH.01`.

**Frequency:** several times per day during a farm visit.

---

### UC.VET.07 — Record a treatment with withholding period

| | |
| --- | --- |
| **Goal** | Document a medication treatment, and ensure the system blocks the cow's milk from the commercial total during the retention period. |
| **Trigger** | The VET treats a cow with a medication that contaminates milk. |

**Main flow:**

1. The VET opens the cow's profile → health tab → "+ Nuevo evento".
2. Selects `TREATMENT`.
3. Enters product name, dosage, cost, optional `nextDueDate` for follow-up.
4. The system looks up the product in the medication catalog. If found, the withholding period is suggested automatically. The VET can adjust if their professional judgment differs (`source = VET_PRESCRIBED`).
5. Saves (→ `HEALTH.01`). The system creates a linked `MedicationWithholdingPeriod` (→ `WITHHOLDING.03` semantics).

**Alternative flows:**

- *4a. Product not in catalog:* the VET enters the withholding days manually (`source = MANUAL_OVERRIDE`).
- *4b. VET wants to shorten an active period below the catalog's value:* the system blocks (`WITHHOLDING.CANNOT_SHORTEN_BELOW_CATALOG`). The VET must contact the manufacturer for documented support.

**Postconditions:**

- New `HealthEvent` row.
- New `MedicationWithholdingPeriod` linked.
- All future milk records for this cow within `[startDate, endDate]` are auto-flagged `isFitForCommercial = false`. **No UI override exists.**
- A `WITHHOLDING_ENDED` notification will fire on `endDate + 1`.

**Features used:** `HEALTH.01`, `WITHHOLDING.03`.

**Frequency:** weekly.

---

### UC.VET.08 — Record an illness observation (mastitis)

| | |
| --- | --- |
| **Goal** | Capture a mastitis case so the cow's history reflects the cumulative count. |
| **Trigger** | Clinical signs of mastitis. |

**Main flow:**

1. The VET opens the cow's profile → health tab → "+ Nuevo evento".
2. Selects `ILLNESS`. Description includes "mastitis" (case-insensitive — keyword catalog).
3. Saves (→ `HEALTH.01`).
4. The system increments `cowProfile.mastitisCaseCount`, updates `lastMastitisDate`.
5. If `mastitisCaseCount >= 3`, the cow's profile shows a "considerar para descarte" indicator and a `HEALTH.HIGH_MASTITIS_RISK` notification is created.

**Postconditions:** Mastitis stats updated; risk tier may rise to `HIGH`.

**Features used:** `HEALTH.01`, `HEALTH.05`.

**Frequency:** weekly.

---

### UC.VET.09 — Quarantine an animal

| | |
| --- | --- |
| **Goal** | Isolate an animal whose milk should be excluded from commercial production. |
| **Trigger** | A suspected contagious illness, or a treatment requires withholding. |

**Main flow:**

1. The VET opens the animal's profile → "Cambiar estado" → `QUARANTINED` (→ `ANIMALS.06`).
2. Provides a reason.
3. The system updates the status. Future milk records auto-flag `isFitForCommercial = false`, `unfitReason = QUARANTINED_ANIMAL`.

**Alternative flows:**

- *Releasing from quarantine:* the VET changes status back to `ACTIVE` once the cow is cleared.

**Postconditions:** `Animal.status = QUARANTINED`. Milk auto-flagged unfit.

**Features used:** `ANIMALS.06`.

**Frequency:** as needed.

---

### UC.VET.10 — Manage semen straws (catalog and inspection)

| | |
| --- | --- |
| **Goal** | Help the OWNER curate the semen straw catalog: adding new entries with full pedigree, marking compromised straws as unusable. |
| **Trigger** | A vet visit, or remote review. |

**Main flow:**

1. The VET opens the Pajillas module.
2. Adds new entries with full pedigree, productive indices, and sanitary tests (→ `STRAWS.01`).
3. Inspects existing entries — sees consumption history and per-straw success rates (→ `STRAWS.07`).
4. If a straw is suspect, marks it unusable with a clear reason (→ `STRAWS.04`).

**Postconditions:** Updated catalog.

**Features used:** `STRAWS.01`, `STRAWS.04`, `STRAWS.07`.

**Frequency:** monthly.

---

### UC.VET.11 — Mark a calf as bull candidate

| | |
| --- | --- |
| **Goal** | Recommend a calf as a future bull, justifying with veterinary criteria. |
| **Trigger** | A routine calf inspection reveals a strong candidate. |

**Main flow:** identical to `UC.OWNER.09` but invoked by the VET, who has permission per the matrix.

**Postconditions:** Same as `UC.OWNER.09`.

**Features used:** `ANIMALS.07`.

**Frequency:** occasional.

---

### UC.VET.12 — Review reproductive efficiency

| | |
| --- | --- |
| **Goal** | Identify cows with poor reproductive performance and bulls with low fertility. |
| **Trigger** | Routine herd review. |

**Main flow:**

1. The VET opens the herd list → filters cows with `LOW_REPRODUCTIVE_EFFICIENCY` notifications (cows > 400 days since last birth without active pregnancy).
2. Reviews each cow's reproductive history; recommends action to the OWNER (e.g., breeding intervention, culling).
3. Reviews bulls with `BullProfile.lowFertilityFlagged = true`; recommends switching donors.

**Postconditions:** Recommendations communicated. Specific actions follow other use cases.

**Features used:** `ANIMALS.02`, `NOTIFICATIONS.01`.

**Frequency:** monthly.

---

## 5. Use Cases — EMPLOYEE

The EMPLOYEE has limited but high-frequency interactions: registering animals, recording milk and weights, and observing reproduction.

---

### UC.EMPLOYEE.01 — Record morning milking session

| | |
| --- | --- |
| **Goal** | Log every cow's milk volume during the morning shift, fast and offline. |
| **Trigger** | It is milking time (typically 4–6 AM). |

**Main flow:**

1. The EMPLOYEE opens the app on their phone.
2. The system shows "Ordeño de hoy" tile prominently because it's milking-time.
3. The EMPLOYEE taps it; the list of expected cows appears (sorted by stall order if configured).
4. For each cow:
   - Tap the cow's tile.
   - A number pad opens.
   - Type the liters → tap done → next cow auto-focuses.
5. After the shift, the EMPLOYEE sees the session total.
6. If offline: the records are stored in IndexedDB with `syncStatus = PENDING`.
7. When connectivity returns, the app syncs silently (→ `OFFLINE.03`).

**Alternative flows:**

- *4a. Cow is `DRY`:* the system shows a clear non-block message ("Esta vaca está seca; no se registra producción."), and the EMPLOYEE moves on. **Hard block.**
- *4b. Cow is `QUARANTINED`:* the EMPLOYEE can record the session, but the system flags it as `isFitForCommercial = false` automatically. The EMPLOYEE sees the indicator but cannot override.
- *4c. Cow has an active medication withholding period:* same as quarantined, with `unfitReason = MEDICATION_WITHHOLDING`.
- *4d. Liters > 60 (sanity bound exceeded):* the system shows a soft warning *"Volumen inusualmente alto, ¿confirma?"*. The EMPLOYEE confirms or corrects.
- *7a. Sync conflict (rare):* the conflict surfaces in the conflicts panel → resolved per `OFFLINE.04`.

**Postconditions:**

- One `MilkProductionRecord` per cow per `productionDate`.
- Session timestamps recorded.

**Features used:** `PRODUCTION.01`, `OFFLINE.01`, `OFFLINE.03`.

**Frequency:** twice daily (morning + afternoon, or three times for very high-producers).

---

### UC.EMPLOYEE.02 — Register a newborn calf

| | |
| --- | --- |
| **Goal** | Add a newly born calf to the herd quickly during or just after parturition. |
| **Trigger** | A cow gives birth; the EMPLOYEE is on shift. |

**Main flow:**

1. The EMPLOYEE goes to the mother's profile → reproduction tab → active pregnancy.
2. Either:
   - If the VET is present, the VET closes the pregnancy with the calf data (→ `UC.VET.05`).
   - If the EMPLOYEE is alone, registers the calf directly via "+ Nuevo animal" (→ `ANIMALS.01`) with the mother already pre-selected from the active pregnancy. The pregnancy outcome is closed by the OWNER or VET later.
3. Captures the calf's ear tag, sex, birth date, optional birth weight, optional photo.
4. The breed composition is pre-filled with the 50/50 average; the EMPLOYEE saves.

**Alternative flows:**

- *2a. EMPLOYEE registers a calf without a linked pregnancy:* allowed, but the OWNER or VET should reconcile by closing the pregnancy with `outcome = SUCCESSFUL` later.

**Postconditions:**

- New `Animal` with `CalfProfile` (`status = NURSING`).
- `BreedComposition` rows summing to 100.

**Features used:** `ANIMALS.01`.

**Frequency:** weekly during calving season.

---

### UC.EMPLOYEE.03 — Record a weight measurement

| | |
| --- | --- |
| **Goal** | Track an animal's weight over time. |
| **Trigger** | Routine weighing (often weekly for calves, monthly for adults). |

**Main flow:**

1. The EMPLOYEE opens the animal's profile → "Pesos" tab → "+ Registrar peso".
2. Enters weight in kg, date (default today), optional notes.
3. Saves (→ `ANIMALS.08`). Works offline.

**Postconditions:** New `WeightRecord` row.

**Features used:** `ANIMALS.08`, `OFFLINE.01`.

**Frequency:** weekly to monthly.

---

### UC.EMPLOYEE.04 — Record an observed heat

| | |
| --- | --- |
| **Goal** | Capture an observed estrus event so the breeding decision can be made in the right window. |
| **Trigger** | The EMPLOYEE notices clear signs of heat (mounting, vocalization, changes in vulva). |

**Main flow:**

1. The EMPLOYEE opens the cow's profile → reproduction tab → "Registrar celo observado" (→ `REPRODUCTION.07`).
2. Date/time pre-filled with now; the EMPLOYEE confirms.
3. The system records a `HealthEvent` with subtype `heat_observation`.

**Alternative flows:**

- *Cow is `PREGNANT`:* the system shows a soft warning that heat in pregnancy is unusual.

**Postconditions:** `HealthEvent` row recorded; future heat estimation anchors on this.

**Features used:** `REPRODUCTION.07`, `OFFLINE.01`.

**Frequency:** weekly.

---

### UC.EMPLOYEE.05 — Register a pregnancy (when authorized)

| | |
| --- | --- |
| **Goal** | Capture a pregnancy on the spot when the OWNER or VET cannot. |
| **Trigger** | The EMPLOYEE was the one performing artificial insemination, or witnessed a natural mating. |

**Main flow:** same as `UC.OWNER.10` but invoked by the EMPLOYEE, who has permission per the matrix (`businessRules.md` §9). The EMPLOYEE acknowledges all soft warnings on behalf of themselves; the OWNER and VET still receive the corresponding notifications.

**Postconditions:** Same as `UC.OWNER.10`.

**Features used:** `REPRODUCTION.01`.

**Frequency:** weekly.

---

### UC.EMPLOYEE.06 — Edit a record from earlier today

| | |
| --- | --- |
| **Goal** | Correct a mistyped milk volume or weight that was just entered. |
| **Trigger** | The EMPLOYEE realizes they tapped the wrong number. |

**Main flow:**

1. The EMPLOYEE opens the cow's profile → finds the record from today.
2. Taps "Editar".
3. Updates the value; the system records the change with the audit log.

**Alternative flows:**

- *Record older than 7 days:* the EMPLOYEE cannot edit; only OWNER can correct via a separate flow (deferred to v1.1).

**Postconditions:** Record updated; audit log entry captures both versions.

**Features used:** `PRODUCTION.01` (overwrite), `ANIMALS.08`.

**Frequency:** daily (corrections happen).

---

### UC.EMPLOYEE.07 — Take a photo of an animal

| | |
| --- | --- |
| **Goal** | Document an animal visually (good for new arrivals, health observations, or confusion about which cow is which). |
| **Trigger** | A cow needs to be photographed — for identification, for an observation, for a buyer's request. |

**Main flow:**

1. The EMPLOYEE opens the animal's profile → "Fotos" → "+ Subir foto".
2. The phone camera opens; takes a photo.
3. The system uploads via the presigned-URL flow (→ `ANIMALS.09`).
4. The photo appears in the carousel.

**Postconditions:** New `AnimalPhoto` row.

**Features used:** `ANIMALS.09`.

**Frequency:** occasional.

---

## 6. Use Cases — AUDITOR

The AUDITOR has read-only access to almost everything except other tenants' data. They typically appear at quarter-end or year-end.

---

### UC.AUDITOR.01 — Run financial reports for a period

| | |
| --- | --- |
| **Goal** | Produce the financial summary for the tax filing or the lender. |
| **Trigger** | End-of-quarter or end-of-year reporting cycle. |

**Main flow:**

1. The AUDITOR logs in and lands on their dashboard (→ `DASHBOARD.04`).
2. Opens Finance → "Reportes" → "Rentabilidad" with the desired period (→ `FINANCE.04`).
3. Reviews income, expense, net per month and per category.
4. Exports to Excel for the tax software (→ `REPORTS.04`).

**Postconditions:** None — read-only.

**Features used:** `FINANCE.04`, `REPORTS.04`.

**Frequency:** quarterly to annually.

---

### UC.AUDITOR.02 — Verify herd inventory

| | |
| --- | --- |
| **Goal** | Confirm the herd composition (count, value, breed mix) matches the financial records. |
| **Trigger** | Year-end inventory. |

**Main flow:**

1. The AUDITOR opens the herd view with all filters at default.
2. Enables `includeTerminal = true` to see sold/deceased animals for the period.
3. Exports the full herd inventory to Excel (→ `REPORTS.02`).
4. Cross-references with the OWNER's records.

**Postconditions:** None.

**Features used:** `ANIMALS.02`, `REPORTS.02`.

**Frequency:** annually.

---

### UC.AUDITOR.03 — Review the audit log

| | |
| --- | --- |
| **Goal** | Confirm critical changes (financial transactions, animal sales, status changes) are properly recorded with attribution. |
| **Trigger** | Compliance audit, or investigation of a discrepancy. |

**Main flow:**

1. The AUDITOR opens "Historial de cambios" (→ `AUDIT.01`).
2. Filters by entity type, user, action, date range.
3. Spot-checks individual entries for old/new value diffs (→ `AUDIT.02`).
4. Exports filtered entries for offline review (→ `AUDIT.03`).

**Postconditions:** None — read-only.

**Features used:** `AUDIT.01`, `AUDIT.02`, `AUDIT.03`.

**Frequency:** quarterly to annually, or on demand.

---

### UC.AUDITOR.04 — Inspect data quality

| | |
| --- | --- |
| **Goal** | Identify gaps in the data: cows without recent milk records, missing weights, animals without breed composition, etc. |
| **Trigger** | The AUDITOR doubts whether the records are complete. |

**Main flow:**

1. From the AUDITOR dashboard, the data-quality tile shows aggregate gaps.
2. The AUDITOR drills into specific gaps:
   - Cows without milk records in the last 7 days.
   - Animals without weight records in the last 90 days.
   - Pregnancies with `outcome = PENDING` past their `estimatedBirthDate + 7 days`.
   - Active withholding periods that may need vet attention.
3. The AUDITOR shares findings with the OWNER.

**Postconditions:** None.

**Features used:** `DASHBOARD.04`, various filtered list endpoints.

**Frequency:** quarterly.

---

## 7. Cross-Role Scenarios

These are scenarios involving multiple roles cooperating. They show how the system supports real-life division of labor on a farm.

---

### UC.CROSS.01 — End-to-end pregnancy lifecycle

A pregnancy from breeding decision to birth, distributed across roles.

1. **OWNER (UC.OWNER.10):** Decides to breed cow Bessie, picks semen straw "BR-12345". Kinship coefficient is 4.2% — below threshold. Pregnancy registered with `confirmedAt = null`.
2. **VET (UC.VET.03):** Two weeks later, during a routine farm visit, palpates Bessie. Confirms pregnancy. Sets `confirmedAt = today`.
3. **EMPLOYEE:** Notices Bessie behaving differently a few days before the estimated birth → creates an in-app note. The system also fires the `UPCOMING_BIRTH` URGENT notification 7 days before.
4. **VET (UC.VET.05):** Attends parturition. A live calf is born. VET closes the pregnancy: outcome `SUCCESSFUL`, calf registered with mother Bessie, father from straw BR-12345, breed composition auto-computed.
5. **System:** Bessie's `CowProfile.lactationCount += 1`, new `LactationPeriod` created. Bull's `BullProfile.totalMatings += 1`, `successfulMatings += 1`.
6. **EMPLOYEE (UC.EMPLOYEE.03):** Weighs the calf the next day; records weight.
7. **EMPLOYEE (UC.EMPLOYEE.01):** Starts recording Bessie's milk daily. The first 14 days are auto-flagged `isFitForCommercial = false`, `unfitReason = COLOSTRUM_PERIOD` per the lactation-transition window.

---

### UC.CROSS.02 — Mastitis case detection and treatment

A mastitis case end-to-end.

1. **System:** A daily background job notices that Bessie (high-producer, average 25 L/day) has not registered a milking session in the last 14 hours. Emits `MASTITIS_RISK` notification.
2. **OWNER (UC.OWNER.07):** Sees the notification on the dashboard, calls the VET.
3. **VET (UC.VET.08):** Visits, examines Bessie, confirms mastitis. Records an `ILLNESS` event with description "mastitis clínica leve". The system increments `mastitisCaseCount`.
4. **VET (UC.VET.07):** Treats Bessie with antibiotic X (catalog says 5-day withholding). Records a `TREATMENT` event; the system auto-creates a `MedicationWithholdingPeriod` from today to today + 5 days.
5. **VET (UC.VET.09):** Quarantines Bessie pending recovery.
6. **EMPLOYEE (UC.EMPLOYEE.01):** Continues to record Bessie's milk daily. The system auto-flags `isFitForCommercial = false`, `unfitReason = QUARANTINED_ANIMAL` (and `MEDICATION_WITHHOLDING` once the quarantine flag is removed but the withholding period is still active).
7. **System:** On day 6, fires `WITHHOLDING_ENDED` notification. The VET releases Bessie from quarantine; her milk returns to commercial fitness.

---

### UC.CROSS.03 — Selling an animal with a clean report

1. **OWNER:** Buyer interested in a specific cow.
2. **OWNER (UC.OWNER.05, UC.OWNER.08):** Generates the cow's profile PDF, shares with buyer.
3. **OWNER (UC.OWNER.06):** Records sale price, transitions cow to `SOLD`. System records `ANIMAL_SALE` financial transaction.
4. **AUDITOR (UC.AUDITOR.01):** At quarter-end, verifies the income shows up in the financial report and the herd inventory reflects the cow as sold.

---

### UC.CROSS.04 — End of life of a cow

1. **EMPLOYEE:** Notices a cow died overnight.
2. **OWNER (UC.OWNER.06):** Transitions cow to `DECEASED` with reason "muerte natural súbita".
3. **System:** Auto-suggests a `OTHER_EXPENSE` financial transaction with `metadata.deathLoss = true` and `amount = estimatedValue`. OWNER confirms.
4. **AUDITOR (UC.AUDITOR.02):** At year-end, sees the death loss as a separate line in the financial summary, distinct from sales.

---

### UC.CROSS.05 — Inviting a vet to a new farm

1. **OWNER (UC.OWNER.14):** Invites Dr. Ramírez as `VETERINARIAN`. Sends invitation.
2. **OWNER (UC.OWNER.14, FARMS.04):** Assigns Dr. Ramírez to the farm.
3. **VET (USERS.03):** Accepts invitation, sets password, enables MFA.
4. **VET (UC.VET.01, UC.VET.02):** First login, switches to the new farm, reviews the herd.
5. From here on, all VET use cases apply.

---

### UC.CROSS.06 — Sync conflict resolution

A milk record edited offline by two devices.

1. **EMPLOYEE A (offline):** records Bessie's morning milk = 18 L on phone 1.
2. **EMPLOYEE B (offline, different stall worker):** records Bessie's morning milk = 22 L on phone 2.
3. **Phone 1:** comes online first. Record syncs successfully. Server has 18 L.
4. **Phone 2:** comes online. Tries to sync 22 L. Server returns `OPTIMISTIC_LOCK_CONFLICT`.
5. **Phone 2:** the record is moved to the "Conflictos" view. EMPLOYEE B sees side-by-side: server (18 L) vs. local (22 L).
6. **EMPLOYEE B (or OWNER):** picks the correct value, saves with the now-current `version`. Both versions appear in the audit log.

---

## 8. Permission Summary

This is the operational view of the matrix in `projectbrief.md` §11.1, organized by use case.

| Use case                                    | O   | V   | E   | A   |
| ------------------------------------------- | --- | --- | --- | --- |
| Sign up & onboarding (UC.OWNER.01)          | ✅  | n/a | n/a | n/a |
| Daily login (UC.OWNER.02 etc.)              | ✅  | ✅  | ✅  | ✅  |
| Review dashboard                            | ✅  | ✅  | ✅  | ✅  |
| Register animal                             | ✅  | ❌  | ✅  | ❌  |
| Inspect animal                              | ✅  | ✅  | ✅  | ✅  |
| Change animal status                        | ✅  | ✅  | ❌  | ❌  |
| Mark calf as bull candidate                 | ✅  | ✅  | ❌  | ❌  |
| Record weight                               | ✅  | ✅  | ✅  | ❌  |
| Take photo                                  | ✅  | ❌  | ✅  | ❌  |
| Register pregnancy                          | ✅  | ✅  | ✅  | ❌  |
| Confirm pregnancy                           | ✅  | ✅  | ❌  | ❌  |
| Close pregnancy with outcome                | ✅  | ✅  | ❌  | ❌  |
| Record observed heat                        | ✅  | ✅  | ✅  | ❌  |
| Record vaccination                          | ✅  | ✅  | ❌  | ❌  |
| Record treatment with withholding           | ✅  | ✅  | ❌  | ❌  |
| Record illness / mastitis                   | ✅  | ✅  | ❌  | ❌  |
| Quarantine animal                           | ✅  | ✅  | ❌  | ❌  |
| Record morning milking                      | ✅  | ❌  | ✅  | ❌  |
| Bulk import production                      | ✅  | ❌  | ✅  | ❌  |
| Manage semen straws                         | ✅  | ✅  | ❌  | ❌  |
| Mark straw unusable                         | ✅  | ✅  | ❌  | ❌  |
| Record financial transaction                | ✅  | ❌  | ❌  | ❌  |
| View finances                               | ✅  | ❌  | ❌  | ✅  |
| Run profitability report                    | ✅  | ❌  | ❌  | ✅  |
| Sell a cow with PDF report                  | ✅  | ❌  | ❌  | ❌  |
| Invite users                                | ✅  | ❌  | ❌  | ❌  |
| Configure farm settings                     | ✅  | ❌  | ❌  | ❌  |
| Export tenant data                          | ✅  | ❌  | ❌  | ❌  |
| Review audit log                            | ✅  | ❌  | ❌  | ✅  |
| Inspect data quality                        | ✅  | ❌  | ❌  | ✅  |

---

## Document Maintenance

This document is updated whenever:

- A new role is introduced (currently 4; future versions may split or combine).
- A new high-value use case becomes part of the daily flow.
- The permission matrix in `projectbrief.md` §11.1 changes (this document follows).
- A use case is materially restructured by a feature change.

Substantive additions require a PR titled `docs(use-cases): <role> - <short description>` with reviewers from product and engineering.

When this document conflicts with `features.md` on what a feature does, **`features.md` wins**. When it conflicts with the permission matrix in `projectbrief.md` §11.1, **`projectbrief.md` wins**.
