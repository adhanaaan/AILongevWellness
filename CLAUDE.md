# CLAUDE.md — AI Wellness Platform

> Claude Code reads this file automatically at the start of every session.
> This is the coordination layer between three developers who are vibe-coding
> separately. **Read this entire file before making any changes.**

## What this is

Executive wellness platform for HSBC Nanjing retreat (~20 participants, Aug 20 launch).
Two sides: participant mobile app + admin/doctor portal. Positioned as **wellness only** —
never diagnosis, treatment, or medical advice. Say "participant" never "patient".

## Stack

- npm workspaces monorepo — the app is `packages/web`, not the repo root
- React Native 0.76 + Expo SDK 52 + Expo Router 4, built for web
  (`expo export --platform web`) and deployed to Vercel as a static SPA
- TypeScript 5.5, StyleSheet.create() with design tokens
- lucide-react-native for icons, react-native-svg for charts
- Repository pattern over Supabase, with an in-memory mock fallback
- NO Tailwind, NO Next.js — write React Native, even though it ships as web

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
capturing → ai_drafted → gp_review → signed → delivered
```
`gp_review` means "awaiting one or both sign-offs" — GP and TCM sign off **independently,
in either order**; neither blocks the other (see "Current state" changelog: async review).
Which specific stage(s) are done comes from the `reviews` table (`gpSigned`/`tcmSigned` on
`ParticipantSummary`, or the `reviews` array on the participant detail page), never from
pipeline.state alone. The `tcm_review` enum value still exists in the type/DB check
constraint but is never entered — left in place rather than ripped out. Valid transitions
are enforced in `mock.ts` (mock) and the `sign_off()` Postgres RPC (real backend,
`supabase/migrations/0006_async_review.sql`) — keep both in sync. Don't bypass them.
`needs_attention` is a boolean overlay, not a pipeline state.

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

**The app lives in `packages/web/`, NOT at the repo root.** This is an npm
workspaces monorepo — never create `app/`, `components/`, `lib/` or `api/` at the
root. Paths elsewhere in this file are relative to `packages/web/` unless they
start with `packages/`.

```
package.json            # workspaces: ["packages/web", "packages/shared"]
supabase/               # migrations (repo root — infra, not a package)
packages/
  web/                  # @aiw/web — the app. Deployed to Vercel as a web SPA.
    app/                # Screens (Expo Router)
      (tabs)/           # Participant bottom tabs (card, ava, tracking, settings)
      admin/            # Admin portal
      onboarding/       # Auth → quiz → capture
    components/
      ui/               # Shared primitives (Button, Card, Field, etc.)
      participant/      # Participant-specific components
      admin/            # Admin-specific components
      layout/           # Shell layouts (MobileShell, AdminShell)
    lib/
      types/db.ts       # THE shared type contract
      data/repository.ts# THE repository interface
      data/mock.ts      # Mock implementation (20 participants seeded)
      data/actions.ts   # Thin async wrappers
      theme/tokens.ts   # Design tokens
      ava/respond.ts    # AVA chat engine
      platform/         # Native-shell bridge client (no-ops in a real browser)
    api/                # Vercel serverless functions. MUST stay beside lib/ —
                        # they import ../lib/* and @vercel/node doesn't reliably
                        # honour tsconfig paths. Never import @aiw/shared here.
    vercel.json         # Vercel Root Directory is set to packages/web
  shared/               # @aiw/shared — bridge protocol. ZERO runtime deps.
  shell/                # @aiw/shell — native WebView app. NOT an npm workspace;
                        # standalone lockfile so its Expo SDK can differ from
                        # web's without Expo autolinking picking up web's
                        # native modules through workspace hoisting.
