# AI Wellness - Architecture & Code Reference

A React Native (Expo) executive wellness platform with two interfaces: a participant-facing mobile app and an admin review portal. Targets **web, iOS, and Android** from a single codebase.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.76 + Expo SDK 52 |
| Navigation | Expo Router 4 (file-based) |
| Styling | `StyleSheet.create()` with design tokens |
| Icons | `lucide-react-native` |
| Charts | `react-native-svg` (ScoreRing) |
| Data | Repository pattern with in-memory mock (swap-ready for Supabase) |
| Language | TypeScript 5.5 |

---

## Project Structure

```
ai-wellness/
├── app/                          # Expo Router screens
│   ├── _layout.tsx               # Root Stack navigator + StatusBar
│   ├── index.tsx                 # Welcome / landing page
│   ├── onboarding/               # Onboarding flow (Stack)
│   │   ├── _layout.tsx
│   │   ├── consent.tsx           # Three-checkbox consent form
│   │   ├── profile.tsx           # Demographics + goals form
│   │   └── capture.tsx           # 5 capture channels + submit
│   ├── (tabs)/                   # Participant bottom tabs
│   │   ├── _layout.tsx           # Tab navigator (Insights, Concierge, Care Plan, Settings)
│   │   ├── card.tsx              # Health card with scores + bio age
│   │   ├── ava.tsx               # AVA chat assistant
│   │   ├── tracking.tsx          # Daily tracking bento grid
│   │   └── settings.tsx          # Participant profile (read-only)
│   └── admin/                    # Admin portal (Stack)
│       ├── _layout.tsx
│       ├── index.tsx             # Participant list + search + stat cards
│       ├── review-queue.tsx      # Filtered GP/TCM review queue
│       ├── exports.tsx           # Data export options
│       ├── settings.tsx          # Admin profile + config
│       └── participants/
│           └── [id].tsx          # Participant detail (biomarkers, sign-off, release)
├── components/
│   ├── ui/                       # Shared design-system components
│   │   ├── Button.tsx            # Primary/secondary/ghost, sizes sm/md/lg
│   │   ├── Card.tsx              # Rounded card with shadow
│   │   ├── Avatar.tsx            # Circular initials avatar
│   │   ├── Field.tsx             # Input, Select, Textarea wrappers
│   │   ├── Chip.tsx              # Selectable pill chip
│   │   ├── ProgressBar.tsx       # Horizontal progress indicator
│   │   ├── SegmentedControl.tsx  # Tab-style segment picker
│   │   ├── StatusBadge.tsx       # Colored status label
│   │   ├── Toggle.tsx            # On/off switch
│   │   └── index.ts              # Barrel export
│   ├── participant/              # Participant-facing components
│   │   ├── BiologicalAgeHero.tsx # Large bio-age display with offset
│   │   ├── ScoreRing.tsx         # SVG circular score gauge
│   │   ├── KeyContributorItem.tsx
│   │   ├── SuggestedFocusGrid.tsx
│   │   ├── CareTeamBadge.tsx
│   │   ├── CaptureChannelCard.tsx
│   │   ├── PillarTabs.tsx        # Vascular / Metabolic / Mental tabs
│   │   ├── ChatBubble.tsx        # User/AVA chat message
│   │   └── SuggestionChips.tsx   # Quick-reply chips for AVA
│   ├── admin/                    # Admin-specific components
│   │   ├── SummaryStatCard.tsx
│   │   ├── PipelineStatusBadge.tsx
│   │   ├── CaptureCompletionBar.tsx
│   │   ├── StatusTimeline.tsx    # Pipeline stage progress
│   │   ├── BiomarkerRow.tsx      # Editable biomarker display
│   │   ├── AIDraftSummaryCard.tsx# Editable AI-generated summary
│   │   ├── SignOffStage.tsx      # GP/TCM review form
│   │   ├── ReleaseButton.tsx     # Deliver card to participant
│   │   ├── DiscussionPointsCard.tsx
│   │   ├── ParticipantTableRow.tsx
│   │   └── index.ts
│   └── layout/                   # Shell layouts
│       ├── MobileShell.tsx       # SafeAreaView + header for participant screens
│       ├── AdminShell.tsx        # Sidebar nav (desktop) / modal drawer (mobile)
│       └── OnboardingStepper.tsx # Progress dots for onboarding
├── lib/
│   ├── theme/
│   │   └── tokens.ts             # Design tokens (colors, fontSizes, radii, shadows, spacing)
│   ├── types/
│   │   └── db.ts                 # All TypeScript interfaces and type unions
│   ├── data/
│   │   ├── repository.ts         # Repository interface + SignedCard type
│   │   ├── mock.ts               # In-memory MockRepository with subscribe/notify
│   │   └── actions.ts            # Async action wrappers (ex-server actions)
│   └── ava/
│       └── respond.ts            # Rule-based AVA response engine
├── package.json
├── tsconfig.json
├── babel.config.js
├── metro.config.js
└── app.json                      # Expo config
```

