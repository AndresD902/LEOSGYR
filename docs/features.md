# Features — CattlePro

> **Status:** Draft v1.0
> **Last updated:** 2026-05-02
> **Owner:** Product & Engineering
>
> This document describes **every functional capability of the system**, organized by module. Each feature includes its **purpose**, **inputs/outputs**, **business rules**, **edge cases**, **error scenarios**, and **role permissions**.
>
> When this document conflicts with `businessRules.md` on a domain matter, **`businessRules.md` wins** and this document is updated. When this document conflicts with `dataModel.md` on a structural matter, the conflict triggers a discussion — usually `dataModel.md` wins because it's the database contract, but if the disagreement is over a behavior the model didn't anticipate, this document drives the change.

---

## Table of Contents

1. [Conventions](#1-conventions)
2. [Module: Authentication](#2-module-authentication)
3. [Module: Tenants & Users](#3-module-tenants--users)
4. [Module: Farms](#4-module-farms)
5. [Module: Animals](#5-module-animals)
6. [Module: Genealogy](#6-module-genealogy)
7. [Module: Reproduction](#7-module-reproduction)
8. [Module: Semen Straws Inventory](#8-module-semen-straws-inventory)
9. [Module: Milk Production](#9-module-milk-production)
10. [Module: Lactation Tracking](#10-module-lactation-tracking)
11. [Module: Health](#11-module-health)
12. [Module: Medication Withholding](#12-module-medication-withholding)
13. [Module: Finance](#13-module-finance)
14. [Module: Calf Rearing Cost](#14-module-calf-rearing-cost)
15. [Module: Notifications & Alerts](#15-module-notifications--alerts)
16. [Module: Reports & Exports](#16-module-reports--exports)
17. [Module: Dashboard](#17-module-dashboard)
18. [Module: Audit Log](#18-module-audit-log)
19. [Module: Offline & Sync](#19-module-offline--sync)
20. [Cross-Cutting Features](#20-cross-cutting-features)

---

## 1. Conventions

### 1.1 Feature template

Every feature in this document follows the same structure:

- **ID:** `<MODULE>.<NUMBER>` (e.g., `ANIMALS.05`).
- **Name:** short imperative phrase.
- **Purpose:** one sentence describing why the feature exists for the user.
- **Roles:** which `UserRole` values can invoke the feature.
- **Inputs:** required and optional input fields.
- **Outputs:** what the user sees on success.
- **Business rules:** the rules from `businessRules.md` and `dataModel.md` that this feature must enforce.
- **Edge cases:** known scenarios that need explicit handling.
- **Errors:** the error codes and conditions under which they are returned.
- **Audit:** what gets recorded in `AuditLog`.

### 1.2 Error code conventions

Errors follow the format `<DOMAIN>.<CODE>` and map to RFC 7807 problem responses (per `decisions.md` ADR-016).

Common codes used across modules:

| Code                                | HTTP | Meaning                                                  |
| ----------------------------------- | ---- | -------------------------------------------------------- |
| `VALIDATION_FAILED`                 | 400  | Zod schema rejected the input                            |
| `UNAUTHENTICATED`                   | 401  | No valid JWT presented                                   |
| `FORBIDDEN`                         | 403  | Authenticated but role is insufficient                   |
| `NOT_FOUND`                         | 404  | Resource does not exist or is in a different tenant      |
| `CONFLICT`                          | 409  | Generic state conflict                                   |
| `OPTIMISTIC_LOCK_CONFLICT`          | 409  | `version` mismatch on update                             |
| `RATE_LIMITED`                      | 429  | Too many requests                                        |
| `INTERNAL_ERROR`                    | 500  | Unhandled error                                          |

Module-specific codes are listed in each module section.

### 1.3 Role abbreviations in this document

| Abbrev | Full name      |
| ------ | -------------- |
| O      | OWNER          |
| V      | VETERINARIAN   |
| E      | EMPLOYEE       |
| A      | AUDITOR        |

A green check (✅) means the role can invoke the feature; an X (❌) means it is forbidden.

### 1.4 Soft warning vs. hard block

A **soft warning** is shown to the user but does not prevent the action; the user must explicitly acknowledge to proceed, and the acknowledgement is recorded in `metadata` and `AuditLog`.

A **hard block** prevents the action entirely and returns an error response.

---

## 2. Module: Authentication

Provides user login, session management, multi-factor authentication, and password lifecycle.

### AUTH.01 — Register tenant and owner

| | |
| --- | --- |
| **Purpose** | Allow a new farm to sign up and create the OWNER user in a single flow. |
| **Roles** | Public (no authentication required). |
| **Inputs (required)** | `tenantName`, `tenantSlug` (URL-safe), `ownerFullName`, `ownerEmail`, `ownerPassword`. |
| **Inputs (optional)** | `defaultCurrency` (default `'COP'`), `defaultTimezone` (default `'America/Bogota'`), `defaultLocale` (default `'es-CO'`). |
| **Outputs** | The created tenant and owner user (without `passwordHash`); access + refresh tokens for the new user. |

**Business rules:**

- `tenantSlug` must match `^[a-z0-9-]{3,60}$` and be unique globally.
- `ownerEmail` must be valid RFC 5322 format.
- `ownerPassword` must be ≥ 12 characters, contain at least one letter and one digit. Argon2id hashed before storage.
- The created user has `role = OWNER`, `isActive = true`, `mfaEnabled = false`, `emailVerifiedAt = null`.
- Sends an email-verification link to `ownerEmail` (asynchronous via BullMQ).
- A welcome `Notification` of type `GENERAL` is created.

**Edge cases:**

- Slug already in use → error `AUTH.SLUG_TAKEN`.
- Email is in another tenant → allowed (a single email may exist in multiple tenants).
- Email already exists in *this* tenant → impossible for a brand-new tenant; never reached.

**Errors:**

| Code                       | HTTP | When                                            |
| -------------------------- | ---- | ----------------------------------------------- |
| `AUTH.SLUG_TAKEN`          | 409  | `tenantSlug` exists                             |
| `AUTH.WEAK_PASSWORD`       | 400  | Password fails policy                           |
| `VALIDATION_FAILED`        | 400  | Zod rejected the body                           |
| `RATE_LIMITED`             | 429  | More than 5 registration attempts/hour per IP   |

**Audit:** `tenant.create`, `user.create`, `auth.login` (initial session).

---

### AUTH.02 — Log in with email and password

| | |
| --- | --- |
| **Purpose** | Authenticate a user and issue session tokens. |
| **Roles** | Public. |
| **Inputs (required)** | `email`, `password`, `tenantSlug` (resolves the tenant; alternative: subdomain-based resolution). |
| **Inputs (optional)** | `mfaCode` if MFA is enabled. |
| **Outputs** | Access token (in JSON body), refresh token (in HTTP-only secure cookie), user profile (without `passwordHash`). |

**Business rules:**

- `tenantId` is resolved from `tenantSlug` server-side.
- The user must exist with `tenantId` and `email` (CITEXT match).
- The user's `isActive` must be `true`; the tenant's `isActive` must be `true`.
- `passwordHash` is verified with Argon2 `verify`.
- If `mfaEnabled = true`, a valid `mfaCode` (TOTP, 30-second window) is required.
- On success: reset `failedLoginAttempts = 0`, set `lastLoginAt = now()`, issue tokens (per `dataModel.md` §3.3).
- On failure: increment `failedLoginAttempts`. After 5 failures, set `lockedUntil = now() + 15 minutes`.

**Edge cases:**

- Account locked (`lockedUntil > now()`) → error `AUTH.ACCOUNT_LOCKED` regardless of password correctness. Counter is **not** incremented further while locked.
- MFA-enabled user submits without `mfaCode` → error `AUTH.MFA_REQUIRED` so the client can prompt.
- MFA-enabled user submits invalid `mfaCode` → counts as a failed login attempt.
- Tenant is inactive → error `AUTH.TENANT_INACTIVE` (the user message says "su organización está inactiva, contacte al administrador").
- User submits an email that exists in another tenant but not this one → error `AUTH.INVALID_CREDENTIALS` (do not leak the existence of the email).

**Errors:**

| Code                          | HTTP |
| ----------------------------- | ---- |
| `AUTH.INVALID_CREDENTIALS`    | 401  |
| `AUTH.ACCOUNT_LOCKED`         | 423  |
| `AUTH.TENANT_INACTIVE`        | 403  |
| `AUTH.MFA_REQUIRED`           | 401  (with hint header) |
| `AUTH.INVALID_MFA`            | 401  |
| `RATE_LIMITED`                | 429  |

**Rate limiting:** 10 login attempts per 15 minutes per (IP, email) tuple.

**Audit:** `auth.login` on success; `auth.login_failed` on failure (without password content).

---

### AUTH.03 — Refresh access token

| | |
| --- | --- |
| **Purpose** | Obtain a new access token using a refresh token, with rotation. |
| **Roles** | Anyone with a valid refresh token. |
| **Inputs** | Refresh token (from HTTP-only cookie). |
| **Outputs** | New access token + new refresh token. The old refresh token is revoked. |

**Business rules:**

- Hash the presented token (SHA-256), look up `RefreshToken.tokenHash`.
- If not found → error `AUTH.INVALID_REFRESH_TOKEN`.
- If `expiresAt < now()` → error `AUTH.REFRESH_TOKEN_EXPIRED`.
- If `revokedAt IS NOT NULL`: this is a **reuse detection event**. Invalidate every token in the same `family` (mark all `revokedAt = now()`). Return `AUTH.REFRESH_TOKEN_REUSED` and force the user to log in again.
- On valid token: issue new tokens, mark old as revoked with `replacedBy = newTokenHash`.
- The user's `isActive` must be `true`; otherwise revoke all family tokens and return `AUTH.USER_INACTIVE`.

**Edge cases:**

- Token presented without a cookie (header injection attempt) → error `AUTH.INVALID_REFRESH_TOKEN`.
- Token from a tenant whose status flipped to inactive → revoke + return `AUTH.TENANT_INACTIVE`.

**Errors:**

| Code                           | HTTP |
| ------------------------------ | ---- |
| `AUTH.INVALID_REFRESH_TOKEN`   | 401  |
| `AUTH.REFRESH_TOKEN_EXPIRED`   | 401  |
| `AUTH.REFRESH_TOKEN_REUSED`    | 401  |
| `AUTH.USER_INACTIVE`           | 403  |
| `AUTH.TENANT_INACTIVE`         | 403  |

**Audit:** `auth.refresh` on success; `auth.refresh_reuse_detected` triggers a `WARNING`-severity audit entry plus an OWNER-targeted `Notification`.

---

### AUTH.04 — Log out

| | |
| --- | --- |
| **Purpose** | End the current session by revoking the active refresh token. |
| **Roles** | Authenticated. |
| **Inputs** | Refresh token (cookie). |
| **Outputs** | 204 No Content; cookie cleared. |

**Business rules:**

- Mark the refresh token's `revokedAt = now()`.
- Other tokens in the same family remain valid (the user may still be logged in on other devices).
- Cookie is cleared with `Set-Cookie` and `Max-Age=0`.

**Edge cases:**

- Already-revoked token → still respond 204 (idempotent).

**Audit:** `auth.logout`.

---

### AUTH.05 — Log out from all devices

| | |
| --- | --- |
| **Purpose** | Revoke every active refresh token for the user (security measure). |
| **Roles** | Authenticated user (acting on themselves) or OWNER (acting on any user in their tenant). |
| **Inputs** | Optional `userId` (only OWNER can use this). |
| **Outputs** | 204; all tokens revoked. |

**Business rules:**

- Mark every `RefreshToken.revokedAt = now()` for the target user.
- The current request's session also dies — the next request from any device will require login.

**Audit:** `auth.logout_all` (with target user reference).

---

### AUTH.06 — Enable MFA (TOTP)

| | |
| --- | --- |
| **Purpose** | Add a second factor (authenticator app) to a user's account. |
| **Roles** | Authenticated user (acting on themselves). |
| **Inputs (step 1, "begin")** | none. |
| **Outputs (step 1)** | TOTP secret (Base32-encoded), QR code data URL containing `otpauth://` URI. |
| **Inputs (step 2, "confirm")** | A valid 6-digit TOTP code derived from the secret. |
| **Outputs (step 2)** | 204; `mfaEnabled` flips to `true`; recovery codes (10 single-use codes) returned **only this once**. |

**Business rules:**

- The TOTP secret is generated server-side (32 random bytes, Base32 encoded); stored in `User.mfaSecret` (encrypted at rest with AES-GCM keyed by app secret).
- Step 1 stores the secret tentatively in a Redis key with 10-minute TTL keyed by `userId`. The user must complete step 2 within that window or the secret is discarded.
- Step 2 verifies the code with a 30-second window (±1 step tolerance). On success, the secret is moved to `User.mfaSecret` permanently.
- 10 recovery codes (UUIDs, hashed before storage) are generated at activation. Each can be used once instead of a TOTP code.
- After successful enablement, **all existing refresh tokens are revoked** to force re-authentication with MFA.

**Edge cases:**

- User already has `mfaEnabled = true` → error `AUTH.MFA_ALREADY_ENABLED`.
- Step 2 submitted past the Redis TTL → error `AUTH.MFA_SETUP_EXPIRED`; user restarts.
- Code wrong on step 2 → counts as a failed login attempt for lockout purposes (3 wrong codes within setup → secret discarded, restart required).

**Errors:** `AUTH.MFA_ALREADY_ENABLED`, `AUTH.MFA_SETUP_EXPIRED`, `AUTH.INVALID_MFA`.

**Audit:** `user.mfa_enable`.

---

### AUTH.07 — Disable MFA

| | |
| --- | --- |
| **Purpose** | Remove the second factor from a user's account. |
| **Roles** | Authenticated user (self) or OWNER (other users in their tenant, with explicit reason). |
| **Inputs** | Current password (required even for OWNER acting on others, to confirm ownership) + a current TOTP code or recovery code. |
| **Outputs** | 204; `mfaEnabled = false`, `mfaSecret = null`, recovery codes deleted. |

**Business rules:**

- Disabling MFA is a high-trust operation: requires re-validating the current password and a valid second factor.
- After disabling, all refresh tokens are revoked.

**Errors:** `AUTH.INVALID_CREDENTIALS`, `AUTH.INVALID_MFA`, `AUTH.MFA_NOT_ENABLED`.

**Audit:** `user.mfa_disable`.

---

### AUTH.08 — Request password reset

| | |
| --- | --- |
| **Purpose** | Initiate a password-reset flow when the user has forgotten their password. |
| **Roles** | Public. |
| **Inputs** | `email`, `tenantSlug`. |
| **Outputs** | Always 204 (do not leak whether the email exists). |

**Business rules:**

- If the (tenant, email) combination exists with `isActive = true`, generate a reset token (32 random bytes, hashed before storage) with TTL = 1 hour.
- Email the user a link `https://app.cattlepro.com/reset?token=...`.
- Rate-limited: 3 reset requests per hour per (tenant, email).

**Edge cases:**

- User does not exist or is inactive → respond 204 anyway, do not send email, log internally.

**Errors:** none surfaced to the caller (always 204). Internal log captures non-existent users for monitoring.

**Audit:** `user.password_reset_request` (with email but not full email content).

---

### AUTH.09 — Reset password with token

| | |
| --- | --- |
| **Purpose** | Complete the password reset using the token sent by email. |
| **Roles** | Public (anyone with a valid token). |
| **Inputs** | `token`, `newPassword`. |
| **Outputs** | 204; user can log in with new password. |

**Business rules:**

- Hash the presented token, find the matching reset record.
- Token must not be expired or used; if expired or used, return `AUTH.INVALID_RESET_TOKEN`.
- `newPassword` must satisfy the password policy (≥ 12 chars, letter + digit).
- Set new `passwordHash`, mark the reset record as `usedAt = now()`.
- Revoke **all** refresh tokens for the user.
- Send a notification email "Su contraseña fue cambiada" to the user.

**Errors:** `AUTH.INVALID_RESET_TOKEN`, `AUTH.WEAK_PASSWORD`.

**Audit:** `user.password_reset_complete`.

---

## 3. Module: Tenants & Users

User and tenant administration within an organization.

### USERS.01 — List users in the tenant

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ❌ | ❌ | ✅ |

**Purpose:** Display all users belonging to the current tenant. Auditors can see them but cannot mutate.

**Inputs:** Optional filters: `role`, `isActive`, search query (matches name + email).

**Outputs:** Paginated list with `id`, `email`, `fullName`, `role`, `isActive`, `mfaEnabled`, `lastLoginAt`. Never `passwordHash` or `mfaSecret`.

**Business rules:**

- Strict tenant scoping (only this tenant's users).
- Default sort: `fullName ASC`.

**Errors:** standard.

**Audit:** none for reads.

---

### USERS.02 — Invite a new user

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ❌ | ❌ | ❌ |

**Purpose:** Add a new user (vet, employee, auditor) to the tenant.

**Inputs:** `email`, `fullName`, `role` (OWNER cannot invite another OWNER in v1.0 — only one owner per tenant).

**Outputs:** The created user, with an invitation email sent.

**Business rules:**

- `role` must be one of `VETERINARIAN`, `EMPLOYEE`, `AUDITOR`. (Inviting another OWNER is open question for v1.1.)
- The user is created with a temporary token-based first-login flow: no password is set; `passwordHash` is a sentinel "must reset" value, `emailVerifiedAt = null`.
- Invitation email contains a 24-hour link `https://app.cattlepro.com/accept-invite?token=...`.
- User must complete invitation acceptance (sets password, optionally enables MFA) before they can log in.
- Email uniqueness is per-tenant: error `USERS.EMAIL_TAKEN_IN_TENANT` if duplicate.

**Edge cases:**

- Same email already in another tenant → allowed; the new user is a separate identity.
- User does not accept invite within 24 hours → invite expires; OWNER can re-invite.

**Errors:** `USERS.EMAIL_TAKEN_IN_TENANT`, `USERS.INVALID_ROLE`, `VALIDATION_FAILED`.

**Audit:** `user.invite`.

---

### USERS.03 — Accept invitation

| | |
| --- | --- |
| **Purpose** | Allow an invited user to set their password and activate the account. |
| **Roles** | Public (anyone with a valid invite token). |
| **Inputs** | `token`, `newPassword`. |
| **Outputs** | Tokens for first session; `emailVerifiedAt` set. |

**Business rules:**

- Same password policy as registration.
- After acceptance, the temporary token is consumed; subsequent uses → `USERS.INVITE_INVALID_OR_USED`.

**Errors:** `USERS.INVITE_INVALID_OR_USED`, `USERS.INVITE_EXPIRED`, `AUTH.WEAK_PASSWORD`.

**Audit:** `user.invite_accept`.

---

### USERS.04 — Update user

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Self-edit | ✅ | ✅ | ✅ | ✅ |
| Edit others | ✅ | ❌ | ❌ | ❌ |

**Purpose:** Update profile fields (name, email).

**Inputs:** `fullName?`, `email?`. Role and active status are managed via dedicated endpoints (USERS.05, USERS.06).

**Business rules:**

- Email change triggers re-verification: `emailVerifiedAt = null`, verification email re-sent.
- A user may not update another user's email or change their own role.

**Errors:** `USERS.EMAIL_TAKEN_IN_TENANT`, standard.

**Audit:** `user.update`.

---

### USERS.05 — Change a user's role

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ❌ | ❌ | ❌ |

**Purpose:** Reassign a user from one role to another.

**Inputs:** `userId`, `newRole`.

**Business rules:**

- Cannot change one's own role (prevents owners locking themselves out).
- Cannot change the only OWNER's role (must transfer ownership first via a separate flow, deferred to v1.1).
- After role change: revoke all the user's refresh tokens to force a fresh login under the new role.

**Errors:** `USERS.CANNOT_CHANGE_OWN_ROLE`, `USERS.CANNOT_DEMOTE_LAST_OWNER`.

**Audit:** `user.role_change` with old and new role.

---

### USERS.06 — Activate / deactivate a user

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ❌ | ❌ | ❌ |

**Purpose:** Suspend a user without deleting their history (e.g., employee who left).

**Inputs:** `userId`, `isActive` (boolean).

**Business rules:**

- Deactivating revokes all refresh tokens immediately.
- Cannot deactivate oneself.
- Cannot deactivate the last active OWNER.
- A deactivated user keeps appearing in `audit_logs.userId` — they are not deleted.

**Errors:** `USERS.CANNOT_DEACTIVATE_SELF`, `USERS.CANNOT_DEACTIVATE_LAST_OWNER`.

**Audit:** `user.activate` or `user.deactivate`.

---

### USERS.07 — View self profile

Any authenticated user can view their own profile (`GET /users/me`). Returns role, tenant, MFA status, last login. Never `passwordHash`/`mfaSecret`.

---

## 4. Module: Farms

Manages the farms (operational units) within a tenant.

### FARMS.01 — Create a farm

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ❌ | ❌ | ❌ |

**Purpose:** Register a new farm under the tenant.

**Inputs (required):** `name`, `country` (default `'CO'`).
**Inputs (optional):** `description`, `capacity`, `addressLine`, `city`, `region`, `timezone`, `currency`, `milkingMode` (default `PER_SESSION`), `metadata`.

**Outputs:** The created farm.

**Business rules (per `dataModel.md` §4.1):**

- `country` is a valid ISO 3166-1 alpha-2 code; default `CO`.
- `timezone` defaults to the tenant's `defaultTimezone` (`America/Bogota`).
- `currency` defaults to the tenant's `defaultCurrency` (`COP`).
- `milkingMode` defaults to `PER_SESSION` and is **locked once any milk record exists** for the farm (per open question #11 in `projectbrief.md`).
- The creating user is implicitly the `ownerId` and gets a `FarmUserAssignment` with role `OWNER`.

**Errors:** standard.

**Audit:** `farm.create`.

---

### FARMS.02 — List farms

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ (all) | ✅ (assigned) | ✅ (assigned) | ✅ (all) |

**Purpose:** Show the farms the user can access.

**Business rules:**

- OWNER and AUDITOR see all farms in their tenant.
- VETERINARIAN and EMPLOYEE see only farms they have a `FarmUserAssignment` for.
- Filter by `isActive`, search by name.

---

### FARMS.03 — Update farm

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ❌ | ❌ | ❌ |

**Purpose:** Modify farm fields.

**Inputs:** any field except `tenantId`, `ownerId` (transferable via FARMS.05).

**Business rules:**

- `milkingMode` change requires zero existing milk records for the farm. Otherwise → `FARMS.MILKING_MODE_LOCKED`.
- `currency` cannot change once any `FinancialTransaction` exists for the farm. Otherwise → `FARMS.CURRENCY_LOCKED`.

**Errors:** `FARMS.MILKING_MODE_LOCKED`, `FARMS.CURRENCY_LOCKED`, standard.

**Audit:** `farm.update`.

---

### FARMS.04 — Assign user to farm

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ❌ | ❌ | ❌ |

**Purpose:** Grant a non-owner user access to a specific farm and define their role on that farm.

**Inputs:** `farmId`, `userId`, `role`.

**Business rules:**

- The `role` here may differ from the user's tenant-wide role: a tenant-wide `EMPLOYEE` may have a `VETERINARIAN` role on a specific farm if they happen to also be a vet for that farm.
- A user can have at most one assignment per farm (UNIQUE `(farmId, userId)`).

**Errors:** `FARMS.DUPLICATE_ASSIGNMENT`, standard.

**Audit:** `farm.user_assign`.

---

### FARMS.05 — Transfer farm ownership

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ (current owner only) | ❌ | ❌ | ❌ |

**Purpose:** Reassign the `ownerId` of a farm to another OWNER user.

**Inputs:** `farmId`, `newOwnerId`.

**Business rules:**

- `newOwnerId` must be a user with role `OWNER` in the same tenant.
- The previous owner retains `FarmUserAssignment` unless explicitly removed.

**Errors:** `FARMS.NEW_OWNER_INVALID`, standard.

**Audit:** `farm.transfer_ownership`.

---

### FARMS.06 — Configure farm settings

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ❌ | ❌ | ❌ |

**Purpose:** Edit operational settings: timezone, currency, milking mode, calculated metrics (default high-production threshold for mastitis alerts, default lactation length, etc.).

**Settings stored in `Farm.metadata` JSONB:**

```json
{
  "highProductionThresholdLiters": 15,
  "mastitisGapHours": 14,
  "lactationStandardDays": 305,
  "calostrumWindowDays": 14,
  "primiparousAttentionEnabled": true,
  "inbreedingThresholdPercent": 6.25,
  "bullCandidatePremiumPercent": 20,
  "milkingFirstSessionEarliestHour": 4,
  "milkingFirstSessionLatestHour": 6
}
```

All values have defaults (per `businessRules.md`); the OWNER can adjust them per farm.

**Audit:** `farm.update_settings`.

---

### FARMS.07 — Soft-delete (deactivate) farm

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ❌ | ❌ | ❌ |

**Purpose:** Mark a farm as inactive.

**Business rules:**

- Cannot deactivate a farm with `Animal.status = ACTIVE/PREGNANT/DRY/QUARANTINED` rows. The farm must first sell, mark deceased, or transfer all active animals.
- All `FarmUserAssignment` rows are removed.
- Historical reports and audit log remain accessible.

**Errors:** `FARMS.HAS_ACTIVE_ANIMALS`.

**Audit:** `farm.deactivate`.

---

## 5. Module: Animals

The central operational module: register, edit, list, and manage cattle.

### ANIMALS.01 — Register a new animal

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ❌ | ✅ | ❌ |

**Purpose:** Add a cow, bull, or calf to the herd.

**Inputs (required):** `farmId`, `earTagNumber`, `sex`, `birthDate`, `breedComposition` (array of `{breedId, percentage}`), `crossCategory` (when applicable).
**Inputs (optional):** `name`, `motherId`, `fatherId`, `acquisitionDate`, `acquisitionCost`, `estimatedValue`, `currency` (default farm's currency), `notes`, `metadata`.

**Outputs:** The created animal with its profile (Cow/Bull/Calf based on age and sex).

**Business rules (per `dataModel.md` §6.1, §6.2):**

- `(tenantId, earTagNumber)` is unique. Reusing tags from sold/deceased animals is forbidden.
- `birthDate ≤ today` and `≥ today − 30 years`.
- `breedComposition` percentages must sum to exactly **100.00**.
- `crossCategory` constraints:
  - `PURE` → exactly one row of 100.
  - `F1` → exactly two rows of 50/50.
  - `BACKCROSS_75_25` → two rows of 75/25.
  - `BACKCROSS_87_13` → two rows of 87.5/12.5.
  - `COMPLEX` → three or more rows summing to 100.
  - `UNKNOWN` → single row referencing the seeded `Mestizo` or `Cruce` breed at 100%.
- Parentage validation:
  - `motherId` (if set): must exist in this tenant, `sex = FEMALE`, `birthDate < this.birthDate`.
  - `fatherId` (if set): must exist in this tenant, `sex = MALE`, `birthDate < this.birthDate`.
  - Cycle prevention: an animal cannot be its own ancestor.
- Initial `status = ACTIVE`.
- The system creates the appropriate profile based on age and sex:
  - Age < 18 months → `CalfProfile` with `status = NURSING`.
  - Age ≥ 18 months and `sex = FEMALE` → `CowProfile`.
  - Age ≥ 18 months and `sex = MALE` → `BullProfile` with `bullType = LIVE_ON_FARM` by default; OWNER may set `bullType = SEMEN_DONOR` post-creation if applicable.

**Edge cases:**

- Ear tag was previously used by a sold cow → error `ANIMALS.EAR_TAG_REUSE_FORBIDDEN`.
- Mother is deceased but birthdate is correct → allowed (mother ID retained for genealogy).
- Mother and father are siblings → soft warning `ANIMALS.SIBLING_PARENTS_WARNING`; user may proceed with explicit acknowledgement.
- Acquisition cost provided in a currency different from the farm's → error `ANIMALS.CURRENCY_MISMATCH`.

**Errors:**

| Code                                    | HTTP |
| --------------------------------------- | ---- |
| `ANIMALS.EAR_TAG_REUSE_FORBIDDEN`       | 409  |
| `ANIMALS.BREED_COMPOSITION_INVALID`     | 422  |
| `ANIMALS.PARENT_NOT_FOUND`              | 422  |
| `ANIMALS.PARENT_WRONG_SEX`              | 422  |
| `ANIMALS.PARENT_NOT_OLDER`              | 422  |
| `ANIMALS.GENEALOGY_CYCLE`               | 422  |
| `ANIMALS.CURRENCY_MISMATCH`             | 422  |

**Audit:** `animal.create`.

---

### ANIMALS.02 — List animals with filters

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ✅ | ✅ | ✅ |

**Purpose:** Browse the herd with rich filtering for everyday operations.

**Filters:**

- `farmId`, `status[]`, `sex`, `breedId`, `crossCategory`, `searchByEarTagOrName`.
- Age range: `bornAfter`, `bornBefore`.
- Reproductive: `hasActivePregnancy`, `lactationCountMin`, `lactationCountMax`.
- Health: `mastitisRiskTier ∈ { LOW, MODERATE, HIGH }`.
- Production: `averageDailyMilkLitersMin`, `averageDailyMilkLitersMax`.
- `isBullCandidate` (calves only).
- Pagination: `page`, `limit` (default 20, max 100).
- Sort: `createdAt | name | earTagNumber | birthDate | averageDailyMilkLiters` × `asc | desc`.

**Visibility rules:**

- Default excludes `SOLD` and `DECEASED` animals; toggle `includeTerminal=true` to include them.
- VETERINARIAN and EMPLOYEE only see animals on farms they have a `FarmUserAssignment` for.

**Audit:** none for reads.

---

### ANIMALS.03 — View animal detail

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ✅ | ✅ | ✅ |

**Purpose:** Show the full profile of a single animal.

**Returned tabs (the API exposes one endpoint that returns aggregated data; the UI presents tabs):**

- **Overview:** identity, status, breed composition, parents, current value, age, days in herd.
- **Production:** lactation periods summary, current daily/weekly/30-day average, peak, lactation curve.
- **Reproduction:** active and historical pregnancies, current status, days since last birth, expected next heat.
- **Health:** vaccinations, treatments, illnesses, current withholding period (if any), mastitis history, next due events.
- **Genealogy:** mother, father, siblings, offspring, ancestry summary (full tree via ANIMALS.04).
- **Photos:** carousel of `AnimalPhoto`.
- **Finance:** transactions tagged to this animal, calf rearing cost (if calf), estimated current value with the bull-candidate premium when applicable.
- **Notes & history:** free-form notes, audit log entries for this animal.

**Errors:** `NOT_FOUND` if the animal is in a different tenant or does not exist.

---

### ANIMALS.04 — View genealogy tree

See module **Genealogy (§6)**. Listed here for cross-reference because it is invoked from the animal detail view.

---

### ANIMALS.05 — Update animal

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ❌ | ✅ | ❌ |

**Purpose:** Modify mutable fields of an animal.

**Inputs:** any of `name`, `breedComposition` (full replacement), `motherId`, `fatherId`, `notes`, `metadata`, `estimatedValue`. Plus the required `version` for optimistic locking.

**Business rules:**

- `earTagNumber` is **immutable**. Errors in registration require deactivation + re-creation with a new tag (or, with OWNER override, a special `animal.correct_ear_tag` flow that fires a high-severity audit entry — deferred to v1.1).
- `sex`, `birthDate` are **immutable**.
- Updating parents triggers re-validation of genealogy invariants.
- Replacing `breedComposition` requires the new set to sum to 100.00 in the same transaction.
- `version` mismatch → `OPTIMISTIC_LOCK_CONFLICT`.

**Audit:** `animal.update` with old/new values.

---

### ANIMALS.06 — Change animal status

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ✅ | ❌ | ❌ |

**Purpose:** Move an animal between operational states (per `businessRules.md` §1).

**Allowed transitions** (per `dataModel.md` §6.1):

```
ACTIVE      → PREGNANT, DRY, QUARANTINED, SOLD, DECEASED
PREGNANT    → ACTIVE, DRY
DRY         → ACTIVE, PREGNANT
QUARANTINED → ACTIVE
SOLD        → (terminal)
DECEASED    → (terminal)
```

**Inputs:** `animalId`, `newStatus`, `effectiveDate` (defaults to today), `reason?`, `version`.

**Status-specific behaviors:**

- `→ DRY`:
  - If invoked by `OWNER` (not `VETERINARIAN`): show recommendation *"Se recomienda confirmar este cambio con el veterinario antes de proceder."* and record `metadata.dryConfirmationNotice = true`. Action proceeds.
  - Auto-marks the cow's open `LactationPeriod.dryOffDate = effectiveDate` if one exists.
- `→ QUARANTINED`: future milk records will be auto-flagged unfit.
- `→ SOLD`: requires a sale `FinancialTransaction` of type `ANIMAL_SALE` with the sale amount. The system suggests the animal's `estimatedValue`. `exitDate = effectiveDate`, `exitReason` populated.
- `→ DECEASED`: requires `exitReason`. Auto-generates a `FinancialTransaction` of type `ANIMAL_DEATH_LOSS` with `amount = estimatedValue` (override permitted). `exitDate = effectiveDate`.
- `→ PREGNANT`: not invoked directly by this endpoint. Use REPRODUCTION.01 (register pregnancy) which transitions automatically.

**Errors:**

| Code                                  | HTTP |
| ------------------------------------- | ---- |
| `ANIMALS.INVALID_STATUS_TRANSITION`   | 422  |
| `ANIMALS.SOLD_REQUIRES_SALE_TX`       | 422  |
| `ANIMALS.DECEASED_REQUIRES_REASON`    | 422  |

**Audit:** `animal.status_change` with `from`, `to`, `effectiveDate`.

---

### ANIMALS.07 — Mark calf as bull candidate

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ✅ | ❌ | ❌ |

**Purpose:** Flag a male calf as a future breeding bull (per `businessRules.md` §3.2).

**Inputs:** `calfId`, `isBullCandidate` (boolean), `bullCandidateNotes?`.

**Business rules:**

- Animal must have `sex = MALE` and an active `CalfProfile`.
- Setting to `true` records `bullCandidateMarkedAt = now()` and `bullCandidateMarkedBy = userId`.
- Setting to `false` clears those timestamps.
- The animal's `estimatedValue` reflects a bull-candidate premium at read time (default +20%, configurable per farm via `bullCandidatePremiumPercent`).

**Errors:** `ANIMALS.NOT_MALE_CALF`.

**Audit:** `calf.mark_bull_candidate` or `calf.unmark_bull_candidate`.

---

### ANIMALS.08 — Record a weight measurement

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ✅ | ✅ | ❌ |

**Purpose:** Add a weight record to an animal's history.

**Inputs:** `animalId`, `weightKg`, `measuredAt` (default today), `notes?`.

**Business rules:**

- `weightKg ∈ (0, 2000]`.
- `measuredAt ≥ animal.birthDate` and `≤ today`.
- Append-only (corrections create a new record).
- The animal's profile re-derives age curves and growth metrics on read.

**Audit:** `weight_record.create`.

---

### ANIMALS.09 — Upload animal photo

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ❌ | ✅ | ❌ |

**Purpose:** Attach a photo to an animal.

**Flow (presigned upload, per `decisions.md` ADR-020):**

1. Client requests a presigned upload URL: `POST /animals/:id/photos/initiate` → returns `{ uploadUrl, storageKey }`.
2. Client uploads the binary directly to S3 using the presigned URL.
3. Client confirms upload: `POST /animals/:id/photos/complete` with `{ storageKey, contentType, sizeBytes, caption? }`.

**Business rules:**

- `contentType ∈ { image/jpeg, image/png, image/webp }`.
- `sizeBytes ≤ 10 MiB`.
- Maximum 50 photos per animal (soft limit — additional uploads are allowed but oldest photos are flagged for archival).

**Errors:** `ANIMALS.PHOTO_TYPE_NOT_ALLOWED`, `ANIMALS.PHOTO_TOO_LARGE`.

**Audit:** `animal_photo.create`.

---

### ANIMALS.10 — Delete animal photo

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ❌ | ✅ (own uploads only) | ❌ |

**Purpose:** Remove a photo (soft hides; physical deletion happens in a scheduled cleanup job after 30 days).

**Business rules:**

- An EMPLOYEE can delete only photos they uploaded.
- The OWNER can delete any photo on the farm.

**Audit:** `animal_photo.delete`.

---

### ANIMALS.11 — Compute estimated value

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ✅ | ❌ | ✅ |

**Purpose:** Provide a system-computed reference price (read-only on detail view).

**Algorithm (per `businessRules.md` §7.1):**

The estimated value is computed as a base value adjusted by factors. The base is determined by the animal's category:

- Adult cow: `weightKg × baseRatePerKgDairy` (configurable per farm).
- Adult bull: `weightKg × baseRatePerKgBeef` (configurable per farm).
- Calf: `birthWeightKg × calfBaseRate` (configurable per farm).

Adjustments (multiplicative):

| Factor                                                  | Effect                                                 |
| ------------------------------------------------------- | ------------------------------------------------------ |
| Pure breed (cross category `PURE`)                      | × 1.15                                                 |
| F1 cross                                                | × 1.05                                                 |
| Mastitis risk `HIGH`                                    | × 0.80                                                 |
| Cow with `lactationCount` ≥ 3 successful pregnancies     | × 1.10                                                 |
| Cow with `peakDailyMilkLiters` > farm average + 30%      | × 1.10                                                 |
| Calf marked `isBullCandidate`                            | × (1 + farm's `bullCandidatePremiumPercent` / 100)     |
| Animal age > 10 years (cow) or > 8 years (bull)         | × 0.85                                                 |
| Animal in `QUARANTINED` status                          | × 0.90 (with note "valor reducido por cuarentena")     |

The final value is **a recommendation**; the OWNER may override `Animal.estimatedValue` manually via ANIMALS.05.

**Output:** `{ recommendedValue, currency, breakdown: [...] }`. The breakdown lists each factor and its contribution for transparency.

---

## 6. Module: Genealogy

Recursive ancestry queries and inbreeding analysis.

### GENEALOGY.01 — Get ancestry tree

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ✅ | ✅ | ✅ |

**Purpose:** Display the maternal and paternal ancestors of an animal (per `decisions.md` ADR-022).

**Inputs:** `animalId`, optional `depth` (default 4, max 8).

**Outputs:** A nested JSON structure:

```json
{
  "id": "...",
  "name": "Bessie",
  "earTagNumber": "COW-001",
  "sex": "FEMALE",
  "birthDate": "2020-03-15",
  "breedSummary": "100% Holstein",
  "mother": { ... recursive ... },
  "father": { ... recursive ... }
}
```

**Implementation:** PostgreSQL `WITH RECURSIVE` CTE, parameterized via `Prisma.sql`. Indexes on `motherId` and `fatherId` are mandatory.

**Business rules:**

- The recursion is bounded by `depth` (server-enforced; client-supplied values clamped to `[1, 8]`).
- Sold/deceased ancestors are still returned — genealogy persists.
- Animals with no recorded parents render `null` for that branch.

---

### GENEALOGY.02 — Get descendants

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ✅ | ✅ | ✅ |

**Purpose:** List the direct offspring (and optionally grand-offspring) of an animal.

**Inputs:** `animalId`, `depth` (default 1).

**Outputs:** Tree of descendants with the same recursive structure as ancestry but expanding via `WHERE motherId = ? OR fatherId = ?`.

---

### GENEALOGY.03 — Compute kinship coefficient

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ✅ | ❌ | ✅ |

**Purpose:** Estimate the genetic kinship coefficient between two animals (used for inbreeding detection in REPRODUCTION.01).

**Inputs:** `animalAId`, `animalBId`, optional `depth` (default 4).

**Algorithm (simplified):**

- Build the ancestor sets `A` and `B` up to `depth` generations using the recursive CTE.
- For each common ancestor `c`, contribute `(0.5 ^ (gen_in_A + gen_in_B + 1))` to the coefficient.
- Sum over all common ancestors.

**Output:** `{ coefficientPercent, commonAncestors: [...] }`.

**Business rule (per `dataModel.md` §13.2):**

- A coefficient > **6.25%** triggers `INBREEDING_WARNING` notifications and warnings at pregnancy registration.
- This is a **simplified estimate**, not a true Wright's coefficient with full inbreeding-of-ancestors corrections; documented as an approximation. A more sophisticated implementation is deferred to a future phase.

---

### GENEALOGY.04 — Find siblings

Returns animals sharing at least one parent with the target. Useful for breeding decisions.

---

## 7. Module: Reproduction

### REPRODUCTION.01 — Register a pregnancy

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ✅ | ✅ | ❌ |

**Purpose:** Record a confirmed pregnancy (per `businessRules.md` §2).

**Inputs (required):** `motherId`, `conceptionMethod`, `conceptionDate`.
**Inputs (conditional):**
- `NATURAL_MATING` → `fatherId` (an `Animal` with `sex = MALE` in this tenant).
- `ARTIFICIAL_INSEMINATION` → `semenStrawId` *or* `fatherId` (the latter when the donor is registered with `BullProfile.bullType = SEMEN_DONOR`).
- `EMBRYO_TRANSFER` → reference text in `notes` (full embryo-transfer modeling deferred).

**Inputs (optional):** `confirmedAt` (date of vet confirmation), `notes`.

**Outputs:** The created `Pregnancy` with computed `estimatedBirthDate` (281 days), `estimatedBirthDateMin` (279 days), `estimatedBirthDateMax` (283 days), and the mother's status auto-set to `PREGNANT`.

**Business rules (per `dataModel.md` §7.1):**

- Mother validation:
  - `mother.sex = FEMALE`.
  - `mother.status ∉ { SOLD, DECEASED }`.
  - `mother.status = DRY` is allowed (a dry cow can become pregnant).
- Conception method requirements:
  - `NATURAL_MATING` requires `fatherId`.
  - `ARTIFICIAL_INSEMINATION` requires either `semenStrawId` (preferred) or `fatherId` referencing a registered semen donor.
- `conceptionDate ≤ today`.
- **Heifer age check:** `conceptionDate ≥ mother.birthDate + 12 months`. Hard reject if `< 9 months`; soft warning if `9 ≤ months < 12`.
- **Active pregnancy uniqueness:** if the mother already has `Pregnancy.outcome = PENDING`, error `REPRODUCTION.PREGNANCY_ALREADY_ACTIVE`.
- **Post-partum interval check:** if the mother's most recent successful pregnancy ended `< 45 days` before `conceptionDate`, soft warning `"Han pasado menos de 45 días desde el último parto..."`. The user must explicitly acknowledge to proceed; logged in `metadata.postPartumWarning = true`.
- **Post-adverse-event check:** if the mother's previous pregnancy ended in `ABORTION` or `COMPLICATIONS`, **mandatory acknowledgement** required: `"El último evento reproductivo fue un aborto o tuvo complicaciones..."`. Logged in `metadata.postAdverseEventAcknowledged = true` with the acknowledging user's ID.
- **Inbreeding check:** compute the kinship coefficient between mother and father (or the donor bull behind a semen straw). If `> 6.25%`, soft warning `INBREEDING_WARNING`. Coefficient stored in `metadata.kinshipCoefficient`.
- **Primiparous flagging:** `isPrimiparous = (mother.cowProfile.lactationCount = 0 AND mother.cowProfile.firstCalvingDate IS NULL)`.
- **Semen straw decrement:** when `semenStrawId` is set, the straw's `quantityAvailable` decrements by 1 in the same transaction. If `quantityAvailable = 0` or `isUsable = false`, error `REPRODUCTION.STRAW_UNAVAILABLE`.
- The mother's `Animal.previousStatus` is captured before the transition to allow returning to `DRY` if she was dry.
- The mother's `Animal.status` becomes `PREGNANT`.

**Edge cases:**

- Father is sold/deceased → still allowed (the pregnancy was already conceived; record retrospective).
- Father is from a different farm in the same tenant → allowed.
- Mother already pregnant on a different farm? Cannot happen — animals belong to a single farm at a time.

**Errors:**

| Code                                       | HTTP |
| ------------------------------------------ | ---- |
| `REPRODUCTION.MOTHER_NOT_FEMALE`           | 422  |
| `REPRODUCTION.MOTHER_TERMINAL`             | 422  |
| `REPRODUCTION.HEIFER_TOO_YOUNG`            | 422  |
| `REPRODUCTION.PREGNANCY_ALREADY_ACTIVE`    | 409  |
| `REPRODUCTION.METHOD_REQUIRES_FATHER`      | 422  |
| `REPRODUCTION.METHOD_REQUIRES_STRAW`       | 422  |
| `REPRODUCTION.STRAW_UNAVAILABLE`           | 409  |
| `REPRODUCTION.POST_ADVERSE_NOT_ACKNOWLEDGED` | 422 |

**Audit:** `pregnancy.create` plus any `*.acknowledge_warning` entries for soft warnings.

---

### REPRODUCTION.02 — Confirm a pregnancy (vet check)

Optional follow-up: when the OWNER registered a pregnancy speculatively and the VET later confirms, this endpoint sets `Pregnancy.confirmedAt = today`.

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ✅ | ❌ | ❌ |

---

### REPRODUCTION.03 — Close a pregnancy with outcome

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ✅ | ❌ | ❌ |

**Purpose:** Record the result of a pregnancy: birth, abortion, or complications.

**Inputs:** `pregnancyId`, `outcome`, `actualBirthDate` (for `SUCCESSFUL`), per-calf data when `SUCCESSFUL` (one or more calves: `sex`, `birthWeightKg`, `name?`, `earTagNumber`, optional override `breedComposition`), `notes?`, `version`.

**Outputs:** Updated pregnancy + (if applicable) one or more newly-created `Animal` rows with `CalfProfile`.

**Business rules (per `businessRules.md` §2.5 and §3.1):**

- `outcome ∈ { SUCCESSFUL, ABORTION, COMPLICATIONS }`. `PENDING → PENDING` is invalid.
- The pregnancy must currently have `outcome = PENDING`.

**`outcome = SUCCESSFUL`:**
- `actualBirthDate` required, must be `≤ today` and `≥ conceptionDate + 240 days` (sanity bound for premature births).
- For each calf, the system auto-creates a new `Animal` row with:
  - `tenantId`, `farmId` from the mother.
  - `sex` from input.
  - `motherId = pregnancy.motherId`, `fatherId = pregnancy.fatherId` (or the donor bull behind the straw).
  - `birthDate = actualBirthDate`.
  - `breedComposition`: auto-computed as the 50/50 average of mother's and father's compositions (per `dataModel.md` §6.2). Override permitted via input.
  - `CalfProfile` with `birthWeightKg` from input, `status = NURSING`, `pregnancyId = this.pregnancy.id`.
- Mother's status returns to `previousStatus` (typically `ACTIVE`; or `DRY` if she was dry pre-pregnancy).
- Mother's `CowProfile.lactationCount += 1`, `lastCalvingDate = actualBirthDate`, `firstCalvingDate = lastCalvingDate` if previously null.
- A new `LactationPeriod` is created: `startDate = actualBirthDate + 1 day`, `lactationNumber = cowProfile.lactationCount`, `transitionEndDate = startDate + 14 days`.
- For each calf, a `CalfRearingCost` row is initialized (zeroed).

**`outcome = ABORTION` or `COMPLICATIONS`:**
- No calf is created.
- Mother returns to `previousStatus` (typically `ACTIVE`).
- The next pregnancy registration will trigger the mandatory acknowledgement.
- A high-priority `Notification` is created for the OWNER and assigned VETERINARIAN.

**Bull statistics update:**
- If `fatherId` is set: `BullProfile.totalMatings += 1`. If `outcome = SUCCESSFUL`: `BullProfile.successfulMatings += 1`. After update, evaluate the low-fertility threshold (per `dataModel.md` §6.4): `totalMatings ≥ 10 AND successRate < 30%` → flag `lowFertilityFlagged = true` and emit `LOW_FERTILITY` notification.

**Edge cases:**

- Twins / triplets: input may include 2+ calves. Each gets its own `Animal` and `CalfProfile`.
- Calf is stillborn: register the calf with `Animal.status = DECEASED` and `exitReason = "Stillborn"` in the same flow.
- Mother dies during birth: outcome may still be `SUCCESSFUL` (calf survives) or `COMPLICATIONS`. The mother's status separately moves to `DECEASED` via ANIMALS.06.

**Errors:**

| Code                                            | HTTP |
| ----------------------------------------------- | ---- |
| `REPRODUCTION.PREGNANCY_NOT_PENDING`            | 409  |
| `REPRODUCTION.BIRTH_DATE_OUT_OF_RANGE`          | 422  |
| `REPRODUCTION.MISSING_CALF_DATA`                | 422  |

**Audit:** `pregnancy.close` with `outcome`, plus `animal.create` per calf, plus `cow_profile.update` (lactation count), plus `lactation_period.create`.

---

### REPRODUCTION.04 — Cancel a pregnancy (correction)

When a pregnancy was registered in error (e.g., wrong cow, wrong date), an OWNER or VETERINARIAN may cancel it. This is **not** the same as `outcome = ABORTION` — it's a record-correction action.

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ✅ | ❌ | ❌ |

**Inputs:** `pregnancyId`, `reason` (required, free text), `version`.

**Business rules:**

- The pregnancy is marked with the outcome `CANCELLED_CORRECTION` (defined in `dataModel.md` §12.6). It is excluded from "previous adverse event" detection — the next pregnancy attempt for this cow does **not** require the post-adverse-event mandatory acknowledgement.
- Mother's status returns to `previousStatus`.
- If a `semenStrawId` was assigned, the straw's `quantityAvailable += 1` is restored.
- The cancellation is loud in the audit log (`pregnancy.cancel_correction` action with the user-provided `reason`).

**Audit:** `pregnancy.cancel_correction` with reason.

---

### REPRODUCTION.05 — List upcoming births

Returns cows with `Pregnancy.outcome = PENDING` ordered by `estimatedBirthDate` ascending. Used by the dashboard.

---

### REPRODUCTION.06 — Detect upcoming heat windows

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ✅ | ✅ | ✅ |

**Purpose:** Display estimated heat windows for cows that are eligible to be bred (per `businessRules.md` §8.3).

**Algorithm:**

For each cow in the herd:
- Skip if `status ∈ { PREGNANT, SOLD, DECEASED, QUARANTINED }`.
- Skip if cow is < 12 months old.
- Reference event:
  - If a previous pregnancy was successful, use `actualBirthDate + 45 days` as the earliest expected first heat post-partum.
  - Otherwise, use the most recent recorded heat (if any) or the cow's last `lastCalvingDate`.
- Estimated next heat: 21-day cycles from the reference event.
- Surface the next 3 estimated heat dates in a 90-day forward window.

**Notifications:**

- A daily background job emits `HEAT_DETECTION` notifications **5 days before** each estimated heat for owners and assigned employees.

**Caveat:** heat estimation is statistical, not biological. The UI clearly labels these as estimates and encourages observed-heat recording for accuracy.

---

### REPRODUCTION.07 — Record an observed heat

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ✅ | ✅ | ❌ |

**Purpose:** Capture an observed heat event so future estimates anchor on real data.

**Inputs:** `cowId`, `observedAt` (timestamp).

**Storage:** observed heats are stored as `HealthEvent` rows with `eventType = CHECKUP` and a structured marker in `description`/`metadata` (alternatively a dedicated `HeatEvent` table — open question; current implementation uses `HealthEvent` with `metadata.subtype = 'heat_observation'`).

**Business rules:**

- A cow may have multiple observed heats; the most recent informs the next-heat estimate.
- Observed heat in a `PREGNANT` cow → soft warning (heat in pregnancy is unusual; may indicate pregnancy loss).

**Audit:** `health_event.create` with subtype `heat_observation`.

---

## 8. Module: Semen Straws Inventory

Catalog and lifecycle management of semen straws (per `businessRules.md` §6).

### STRAWS.01 — Register a new semen straw entry

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ✅ | ❌ | ❌ |

**Purpose:** Add a new straw type to the inventory (or restock an existing one).

**Inputs (required):** `farmId`, `donorBullName`, `donorBreedName` (or `donorBreedId`), `registrationCode`, `productionCenter`, `semenType`, `pricePerStraw`, `quantityAvailable`.
**Inputs (optional):** `donorBullId` (link to a registered `BullProfile.bullType = SEMEN_DONOR`), `donorBreedId`, `originCountry`, `batchNumber`, `pedigree` (JSONB), `productiveIndices` (JSONB), `sanitaryTests` (JSONB), `freezingDate`, `tankColorCode`, `notes`, `currency` (default farm's).

**Outputs:** The created straw entry.

**Business rules (per `dataModel.md` §7.2):**

- `(tenantId, registrationCode)` is unique. Restocking an existing entry uses STRAWS.05 instead.
- `pricePerStraw > 0`, `quantityAvailable ≥ 0`.
- If `donorBullId` is set, the linked bull must have `BullProfile.bullType = SEMEN_DONOR`.
- A `FinancialTransaction` of type `SEMEN_PURCHASE` is suggested but not auto-created — open decision (future enhancement could auto-link).

**Errors:** `STRAWS.DUPLICATE_REGISTRATION_CODE`, standard.

**Audit:** `semen_straw.create`.

---

### STRAWS.02 — List straws

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ✅ | ❌ | ✅ |

Filters: `farmId`, `donorBreedId`, `semenType`, `isUsable`, `quantityAvailableMin`, `tankColorCode`. Sort by `freezingDate`, `createdAt`, `quantityAvailable`.

---

### STRAWS.03 — View straw detail

Includes `quantityAvailable`, list of pregnancies that consumed straws from this entry, total consumed, total spent.

---

### STRAWS.04 — Mark straw as unusable

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ✅ | ❌ | ❌ |

**Purpose:** Flag straws that suffered cold-chain breach or accidental thawing.

**Inputs:** `strawId`, `unusableReason` (required), `version`.

**Business rules:**

- Sets `isUsable = false`.
- Future pregnancy registrations cannot reference this straw.
- The remaining `quantityAvailable` is preserved (for accounting), but marked unusable.

**Audit:** `semen_straw.mark_unusable`.

---

### STRAWS.05 — Restock straws

Increments `quantityAvailable` for an existing entry. Optionally creates a linked `FinancialTransaction`.

---

### STRAWS.06 — Adjust quantity (correction)

For inventory audits. Sets `quantityAvailable` to a new value with a mandatory `reason`. Loudly audited.

---

### STRAWS.07 — View consumption history

Lists every `Pregnancy` that referenced this straw, with success rate computed from those pregnancies.

---

## 9. Module: Milk Production

Daily milk recording per cow, in two configurable modes (per `businessRules.md` §5.1).

### PRODUCTION.01 — Record a milk session (PER_SESSION mode)

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ❌ | ✅ | ❌ |

**Purpose:** Capture morning/afternoon/evening milking volumes.

**Inputs:** `cowId`, `productionDate` (default today), `session` (`MORNING | AFTERNOON | EVENING`), `liters`, `recordedAt?` (timestamp), `notes?`.

**Behavior:**

- Looks up the existing `MilkProductionRecord` for `(cowId, productionDate)` or creates one.
- Updates the corresponding `morningLiters` / `afternoonLiters` / `eveningLiters` and `*RecordedAt` timestamp.
- Recomputes `dailyTotalLiters = morningLiters + afternoonLiters + eveningLiters`.

**Business rules (per `dataModel.md` §8.1):**

- `cow.sex = FEMALE`, age ≥ 18 months at `productionDate`.
- `cow.status ∈ { ACTIVE, PREGNANT, QUARANTINED }`. **Hard block on `DRY`, `SOLD`, `DECEASED`** with `PRODUCTION.STATUS_BLOCKS_RECORD`.
- The farm's `milkingMode` must be `PER_SESSION`. If the farm is in `DAILY_TOTAL` mode, error `PRODUCTION.WRONG_MILKING_MODE`.
- `liters ≥ 0`.
- Per-session sanity bound: `liters ≤ 60`. Above → soft warning + explicit confirmation; user may proceed if confirmed.
- `productionDate ≤ today`.
- **Unfit-milk auto-flagging:**
  - If `cow.status = QUARANTINED` at `productionDate` → `isFitForCommercial = false`, `unfitReason = QUARANTINED_ANIMAL`.
  - If a `MedicationWithholdingPeriod` covers `productionDate` for this cow → `isFitForCommercial = false`, `unfitReason = MEDICATION_WITHHOLDING`, `withholdingPeriodId` populated.
  - If `productionDate ≤ cow.cowProfile.lastCalvingDate + 14 days` → `isFitForCommercial = false`, `unfitReason = COLOSTRUM_PERIOD`.
  - **No UI override** for any unfit reason.
- The first session of the day (typically before 6 AM) is informational; specific morning hour is free.

**Edge cases:**

- Updating a session that already exists → overwrites the previous value (within 7-day edit window). Audit log captures both versions.
- Submitting after the 7-day edit window → must use a separate "milk correction" flow restricted to OWNER (deferred to v1.1).

**Errors:**

| Code                                  | HTTP |
| ------------------------------------- | ---- |
| `PRODUCTION.STATUS_BLOCKS_RECORD`     | 422  |
| `PRODUCTION.AGE_BELOW_MINIMUM`        | 422  |
| `PRODUCTION.WRONG_MILKING_MODE`       | 422  |
| `PRODUCTION.SANITY_LIMIT_EXCEEDED`    | 422  (soft warning, requires confirmation) |
| `PRODUCTION.RECORD_LOCKED`            | 422  |

**Audit:** `milk_production.create` or `milk_production.update_session`.

---

### PRODUCTION.02 — Record a daily total (DAILY_TOTAL mode)

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ❌ | ✅ | ❌ |

**Purpose:** Capture the entire day's volume in a single number when the farm is in `DAILY_TOTAL` mode.

**Inputs:** `cowId`, `productionDate`, `dailyTotalLiters`, `notes?`.

**Behavior:**

- Creates or updates the `MilkProductionRecord` for `(cowId, productionDate)`.
- Session fields are 0; `dailyTotalLiters` is taken directly from input.

**Business rules:**

- All the same status / age / unfit-milk auto-flagging rules apply as in PRODUCTION.01.
- Sanity bound: `dailyTotalLiters ≤ 120`.
- The farm's `milkingMode` must be `DAILY_TOTAL`. If `PER_SESSION`, error `PRODUCTION.WRONG_MILKING_MODE`.

**Audit:** `milk_production.create` or `milk_production.update_total`.

---

### PRODUCTION.03 — Bulk record (CSV / Excel import)

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ❌ | ✅ | ❌ |

**Purpose:** Import many records at once from a spreadsheet.

**Flow:**

1. User uploads a file matching the template.
2. The system parses, validates, and shows a preview with `valid` and `invalid` rows highlighted.
3. User confirms; the system commits only the valid rows in chunks of 200 rows per transaction.
4. Invalid rows are returned in a downloadable error report.

**Validation:**

- All PRODUCTION.01 / PRODUCTION.02 rules apply per row.
- Duplicate `(cowId, productionDate)` within the file → first wins, others marked invalid.

**Errors:** `PRODUCTION.INVALID_TEMPLATE`, `PRODUCTION.FILE_TOO_LARGE` (max 5 MiB).

---

### PRODUCTION.04 — Record quality metrics

Adds `fatPercentage` and `proteinPercentage` to an existing record. Both ∈ `[0, 10]`. Permission: `O`, `E`.

---

### PRODUCTION.05 — Production report (per cow / per period)

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ✅ | ❌ | ✅ |

**Purpose:** Aggregate milk production for analysis.

**Inputs:** `cowId?` (omit for tenant-wide), `farmId?`, `from`, `to`, `granularity` (`DAY | WEEK | MONTH`), `commercialOnly` (boolean — default `true`, includes only `isFitForCommercial = true`).

**Outputs:** time series + aggregates: total liters, average daily, peak daily, count of unfit days with breakdown by `unfitReason`.

---

### PRODUCTION.06 — Lactation curve

Returns the per-day production for a single `LactationPeriod`. Used to render the curve on the cow's profile and detect anomalies.

---

### PRODUCTION.07 — Mastitis risk monitor (background job)

A scheduled job runs every hour:

- For each cow with `cowProfile.averageDailyMilkLiters ≥ farm.metadata.highProductionThresholdLiters` (default 15) and `isCurrentlyLactating = true`:
  - Find the most recent `MilkProductionRecord` and the latest session timestamp within it.
  - If the gap from `now()` to that timestamp exceeds `farm.metadata.mastitisGapHours` (default 14), emit a `MASTITIS_RISK` notification (severity `WARNING`) targeting the farm's OWNER and assigned EMPLOYEEs.
- Notifications are de-duplicated: at most one open `MASTITIS_RISK` notification per cow at a time.

---

### PRODUCTION.08 — Lactation-curve anomaly detection (background job)

A daily job:

- For each cow with an open `LactationPeriod` past the `transitionEndDate`:
  - Compute the 3-day moving average of `dailyTotalLiters` (commercial only).
  - Compare with the previous 7-day baseline.
  - If the 3-day average is `> 20%` below the baseline, emit `LOW_PRODUCTION` (severity `WARNING`) for the cow.

---

## 10. Module: Lactation Tracking

Manages the lifecycle of `LactationPeriod` rows.

### LACTATION.01 — View open lactation

Returns the current open `LactationPeriod` for a cow. Includes `daysSinceCalving`, `currentDayInLactation`, `cumulativeCommercialLiters`, `peakDailyLiters`, `peakDayOffset`, projected vs. actual.

---

### LACTATION.02 — Dry off cow

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ✅ | ❌ | ❌ |

**Purpose:** End the open lactation period and transition the cow to `DRY` status.

**Inputs:** `cowId`, `dryOffDate` (default today).

**Business rules:**

- The cow must have an open `LactationPeriod` (`dryOffDate IS NULL`).
- `dryOffDate ≥ LactationPeriod.startDate`.
- Sets `LactationPeriod.dryOffDate = input`.
- Sets `Animal.status = DRY` (uses ANIMALS.06 internally; preserves `previousStatus`).
- If invoked by `OWNER` (not `VETERINARIAN`), the recommendation `"Se recomienda confirmar este cambio con el veterinario antes de proceder."` is shown and recorded.

**Audit:** `lactation_period.dry_off`.

---

### LACTATION.03 — Reopen lactation (correction)

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ❌ | ❌ | ❌ |

**Purpose:** Undo an erroneous dry-off.

**Business rules:**

- The cow's status returns to `previousStatus`.
- `LactationPeriod.dryOffDate = null`.
- Heavily audited; requires a `reason` field.

**Errors:** `LACTATION.NOT_CLOSED`.

**Audit:** `lactation_period.reopen` with reason.

---

### LACTATION.04 — Lactation overdue alert (background job)

Daily job: for each cow with an open `LactationPeriod` and `today - startDate > farm.metadata.lactationStandardDays` (default 305):

- Emit `LACTATION_OVERDUE` notification (severity `INFO`) suggesting the OWNER consider drying off.
- De-duplicate: at most one open per cow.

---

## 11. Module: Health

Vaccinations, treatments, and observations.

### HEALTH.01 — Record a health event

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ✅ | ❌ | ❌ |

**Purpose:** Capture a vaccination, treatment, illness, checkup, deworming, injury, or surgery (per `dataModel.md` §9.1).

**Inputs (required):** `animalId`, `eventType`, `eventDate` (default today), `description`.
**Inputs (optional):** `veterinarianId`, `productName`, `dosage`, `cost`, `nextDueDate`, `attachments` (array of S3 keys), `withholdingDays?` (manual override; if absent and `productName` is in the catalog, the system computes automatically).

**Outputs:** The created `HealthEvent`. If a withholding period applies, a linked `MedicationWithholdingPeriod` is also created.

**Business rules:**

- `eventDate ≥ animal.birthDate`, `≤ today`.
- `cost ≥ 0` when set.
- `nextDueDate > eventDate` when set.
- `description` non-empty after trim.
- **Withholding period auto-creation:** if `eventType = TREATMENT` AND (`productName` matches the medication catalog OR `withholdingDays` is provided):
  - Create a `MedicationWithholdingPeriod` with `startDate = eventDate`, `endDate = eventDate + days`, `source = CATALOG_LOOKUP | MANUAL_OVERRIDE | VET_PRESCRIBED` accordingly.
  - Link it via `HealthEvent.withholdingPeriodId`.
- **Mastitis detection:** if `eventType = ILLNESS` AND `description` matches the mastitis keyword catalog (case-insensitive: `mastitis`, `mastitica`, `mamitis`):
  - Increment `cow.cowProfile.mastitisCaseCount += 1`.
  - Update `cow.cowProfile.lastMastitisDate = eventDate`.
  - If new `mastitisCaseCount ≥ 3`, surface "considerar para descarte" indicator and emit a `HEALTH.HIGH_MASTITIS_RISK` notification.

**Edge cases:**

- Recording a vaccination that re-uses a `nextDueDate` that already exists → allowed (boosters are valid).
- `eventDate` after the animal was sold/deceased → soft warning ("este animal ya no está activo").

**Errors:**

| Code                              | HTTP |
| --------------------------------- | ---- |
| `HEALTH.INVALID_EVENT_DATE`       | 422  |
| `HEALTH.WITHHOLDING_INVALID`      | 422  |

**Audit:** `health_event.create` plus `medication_withholding.create` if applicable.

---

### HEALTH.02 — Health timeline for an animal

Returns the chronological sequence of `HealthEvent` rows for an animal, with active withholding periods overlaid.

---

### HEALTH.03 — Upcoming due events

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ✅ | ✅ | ✅ |

**Purpose:** List vaccinations/treatments due soon.

**Inputs:** `farmId?`, `daysAhead` (default 30).

**Outputs:** Events with `nextDueDate ≤ today + daysAhead` ordered ascending. For overdue events (`nextDueDate < today`), severity escalates.

**Background job:** emits `VACCINATION_DUE` notifications:
- 7 days before → `INFO` severity.
- 1 day before → `WARNING`.
- Day-of or after → `URGENT`.

---

### HEALTH.04 — Update / correct a health event

Append-only model: corrections create a new event with `metadata.correctsEventId = oldEventId` rather than editing in place. The original remains for audit.

---

### HEALTH.05 — Mastitis history view

Returns `mastitisCaseCount`, `lastMastitisDate`, list of mastitis events with treatments, current risk tier (`LOW`/`MODERATE`/`HIGH`).

---

## 12. Module: Medication Withholding

Tracks and enforces milk-withholding windows after medication (per `projectbrief.md` non-negotiable #12).

### WITHHOLDING.01 — List active withholding periods

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ✅ | ✅ | ✅ |

Returns all `MedicationWithholdingPeriod` rows with `endDate ≥ today` for animals on the farms the user can access. Used by the dashboard to remind staff which cows' milk is currently unfit.

---

### WITHHOLDING.02 — Check unfit status for a cow on a date

Internal helper used by PRODUCTION.01 / PRODUCTION.02. Returns a boolean and the matching withholding period (if any).

---

### WITHHOLDING.03 — Manual withholding override

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ✅ | ❌ | ❌ |

**Purpose:** Allow a vet to record a withholding period for a medication not in the catalog, or to extend a known one.

**Inputs:** `animalId`, `productName`, `startDate`, `endDate`, `notes` (required).

**Business rules:**

- `endDate ≥ startDate`.
- `source = MANUAL_OVERRIDE` if invoked by OWNER without VETERINARIAN role; `VET_PRESCRIBED` if invoked by VETERINARIAN.
- Cannot **shorten** an active period below the catalog's value when one exists. To allow earlier resumption, the user must contact the medication manufacturer for documented support — this is a non-negotiable safety measure.

**Errors:** `WITHHOLDING.CANNOT_SHORTEN_BELOW_CATALOG`.

**Audit:** `medication_withholding.create_manual`.

---

### WITHHOLDING.04 — Withholding-ended notification (background job)

Daily job: for each `MedicationWithholdingPeriod` whose `endDate = yesterday`, emit a `WITHHOLDING_ENDED` notification: *"La leche de [animal] ya es apta para venta comercial."*

---

### WITHHOLDING.05 — Catalog management

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ❌ | ❌ | ❌ |

The medication catalog (product name → withholding days) lives in a versioned configuration file in v1.0 (per `dataModel.md` §9.2 and open question #12 in `projectbrief.md`). Tenants cannot modify it; future iterations may move it to a database table editable per tenant.

---

## 13. Module: Finance

Financial transactions and per-animal cost basis.

### FINANCE.01 — Record a financial transaction

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ❌ | ❌ | ❌ |

**Purpose:** Capture an income or expense event tied to the farm and optionally a specific animal.

**Inputs (required):** `farmId`, `type`, `amount`, `description`, `occurredOn`.
**Inputs (optional):** `animalId`, `currency` (default farm's), `metadata`.

**Outputs:** The created `FinancialTransaction` with computed `direction`.

**Business rules (per `dataModel.md` §10.1):**

- `amount > 0`. The direction (income/expense) is encoded in `type`, not in the sign of `amount`.
- `currency` must match the farm's currency in v1.0 (single-currency per tenant).
- `occurredOn ≤ today`.
- For `type ∈ { ANIMAL_PURCHASE, ANIMAL_SALE }`, `animalId` should be set; warning if absent.
- For `type = ANIMAL_SALE`, the animal's `status` must subsequently transition to `SOLD` (this endpoint does not auto-transition; ANIMALS.06 does).

**Special case — animal death:** This module also handles the auto-suggestion when an animal is marked `DECEASED`:
- ANIMALS.06 (status change to `DECEASED`) auto-creates a `FinancialTransaction` of type `ANIMAL_DEATH_LOSS` (a first-class enum value, not `OTHER_EXPENSE` with metadata), with `amount = animal.estimatedValue` (override permitted), `description = "Pérdida de activo: [reason]"`. This keeps death losses as a clean, dedicated line in profitability reports — distinct from genuine "other" expenses.

**Errors:**

| Code                                   | HTTP |
| -------------------------------------- | ---- |
| `FINANCE.CURRENCY_MISMATCH`            | 422  |
| `FINANCE.AMOUNT_INVALID`               | 422  |
| `FINANCE.FUTURE_DATE_NOT_ALLOWED`      | 422  |

**Audit:** `financial_transaction.create`.

---

### FINANCE.02 — List transactions

Filters: `farmId`, `type[]`, `direction`, `animalId`, `from`, `to`, `recordedBy`. Sort by `occurredOn DESC` default. To filter for animal deaths specifically, use `type=ANIMAL_DEATH_LOSS` (cleaner than the v1.1 metadata-based filter).

---

### FINANCE.03 — Reverse a transaction

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ❌ | ❌ | ❌ |

**Purpose:** Compensate an erroneous transaction.

**Behavior:** Creates a new transaction with opposite `direction` and `metadata.reverses = originalTxId`. The original is **not** deleted.

**Audit:** `financial_transaction.reverse`.

---

### FINANCE.04 — Profitability report

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ❌ | ❌ | ✅ |

**Purpose:** Show income, expense, and net for the farm or per-animal.

**Inputs:** `farmId?`, `animalId?`, `from`, `to`, `groupBy` (`MONTH | QUARTER | YEAR | ANIMAL`).

**Outputs:**

- Aggregated buckets with `totalIncome`, `totalExpense`, `net`, top expense categories.
- For per-animal mode: a leaderboard of most profitable / least profitable animals over the period, factoring milk income (computed from `MilkProductionRecord` × farm's milk price configuration), animal sales, and direct expenses tagged to the animal.

---

### FINANCE.05 — Cost basis per animal

Returns lifetime sum of all `FinancialTransaction` rows tagged to the animal, plus the `CalfRearingCost` aggregate if the animal was raised on the farm. Used to compute "is this cow profitable?" answers.

---

### FINANCE.06 — Configure farm milk price

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ❌ | ❌ | ❌ |

**Purpose:** Set the farm's expected milk sale price per liter (for opportunity-cost calculations and profitability reports).

**Stored in:** `Farm.metadata.milkPricePerLiter`.

---

## 14. Module: Calf Rearing Cost

Aggregates the cost of raising a calf from birth to weaning (per `dataModel.md` §10.2).

### CALF_COST.01 — View calf rearing cost

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ✅ | ❌ | ✅ |

**Purpose:** Show the cumulative cost components for a specific calf.

**Outputs:** `milkConsumedLiters`, `milkConsumedValue`, `feedCost`, `medicationCost`, `veterinaryCost`, `laborEstimateValue`, `totalCost`, `lastComputedAt`.

---

### CALF_COST.02 — Recompute calf rearing cost

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ❌ | ❌ | ❌ |

**Purpose:** Force a fresh computation outside the nightly job.

**Algorithm:**

For a calf with `CalfProfile.status ∈ { NURSING, WEANED }`:

1. **Milk consumed (estimated, since calves nurse from mother):**
   - During the nursing window (`birthDate` to `weaningDate`, or `today` if unweaned), assume average daily consumption of `farm.metadata.calfDailyMilkLiters` (default 4 L/day). Actual measurement is impractical without sensors.
   - `milkConsumedValue = milkConsumedLiters × farm.metadata.milkPricePerLiter`.
2. **Feed cost:** sum of `FinancialTransaction` of type `FEED_PURCHASE` tagged to this calf (via `animalId`) or with `metadata.calfId` matching.
3. **Medication cost:** sum of `MEDICATION_PURCHASE` and treatment-linked `VETERINARY_SERVICE` transactions tagged to the calf.
4. **Veterinary cost:** sum of `VETERINARY_SERVICE` transactions.
5. **Labor estimate:** `farm.metadata.calfLaborDailyEstimate × daysSinceBirth`.

**Total = sum of above.**

**Storage:** `CalfRearingCost` row updated, `lastComputedAt = now()`.

**Audit:** `calf_rearing_cost.recompute`.

---

### CALF_COST.03 — Background job: nightly recompute

A scheduled job runs nightly at 02:00 farm-time (the farm's tz):
- For every calf with `CalfProfile.status ∈ { NURSING, WEANED }` updated since the last run, recompute its cost.
- Calves promoted to adult freeze their cost (no further recomputation).

---

## 15. Module: Notifications & Alerts

In-app notifications and email delivery for time-sensitive domain events.

### NOTIFICATIONS.01 — List notifications

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ✅ | ✅ | ✅ |

Filters: `unreadOnly`, `type[]`, `severity[]`, `from`, `to`, `relatedAnimalId`. Default sort: `createdAt DESC`. Pagination.

---

### NOTIFICATIONS.02 — Mark notification as read

Sets `readAt = now()` on a single notification or in bulk.

---

### NOTIFICATIONS.03 — Notification dispatch (background job)

A scheduled job orchestrates the creation and delivery of all alerts. The full catalog of automatic notifications:

| Type                          | Trigger                                                                          | Severity | Recipients                       |
| ----------------------------- | -------------------------------------------------------------------------------- | -------- | -------------------------------- |
| `UPCOMING_BIRTH`              | Cow with `Pregnancy.outcome = PENDING`, days-to-`estimatedBirthDate` ∈ {30,15,7} | INFO/WARNING/URGENT | OWNER + assigned VET    |
| `VACCINATION_DUE`             | `HealthEvent.nextDueDate` − today ∈ {7,1,0,−n}                                    | INFO/WARNING/URGENT | OWNER + assigned VET    |
| `HEAT_DETECTION`              | Estimated heat date is 5 days away                                                | INFO     | OWNER + assigned EMPLOYEE        |
| `MASTITIS_RISK`               | High-producer cow > 14h without milking session                                   | WARNING  | OWNER + assigned EMPLOYEE        |
| `LACTATION_OVERDUE`           | Open lactation > 305 days                                                         | INFO     | OWNER                            |
| `LOW_PRODUCTION`              | 3-day moving average drop > 20% off baseline                                      | WARNING  | OWNER + assigned VET             |
| `INBREEDING_WARNING`          | New pregnancy with kinship coefficient > 6.25%                                    | WARNING  | OWNER + assigned VET             |
| `LOW_REPRODUCTIVE_EFFICIENCY` | Cow > 400 days since last birth without active pregnancy                          | INFO     | OWNER                            |
| `LOW_FERTILITY`               | Bull conception rate < 30% with ≥ 10 services                                     | WARNING  | OWNER                            |
| `PRIMIPAROUS_ATTENTION`       | Primiparous cow's `estimatedBirthDate` − today ∈ {15, 7, 3, 1, 0}                 | WARNING/URGENT | OWNER + assigned VET       |
| `WITHHOLDING_ENDED`           | Withholding `endDate = yesterday`                                                 | INFO     | OWNER + assigned EMPLOYEE        |
| `GENERAL`                     | System messages, billing, etc.                                                    | INFO     | OWNER                            |

**De-duplication:** for cyclical alerts (mastitis, lactation overdue), at most one open per cow at a time.

**Email delivery:** notifications with severity `URGENT` are also emailed to the recipient if their `User.notificationPreferences.email ∈ { ALL, URGENT_ONLY }`. `WARNING` is emailed if preference is `ALL`. `INFO` is in-app only by default.

---

### NOTIFICATIONS.04 — Notification preferences

Per-user settings: which severities are emailed, in-app only, or muted entirely. Stored in `User.metadata.notificationPreferences`.

---

## 16. Module: Reports & Exports

PDF and Excel export of operational, reproductive, and financial data.

### REPORTS.01 — Animal profile PDF

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ✅ | ❌ | ✅ |

**Purpose:** Generate a clean, professional one-pager for an animal — used when selling, when meeting a buyer, when applying for credit.

**Contents:**

- Header: farm name, ear tag, name, photo, breed composition, age, status.
- Production summary (last 12 months): total liters, peak, lactation count.
- Reproductive history: pregnancy count, success rate, last calving.
- Health summary: last 12 months of events, current vaccinations.
- Genealogy: 3 generations on each side.
- Estimated value with breakdown.

**Generation:** server-side via Playwright printing a templated React page to PDF. Files are uploaded to S3 and a presigned download URL is returned (TTL 1 hour). The user can also email it from within the app.

---

### REPORTS.02 — Herd inventory export

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ✅ | ❌ | ✅ |

Excel file listing every animal on the farm with all key fields. Filterable.

---

### REPORTS.03 — Production report export

PDF or Excel of the production data behind PRODUCTION.05.

---

### REPORTS.04 — Profitability report export

PDF of FINANCE.04.

---

### REPORTS.05 — Tenant data export (right to portability)

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ❌ | ❌ | ❌ |

**Purpose:** Per `projectbrief.md` non-negotiable #7, the OWNER can request a full ZIP archive of every entity in the tenant.

**Flow:**

1. OWNER requests export.
2. A background job assembles the archive (JSON files per entity + manifest).
3. When ready (typically minutes), an email and in-app notification with a presigned download link (TTL 24 hours).

**Audit:** `tenant.data_export`.

---

## 17. Module: Dashboard

The home screen for each role.

### DASHBOARD.01 — Owner dashboard

**Tiles (in order of importance):**

1. **Today's milking session** — current in-progress milking with quick-tap rows for each cow.
2. **Upcoming events (7 days):** births, vaccinations, heats, withholding endings.
3. **Active pregnancies:** count, list of upcoming births.
4. **Production summary:** today vs. yesterday, last 7 days trend.
5. **Active alerts:** mastitis-risk, low production, low fertility, lactation overdue.
6. **Herd quick stats:** total active animals, calves nursing, dry cows, quarantined.
7. **Financial snapshot (current month):** income, expense, net.

---

### DASHBOARD.02 — Veterinarian dashboard

**Tiles:**

1. **Animals on my farms:** quick switcher between assigned farms.
2. **Upcoming vet-relevant events:** vaccinations due, pregnancies near birth, primiparous attention.
3. **Active mastitis cases.**
4. **Active withholding periods I prescribed.**
5. **Recent observations awaiting vet review.**

---

### DASHBOARD.03 — Employee dashboard

**Tiles:**

1. **Today's milking session.**
2. **Today's tasks** (suggested by the system: weights to record, calves to weigh, observations needing capture).
3. **Recent records I created** (for quick correction within the 7-day window).

---

### DASHBOARD.04 — Auditor dashboard

**Tiles:**

1. **Recent audit log entries.**
2. **Financial overview.**
3. **Data quality indicators:** count of cows without recent milk records, active warnings, unfit-milk volume.

---

## 18. Module: Audit Log

Immutable record of every critical action.

### AUDIT.01 — List audit entries

| | O | V | E | A |
| --- | --- | --- | --- | --- |
| Permission | ✅ | ❌ | ❌ | ✅ |

Filters: `entityType`, `entityId`, `userId`, `action`, `from`, `to`. Pagination and sorting.

**Visibility:** OWNER and AUDITOR only. Sensitive fields (`passwordHash`, `mfaSecret`) display as `"***REDACTED***"`.

---

### AUDIT.02 — View audit entry detail

Single entry with `oldValues` and `newValues` rendered as a diff.

---

### AUDIT.03 — Audit export

Excel export of filtered audit entries. Used during compliance audits.

---

## 19. Module: Offline & Sync

PWA capability for field data capture without connectivity.

### OFFLINE.01 — Offline-capable flows (whitelist)

The following flows are guaranteed to work offline (per `productContext.md` §10.6 and the `projectbrief.md` non-negotiable #8):

- PRODUCTION.01 / PRODUCTION.02 — record milk session / daily total.
- ANIMALS.08 — record weight.
- HEALTH.01 — record health event (without auto-creation of withholding period until sync; the period is created during sync if applicable).
- ANIMALS.01 — register an animal (limited to required fields; advanced fields require connectivity).
- REPRODUCTION.07 — record observed heat.

**Not offline-capable:**

- All financial flows.
- Reports and exports.
- User management.
- Genealogy queries (the recursive CTE requires the database).
- Settings.

---

### OFFLINE.02 — Local storage

Offline data is persisted in **IndexedDB** with a structured schema that mirrors the API request payloads, plus:

- `pendingId` (UUID generated locally; replaced by server ID after sync).
- `createdAtLocal` (the device's local time at write).
- `syncStatus` (`PENDING | SYNCING | SYNCED | FAILED`).
- `lastSyncAttemptAt`, `syncError` if any.

---

### OFFLINE.03 — Sync algorithm

When the device regains connectivity, the Service Worker triggers a sync:

1. Read all `PENDING` entries from IndexedDB.
2. Group by entity type; process in dependency order (animals before milk records, etc.).
3. For each entry, POST to the API with an `Idempotency-Key` header set to the local `pendingId`.
4. On 2xx: update local entry with `syncStatus = SYNCED`, server-assigned ID.
5. On 4xx (validation): mark `FAILED`, surface in the conflict-resolution UI.
6. On 5xx or network error: keep `PENDING`, exponential backoff up to 1 hour between retries.

**Idempotency:** the API honors `Idempotency-Key` for write operations. If the same key arrives twice, the second request returns the original response without re-processing.

---

### OFFLINE.04 — Conflict resolution

When the same record (e.g., milk for cow X on date Y) is edited offline by two devices:

- The first sync wins (server timestamp ordering).
- The second sync receives `OPTIMISTIC_LOCK_CONFLICT`.
- The conflicting record is moved to a "Conflicts" view, where the user sees the server's current values vs. their local values, side by side.
- The user picks one or merges field-by-field. The result is sent as a normal update with the now-current `version`.
- The audit log captures the conflict resolution as `<entity>.conflict_resolved`.

**No silent data loss.** This is non-negotiable per `projectbrief.md` #8.

---

### OFFLINE.05 — Offline indicator

The UI shows a small status icon:

- 🟢 Online and synced.
- 🟡 Offline, N records pending.
- 🔴 Online but sync error (with link to view).

The icon is the only intrusive indicator of offline mode. The rest of the UI behaves identically.

---

## 20. Cross-Cutting Features

### CROSS.01 — Tenant scoping enforcement

Every API endpoint that returns or mutates domain data filters by `tenantId` derived from the JWT. Integration tests verify cross-tenant access returns `NOT_FOUND` (not `FORBIDDEN`, to avoid leaking the existence of resources in other tenants).

---

### CROSS.02 — Internationalization (UI)

In v1.0, the UI is **Spanish-only** (`es-CO`). All user-facing strings are in `apps/web/src/locales/es-CO.json` and accessed via a translation hook. The architecture supports future locales without code changes; only translation files need to be added (English and Brazilian Portuguese in Year 2).

---

### CROSS.03 — Time and timezone handling

- Server stores all timestamps in UTC.
- The frontend converts to the **farm's** configured timezone for display.
- Date-only fields (`birthDate`, `eventDate`, etc.) are stored as `DATE` and rendered as-is — no timezone conversion.
- The "today" used in business rules is computed as `today_in_farm_timezone()`.

---

### CROSS.04 — Optimistic concurrency

All mutating endpoints on entities with a `version` column require the client to submit the `version` they read. Mismatch returns `OPTIMISTIC_LOCK_CONFLICT` (HTTP 409). The client refreshes and retries.

---

### CROSS.05 — Idempotency for write operations

Endpoints that create resources accept an `Idempotency-Key` header (UUID). The server stores `(idempotencyKey, response)` pairs in Redis with a 24-hour TTL. Duplicate requests with the same key return the cached response.

---

### CROSS.06 — Rate limiting

| Bucket                      | Limit                                |
| --------------------------- | ------------------------------------ |
| Per IP, per auth endpoint   | 10 / 15 minutes                      |
| Per (IP, email) login       | 10 / 15 minutes                      |
| Per IP, per registration    | 5 / hour                             |
| Per user, all endpoints     | 200 / minute                         |
| Per tenant, write endpoints | 600 / minute                         |
| Per tenant, export jobs     | 5 / day                              |

Rate-limited responses include `Retry-After` headers.

---

### CROSS.07 — Search

Animals are searchable by ear tag and name with case-insensitive substring matching, leveraging PostgreSQL `ILIKE`. Future enhancements may add full-text search via `tsvector` on `description` and `notes` fields.

---

### CROSS.08 — Pagination

Standard pagination contract for list endpoints:

```json
{
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 234,
    "totalPages": 12
  }
}
```

Cursor-based pagination is reserved for high-cardinality timeline endpoints (audit logs, milk records); offset-based for the rest.

---

### CROSS.09 — Error response format (RFC 7807)

```json
{
  "type": "https://cattlepro.dev/errors/REPRODUCTION.HEIFER_TOO_YOUNG",
  "title": "REPRODUCTION.HEIFER_TOO_YOUNG",
  "status": 422,
  "detail": "La novilla debe tener al menos 12 meses al momento de la concepción.",
  "code": "REPRODUCTION.HEIFER_TOO_YOUNG",
  "errors": [
    { "path": "conceptionDate", "message": "..." }
  ]
}
```

---

### CROSS.10 — Audit logging

Every state-changing endpoint emits one or more `AuditLog` entries via the `AuditLogService`. The service is a NestJS `@Global()` provider available to every module. Failure to write an audit entry is **never** silently ignored — it raises an alert and may roll back the originating transaction depending on the entity's criticality (financial transactions and animal status changes always require audit; less critical events like notification reads do not).

---

## Document Maintenance

This document is updated whenever a feature is added, removed, or significantly changed. A feature ticket is not Done until this document reflects the change (per `projectbrief.md` non-negotiable #10).

When this document conflicts with `businessRules.md` on a domain matter, **`businessRules.md` wins**. When it conflicts with `dataModel.md` on a structural matter, the conflict triggers a discussion before either document is changed.

Substantive feature additions require a PR titled `docs(features): <module> - <short description>` with reviewers from both product and engineering.
