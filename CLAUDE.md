# CLAUDE.md — AI Wellness Platform

> Claude Code reads this file automatically at the start of every session.
> This is the coordination layer between three developers who are vibe-coding
> separately. **Read this entire file before making any changes.**

## What this is

Executive wellness platform for HSBC Nanjing retreat (~20 participants, Aug 20 launch).
Two sides: participant mobile app + admin/doctor portal. Positioned as **wellness only** —
never diagnosis, treatment, or medical advice. Say "participant" never "patient".

## Stack

- React Native 0.76 + Expo SDK 52 + Expo Router 4
- TypeScript 5.5, StyleSheet.create() with design tokens
- lucide-react-native for icons, react-native-svg for charts
- Repository pattern with in-memory mock (Supabase swap later)
- NO Tailwind, NO Next.js — this is React Native, not web

## Who owns what

Three developers are coding separately. Respect ownership boundaries.

| Person | Owns | Key files |
|--------|------|-----------|
| Person 1 (CRUD + gate) | Onboarding flow, review/sign-off UI, pipeline display | `app/onboarding/`, `components/admin/SignOffStage.tsx`, `components/admin/ReleaseButton.tsx`, `components/admin/StatusTimeline.tsx` |
| Person 2 (Capture + track) | Five capture channels, daily logs, tracking, file uploads | `app/onboarding/capture.tsx`, `app/(tabs)/tracking.tsx`, biomarker write logic |
| Person 3 (AI + output) | AI draft generation, health card rendering, AVA chat, pillar scoring | `app/(tabs)/card.tsx`, `app/(tabs)/ava.tsx`, `lib/ava/`, AI draft logic |

## Foundation rules — DO NOT BREAK THESE

### 1. Repository is the only data access layer
Every screen reads/writes through `lib/data/repository.ts`. Never import mock.ts directly
from a screen or component. Never scatter raw data in components.

### 2. Types are the shared contract
All domain types live in `lib/types/db.ts`. If you need a new field:
- Add it to the interface in `db.ts`
- Add it to the mock data in `lib/data/mock.ts`
- Add a method to the Repository interface if needed
- **Do NOT add fields only in your component state — it won't survive the Supabase swap**

### 3. Pipeline state machine is sacred
```
capturing → ai_drafted → gp_review → tcm_review → signed → delivered
```
Valid transitions are enforced in `mock.ts`. Don't bypass them. `needs_attention` is a
boolean overlay, not a pipeline state.

### 4. Design tokens are locked
All in `lib/theme/tokens.ts`. Use only:
- sage `#6B9080` (brand primary)
- bone `#FAF9F4` (background)
- terracotta `#E98A6D` (accent/warning, sparing)
- charcoal `#1A1C1C` (text)
If you see `#3f6355` or `#f9f9f9` anywhere, that's a bug from Stitch — fix it.

### 5. Demo data must be consistent
James Chen, 58, male. Vascular 74 / Metabolic 68 / Mental 81. Bio age 54 vs chrono 58.
These numbers must match everywhere: health card, AVA chat, admin detail, biomarkers.

### 6. Compliance language
- "wellness insights" not "diagnosis"
- "areas to monitor" not "risk factors"
- "suggested discussion points" not "treatment plan"
- AVA always ends substantive answers with: "This is general wellness information, not medical advice."

## How to change the shared contract

If you need to change types or the repository interface:

1. **Check the current state first.** Run `cat lib/types/db.ts` and `cat lib/data/repository.ts`
   before proposing changes. Another person may have already modified them.
2. **Make the minimal change.** Add fields as optional (`field?: type`) so you don't break
   existing code. Only make fields required when all consumers are ready.
3. **Update the mock data** in `lib/data/mock.ts` to include the new field with realistic values.
4. **Document what you changed** by adding a comment at the top of db.ts:
   ```
   // CHANGE LOG (newest first)
   // - [date] [person] Added daily_logs table types
   // - [date] [person] Added consent_given to Participant
   ```

## Git workflow

Each person works on their own branch:
- `person1/[feature-name]` — e.g. `person1/consent-flow`
- `person2/[feature-name]` — e.g. `person2/capture-channels`
- `person3/[feature-name]` — e.g. `person3/health-card`

Before starting work:
```bash
git checkout main
git pull origin main
git checkout -b person[N]/[feature-name]
```

Before pushing:
```bash
git add -A
git commit -m "descriptive message"
git push origin person[N]/[feature-name]
```

**Merge to main frequently** (at least daily). Whoever merges resolves conflicts in
`db.ts`, `mock.ts`, and `repository.ts` carefully — those are the shared contract files.

## File structure (do not reorganise)

