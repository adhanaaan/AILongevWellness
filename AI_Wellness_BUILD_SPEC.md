# AI Wellness — Build Spec (HSBC Retreat MVP)

This is the authoritative spec for building the app in **Claude Code**. The Stitch HTML exports are the visual reference for *look and layout only* — this document overrides them wherever they conflict (palette, naming, copy, logic). Read this first, then `tailwind.config.js`, `globals.css`, and `COMPONENTS.md`.

---

## 1. What we're building

A two-sided executive wellness platform for the HSBC Nanjing retreat (~20 participants, target 20 August). Positioned strictly as **wellness, not diagnosis**.

- **Participant app** (mobile) — onboarding, three-pillar capture, the signed health card, the grounded assistant (AVA), and tracking.
- **Admin / doctor portal** (desktop/tablet) — participant list with pipeline status, participant detail with editable biomarkers, AI-drafted summary, and the two-stage GP→TCM sign-off.

Both sides share the same design tokens, component primitives, and data. Build the participant flow first (per decision), but scaffold both route groups now.

## 2. Stack

Next.js (App Router) · TypeScript · Tailwind (tokens locked in `tailwind.config.js`) · Supabase (Postgres + Auth + Storage) · OpenAI (extraction + AVA). Icons: **lucide-react** (replace Stitch's Material Symbols — mapping in `COMPONENTS.md`). Load Manrope via `next/font`.

Lean backend is acceptable for a 20-person pilot; manual/admin steps are fine. Design the data model to extend cleanly (wearables, labs, corporate dashboards later) without a rebuild.

## 3. Naming & copy rules (enforce globally)

Stitch was inconsistent. Lock these:

- **Product name is "AI Wellness"** everywhere. Remove all instances of "Equilibrium", "Elysia", "ELYSIA".
- Say **"participant"**, never "patient". Rename Stitch's "Patient Records" → "Participants".
- **Compliance vocabulary only:** "wellness insights", "areas to monitor", "suggested discussion points", "reviewed and signed off". Never "diagnosis", "disease", "treatment", "medical advice", "risk of [condition]".
- Use **one canonical demo participant** on the participant side and its linked admin detail: **James Chen, 58, male**. Scores must be consistent everywhere for that participant: Vascular **74** (Good), Metabolic **68** (Monitor), Mental **81** (Strong); biological age **54** vs chronological **58**.
- **Fix the AVA bug:** the chat currently says metabolic **84** — change to **68** to match the card. AVA must never state a value that isn't on the signed card.
- Admin list may show other demo rows (Alexander Jameson, Morgan Chen, etc.) — that's fine for a list, but any drill-in detail must be internally consistent.

## 4. Routes & access

```
/                      → participant welcome / QR entry
/onboarding/consent
/onboarding/profile
/capture               → three-pillar capture
/card                  → executive health card (Insights tab)
/ava                   → grounded assistant (Concierge tab)
/tracking              → daily tracking (Care Plan tab)
/admin                 → participant list
/admin/participants/[id] → detail + review + sign-off
```

Two route groups: `(participant)` mobile shell with bottom nav, `(admin)` desktop shell with sidebar. Role-based access (participant vs care-team). Onboarding is a first-run stepper, not in the bottom nav.

## 5. Data model (Supabase / Postgres)

Minimum viable, extensible. Tables:

- **participants** — id, name, age, sex, height_cm, weight_kg, goals (text[]), created_at.
- **capture_channels** — id, participant_id, channel (`manual` | `wearables` | `body_composition` | `lab_report` | `recognize`), status (`empty` | `partial` | `complete`), entered_by (`participant` | `admin`), updated_at.
- **biomarkers** — id, participant_id, pillar (`vascular` | `metabolic` | `mental`), key, label, value, unit, ref_low, ref_high, source (`manual` | `wearable` | `lab_extract` | `body_comp` | `recognize` | `admin`), status (`entered` | `imported` | `extracted` | `needs_review`), flagged (bool), updated_at.
- **ai_draft** — id, participant_id, scores (jsonb: {vascular, metabolic, mental}), biological_age, chronological_age, key_contributors (jsonb[]), strengths (text[]), areas_to_monitor (text[]), suggested_focus (text[]), discussion_points (text[]), generated_at, edited_by_admin (bool).
- **reviews** — id, participant_id, stage (`gp` | `tcm`), reviewer_name, reviewer_credential, notes, signed_at (nullable).
- **pipeline** — participant_id, state (see §6), needs_attention (bool), attention_reason, delivered_at (nullable).
- **files** — id, participant_id, kind (`lab_report` | `body_comp` | `apple_health_export`), storage_path, extracted (bool).

Every biomarker carries **source** and **status** tags — surface these in the admin detail table (the "Wearable / Lab / Manual / Admin" pills) and use `flagged` + range to drive the terracotta out-of-range styling.

## 6. Pipeline state machine

States (single enum on `pipeline.state`):

```
capturing → ai_drafted → gp_review → tcm_review → signed → delivered
```

`needs_attention` is a **separate boolean overlay** (e.g. incomplete labs) that can sit on top of any state and drives the red flag + "Resolve" action in the list. It does not replace the state.

Transitions & guards:

| From | To | Trigger / guard |
|---|---|---|
| capturing | ai_drafted | capture reaches threshold **and** AI summary generated |
| ai_drafted | gp_review | enters GP queue (auto or admin action) |
| gp_review | tcm_review | GP sign-off recorded (reviewer + credential + notes + timestamp) |
| tcm_review | signed | TCM sign-off recorded |
| signed | delivered | "Release health card" pressed → pushes card to participant app |

**Hard rules:** TCM stage is locked until GP is signed. The "Release health card" button is disabled until **both** GP and TCM are signed. The participant `/card` route must only render a card whose pipeline state is `delivered` (before that, show a "your snapshot is being prepared" state).

Status badge colours (from tokens): `signed`/`delivered` → sage; `gp_review`/`tcm_review`/`capturing`/`ai_drafted` → neutral (ink-muted on surface-muted); `needs_attention` overlay → danger. "Monitor"/out-of-range values → terracotta.

## 7. Screens

### Participant (mobile)

1. **Welcome / QR** (`/`) — AI Wellness wordmark, "Your personalised longevity snapshot", "A guided wellness check — about 30 minutes", primary **Begin**, secondary "Scan the retreat QR code to start". (Stitch: reused correct #FAF9F4 — keep.)
2. **Consent** (`/onboarding/consent`) — three required checkboxes (wellness-not-diagnosis, data reviewed by care team, privacy terms), "Agree and continue" disabled until all ticked. Rename "Equilibrium" → "AI Wellness".
3. **Profile** (`/onboarding/profile`) — name, age, sex, height, weight; goals as multi-select chips; basic health (exercise/smoking/alcohol). Keep the **Me / Admin** segmented control (either can enter — writes `entered_by`).
4. **Capture** (`/capture`) — pillar tabs (Vascular/Metabolic/Mental) + five channel cards: Manual & questionnaire, Wearables (Connect), Body composition scan (Upload / Enter values), Screening / lab reports (Upload PDF or photo → extraction), ReCOGnAIze (Start assessment). Each card shows a **source tag** and per-channel "entered by". Progress bar. CTA "Review my snapshot".
5. **Health card** (`/card`) — hero: biological age 54 vs 58, "−4 years"; three ScoreRings (74/68/81); Key contributors (3, one terracotta "monitor"); Suggested focus (4); **care-team badge showing GP + TCM initials**; CTA "Ask about my results" → `/ava`. Only renders when `delivered`.
6. **AVA** (`/ava`) — grounded read-only chat. See §9. Header "Ask AVA about your results · Read-only · based on your reviewed card". Suggestion chips. **Fix metabolic 84→68.** Tighten answers to non-prescriptive (see §9).
7. **Tracking** (`/tracking`) — daily quick-log bento (sleep, activity, mood, food, weight, supplements) + weekly trend strip + "wearable data syncs automatically" note.

### Admin (desktop/tablet)

8. **Participant list** (`/admin`) — sidebar (Participants, Review queue, Exports, Settings), summary stat cards (Total 20 · Awaiting GP/TCM 9 · Delivered 9 · Needs attention 3), search + status filter, table rows (name, demographics, capture bar, **PipelineStatusBadge**, actions). `needs_attention` rows tinted + "Resolve".
9. **Participant detail + sign-off** (`/admin/participants/[id]`) — StatusTimeline (AI drafted → GP signed → TCM signed → Released); three pillar summary cards; **editable** biomarker table (value, reference range, source tag, trend, out-of-range in terracotta, missing = "needs data"); editable AI-drafted summary (strengths / areas to monitor / suggested focus); right rail **Verification Hub**: Stage 1 GP (reviewer, notes, "Sign off (GP)") → Stage 2 TCM (locked until GP signed) → "Release health card" (disabled until both). Suggested discussion points card. Rename sidebar "Patient Records" → "Participant Records".

## 8. Two-stage sign-off (detail)

Sequential, auditable. GP first, then TCM. Each stage records reviewer_name, reviewer_credential, notes, signed_at. On GP sign: unlock TCM stage, advance state to `tcm_review`. On TCM sign: state `signed`, enable Release. On Release: state `delivered`, set `delivered_at`, card becomes visible in participant app. Store both signatures immutably (they're the compliance record). The Stitch demo fakes this with DOM swaps — implement it as real state, not client-side theatre.

## 9. AVA — grounding rules (compliance-critical)

AVA is **read-only** and may only explain the participant's **own signed health card**. It is not a medical chatbot.

- **Context = the signed card only.** Feed AVA the participant's delivered `ai_draft` + `biomarkers` as structured context. No open web, no other participants' data.
- **Never invent values.** Every number AVA cites must exist on the card (this is why the 84→68 fix matters).
- **Non-prescriptive.** AVA may restate the card's already-reviewed "suggested focus" in plain language, but must **not** generate new protocols, dosages, durations, or specific regimens. Rewrite Stitch's drafted answers accordingly — e.g. replace "integrate 150 minutes of Zone 2 aerobic activity per week" with "your card highlights daily activity as a focus area — your care team can help you set a specific plan."
- **Always disclaim + defer.** Every substantive answer ends with a plain "This is general wellness information, not medical advice" and, for anything outside the card, "That's a good question for your care team."
- **Refuse out-of-scope** (diagnosis, medication, symptoms, anything not on the card) with a warm deferral to the care team.

Implementation: system prompt hard-constrains scope to the injected card JSON; temperature low; add a lightweight output check that no diagnosis/medication vocabulary slips through.

## 10. How data enters (capture channels)

- **Manual & questionnaire** — form entry (participant or admin) → `biomarkers` / profile.
- **Wearables** — via an aggregator (Terra / Vital / Rook): one connect flow, normalised pull → `biomarkers` (source `wearable`). Apple Health fallback = upload export file. Read-only import for the pilot; real-time streaming is Phase 2.
- **Body composition scan** — file upload → extraction, or admin enters values (source `body_comp`).
- **Screening / lab reports** — upload PDF/image → OpenAI extraction into structured biomarkers with ref ranges, `status = extracted` (`needs_review`) until a human confirms in the admin table (source `lab_extract`).
- **ReCOGnAIze** — API/export if available, else admin entry → mental pillar (source `recognize`).

## 11. Design tokens

Locked in `tailwind.config.js` / `globals.css`. **Do not use Stitch's `primary #3f6355` or `background #f9f9f9`.** Brand = sage `#6B9080`, bone `#FAF9F4`, terracotta `#E98A6D` (sparing), charcoal `#1A1C1C`. Manrope throughout. Cards `rounded-lg` (16px) + `shadow-soft`; primary CTAs are `rounded-full`. Component-to-token mapping in `COMPONENTS.md`.

## 12. Build order

1. Tokens + shells (participant mobile shell w/ bottom nav; admin shell w/ sidebar) + Manrope.
2. Shared primitives (`COMPONENTS.md` §1) + composite components (§2).
3. Participant flow end-to-end with mock data: welcome → consent → profile → capture → card → AVA → tracking.
4. Admin list + detail + real sign-off state machine.
5. Supabase wiring (auth, tables, storage), then lab extraction + AVA grounding against real card data.
6. Wearable aggregator connect (read-only).