```

### Web vs native

There is one app, and it is a web app. The native iOS/Android build is a thin
Expo shell whose only screen is a `react-native-webview` pointed at the deployed
Vercel URL — so **participant/admin features are built once, in
`packages/web`, and are automatically present on native**. Only capabilities a
browser genuinely cannot provide (secure session storage, local notifications,
offline detection, OAuth that providers refuse to run in a WebView) live in
`packages/shell`, reached over the typed bridge in `packages/shared`.

Everything in `packages/web` must keep working in a plain browser. Bridge calls
go through `lib/platform/`, which no-ops when the shell isn't present.

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
- [x] Onboarding consolidated onto the single `quiz.tsx` (Bumble-style card stack:
      Name + Goal required, sex/age/height/weight + lifestyle optional). The old
      multi-screen pre-signup + questionnaire chain that this superseded was removed
      (`intro-hook`, `intro-longevity`, `consent`, `profile-intro`,
      `profile-wellness-intro`, `intro-wellness-snapshot` deleted — they were
      unreachable once "Get started" pointed straight at `/onboarding/auth`, and
      consent now lives inside `auth.tsx`'s signup form + `TermsModal`). The
      surviving `profile.tsx` / `profile-goals.tsx` / `profile-lifestyle.tsx` are now
      **edit-only** surfaces (always `router.back()` on save), reachable from the
      Data Capture hub's "Edit your profile" section (Personal info / Wellness goals
      / Lifestyle rows). `GOALS` moved out of `profile-goals.tsx` into shared
      `lib/onboarding/goals.ts` (imported by both `quiz.tsx` and `profile-goals.tsx`).
      The `flow.ts` `questionnaire` section route repointed to `/onboarding/quiz`
      (the entry is filtered out of the hub UI; it stays only for the gating helpers).
      The quiz's basics step (sex/age/height/weight) is now **required** (was
      skippable) — sex drives the sex-aware ranges, age the biological-age/age
      clocks, and height+weight the BMI, so a skipped step left the snapshot weak;
      only the lifestyle step stays optional.
- [x] Admin portal separated from the consumer app (`lib/auth/RouteGuard.tsx`
      `CareTeamGuard`): a signed-in participant (a lay user) who reaches any
      `/admin` route — including `/admin/login` — is now redirected back to their
      own app (`/`) instead of being shown the care-team login. Only a genuinely
      signed-out visitor sees `/admin/login`, and only a `care_team` account sees
      the portal itself. Care-team access stays gated to specific people via the
      `care_team_allowlist` (migration 0013); the admin login is the sole,
      unlinked entry point (never surfaced anywhere in the participant UI).
- [x] Care-team accounts are admin-created, not self-service
      (`supabase/migrations/0016_admin_created_care_team.sql`, run after 0013;
      supersedes 0015). The signup trigger now decides the role **solely from the
      `care_team_allowlist`** (client `role` metadata is ignored entirely, so it
      can never be escalated from the client): an allowlisted email → `care_team`
      (no participant row), everyone else → participant. `app/admin/login.tsx` is
      now **sign-in only** — the signup toggle / `signUpCareTeam` UI was removed, so
      there is no public admin registration. An admin creates an account by
      allowlisting the email then adding the user in the Supabase dashboard. See
      SETUP.md "Creating admin (care-team) accounts".
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
- [x] Wearable aggregator connect (Terra) + health-export auto-sync: live device
      data now lands as biomarkers through two API-driven paths on top of the manual
      Apple Health export upload, all sharing one normalize→score writer
      (`lib/data/writeWearableBiomarkers.ts`). (1) **Terra** (`api/terra-connect.ts`
      + `api/terra-webhook.ts`, `lib/wearables/terra.ts`): the participant taps
      "Connect a device" (`components/onboarding/WearableConnectOptions.tsx`, gated on
      `isTerraEnabled`), Terra's widget OAuths a provider (Oura/Garmin/Fitbit/Whoop/…)
      with `reference_id = participantId`, and signed webhooks (HMAC `terra-signature`
      verified against the raw body) write `source=wearable` biomarkers. Connections
      are stored in a new `wearable_connections` table. (2) **Health Auto Export**
      (`api/health-ingest.ts` + `api/health-ingest-setup.ts`, `lib/wearables/healthAutoExport.ts`):
      a per-participant `ingest_token` (new column) gives the iOS export app a private
      POST URL for automatic Apple Health JSON sync (`source=apple_health`); the
      endpoint echoes seen `metricNames` since a few HAE metric-name strings weren't
      authoritatively verifiable. `supabase/migrations/0009_wearable_ingest.sql`; setup
      in SETUP.md "Wearables & health data".
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
- [x] Care Plan tab premium redesign (Mobbin-referenced, Superpower "Protocol" pattern):
      the tab was a passive list with no daily driver. Now it opens on a navy "Today" hero
      (`components/participant/CarePlanTodayHero.tsx`, sibling to the Insights BodyMap hero)
      with a gradient progress ring showing today's completion, backed by a new generic
      `components/participant/ProgressRing.tsx` primitive (kept separate from `ScoreRing`,
      which is 0–100/status-specific). Below it a `components/participant/TodayActionsList.tsx`
      surfaces every actionable item in one checkable timeline — each supplement (tap to mark
      taken, strikes through) plus the daily mood check-in with an inline mood picker — honest
      to the only two `tracked` categories (meds + mood); nothing fake to check for
      nutrition/exercise/sleep. "Your plan" carries a care-team-reviewed / AI-draft-in-review
      pill and the existing `CarePlanCategoryCard` grid; the "Mood this week" trend recolored to
      the mental pillar; "Add more data" renamed "Sharpen your plan". The category drill-down
      (`app/care-plan/[category].tsx`) gained a matching category-colored hero header with a
      per-category `ProgressRing` on the tracked ones (medications = today's adherence,
      mindfulness = days checked in this week) and consistent section styling. All daily
      writes go through the existing `upsertDailyLogAction`; no schema/repository change.
- [x] AVA "weave" — ask about any data point from anywhere: the AVA tab already read a
      `q` param and auto-sent it, but seeded only once per mount, and React Navigation
      keeps tab screens mounted after first visit — so a second "Ask Ava" tap anywhere
      silently did nothing. Fixed with a `qid` nonce: a new `lib/ava/useAskAva.ts` hook
      navigates to `/(tabs)/ava` with `q` + a fresh monotonic `qid` each call, and
      `ava.tsx` re-seeds whenever the `qid` token changes (was: a one-shot `seededRef`
      boolean). A reusable `components/participant/AskAvaButton.tsx` ("Ask Ava about
      this" row, matching the pillar page's original styling) is now woven onto the
      bio-age page ("How can I improve my biological age?") and each care-plan category
      drill-down ("Ask Ava about my {category} plan", shown when a plan exists). The
      pillar page's existing Ask-Ava rows and the Insights tab's "Ask Ava" FAB were
      switched onto the same hook so they fire reliably on every tap, not just the first.
- [x] AVA answers deep-link back into the app (closes the weave loop the other way):
      AVA replies were dead-end text. A new `lib/ava/suggestedActions.ts` scans the
      participant's question + AVA's reply for topics the app has a screen for (each
      pillar, biological age, a care-plan category, the Methodology page) and returns up
      to 3 deep-link chips (deduped by route), rendered under each AVA bubble in
      `ava.tsx` — tapping one routes straight there (`router.push`). Pure string matching,
      no API/schema change; works in both the real (`api/ava.ts`) and mock
      (`respondAsAva`) response paths.
- [x] Care Plan tab now carries the same AI-draft/reviewed status as the scores: the
      care plan is AI-drafted then clinician-reviewed on the same pipeline as the
      snapshot, so the Care Plan tab (`app/(tabs)/tracking.tsx`) surfaces the shared
      `DraftStatusBadge` prominently under the title (was: a small "Your plan" review
      pill) — an amber "AI-drafted · pending your care team's review" before sign-off,
      a green "Reviewed & signed off by [name]" after — exact parity with the Insights
      snapshot. Shown only once a draft exists (`card || pendingDraft`). The category
      drill-down keeps its own smaller per-category pill.
- [x] Care Plan never shows an empty placeholder: a fresh account (no AI draft yet) used
      to drop every category to a thin one-line `fallback`, so the plan read empty and
      unfinished. Each category now carries a full multi-point `starter` plan
      (`lib/carePlan/categories.ts`) — substantive, GENERIC best-practice wellness
      guidance — surfaced whenever no real `AiDraft.care_plan` exists, so the tab always
      opens onto a real protocol; a personalized draft replaces it the moment one is
      generated. Shown WITHOUT the AI-drafted badge (that only renders when a real draft
      exists) plus an honest "Starter guidance · personalizes after review" note, so
      generic defaults are never presented as a reviewed or tailored plan.
      `CarePlanCategoryCard` also grew from a single truncated snippet to a compact
      two-line bulleted preview (+`N more`), so each card reads like a real mini-protocol.
- [x] Visible, retryable plan generation (was: silent failure): the personalized care plan
      is AI-drafted from screening data by `regenerateDraft` (`lib/ai/draftGeneration.ts`,
      via `/api/generate-draft`), fired after onboarding — but as fire-and-forget
      `generateDraft(...).catch(() => {})`, so any failure (missing `SUPABASE_SERVICE_ROLE_KEY`,
      unapplied migration, pipeline-state issue) silently left the account on the generic
      starter fallback with no signal. New `lib/ai/useGenerateDraft.ts` hook + on the Care
      Plan tab a `components/participant/GeneratePlanCard.tsx` now surface generation as a
      real action when no personalized draft exists (`!carePlan && isSupabaseConfigured`):
      a "Generate my plan" CTA → a "Building your personalized plan…" spinner → on failure
      the endpoint's ACTUAL error message + a retry (so a broken backend is diagnosable,
      not invisible). On success the screen reloads (server-side draft isn't observed by
      the local `repository.subscribe`) and the real plan replaces the starter.
- [x] Care-plan backfill for already-delivered cards: a card signed off BEFORE the
      care-plan feature existed has a doctor-reviewed assessment but an empty `care_plan`,
      and a signed card is (correctly) locked from full regeneration — so it was stuck on
      generic starters. New `backfillCarePlan` (`lib/ai/draftGeneration.ts`) + endpoint
      (`api/generate-care-plan.ts`, allowed while `delivered`, unlike `/api/generate-draft`)
      generates ONLY the `care_plan` from the card's own signed values and biomarkers and
      updates only that column (never the signed scores/narrative), refusing to clobber a
      plan that already exists. Surfaced honestly as AI-drafted **pending review**, never
      "signed off": the Care Plan tab + category drill-down detect a post-sign-off plan via
      `ai_draft.generated_at > max(review.signed_at)` (sign-off never writes `ai_draft`, so
      that only moves when the plan was backfilled afterward; gated to Supabase mode so the
      demo's delivered card stays green). The Care Plan tab's "Generate my plan" now picks
      mode by state — full `draft` when not delivered, `carePlan` backfill when delivered.
- [x] Care-plan items restructured to premium {title, detail} cards (Mobbin-referenced —
      Superpower "What we're working on" / Withings protocol cards): items were a flat
      sentence each, which read as a wall of text. Now each item is a short imperative
      `title` + a one-line `detail` (`PlanItem` in `db.ts`, `CarePlan` is now
      `Record<PlanCategory, PlanItem[]>`; no migration — jsonb column, legacy string
      items coerced by `normalizePlanItem` in `lib/carePlan/categories.ts` at read time).
      Generation writes both (`draftGeneration.ts` prompt + `PLAN_ITEM_SCHEMA` with
      maxLength guardrails); the category drill-down shows a ranked number + bold title +
      muted detail; the Care Plan tab cards preview just the bold titles; the admin
      `CarePlanEditor` edits "Title — detail" per line. Mock demo (James Chen + generic)
      and the starter plans rewritten to the structured shape. Existing delivered cards
      keep rendering (title-only) until regenerated.
- [x] Sign-off trust badge (`components/participant/SignOffBadge.tsx`): the Insights tab
      only surfaced clinician review as a "Notes from your care team" card mid-scroll —
      easy to skim past, and undersells the platform's real differentiator versus
      AI-only competitors (which draft a plan with human escalation on request, not a
      per-user clinician sign-off before release). A compact "Reviewed & signed off by
      [name] ([credential])" badge now sits directly above the biological-age hero, so
      trust is established before the participant sees any number.
- [x] Methodology & Sources page (`app/methodology.tsx`, linked from participant Settings)
      plus a tappable biological-age drill-down (`app/bio-age.tsx`, `BiologicalAgeHero`
      gained an optional `onPress`): a real citation-research pass on every reference
      range the app scores against caught actual bugs, not just missing sources — a
      physiologically-impossible GMI floor (4.0% implies ~29 mg/dL average glucose),
      an invented eGFR ceiling (KDIGO defines none), and body fat %/waist-hip ratio
      using one unisex range when real sources (ACE, WHO) define meaningfully
      different healthy ranges by sex. Fixed all three (`lib/ai/labCatalog.ts`,
      new `lib/ai/sexAwareRanges.ts` applied at biomarker-write time in
      `api/extract-body-comp.ts`/`api/extract-wearables.ts` and in the mock demo
      generator). The methodology page (`lib/methodology/content.ts`) is static,
      human-reviewed content, not AI-generated per request — citations are exactly
      the kind of claim a model will confidently fabricate. Biological age is
      explicitly labeled as our own composite estimate, not a named clinical
      formula (e.g. PhenoAge) we don't actually implement.
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
- [x] Deepened the AI draft narrative (`api/generate-draft.ts`): the actual per-participant
      deliverable was too shallow to be worth paying for — 2-4 short generic bullets per
      section. Rewrote the prompt to demand real depth (5-8 key_contributors, 4-6 strengths/
      suggested_focus, 3-5 discussion_points, 2-4 care_plan items per category, `minItems`
      enforced in the tool schema — `areas_to_monitor` deliberately has none, so the model
      is never pressured to invent a concern the data doesn't support) and real substance:
      each point now names the actual biomarker value and briefly explains why it matters,
      citing a real guideline body by name (ADA, AHA, WHO, KDIGO, etc.) via a grounding
      block built from `lib/methodology/content.ts` — the same human-verified source
      content shown on the Methodology page, reused as context so the model can reference
      real sources without ever inventing a specific study, author, or year. Mock data
      (James Chen's hand-authored draft and the generic demo-participant generator) was
      rewritten to the same depth standard, since that's what every preview/demo deploy
      actually shows by default.
- [x] Async GP/TCM review: sign-off previously required GP to finish before TCM was even
      allowed to act (`sign_off()` required state to be exactly `tcm_review`, only reachable
      after GP signed). Real GP/TCM pairs don't work a queue that way, so both stages can
      now sign off any time the pipeline is in `gp_review` (repurposed to mean "awaiting one
      or both signatures"), in either order, and the pipeline only advances to `signed` once
      both stage rows exist — enforced in both `mock.ts`'s `signOff()` and a new Postgres RPC
      (`supabase/migrations/0006_async_review.sql`). `ParticipantSummary` gained
      `gpSigned`/`tcmSigned` so list views (review queue, participant rows) can show which
      specific stage is still outstanding — `PipelineStatusBadge` now renders "Awaiting GP" /
      "Awaiting TCM" / "In Review" instead of a label that always said "GP Review" regardless
      of which one was actually pending. The participant detail page's pipeline timeline
      collapsed GP+TCM into one "Review" step (was two sequential ones) since the state no
      longer implies an order between them; the two `SignOffStage` cards below it still show
      each stage's real completion independently. Review queue segments changed from
      GP Review/TCM Review (state-based, `tcm_review` is now unreachable) to Needs GP/Needs
      TCM (based on the new `gpSigned`/`tcmSigned` flags).
- [x] Dr. Tong revamp — AI-drafted content shown pre-review, updated post-review:
      the Insights tab (`app/(tabs)/card.tsx`), Care Plan tab (`app/(tabs)/tracking.tsx`)
      and its category drill-down (`app/care-plan/[category].tsx`) previously showed
      nothing at all until a signed, delivered card existed. All three now fall back to
      `ai_draft` (already RLS-readable pre-delivery — no schema/RLS change) the moment
      one exists, so a participant sees the AI's first-pass scores and care plan
      immediately instead of waiting on the full GP → TCM sign-off chain. A new
      `components/participant/DraftStatusBadge.tsx` replaces `SignOffBadge` above the
      biological-age hero and renders either state: an orange "AI-drafted · pending
      your care team's review" badge (with a live missing-biomarker count) before
      delivery, or the existing green "Reviewed & signed off by [name]" badge after.
      The moment the care team signs off, the same screens swap over to the reviewed
      `card.aiDraft`/`card.reviews` data with no other UI change.
- [x] Dr. Tong revamp — progressive insights during onboarding: `api/generate-draft.ts`'s
      `REGENERATABLE_STATES` now includes `"capturing"` (was gated to
      `ai_drafted`/`gp_review`/`tcm_review` only), safe because its pipeline-state
      update is already conditioned on the current state being exactly `"ai_drafted"` —
      calling it mid-`"capturing"` populates/refreshes `ai_draft` without ever
      advancing the pipeline early. `generateDraft()` is now fired (fire-and-forget)
      right after the Questionnaire completes (`profile-lifestyle.tsx`) and again after
      each of Wearables/Body Composition/Lab Reports (`capture-wearables-intro.tsx`,
      `capture-body-composition-intro.tsx`, `capture-lab-reports-intro.tsx`), so a
      participant gets a first draft as soon as basic info is in and it sharpens with
      each subsequent upload, instead of everything being gated behind full capture.
- [x] Dr. Tong revamp — referenced vascular/metabolic age clocks: new
      `lib/ai/ageClocks.ts` (`computeVascularAge`, `computeMetabolicAge`) derives a
      points-based age-equivalent from real biomarkers already on file, informed by
      cited published risk models (Framingham/D'Agostino et al. 2008 + CDC's "heart
      age" per Yang et al. 2015 for vascular; IDF metabolic syndrome criteria/Alberti
      et al. 2006 + NCEP ATP III for metabolic) — deliberately labeled everywhere
      (in-code comments, `lib/methodology/content.ts`'s new "Your age clocks" section)
      as our own simplified adaptation informed by those papers, not a replication of
      their exact statistical models, since real inputs they use (diagnosed-diabetes
      status, BP-medication use) aren't fields we capture. Surfaced on
      `app/pillar/[pillar].tsx` as an age-clock card (age + list of driver factors,
      each citing the real threshold it's based on) with a link into the Methodology
      page. Deliberately did **not** build a "cognitive/brain age" number — no
      peer-reviewed literature converts a reaction-time result into an age-equivalent,
      so the Mental pillar intentionally stays a 0-100 score only (also documented on
      the Methodology page).
- [x] AI extraction/chat models upgraded to Opus: `api/extract-lab.ts` and
      `api/extract-body-comp.ts` (misreading a value here silently corrupts a pillar
      score and everything drafted from it) and `api/ava.ts` (grounding quality) now
      call `claude-opus-5` instead of `claude-sonnet-5`, matching `generate-draft.ts`.
      Extraction calls got `max_tokens` raised to 8000 for Opus's adaptive-thinking
      headroom (thinking and output share one budget); `ava.ts` instead sets
      `thinking: {type: "disabled"}` since it's plain-text chat with no tool call, so
      none of the disabled-thinking pitfalls apply and it keeps replies fast.
- [x] AI provider migrated from Anthropic/Claude to **Google Gemini** (Google AI
      Studio). All model calls go through one helper (`lib/ai/gemini.ts`,
      `@google/genai`): `extractJsonFromDocument` (vision/PDF → schema-constrained
      JSON) for `api/extract-lab.ts` + `api/extract-body-comp.ts`, `generateJson`
      for the two `lib/ai/draftGeneration.ts` narrative calls, and `chatText` for
      `api/ava.ts`. Gemini Pro for extraction/draft (accuracy), Flash for AVA chat.
      Env var is now `GEMINI_API_KEY` (server-only; `CORE_API_ENV` updated); the
      Anthropic forced-tool-calls became Gemini `responseSchema` + `responseMimeType:
      application/json`, and item-count/length limits moved from schema keywords to
      the prompt (Gemini's schema support for `minItems`/`maxLength` is inconsistent).
      Gemini ingests PDFs and images natively, so the old document-vs-image block
      split is gone. The mock/rule-based fallbacks (`lib/ava/respond.ts`, mock draft)
      are unchanged and still run with no AI configured. Reason for the swap: repeated
      Anthropic API-account suspensions; the deterministic scoring/PhenoAge/age-clocks
      never used an LLM and are untouched.
- [x] AI provider migrated again from Gemini to **OpenAI** (`lib/ai/openai.ts`,
      `openai` SDK). Same three helpers, same signatures, so no endpoint changed:
      `extractJsonFromDocument` (image/PDF → JSON), `generateJson` (draft narrative
      + care plan), `chatText` (AVA). `gpt-4o` for extraction/draft, `gpt-4o-mini`
      for chat; env-overridable via `OPENAI_MODEL` / `OPENAI_MODEL_MINI`. Env var is
      now `OPENAI_API_KEY` (server-only; `CORE_API_ENV` updated). Structured output
      uses OpenAI **strict** `response_format: json_schema` — a `toStrictSchema`
      helper deep-adds `additionalProperties:false` + full `required` and makes
      source-optional fields nullable, since strict mode requires it. Schema type
      constants moved from Gemini's uppercase `Type` enum to a local lowercase
      `JsonType` (standard JSON Schema). PDFs go in as a `file` content part, images
      as `image_url`. `lib/ai/gemini.ts` + `@google/genai` removed. Reason for the
      swap: Gemini's relentless model-name churn and SDK-version lag (2.5-pro retired
      for new keys, then an ESM-only-SDK build failure, then a cryptic runtime error
      on 3.x) — OpenAI has stable model names, first-class strict structured output,
      and a CJS-compatible SDK (no Vercel ESM/CJS build drama). Deterministic
      scoring/PhenoAge/age-clocks and the mock fallbacks are still untouched.
- [x] Real PhenoAge as the biological-age formula: `lib/ai/phenoAge.ts` implements the
      actual published Levine et al. 2018 formula ("An epigenetic biomarker of aging
      for lifespan and healthspan," *Aging*, 10(4):573–591) — the real coefficients and
      Gompertz-based calculation, not our own adaptation of it (unlike the vascular/
      metabolic age clocks above). Requires all 9 of its inputs (albumin, creatinine,
      fasting glucose, hs-CRP, lymphocyte %, MCV, RDW, alkaline phosphatase, white
      blood cell count) or returns `null` rather than guessing from a partial set.
      Wired in wherever biological age is computed (`api/generate-draft.ts`, both
      repositories' biomarker-edit score-resync path) as `computePhenoAge(...) ??`
      falling back to the existing composite estimate — real formula when the data
      supports it, honest fallback otherwise. Six new catalog entries added to power
      this (`albumin`, `lymphocyte_pct`, `mcv`, `rdw`, `alp`, `wbc` in
      `lib/ai/labCatalog.ts`, grouped under the metabolic pillar alongside the other
      general-chemistry markers already there) with matching extraction support in
      `api/extract-lab.ts` and unit-conversion entries in `lib/ai/unitConversion.ts`
      (creatinine and hs-CRP were already stored in the units PhenoAge needs; only
      fasting glucose needs converting, done inside `phenoAge.ts` itself). Demo data
      (`lib/data/mock.ts`) extended with the same six markers so delivered demo
      participants show the real formula rather than only the fallback — James Chen's
      hand-authored draft is untouched, keeping his numbers consistent with rule #5.
      `app/bio-age.tsx` and the Methodology page's "How your scores are calculated"
      section both branch on `missingPhenoAgeInputs(biomarkers).length === 0` to
      honestly describe whichever one actually produced the displayed number, instead
      of always claiming the composite (which was true before this, but would have
      become a false claim the moment PhenoAge could apply).
- [x] Onboarding upload flow hardened (tester feedback): the three capture channels
      (Lab Reports, Body Composition, Wearables) now share one `lib/onboarding/useChannelUpload.ts`
      hook that AWAITS extraction and only marks a section "done" when the file actually
      yielded health data — a wrong/unreadable upload surfaces a real error + retry instead
      of the old fire-and-forget `.catch(()=>{})` that swallowed every failure and always
      showed "Done". Uploaded files are now visible (`components/onboarding/UploadedFilesList.tsx`,
      real filename parsed from `storage_path` via `fileDisplayName`) with read/processing
      status, and multiple files per channel are supported ("Add another"). Wearables accept
      the Apple Health `export.xml` directly, not just the `.zip` — `api/extract-wearables.ts`
      detects zip-vs-xml by the "PK" magic bytes and parses either.
- [x] Uploads made optional: `lib/onboarding/flow.ts` — ReCOGnAIze now unlocks right after
      the Questionnaire (was gated behind all three uploads), the three upload channels are
      marked `optional` and no longer gate `isCaptureComplete` (only Questionnaire + ReCOGnAIze
      are required), each channel screen has an "I'll add this later" skip, and the hub shows an
      "Optional" tag on them. Matches Dr. Tong's "insights from basic info, more on more data".
- [x] Tester bug fixes: (a) "James" no longer leaks into real accounts — dropped the
      hard-coded `name = "James"` default in `MobileShell` (rendered during the participant
      load window); greeting shows alone until the real name arrives. (b) Mood is editable
      again and profile edits reflect immediately — `SupabaseRepository.upsertDailyLog` and
      `.updateParticipant` now call `this.notify()` like `MockRepository` does, so subscribed
      screens re-read after a same-client write (they relied only on Postgres realtime, which
      doesn't fire synchronously for the writing client). (c) Password fields got a show/hide
      eye toggle built into `components/ui/Field.tsx`'s `Input`. (d) Age/Height/Weight on
      `profile.tsx` are typed numeric inputs (number-pad, digits-only, plausibility bounds)
      instead of long scroll `SelectField`s.
- [x] Participant-initiated consent withdrawal (`app/privacy.tsx`, linked from the participant
      Settings "Privacy & consent" row): shows consent status + what data is held, and a
      "Withdraw consent" action (confirm dialog) that records `consent_withdrawn_at`
      (`supabase/migrations/0008_consent_withdrawal.sql`) and signs the participant out.
      Deliberately NON-destructive — data isn't auto-deleted; the withdrawal surfaces to the
      care team on the admin participant detail page ("Consent withdrawn [date]") for handling
      per the retreat's data policy.
- [x] Repository resolution made lazy (`lib/data/mock.ts`): `export const repository =
      getRepository()` ran at module scope, so `createClient()` AND the realtime
      `channel("db-changes").subscribe()` both fired during bundle evaluation — the import
      chain `app/_layout.tsx → lib/auth/AuthProvider → lib/data/actions → ./mock` reaches it
      before React renders anything. That left no seam early enough to hand Supabase a
      different auth `storage` adapter (it's taken at `createClient` construction), which the
      native shell needs to back the session with `expo-secure-store` instead of localStorage.
      Now a lazy `Proxy` with a binding get-trap, so the ~19 files importing the const are
      untouched; `Repository` is all methods and no data properties, so that's sufficient.
- [x] **Repo restructured into an npm workspaces monorepo** — the whole app moved from the
      repo root into `packages/web` (`git mv`, so history follows; no file's relative imports
      changed, and `api/` moved alongside `lib/` so its `../lib/*` imports still resolve).
      Root `package.json` declares `workspaces: ["packages/web", "packages/shared"]`.
      `packages/web/metro.config.js` gained the monorepo `watchFolders` +
      `nodeModulesPaths` config (npm hoists everything to the root `node_modules`, outside
      Metro's default project root) — deliberately WITHOUT `disableHierarchicalLookup`,
      which under npm hoisting makes Metro ignore nested version resolutions and serve the
      wrong transitive deps. `vercel.json` moved to `packages/web/` and **dropped its
      `installCommand: "npm ci"`**: a custom install command runs with cwd = the Vercel Root
      Directory, where there is no lockfile, so it fails outright — Vercel's default install
      correctly walks up to the workspace root instead. Two matching Vercel dashboard changes
      are required (see SETUP.md): Root Directory → `packages/web`, and **"Include source
      files outside of the Root Directory" → ON**, without which `@vercel/node` can't trace
      the hoisted deps and every `/api/*` function fails at runtime with `MODULE_NOT_FOUND`.
      Reason for all of it: the native iOS/Android app is a thin WebView shell
      (`packages/shell`) around the deployed web build, mirroring the sibling
      `revitalaize-gms` repo's architecture.
- [x] **Native WebView shell (`packages/shell`)**: a standalone Expo SDK 54 app whose only
      screen is a `react-native-webview` onto the deployed web build. Deliberately NOT an
      npm workspace member (root `workspaces` lists only `packages/web` + `packages/shared`)
      with its own lockfile and `expo.autolinking.searchPaths: ["./node_modules"]` — Expo
      autolinking searches every ANCESTOR `node_modules`, so under workspace hoisting it
      would link `packages/web`'s native modules (expo-blur, expo-video, react-native-svg…)
      into the shell build and pin both packages to one Expo SDK. Verified isolated:
      `expo-modules-autolinking search` resolves all 13 modules from
      `packages/shell/node_modules`, none from web. Note `resolver.disableHierarchicalLookup`
      is NOT set anywhere — it sounds like the isolation knob and isn't (npm nests
      conflicting versions, and disabling the lookup makes Metro refuse to see them; it
      broke the bundle on `expo-asset`). Launch gates on connectivity ONCE and then never
      unmounts the WebView — swapping in the offline screen would destroy the web app's JS
      context and reboot it mid-flow on a brief drop. Crash recovery bumps the WebView's
      React `key` to force a native remount rather than calling `.reload()`, which doesn't
      reliably re-run `injectedJavaScriptBeforeContentLoaded`.
- [x] **Typed web↔native bridge (`packages/shared/src/bridge`)**: dependency-free
      postMessage protocol (`BridgeCore` — envelopes, request/response correlation,
      timeouts, events) used by both sides, with 21 vitest tests. Versioned via
      `PROTOCOL_VERSION` because the two halves ship on different clocks: web redeploys on
      every push, the shell ships through store review and lingers on devices — so a newer
      web app talking to an older shell is the NORMAL case, and `UNSUPPORTED` is a routine
      answer, not an error. Web side is `packages/web/lib/platform/`; every helper there
      no-ops or falls back in a plain browser, so nothing in the app needs to branch on
      platform. `@aiw/shared` is aliased explicitly in both metro configs and both
      tsconfigs (to `packages/shared/src`) rather than relying on its `exports` map — SDK
      52's Metro doesn't enable package exports and `expo/tsconfig.base` uses classic
      moduleResolution, so neither would honour it.
- [x] **Auth session in the device keychain**: inside the WebView `Platform.OS === "web"`,
      so supabase-js would persist to localStorage — and WebKit's storage eviction applies
      to WKWebView, silently signing users out between launches. `lib/data/supabase.ts` now
      picks its `storage` from `getPlatform()`, backed by `expo-secure-store` over the
      bridge. Hydrate-once + write-through (whole map read at boot into memory, reads
      served synchronously, writes mirrored after) rather than a proxy, so auth doesn't
      depend on bridge liveness. Chunked at 1800 UTF-8 bytes because expo-secure-store
      documents a 2048-byte Android limit and a Supabase session lands at 1.8–3 KB —
      straddling it, so it would fail only for accounts with more metadata. The chunking
      is in `sessionCodec.ts` (shared, tested for multi-byte and surrogate pairs) since
      it's genuinely a two-sided contract. This is why the repository had to become lazy.
- [x] **Terra OAuth via the system browser**: providers reject OAuth in an embedded WebView
      (Google returns `disallowed_useragent`), so `WearableConnectOptions` now calls
      `openExternalUrl()` → `WebBrowser.openAuthSessionAsync` (ASWebAuthenticationSession /
      Custom Tabs). Driven by an explicit bridge call, NOT by intercepting
      `onShouldStartLoadWithRequest` — on Android that maps to `shouldOverrideUrlLoading`,
      which isn't reliably invoked for JS-initiated navigation without a user gesture, and
      the call happens after an `await`. Terra requires an `https:` redirect but the iOS
      auth sheet only auto-dismisses on a custom scheme, so `packages/web/public/terra-return.html`
      bounces to `ai-wellness://` (served as a real static file, which Vercel resolves
      before the SPA rewrite). The shell forwards the params back as a `navigation:deep-link`
      event, since the redirect landed in the system browser and the web app can't read it
      from `window.location`.
- [x] **Android hardware back over the bridge**: resolved by the WEB app
      (`useNativeBackHandler` → `router.canGoBack()`), not by WebView history — several
      flows use `router.replace()`, which pushes no history entry, so `goBack()` would skip
      screens or exit early.
- [x] **Daily check-in reminder** (`app/(tabs)/settings.tsx` + `lib/platform/useDailyReminder.ts`):
      local notifications only (no push, no server, no FCM/APNs). Renders only in the shell.
      Deliberately a visible, user-configurable setting rather than a silent scheduler —
      it's the main mitigation for App Store guideline 4.2, which rejects apps that are
      just a website in a wrapper, and a reviewer has to be able to find and trigger it.
      Reconciles the OS with the stored preference on mount, since localStorage can be
      evicted in a WKWebView and would otherwise leave a reminder firing that the UI
      shows as off.
- [ ] **Blocking before any store build**: app icons + splash (none exist in this repo);
      confirm the production URL in `packages/shell/src/config.ts`; in-app account deletion
      (App Store 5.1.1(v) requires it — the existing consent withdrawal is deliberately
      non-destructive and does not satisfy it). See `packages/shell/README.md`.
