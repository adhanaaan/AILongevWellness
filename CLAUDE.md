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
- [ ] Wearable aggregator connect
- [ ] Consent tracking (consent_given, consented_at fields) — consent screen doesn't yet persist to a row
- [ ] Body composition scan value extraction (currently uploads the file only, no parsing)
- [ ] ReCOGnAIze is still an informational-only placeholder screen (no real assessment yet)