```
app/                    # Screens (Expo Router)
  (tabs)/               # Participant bottom tabs (card, ava, tracking, settings)
  admin/                # Admin portal
  onboarding/           # Consent → profile → capture
components/
  ui/                   # Shared primitives (Button, Card, Field, etc.)
  participant/          # Participant-specific components
  admin/                # Admin-specific components
  layout/               # Shell layouts (MobileShell, AdminShell)
lib/
  types/db.ts           # THE shared type contract
  data/repository.ts    # THE repository interface
  data/mock.ts          # Mock implementation (20 participants seeded)
  data/actions.ts       # Thin async wrappers
  theme/tokens.ts       # Design tokens
  ava/respond.ts        # AVA chat engine
```

## Current state (update this when you make progress)

- [x] Project scaffolded (Expo + Router + TypeScript)
- [x] Design tokens locked
- [x] Component library (Button, Card, Field, Chip, Avatar, etc.)
- [x] Navigation: bottom tabs + admin stack + onboarding stack
- [x] Mock data layer with 20 participants + pipeline states
- [x] Repository pattern with subscribe/notify reactivity
- [x] Welcome, Consent, Profile, Capture screens
- [x] Onboarding Capture restructured into a hub-and-spoke sub-flow: Data Capture hub
      (`app/onboarding/capture.tsx`) with a per-participant `OnboardingProgress` record
      (`getOnboardingProgress`/`updateSectionStatus` in the repository) and a shared,
      tappable `CaptureFlowStepper` on every screen. Questionnaire (Personal Info → Goals
      → Lifestyle) is the fixed, non-skippable start; Wearables/Body Composition/Lab
      Reports unlock together and can be done in any order; ReCOGnAIze unlocks once that
      trio is done and leads into a Calculating screen before Home.
- [x] Health card screen (tab: Insights), restructured as a narrative-led snapshot: a
      one-line plain-English summary (`buildPillarNarrative` in `lib/ai/scoring.ts`) sits
      under the biological-age hero, the care-team sign-off card moved up right below it,
      the three pillar scores are demoted into a compact `PillarStrip`, and "next steps"
      leads with a single ranked `TopRecommendation` (top focus + top discussion point)
      with the full suggested-focus/discussion-point lists behind a "see all" toggle. A
      persistent floating "Ask Ava" affordance replaces the old end-of-scroll button.