---

## Navigation Architecture

```
Root Stack
├── index            → Welcome page
├── onboarding/      → Stack
│   ├── consent
│   ├── profile
│   └── capture
├── (tabs)/          → Bottom Tab Navigator
│   ├── card         → "Insights"
│   ├── ava          → "Concierge"
│   ├── tracking     → "Care Plan"
│   └── settings     → "Settings"
└── admin/           → Stack
    ├── index        → Participant list
    ├── review-queue → Filtered review queue
    ├── exports      → Data exports
    ├── settings     → Admin settings
    └── participants/[id] → Participant detail
```

---

## Data Layer

### Repository Pattern

All data access goes through a `Repository` interface (`lib/data/repository.ts`). The current implementation is `MockRepository` (`lib/data/mock.ts`) with seeded demo data.

**Key methods:**
- `listParticipants()` → `ParticipantSummary[]`
- `getParticipant(id)` → `Participant | null`
- `getCaptureChannels(id)` → `CaptureChannel[]`
- `getBiomarkers(id)` → `Biomarker[]`
- `getAiDraft(id)` → `AiDraft | null`
- `getReviews(id)` → `Review[]`
- `getPipeline(id)` → `Pipeline | null`
- `signOff(id, stage, data)` → `Review`
- `releaseCard(id)` → `Pipeline`
- `getSignedCard(id)` → `SignedCard | null`

### Reactivity

Components subscribe to data changes via `repository.subscribe(callback)`:

```tsx
useEffect(() => {
  repository.getParticipant(id).then(setParticipant);
  return repository.subscribe(() => {
    repository.getParticipant(id).then(setParticipant);
  });
}, [id]);
```

Mutations (sign-off, release, biomarker edits) call `notify()` internally, triggering all subscribers.

### Actions

`lib/data/actions.ts` provides thin async wrappers over repository methods. These were originally Next.js server actions; they now call the repository directly.

---

## Pipeline State Machine

Each participant progresses through a linear pipeline:

```
capturing → ai_drafted → gp_review → tcm_review → signed → delivered
```

| State | Description |
|-------|-------------|
| `capturing` | Data collection in progress across 5 channels |
| `ai_drafted` | AI has generated a health card draft |
| `gp_review` | Awaiting General Practitioner sign-off |
| `tcm_review` | Awaiting Traditional Chinese Medicine practitioner sign-off |
| `signed` | Both reviews complete; ready for release |
| `delivered` | Card released to participant; AVA chat unlocked |

Participants can also be flagged with `needs_attention` (e.g., incomplete lab upload, wearable sync failure).

---

## Type System

All domain types live in `lib/types/db.ts`:

| Type | Purpose |
|------|---------|
| `Participant` | Demographics: name, age, sex, height, weight, goals |
| `CaptureChannel` | 5 data channels: manual, wearables, body_composition, lab_report, recognize |
| `Biomarker` | Individual health metric with value, reference range, source, flag |
| `PillarScores` | Composite scores for vascular, metabolic, mental |
| `AiDraft` | AI-generated health card: scores, bio age, contributors, strengths, focus areas |
| `Review` | GP or TCM sign-off record with reviewer credentials |
| `Pipeline` | Current state + attention flag |
| `ParticipantSummary` | Lightweight list item: participant + pipeline + capture completion % |
| `SignedCard` | Delivered card bundle: participant + draft + biomarkers + reviews |

