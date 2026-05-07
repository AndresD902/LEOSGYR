# Product Context — CattlePro

> **Status:** Draft v1.0
> **Last updated:** 2026-05-02
> **Owner:** Product
>
> This document grounds the product in the *real life of the user*. Where `projectbrief.md` defines **what** we are building and **why it matters as a business**, this document defines **how the product fits into the user's day**, **what jobs they are hiring it to do**, and **what experience principles guide every decision**.
>
> When in doubt about a product decision, this document is the second place to look (after `projectbrief.md`).

---

## Table of Contents

1. [Why CattlePro Exists](#1-why-cattlepro-exists)
2. [The User's World Today](#2-the-users-world-today)
3. [Jobs to Be Done](#3-jobs-to-be-done)
4. [Day in the Life — Before vs. After](#4-day-in-the-life--before-vs-after)
5. [The User Journey](#5-the-user-journey)
6. [Experience Principles](#6-experience-principles)
7. [Core User Flows](#7-core-user-flows)
8. [Emotional Journey & Moments That Matter](#8-emotional-journey--moments-that-matter)
9. [What Success Looks Like for the User](#9-what-success-looks-like-for-the-user)
10. [Anti-Patterns to Avoid](#10-anti-patterns-to-avoid)

---

## 1. Why CattlePro Exists

A small or medium cattle farm is a complex, living business. Every animal is simultaneously an asset, a production unit, a medical patient, and a member of a multi-generational pedigree. The decisions a farmer makes daily — *which cow to breed*, *which to sell*, *which is sick*, *which is producing below potential* — depend on data that is largely **invisible** in current operations.

That invisibility has costs:

- A cow that should have been bred three weeks ago, but was missed, costs roughly a month of future milk income.
- A vaccination skipped because the schedule lived in someone's head triggers a herd-wide outbreak.
- A bull whose semen produces poor offspring keeps being used because nobody connects the genealogy to the production data.
- A cow sold below market value because the owner cannot prove her production history.

CattlePro exists to **make the invisible visible** — to turn the daily acts of farming (a milk bucket weighed, an ear tag glanced at, a heat detected) into structured, durable data that compounds into better decisions.

The product's reason for being is not to digitize the farm. It is to give the farmer the same operational clarity an industrial operator has, at a price they can afford, with a tool they can actually use.

---

## 2. The User's World Today

### 2.1 The physical context

The farmer's "office" is the milking parlor at 4:30 AM, the corral at 11:00 under direct sun, the back of a pickup truck with the laptop on the dashboard, the kitchen table at 9:00 PM after dinner. They are rarely sitting at a desk. They wear gloves. Their hands are wet, dirty, or cold. Their phone is the most reliable computer they own, and its battery is at 38% by mid-afternoon.

Connectivity is uneven. Some areas of the farm have signal, others do not. Wi-Fi reaches the house but not the milking parlor. Mobile data exists but data plans are limited and roaming is expensive. Power outages happen. Devices get dropped, splashed, and stepped on.

### 2.2 The cognitive context

A working cattle farm has somewhere between **20 and 500 entities** the owner needs to think about. Each one has a name or number, a status, a history, a relationship to others. The farmer's working memory has to hold all of this — and the daily reality is that some of it slips. A cow's last vaccination date. The exact day she was inseminated. Which calf this is — the second or the third out of that mother. Whether the bull is related to her closely enough that breeding would be a genetic problem.

The farmer is not stupid or careless. They are **carrying too much state in their head** while doing physical work. The current tools (notebook, spreadsheet, memory) leak that state.

### 2.3 The economic context

Margins are tight. A 100-head dairy farm in a typical Latin American market operates on single-digit percent margins per liter of milk. The cost of *one missed reproductive cycle* on *one cow* can be the entire monthly profit of that animal. Decisions that look small — keeping a low-producer "for one more year", buying a bull from an unverified source — compound into the difference between a farm that grows and one that contracts.

CattlePro must justify its monthly cost in this context. The math is simple: if it prevents *one* missed pregnancy or *one* unnecessary veterinary intervention per quarter, it has paid for itself for the year.

### 2.4 The social context

The farmer is rarely alone in operating the farm. There is a spouse who handles certain tasks, an employee or two, a vet who visits, a family member helping seasonally, an accountant who appears at tax time. Each of these people has a piece of the data — and right now, those pieces never meet. The vet writes on a paper. The employee tells the owner verbally. The accountant gets a folder of receipts in March.

When data lives in the heads and notebooks of multiple people, **the farm has no single source of truth**. CattlePro becomes that single source of truth.

---

## 3. Jobs to Be Done

The Jobs-to-Be-Done framework asks: *"When [situation], I want to [job], so I can [outcome]."* These are the jobs CattlePro is hired to do. They are written from the user's perspective, in their words.

### 3.1 Operational jobs (daily)

| When                                   | I want to                                       | So I can                                                  |
| -------------------------------------- | ----------------------------------------------- | --------------------------------------------------------- |
| I finish milking a cow                 | Record her milk volume in seconds               | Move on without breaking the rhythm of the milking shift  |
| I notice a cow in heat                 | Mark the date and time before I forget          | Schedule insemination at the right window                 |
| The vet finishes a treatment           | Record what was done and when the next dose is due | Avoid missing the booster and starting the cycle over   |
| I'm weighing calves                    | Capture each weight tied to the right calf      | Track growth without paper that gets lost                 |
| I notice an animal looks sick          | Write down what I saw with a photo              | Compare with the vet later or track if it gets worse      |

### 3.2 Decision-making jobs (weekly / monthly)

| When                                       | I want to                                                          | So I can                                                  |
| ------------------------------------------ | ------------------------------------------------------------------ | --------------------------------------------------------- |
| I'm deciding which cows to keep for next year | See production, age, and health for each one                    | Cull low-performers without second-guessing               |
| I'm planning breeding for the season       | See which cows can be bred and to which bulls without inbreeding   | Make pairings that improve the herd                       |
| The vet asks "when was she last vaccinated?" | Pull up her full health record on my phone, instantly             | Avoid duplicate or missed treatments                      |
| A buyer asks about a cow I'm selling       | Show production history, parents, and health from a clean report   | Sell at fair value with proof                             |
| I'm reviewing the month                    | See total milk, total cost, top and bottom producers               | Spot trends I would otherwise miss                        |

### 3.3 Strategic jobs (quarterly / yearly)

| When                                                  | I want to                                                                   | So I can                                                |
| ----------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------- |
| I'm doing taxes or applying for credit                | Export a clean financial summary                                            | Save hours and look professional                        |
| I'm evaluating whether a bull is worth the semen cost | See his offspring's production and survival rates                           | Drop poor genetics and double down on good ones         |
| I'm comparing this year to last year                  | See trends in herd size, total production, costs, and reproductive success  | Know if the farm is growing or stagnating               |
| An auditor or buyer wants to verify my data           | Show an immutable record of who did what and when                           | Build trust quickly                                     |

### 3.4 Coordination jobs (with other people)

| When                                            | I want to                                                          | So I can                                              |
| ----------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------- |
| I'm not at the farm and an employee is milking  | Trust that what they record is right and that I can see it later   | Run the farm without being physically present        |
| The vet visits while I'm away                   | Have the vet record directly into the system                       | Skip the phone call and the lost paper               |
| I'm onboarding a new employee                   | Show them the same screens I use, with simple flows                | Get them productive fast                              |

### 3.5 Reassurance jobs (emotional)

These are the jobs nobody states out loud but the product must serve:

- *I want to feel that nothing is slipping through the cracks.*
- *I want to feel that I am making decisions on facts, not memory.*
- *I want to feel that if something happens to me, my family can run the farm from the data.*
- *I want to feel that this is real software, not a school project — that my data is safe.*

These emotional jobs are why details like a clean UI, fast load times, clear notifications, and visible audit logs **matter**, even when they don't directly produce data.

---

## 4. Day in the Life — Before vs. After

A grounded narrative of how the product changes a real day.

### 4.1 Maria — owner of a 90-head dairy farm

#### Before CattlePro

**4:30 AM.** Maria walks into the milking parlor with her employee Luis. They start the routine. Luis writes the milk volumes in a notebook, one column per cow. Sometimes he forgets which cow is which because their ear tags are dirty.

**8:00 AM.** Maria is in the kitchen with coffee. The vet calls: he can come tomorrow to check Cow #47 for pregnancy. Maria thinks: *Wait, was she inseminated 30 days ago, or was that #74?* She walks to the office, finds last month's notebook, can't find the entry. She tells the vet "come anyway, we'll figure it out."

**11:00 AM.** A buyer arrives interested in three cows for sale. He asks for production history. Maria flips through three different notebooks, transcribing numbers into a Word document on her laptop. The transfer takes 40 minutes. The buyer offers a low price because the records are "incomplete."

**3:00 PM.** Maria notices Cow #23 isn't eating. She makes a mental note to call the vet. She gets distracted by a fence repair. She forgets.

**8:00 PM.** Maria opens her laptop to update the spreadsheet with the day's milk volumes from Luis's notebook. She finds three illegible entries and one she's pretty sure is wrong (a cow producing 45 liters in one shift — impossible).

**Mental load at end of day:** high. She's sure she forgot something. She did.

#### After CattlePro

**4:30 AM.** Luis opens CattlePro on his phone in the milking parlor — no signal there, but the app works offline. As he milks each cow, he taps the cow's tile, taps the milk volume, taps save. Three taps, two seconds. The phone is in his apron pocket between cows.

**6:30 AM.** Luis comes out of the parlor, his phone reconnects to Wi-Fi at the house, and the morning's records sync automatically.

**8:00 AM.** Vet calls about Cow #47. Maria opens the app, taps her name. The reproduction tab shows: *Inseminated 28 days ago. Pregnancy check due in 4 days.* She tells the vet: "Yes, come tomorrow, that's perfect timing for #47, and please also check #62."

**11:00 AM.** Buyer arrives. Maria taps "Generate report" on each of the three cows. PDFs land in her email. She forwards them. The buyer offers a fair price.

**3:00 PM.** Maria sees Cow #23 isn't eating. She opens the app, adds a health observation with a photo, taps "Notify vet on next visit." It's now in the system.

**8:00 PM.** Maria opens the dashboard. Today's totals are already there. Cow #58's production dropped 30% — flagged automatically. She adds a note to check her tomorrow.

**Mental load at end of day:** low. The app is holding the state. She is making decisions, not running an inventory in her head.

### 4.2 The compounding effect

Six months in, Maria is making different decisions:

- She culled three low-producing cows that previously "felt fine."
- She switched to a different bull's semen because the genealogy + production data showed his offspring were 12% below the herd average.
- She caught a respiratory cluster in week two by spotting a pattern of health observations she would have missed.
- She got a 4% better price on a bulk milk contract because she could prove quality consistency over twelve weeks.

These are not features. These are **outcomes** that emerged because the data was finally available. The product's job is to make those outcomes inevitable.

---

## 5. The User Journey

The journey from "person with a farm" to "active CattlePro user" to "advocate" has predictable stages. Each stage has a critical question and a failure mode.

### Stage 1 — Awareness

**Where they are:** Hearing about CattlePro from a neighbor, a vet, a feed-store flyer, or an Instagram ad.
**Critical question:** *"Is this for someone like me, or for big industrial farms?"*
**Failure mode:** Marketing language that smells like enterprise software. Screenshots full of charts they don't recognize. Pricing that requires "talking to sales."
**Product implication:** Marketing materials and onboarding screens must show real-sized farms (50–200 head), Spanish-speaking faces, dirty boots. Pricing must be transparent and self-serve.

### Stage 2 — Evaluation

**Where they are:** On the website, on a free-trial signup form, or talking to a salesperson.
**Critical question:** *"Will this actually work in the parlor at 5 AM with no signal?"*
**Failure mode:** Demos that only work on desktop. No mention of offline support. Sign-up requires a credit card before they can see the app.
**Product implication:** The free trial must be self-serve, must work on mobile from minute one, and the offline story must be visible early (in marketing, in onboarding, in the first walkthrough).

### Stage 3 — Onboarding

**Where they are:** Signed up. Empty dashboard. Wondering where to start.
**Critical question:** *"How do I get from zero to actually using this without spending a weekend?"*
**Failure mode:** A 30-step setup wizard. A demand to import all 90 animals before they can do anything. Forms with fields they don't know how to fill.
**Product implication:** They should be able to register **one** animal in under 60 seconds and immediately see the value (animal profile, ability to log a milk record). Bulk import is offered but never required. Optional fields are visibly optional. A guided tour is available but skippable.

### Stage 4 — First value

**Where they are:** They've used the app for one week. Two-three animals are registered. A few production records exist.
**Critical question:** *"Is this giving me anything I didn't already have?"*
**Failure mode:** The app feels like just another data-entry chore. No insights are surfaced.
**Product implication:** By day 7, the dashboard should show **at least one insight** the user did not have before — even if the dataset is small. Examples: "Cow Bessie has produced 15% more than the breed average for new mothers", "Vaccination for X is due in 5 days for 3 animals", "You've recorded 12 records this week, your most consistent yet."

### Stage 5 — Habituation

**Where they are:** Daily/weekly usage. Most of the herd is in the system. Family or employees are using it too.
**Critical question:** *"Is this earning its place in my routine?"*
**Failure mode:** Slow load times. Confusing notifications. A sync conflict that loses data. A bug that the user can't recover from.
**Product implication:** Reliability becomes the dominant feature. Performance must be ruthless. Notifications must be useful (not spammy). When something goes wrong, the recovery must be obvious.

### Stage 6 — Power use

**Where they are:** Three months in. The full herd is in the system. They're using reports, exports, the genealogy view, the financial module.
**Critical question:** *"What else can this do for me?"*
**Failure mode:** Hitting feature ceilings. Asking for export formats and getting "not supported." Wanting to invite a vet but having no shared-access model.
**Product implication:** Advanced features (custom reports, API access, multi-user roles, bulk operations) become discoverable as the user's data and confidence grow. Progressive disclosure is non-negotiable.

### Stage 7 — Advocacy

**Where they are:** Telling other farmers about CattlePro. Inviting the vet to use it on their farm. Posting on social media when something works well.
**Critical question:** *"Is this a tool I'm proud to be associated with?"*
**Failure mode:** Embarrassing UI choices. Buggy features visible to people they invited. Customer support that doesn't answer.
**Product implication:** The product is not just functional — it is **dignified**. The user does not feel cheap for using it.

---

## 6. Experience Principles

These principles are the heuristics every designer and engineer applies when making a product decision. They are derived from the personas, jobs-to-be-done, and the real conditions of use.

### 6.1 Three taps or fewer for daily actions

The most common daily action — recording a milk volume, marking heat detection, registering a weight — must be reachable in three taps from the home screen. If a flow grows past three taps, it gets redesigned, not rationalized.

### 6.2 Offline is a feature, not a fallback

We don't show "you are offline" warnings as if something is wrong. The app behaves the same way online and offline for the critical field flows. The only visible difference is a small icon indicating sync status. When connectivity returns, syncing happens silently.

### 6.3 The user's data is sacred

We never silently drop input. We never overwrite something the user typed without telling them. If a sync conflict occurs, we surface it in plain language and let the user choose. Loss of data is treated as a P0 incident.

### 6.4 Progressive disclosure

A new user sees a clean, minimal interface with the essential fields. A power user can access advanced fields, bulk operations, and reports. The advanced features are not hidden — they are **earned through context**. We don't dump all options on every screen.

### 6.5 Speak the user's language

We use the words farmers use. *Vaca*, not *bovine female*. *Pajilla*, not *frozen genetic material*. *Parto*, not *parturition event*. Spanish first; the language is plain, warm, and respectful. We avoid corporate jargon and we do not patronize.

### 6.6 Trust is earned in details

Audit logs are visible to owners. Export is one click. The user can see exactly when their last sync happened. Every notification has a clear sender and a clear action. Every error has a recovery path. We don't hide what the system is doing.

### 6.7 Forgiveness is built in

The app assumes the user will mistype, mistap, and misremember. Undo is available wherever it makes sense. Confirmations exist for destructive actions. The user can correct a milk record from yesterday, a weight from last week, a registration from last month — and the audit log records the correction without shaming the user.

### 6.8 No empty states

A new dashboard does not say "No data yet — please register your first animal." It says: *"Welcome. Let's add your first cow — it takes about a minute. Or skip and explore the demo data first."* Every empty state is an opportunity to teach and to invite.

### 6.9 Accessibility is non-optional

Large touch targets. High-contrast text. Readable in bright sunlight. Works with system-level font scaling. Keyboard navigable. Screen-reader compatible. These are baseline requirements, not enhancements.

### 6.10 Performance is a feature

Page load under 2 seconds on 3G. Offline interactions feel instant. Background sync never blocks the UI. A slow product, in this context, is a broken product.

---

## 7. Core User Flows

These are the canonical flows the product must execute flawlessly. Each is described from the user's perspective, not the system's.

### 7.1 Record a daily milk session

**Trigger:** It's milking time. The user enters the parlor.
**Goal:** Log production for each cow as they are milked.
**Path:**
1. Open app → "Today's milking" tile shows automatically (it's milking time, the app knows).
2. List of expected cows appears, sorted by stall order if configured.
3. Tap a cow → number pad appears → type liters → tap done → next cow auto-focuses.
4. At the end, the user sees the session total and can save or correct any entry.

**Why it matters:** This is the highest-frequency action in the system. If it is awkward, nothing else matters.

### 7.2 Register a new animal

**Trigger:** A new calf is born, or a cow is purchased.
**Goal:** Get the animal into the system with at least the minimum required data.
**Path:**
1. Tap "+" → "New animal."
2. Required fields only: ear tag, sex, breed, birth date.
3. Optional, expandable: parents, photo, notes, weight, acquisition cost.
4. Save → animal appears in the herd list with a confirmation toast.

**Why it matters:** This is the entry point for every other module. It must be fast and forgiving.

### 7.3 Log a heat detection

**Trigger:** The user observes a cow in heat (signs of estrus).
**Goal:** Record the date/time so insemination can be scheduled.
**Path:**
1. Find the cow (search or list).
2. Tap "Heat detected" → date/time pre-filled with now → confirm.
3. App suggests an insemination window and offers to schedule a reminder.

**Why it matters:** Missed heat detection is the #1 cause of lost reproductive cycles. The app must reduce friction to near zero.

### 7.4 Record a health event

**Trigger:** Vaccination, treatment, illness observation, vet visit.
**Goal:** Capture what happened, with enough structure to alert about follow-ups.
**Path:**
1. Animal profile → "Health" tab → "+".
2. Pick event type (vaccination / treatment / observation / etc.).
3. Required fields: date, description. Optional: product, dosage, cost, next due date.
4. Save → if `next due date` was set, a reminder is created automatically.

**Why it matters:** This is where the system earns its keep on missed vaccinations and follow-ups.

### 7.5 Confirm a pregnancy

**Trigger:** Vet visits and confirms an animal is pregnant.
**Goal:** Move the animal into the pregnancy lifecycle and project an expected birth date.
**Path:**
1. Animal profile → "Reproduction" tab → "Confirm pregnancy."
2. Select method (natural / AI / embryo transfer), date of conception, father (with autocomplete by ear tag or name).
3. App calculates expected birth date (≈283 days for cattle).
4. Save → the cow's status changes to "Pregnant" everywhere, and a calendar reminder is created for the expected birth.

**Why it matters:** A clean reproductive timeline is the foundation of dairy economics.

### 7.6 View an animal's full story

**Trigger:** Someone asks about a specific cow (vet, buyer, the user themselves).
**Goal:** See everything about that animal in one place.
**Path:**
1. Search by name or ear tag → tap the result.
2. Tabs: *Overview*, *Production*, *Reproduction*, *Health*, *Genealogy*, *Photos*, *Notes*.
3. Each tab loads progressively; the overview shows the most-asked-for facts at the top.

**Why it matters:** The "tell me about this cow" question happens many times a week. It must be instant.

### 7.7 Resolve a sync conflict

**Trigger:** Two users edited the same record offline; both come online and sync.
**Goal:** Let the user decide which version to keep, without losing information.
**Path:**
1. App shows a non-blocking banner: *"One record had conflicting changes. Review."*
2. The user opens the conflict view: side-by-side comparison of fields.
3. They pick a side or merge field-by-field.
4. The audit log records both versions and the chosen resolution.

**Why it matters:** Conflicts are rare but high-stakes. The user must trust the recovery path.

### 7.8 Generate a report

**Trigger:** The user needs to share data — with a vet, buyer, accountant, lender.
**Goal:** Produce a clean, professional document.
**Path:**
1. From the relevant context (an animal, a herd view, a date range), tap "Export."
2. Choose format (PDF / Excel / both).
3. Choose what to include (defaults are sensible).
4. Generate → file is emailed and also available in-app.

**Why it matters:** This is when the user gets to "show off" the system to outsiders. It must look professional.

---

## 8. Emotional Journey & Moments That Matter

Beyond the functional flows, the product creates a series of emotional moments. The good ones create loyalty; the bad ones create churn.

### 8.1 Moments of delight (we engineer for these)

- The first time a cow's profile loads with her photo, name, and last 30 days of production charted — *"This is what I always wanted to see in one place."*
- The first time a vaccination reminder fires and the user catches it in time — *"It saved me."*
- The first time a sync completes silently after an offline morning — *"It just works."*
- The first time a buyer says "this is a really professional report" — *pride*.
- The first time a generated insight surprises the user with something true — *"I didn't know that."*

### 8.2 Moments of risk (we engineer to avoid these)

- A field worker tries to record a milk volume offline, taps save, sees an error. *Trust collapses immediately.*
- A user mistypes a number, doesn't notice, and it skews their dashboard for a week. *We failed to provide a sanity check.*
- A sync conflict erases what the user typed last night. *We violated the data-is-sacred principle.*
- A notification fires for an event the user already handled. *We made the user feel managed by their tool.*
- A bug causes a temporary 500 error during a vet visit. *The user is embarrassed in front of the vet.*

The product team treats moments-of-risk events as P0 — even rare ones — because of their disproportionate effect on trust.

### 8.3 The hidden curriculum

Every interaction teaches the user something about the system:
- *Speed teaches:* "this is reliable."
- *Clarity teaches:* "this respects me."
- *Recovery from errors teaches:* "this is on my side."
- *Sensible defaults teach:* "this knows my world."
- *Audit log visibility teaches:* "this is honest."

We are not just shipping features. We are teaching, in every interaction, that the system is **trustworthy**. That trust is what unlocks the deeper value of the product.

---

## 9. What Success Looks Like for the User

We measure ourselves not by the features shipped, but by what becomes true for the user.

A successful user, six months in:

- **Has stopped using their notebook.** Not because we forbade it — because they don't need it anymore.
- **Knows the names and statuses of more animals than they did before.** The cognitive offload created room for noticing.
- **Has had at least one moment where the system caught something they would have missed.** A vaccination, a heat, a drop in production, an inbreeding risk.
- **Has shared at least one report with someone outside the farm.** And it landed well.
- **Trusts the system with their data.** They don't double-record in another tool "just in case."
- **Has invited at least one other person to use it with them.** Spouse, employee, vet.
- **Is making at least one decision per quarter based on data they didn't have before.** Culling, breeding, purchasing, selling.

If these things are true, we have done our job. If they are not, no amount of features or charts will save us.

---

## 10. Anti-Patterns to Avoid

Things we will *not* do, no matter how tempting they look in a roadmap discussion.

### 10.1 Pretending to be enterprise software

We will not bury simple actions under "modules" and "workflows" and dashboards full of charts the user does not understand. The visual language is clean and modern but never imposing. A 200-head dairy is not a Fortune 500 supply chain.

### 10.2 Gamifying farming

We will not give the user badges for "10 days streak of milk recording." Their work is not a game and treating it like one is patronizing. We surface insights, not points.

### 10.3 Drowning the user in notifications

Every notification has to earn its place. If a user starts ignoring notifications, we have failed. Better to send three useful ones a week than fifteen mediocre ones.

### 10.4 Asking the user to teach the system

We do not ask the user to "configure their workflow," "customize their fields," or "set up their preferences" before they can do anything. We ship sensible defaults and let advanced configuration emerge.

### 10.5 Hiding bad news

If sync failed, we say so. If a payment didn't go through, we say so. If we lost a record, we say so and we tell the user how to recover. Hiding bad news destroys trust the moment it is discovered.

### 10.6 Over-engineering the offline story

The offline experience is a finite set of well-tested flows: record production, weight, heat, health observation, animal registration. Not everything needs to work offline. Reports, complex queries, settings, billing — these can require connectivity. We optimize the offline experience for the *5 things the user does in the parlor*, not for *every screen*.

### 10.7 Treating veterinarians as edge-case users

Vets are a primary persona. Their experience matters. We do not build the vet view as a stripped-down version of the owner view. We build it for what *they* need: fast access to medical history, easy event recording, multi-farm switching.

### 10.8 Designing for ourselves

We do not design for what makes sense to a software engineer in a city. We design for what makes sense to a farmer at 5 AM in the rain. Every flow is validated with real users in real conditions before it ships.

---

## Document Maintenance

This document is reviewed quarterly and updated when:

- A new persona becomes important enough to formalize.
- A new job-to-be-done emerges from user research.
- An experience principle is challenged and either reaffirmed or evolved.
- A user flow becomes obsolete or a new core flow is added.

Substantive changes require a PR titled `docs(product-context): <short description>` with Product owner approval. Minor edits (typos, link fixes) can be made directly.

When this document and a feature ticket disagree, the document wins. The feature ticket is updated, or the team brings the disagreement to Product for resolution.