- [x] AVA chat screen (tab: Concierge)
- [x] Tracking screen (tab: Care Plan)
- [x] Admin participant list + search + stat cards
- [x] Admin participant detail with biomarkers + sign-off + release
- [x] Admin review queue
- [x] Supabase wiring (auth, tables, storage, RLS) — see `SETUP.md` for self-serve setup
- [x] Real accounts: participant + care team sign-up/sign-in, session, route guards
- [x] File upload to Supabase Storage (lab report + body comp capture channels)
- [x] Lab report extraction (Claude vision, `/api/extract-lab.ts`, writes `needs_review` biomarkers)
- [x] AVA grounding against real signed card data (Claude, `/api/ava.ts`, mock rule-based engine stays as the no-Supabase-configured fallback)
- [x] Daily log persistence
- [x] Pre-auth Intro revamp: the entry screen (`app/index.tsx`) now leads with a
      "Get started" primary CTA (was: Login) and a floating longevity-snapshot
      mockup (`ScoreRing` trio) over the hero photo; "Get started" moves into two
      new screens, `app/onboarding/intro-hook.tsx` (brief "busy world" hook,
      auto-advances after ~3s) then `app/onboarding/intro-longevity.tsx` ("what is
      longevity" explainer with the real Get Started CTA into `/onboarding/consent`).
      "Login" on the entry screen bypasses both, going straight to
      `/onboarding/auth?mode=signin` as before.
- [x] Account creation revamp: `consent.tsx` and `auth.tsx` dropped the
      `OnboardingStepper` chrome (back button + step segments, now deleted, zero
      remaining callers) for a plain full-bleed layout. Tapping "Privacy & data
      handling" on the consent screen opens a new `components/ui/TermsModal.tsx`
      (scrollable body gated "Scroll to bottom" → "Accept and continue" once the
      user reaches the end) instead of toggling directly; the "Agree and continue"
      footer button no longer renders at all until all three items are checked
      (was: always visible, just disabled). `auth.tsx` gained a "Confirm password"
      field (signup only, inline mismatch error) and a short legal disclaimer line
      above the submit button; the post-signup no-session state is retitled "Verify
      your email" (was "Check your email").
- [x] Create Profile revamp: the Questionnaire trio (`profile.tsx`, `profile-goals.tsx`,
      `profile-lifestyle.tsx`) dropped the `CaptureFlowStepper` chrome (back button +
      section pill row — the component itself stays, still used by every other
      capture-* screen) for a plain full-bleed layout, bookended by two new chrome-free
      transition screens: `app/onboarding/profile-intro.tsx` ("Let's create your
      profile") before Personal Info, and `app/onboarding/profile-wellness-intro.tsx`
      ("A bit about your wellness and lifestyle") between Personal Info and Goals. The
      hub's `questionnaire` section now routes to `profile-intro` first
      (`lib/onboarding/flow.ts`), matching how every other section already routes to
      its own `-intro` screen. Personal Info also dropped the inert "Me"/"Admin"
      toggle and the non-functional avatar/photo-upload placeholder. Wellness Goals
      gained a one-line description per goal tile and a reassurance line ("This won't
      limit what your care team reviews for you."). Lifestyle's completion now routes
      to `app/onboarding/intro-wellness-snapshot.tsx` (mirrors the "PREVIEW card +
      ABOUT section" pattern from `components/participant/AvaPromo.tsx`: an example
      snapshot card with the consistent James Chen demo scores, an "ABOUT YOUR
      WELLNESS SNAPSHOT" explainer, and the same "data capture isn't finished yet"
      status line AVA's own promo uses, tap-through "Continue" button, no
      auto-advance) before landing back on the Data Capture hub.
- [x] Data Capture hub revamp: `CaptureFlowStepper` (shared by every capture-*
      screen) dropped its tappable section pill row entirely and simplified its
      back button from a chevron + "Back" label + "Data Capture" caption down to a
      plain icon-only chevron, since the pill row was fully redundant with the
      hub's own section list. `HubSectionCard` (only used by the hub) is now a
      borderless full-row tap target instead of its own bordered `GlassCard`, with
      a prominent dark-green-fill + white-text/icon treatment once a section is
      done (was: a small icon-circle color change), sitting in a light-green
      gradient zone (`teal[50]` → `teal[100]`) inside one consolidated `Card`. Once
      the Questionnaire is done, that same card also shows a "Your profile"
      summary built from the real saved `Participant` fields, plus a
      completion-percentage bar (`doneCount / 5`) that's always visible. Hub
      copy also got a humanizer/ux-copywriter pass (dropped an em dash, replaced
      "Capture body composition metrics."/"Upload a recent lab report for AI
      extraction." with plainer, outcome-first phrasing).
- [x] Data Capture hub "Your profile" summary split into three subcards
      (Personal Info / Wellness Goals / Lifestyle), each showing real detail
      (Personal Info mirrors `profile.tsx`'s own name/Sex at Birth/Age-Height-
      Weight grouping as read-only text; Goals lists each selected goal with its
      description reused from `profile-goals.tsx`'s exported `GOALS`; Lifestyle
      shows Exercise/Smoking/Alcohol as separate labeled rows) and its own
      "Edit" button routing to that screen with a `?mode=edit` param.
      `profile.tsx`/`profile-goals.tsx`/`profile-lifestyle.tsx` all read that
      param — in edit mode, "Continue" still saves but calls `router.back()`
      to return straight to the hub instead of chaining forward through the
      rest of onboarding (and skips re-marking already-`"done"` sections as
      `"in_progress"`). The hub subtitle also dropped its "Start with the
      Questionnaire" clause.
- [x] Data Capture channel screens (Wearables, Body Composition, Lab Reports) each
      merged their `-intro.tsx` + `-upload.tsx` pair into a single scrolling
      `-intro.tsx` file (both screens' content stacked, one file-choose button
      running the real upload logic; the `-upload.tsx` files are deleted).
      `CaptureFlowStepper` traded its bare icon-only back chevron for a labeled
      "‹ Back to Data Capture" button that navigates explicitly to
      `/onboarding/capture` (`showBackButton` prop, default true; the hub itself
      passes `false` since a button back to Data Capture doesn't belong on Data
      Capture). Each channel's file-choose button is now a light `teal[200]` →
      `teal[400]` gradient (dark `tealDark` text) instead of the flat solid-teal
      `Button`, to stand out as the primary action. Copy pass: every "What this
      feeds into" card lost its em dashes and dense clinical-abbreviation lists
      (e.g. Lab Reports' body now says "cholesterol, blood sugar, and
      inflammation levels" instead of "lipids... hs-CRP, HbA1c... insulin"), and
      Wearables' export subtitle dropped its "isn't available over the cloud"
      negative framing for a positive one.
- [ ] Wearable aggregator connect
- [x] Consent tracking: `consent_given`/`consented_at` added to `participants`
      (`supabase/migrations/0002_consent_tracking.sql`), recorded automatically the
      first time a participant is ever seen authenticated (`AuthProvider.tsx`'s
      `loadRole`) rather than threaded through every signup/sign-in/email-confirmation
      branch — consent.tsx structurally precedes signup so that's sufficient proof.
      Surfaced on the admin participant detail page.
- [x] File upload size/type limits: bucket-level `file_size_limit`/`allowed_mime_types`
      (`supabase/migrations/0003_upload_limits.sql`) plus a client-side size pre-check
      (`lib/data/uploadLimits.ts`) before each capture-*-intro.tsx upload.
- [x] Body composition scan value extraction: `api/extract-body-comp.ts` (Claude vision,
      mirrors `api/extract-lab.ts`) now runs in the background after upload, targeting
      the four keys `lib/ai/scoring.ts` already scores (`bmi`, `body_fat_pct`,
      `visceral_fat`, `waist_hip_ratio`).
- [x] Admin visibility into daily tracking logs: participant detail page
      (`app/admin/participants/[id].tsx`) now loads `listDailyLogs` and shows the last
      7 entries (sleep/activity/mood/weight/supplements/notes), and its sign-off/
      release/resolve-attention actions surface real errors instead of failing silently.
- [x] Real ReCOGnAIze cognitive assessment: `app/onboarding/capture-recognaize.tsx` runs
      an actual 5-trial reaction-time test (full-screen tap zone, discards false starts
      without counting them), then submits results to `api/submit-recognize.ts`, which
      derives a `cog_composite` score and writes both as `mental`-pillar biomarkers
      (`lib/ai/recognizeCatalog.ts`). Mock mode (no Supabase configured) skips the
      interactive test, matching the other capture-*-intro screens.
- [x] Care Plan tab redesign (tab: Care Plan, `app/(tabs)/tracking.tsx`): previously just a
      habit logger disconnected from anything the care team recommended. Now organized
      around 5 categories (Nutrition / Exercise / Medications & Supplements / Sleep &
      Recovery / Mindfulness & Stress, `lib/carePlan/categories.ts`), each mapping onto an
      existing DailyLog field. `AiDraft.care_plan` (`PlanCategory`/`CarePlan` in `db.ts`) is
      AI-drafted alongside the rest of the narrative (`api/generate-draft.ts`) and
      doctor-verified before sign-off (`components/admin/CarePlanEditor.tsx`, same
      edit/save pattern as `AIDraftSummaryCard`) — gated to the delivered card on the
      participant side, generic wellness-guidance fallback text shown before that. The
      main tab shows compact nav rows (plan snippet + today's status); tapping one opens
      `app/care-plan/[category].tsx` (mirrors the `app/pillar/[pillar].tsx` drill-down
      pattern) with the full plan text, the full logging widget, and a 7-day mini trend.
      Medications & Supplements is deliberately self-report only (participant's own
      `Participant.medications` catalog, add/remove + daily adherence toggle) — never
      doctor-prescribed dosing, consistent with the wellness-not-clinical positioning.
- [x] Care Plan rescoped to "only ask for what only you can report": Nutrition/Exercise/Sleep
      dropped their manual daily-logging widgets (tap-to-cycle sleep hours, activity type,
      meal/weight counters) — busywork re-entering data a wearable should already have, not
      real product value for this audience. Only Medications (self-report catalog) and
      Mindfulness (one-tap mood check-in) keep a daily interaction; the other three are
      plan-only pages (`CarePlanCategoryConfig.tracked` in `lib/carePlan/categories.ts`
      gates this everywhere). The main tab's "This week" trend is now mood-only instead of
      a fabricated sleep+mood composite. Live wearable sync (still on the roadmap, see
      "Wearable aggregator connect" below) is what would eventually make Sleep/Exercise
      trackable again — with real passive data, not manual re-entry.
- [x] Real admin Settings page (`app/admin/settings.tsx` + `components/layout/AdminShell.tsx`):
      both previously showed a hardcoded fake identity ("Dr. Helena Marsh") and fabricated
      claims (a fake team roster, "email alerts" with no notification system behind them).
      Now shows the real signed-in account's email + a working "Sign out" button, a "Data
      source" line that reflects `isSupabaseConfigured` (and the real project host) instead
      of a static claim, and a real registered-care-team-account count (new RLS policy,
      `supabase/migrations/0005_care_team_roster.sql`, since `user_roles` was previously
      own-row-read-only). Notifications honestly labeled "not yet built" rather than
      claiming to work.
- [x] Real admin Exports (`app/admin/exports.tsx`): all three buttons were no-ops before.
      Participant data and the audit log now export as real CSVs (`lib/export/csv.ts` +
      `lib/export/download.ts`, a Blob-URL download — web only, the actual deployment
      target) built from live repository data. "Signed cards" exports as JSON, not PDF —
      no PDF-generation dependency exists in the project, so a real JSON export of the
      full delivered-card data shipped instead of a fake PDF button.