---

## Design Tokens

All visual constants in `lib/theme/tokens.ts`:

### Colors
- **Backgrounds:** `bone` (#FAF9F4), `surface` (#FFF), `surfaceMuted` (#F3F1EA)
- **Text:** `charcoal` (#1A1C1C), `inkMuted` (#5F625C)
- **Brand:** `sage` (#6B9080), `sageDark` (#557567), `sageTint` (#E8F0EB)
- **Accent:** `terracotta` (#E98A6D), `terracottaInk` (#B8542F), `terracottaTint` (#FBE9E1)
- **Borders:** `border` (#DCD9CF), `borderStrong` (#C9C5B8)
- **Danger:** `danger` (#BA1A1A), `dangerTint` (#FBE4E2)

### Font Sizes
`display` (48) · `headlineLg` (32) · `headlineMd` (24) · `bodyLg` (18) · `bodyMd` (16) · `labelMd` (14) · `caption` (12)

### Radii
`sm` (8) · `md` (12) · `lg` (16) · `full` (9999)

---

## Screen Reference

### Participant Screens

| Screen | File | Key Features |
|--------|------|-------------|
| Welcome | `app/index.tsx` | Brand intro, "Begin" CTA, QR scan button |
| Consent | `app/onboarding/consent.tsx` | 3 checkboxes, all required to proceed |
| Profile | `app/onboarding/profile.tsx` | Name, age, sex, height, weight, goal chips |
| Capture | `app/onboarding/capture.tsx` | 5 channel cards, progress bar, submit |
| Insights | `app/(tabs)/card.tsx` | Bio age hero, 3 score rings, contributors, focus grid |
| Concierge | `app/(tabs)/ava.tsx` | AVA chat with suggestion chips, guardrails |
| Care Plan | `app/(tabs)/tracking.tsx` | Weekly bars, sleep/steps stats, mood, meals, supplements |
| Settings | `app/(tabs)/settings.tsx` | Profile display, privacy, about |

### Admin Screens

| Screen | File | Key Features |
|--------|------|-------------|
| Participants | `app/admin/index.tsx` | Stat cards, search, scrollable list |
| Review Queue | `app/admin/review-queue.tsx` | Segmented filter (All/GP/TCM), queue list |
| Exports | `app/admin/exports.tsx` | CSV, PDF, audit log export options |
| Settings | `app/admin/settings.tsx` | Dr. Helena Marsh profile, permissions, team |
| Detail | `app/admin/participants/[id].tsx` | Pipeline timeline, biomarkers by pillar, AI draft editor, GP/TCM sign-off forms, release button |

---

## AVA Chat Assistant

`lib/ava/respond.ts` implements a rule-based response engine that:
- Only answers questions about the participant's **delivered, signed health card**
- Returns guardrail responses for diagnosis requests
- Matches keywords to card data (scores, bio age, contributors, focus areas)
- Is unavailable until the card reaches `delivered` state

---

## Running the App

```bash
npm install
npx expo start          # Dev server (press w for web, i for iOS, a for Android)
npx expo start --web    # Web only
```

---

## Swapping to Supabase

1. Create a new class implementing the `Repository` interface in `lib/data/repository.ts`
2. Replace the `repository` export in a new `lib/data/supabase.ts` module
3. Update imports in `lib/data/actions.ts` to use the Supabase repository
4. The `subscribe/notify` pattern maps to Supabase Realtime subscriptions
5. All screens consume data through the same interface — no UI changes needed

---

## Demo Data

The mock seeds **20 participants** with varied pipeline states:
- 9 delivered, 4 GP review, 4 TCM review, 1 AI drafted, 1 capturing
- 3 flagged with `needs_attention`
- James Chen (`james-chen`) is the primary demo participant in `capturing` state
- Biomarkers generated from pillar scores with deterministic seeded randomness
