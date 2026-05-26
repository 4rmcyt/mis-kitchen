# Agile/Scrum Restaurant Research

Source: [agile-scrum-for-restaurants.com](https://agile-scrum-for-restaurants.com/)  
Case: Riccardo's "A Taste of Tuscany", London — world's first Scrum restaurant (2016)  
Authored by Riccardo Mariti + Jeff Sutherland (Scrum co-creator)  
Ticket: [#70](https://app.fizzy.do/6196871/cards/70)

---

## What Riccardo Did and What It Achieved

### ROTA (scheduling)
The weekly staff schedule used to take a manager 24 hours. By running a team "swarming" session — everyone collaborates on it together — they cut it to 1 hour and discovered **hidden shifts** that represented 15% unnecessary labor cost.

**Takeaway:** visibility + team involvement exposes waste that top-down management hides.

### T-shaped employees
Each person has a primary station but is trained to cover adjacent roles: waiter ↔ kitchen, bartender ↔ reservations. Unlimited vacation was gated on: *"can a colleague with the same skills cover you?"* — which incentivized cross-training.

**Takeaway:** cross-training is not a nice-to-have, it's what makes flexibility and coverage possible.

### Daily standup before each shift
Format: watch a 2-second F1 pitstop video → ask "how can we be more like this?" → pick **one small experiment** for today's shift → at end of shift: quick retro → did it work? → if yes, document and share on WhatsApp or write up in accountability board.

**Takeaway:** continuous improvement is not a quarterly review — it's one micro-experiment per shift.

### Accountability board
A grid: team members × skills/cross-training items. Everything starts red. As someone learns a skill, it turns green. Public, visible, drives ownership.

**Takeaway:** skill progress made visible drives self-directed learning better than manager assignments.

### Decision latency elimination
Staff are empowered to make immediate decisions: handle a customer substitution, resolve a complaint — without waiting for a manager. This cuts the time from problem to resolution from minutes to seconds.

**Takeaway:** the bottleneck in a busy kitchen is often "waiting for approval", not the actual work.

### Making work visible
Riccardo published the restaurant's accounts, salaries, and product backlog (epics written as user stories on the wall). The team collectively decides raises, time-off, rota placement.

**Takeaway:** radical transparency builds trust and removes the political overhead of traditional hierarchy.

### Servant leadership
Manager's job: remove blockers, not give orders. The team self-organizes around the backlog.

---

## Results

| Metric | Change |
|---|---|
| ROTA scheduling time | 24h → 1h |
| Labor cost | -15% |
| Table turnover | +20% |
| Net profit | +40% |
| Free time for innovation | +90 min/day |

---

## What mis-kitchen Can Apply

### 1. Shift standup / daily experiment (HIGH VALUE)
**What:** Admin posts one "experiment for today" before the shift starts. Staff see it on Today screen. End-of-shift report includes a field: "did today's experiment work?"

**Why it fits:** mis-kitchen already has the daily task flow and end-of-shift report. This is a lightweight layer on top — no new infrastructure needed. Directly implements the core Scrum loop (hypothesize → try → inspect → adapt) for kitchen teams.

**Effort:** Low. Add a `daily_experiment` field to the admin panel + show it on TodayScreen + add it to the report modal.

**Connects to:** ReportModal, TodayScreen, ReportsTab.

---

### 2. T-shaped skills / cross-training tracker (MEDIUM VALUE)
**What:** Per-person skill matrix in admin People tab. Each person has a primary station and a list of stations they're trained for. Admin can see coverage gaps: "if person X is absent, who covers station Y?"

**Why it fits:** LineupScreen already groups staff by station. The next step is knowing *who can flex*. This is especially useful when scaling to multiple restaurants.

**Effort:** Medium. New `skills` table in DB + UI in PeopleTab + coverage view.

**Connects to:** PeopleTab, LineupScreen, profiles table.

---

### 3. Schedule / ROTA builder (MEDIUM VALUE)
**What:** Admin builds the weekly schedule collaboratively — assigns people to shifts and stations. Staff see their own schedule. Makes "who works when" visible to the whole team.

**Why it fits:** Currently staff don't see the schedule in mis-kitchen. This is the biggest gap vs. Riccardo's model. Connects directly to station coverage and reservation count (#44, #35).

**Effort:** High. New `shifts` table, schedule builder UI, staff-facing schedule view.

**Connects to:** #44 Reservations, #35 Scale prep quantities, LineupScreen.

---

### 4. Task velocity / station burndown (MEDIUM VALUE)
**What:** Admin view showing task completion % per station per shift over time. Trends: which station consistently under-delivers? Which days are hardest?

**Why it fits:** The data already exists in the tasks table. This is a reporting layer on top of existing completions. Riccardo's accountability board was just making existing data visible.

**Effort:** Low-Medium. SQL aggregation + chart in ReportsTab.

**Connects to:** ReportsTab, tasks table, existing shift reports.

---

### 5. Improvement log (LOW EFFORT, HIGH CULTURE VALUE)
**What:** Admin can post a short "this week we improved X" entry. Visible to all staff on a dedicated tab or as a notice on Today screen. Builds culture of continuous improvement.

**Why it fits:** Lightweight. No complex data model. Directly mirrors Riccardo's WhatsApp retrospective notes, but inside the product.

**Effort:** Very low. A `improvements` table + simple list UI.

---

## Priority Order

| # | Feature | Effort | Value | Rationale |
|---|---|---|---|---|
| 1 | Shift standup / daily experiment | Low | High | Sits on top of existing flows, delivers the core Scrum loop |
| 2 | Task velocity / station burndown | Low-Med | High | Data already exists, unlocks operational insight for admins |
| 3 | T-shaped skills tracker | Medium | Medium | Needed at scale, useful now for coverage planning |
| 4 | Schedule / ROTA builder | High | High | Big feature, connects to #44 and #35 |
| 5 | Improvement log | Very low | Medium | Quick win for culture |

---

## What NOT to Apply

- **Salary transparency / public accounts** — not a software feature, it's an organizational culture choice for the restaurant owner. Not mis-kitchen's domain.
- **Team decides raises** — same: HR/org process, not a product feature.
- **Unlimited vacation policy** — out of scope.

These are valuable for restaurants to adopt as practices, but mis-kitchen doesn't need to build tooling for them.
