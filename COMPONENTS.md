# AI Wellness — Component Inventory

Shared components pulled from the nine Stitch screens, de-duplicated. Build these once; every screen composes from them. All colours reference tokens in `tailwind.config.js`. Icons use **lucide-react** (mapping at the bottom).

## 1. Primitives

| Component | Props | Notes |
|---|---|---|
| `Button` | `variant` (`primary` \| `secondary` \| `ghost`), `size`, `disabled`, `iconRight?` | primary = sage fill, `rounded-full`, white text; secondary = `border-strong` outline, sage text; disabled = `surface-muted` bg, no shadow. Admin buttons may use `rounded-md`. |
| `Card` | `padding?`, `tinted?` | `bg-surface`, `border` 0.5px, `rounded-lg`, `shadow-soft`. |
| `StatusBadge` | `status` | pill. Maps status→token: good/strong/signed/delivered→sage on sage-tint; monitor→terracotta-ink on terracotta-tint; needs-attention→danger on danger-tint; neutral (capturing/ai_drafted/gp_review/tcm_review)→ink-muted on surface-muted. |
| `Chip` | `selected`, `onToggle` | multi-select goal chips; selected = sage fill + white. |
| `SegmentedControl` | `options`, `value`, `onChange` | the Me / Admin and pillar tabs; active segment = `bg-surface` + sage text on a `surface-muted` track. |
| `Toggle` | `checked`, `onChange` | smoking-style switch; on = sage. |
| `Input` / `Select` / `Textarea` | standard + `error?` | `bg-surface`, `border-strong`, `rounded-md`, focus ring sage. |
| `ProgressBar` | `value` (0–100) | sage fill on `surface-muted` track; capture completion. |
| `Avatar` | `src?` \| `initials`, `size` | initials fallback on sage-tint. |

## 2. Composite (participant)

| Component | Props | Screen |
|---|---|---|
| `ScoreRing` | `value` (0–100), `label`, `status` | Health card. SVG ring, `.ring-chart` rotate −90°; stroke sage for good/strong, terracotta for monitor; animate dasharray on mount. |
| `BiologicalAgeHero` | `bioAge`, `chronoAge` | Health card hero; big `display` number, `−N years` pill in sage-tint, chronological struck-through. |
| `PillarTabs` | `active`, `onChange` | Vascular/Metabolic/Mental segmented control (capture + detail). |
| `CaptureChannelCard` | `icon`, `title`, `sourceTag`, `enteredBy`, `status`, `action` | Capture. Five variants; ReCOGnAIze card gets the sage-tint "AI Tech" treatment. |
| `KeyContributorItem` | `icon`, `text`, `tone` (`good` \| `monitor`) | Health card; monitor tone = terracotta-tint bg + warning icon. |
| `SuggestedFocusGrid` | `items[]` | Health card 2×2 focus tiles. |
| `CareTeamBadge` | `gpInitials`, `tcmInitials` | Health card; overlapping GP + TCM avatars + "Reviewed and signed off by your care team". |
| `ChatBubble` | `role` (`user` \| `ava`), `children` | AVA; user = secondary-container right-aligned, AVA = surface + border left, with disclaimer slot. |
| `SuggestionChips` | `items[]`, `onPick` | AVA horizontal scroll chips. |

## 3. Composite (admin)

| Component | Props | Screen |
|---|---|---|
| `PipelineStatusBadge` | `state`, `needsAttention?` | List + detail. Six states (§6 of spec) + optional danger flag row. |
| `CaptureCompletionBar` | `value` | List row; sage when complete, terracotta while partial. |
| `SummaryStatCard` | `icon`, `label`, `value`, `tone` | List header strip. |
| `ParticipantTableRow` | participant + pipeline | List; hover shift; `needs_attention` → danger-tint row + "Resolve". |
| `StatusTimeline` | `stages[]` (AI drafted → GP → TCM → Released), `current` | Detail; done = sage, active = outline, locked = muted + lock icon. |
| `BiomarkerRow` | `metric`, `value`, `unit`, `refLow`, `refHigh`, `source`, `trend`, `editable`, `flagged` | Detail table; out-of-range value in terracotta; `source` pill (Wearable/Lab/Manual/Admin/Body comp); `needs data` when empty. |
| `AIDraftSummaryCard` | `strengths[]`, `areasToMonitor[]`, `suggestedFocus[]`, `editable` | Detail; "Editable" badge; inline edit. |
| `SignOffStage` | `stage` (`gp` \| `tcm`), `reviewer`, `credential`, `notes`, `signed`, `locked` | Detail Verification Hub; TCM `locked` until GP `signed`. |
| `ReleaseButton` | `enabled` (both signed) | Detail; disabled styling until `enabled`. |
| `DiscussionPointsCard` | `points[]` | Detail right rail. |

## 4. Layout

| Component | Notes |
|---|---|
| `MobileShell` | max-width phone canvas, sticky top bar (avatar + greeting), bottom nav: **Insights** (`/card`), **Concierge** (`/ava`), **Care Plan** (`/tracking`), **Settings**. |
| `AdminShell` | left sidebar (AI Wellness wordmark + "Admin Portal"; nav: Participants, Review queue, Exports, Settings; clinician profile footer) + top bar (title, search, filter). |
| `OnboardingStepper` | welcome → consent → profile → capture; minimal progress dots; not part of bottom nav. |

## 5. Icon mapping (Material Symbols → lucide-react)

`notifications`→`Bell` · `bedtime`→`Moon` · `directions_run`→`Activity` · `restaurant`→`Utensils` · `monitor_weight`→`Scale` · `description`→`ClipboardList` · `match_case`/watch→`Watch` · `accessibility_new`→`PersonStanding` · `clinical_notes`→`FileText` · `psychology`→`Brain` · `upload_file`→`Upload` · `verified_user`→`ShieldCheck` · `auto_awesome`→`Sparkles` · `favorite`→`Heart` · `bolt`→`Zap` · `trending_up/down/flat`→`TrendingUp/TrendingDown/Minus` · `check_circle`→`CheckCircle2` · `lock`→`Lock` · `send`→`Send` · `qr_code_scanner`→`ScanLine` · `diversity_1`/group→`Users` · `rate_review`→`ClipboardCheck` · `file_download`→`Download` · `search`→`Search` · `tune`→`SlidersHorizontal` · `chat_bubble`→`MessageCircle`.

## 6. Cross-screen consistency checklist (fixes from Stitch)

- One product name: **AI Wellness** (drop Equilibrium / Elysia).
- "participant" not "patient"; rename "Patient Records".
- Palette from tokens only — no `#3f6355` / `#f9f9f9`.
- Bottom nav labels identical across all participant screens.
- AVA metabolic value **68**, not 84; no invented numbers.
- Same demo participant (James Chen, 58) across participant card, AVA, and its admin detail; consistent scores 74/68/81.
- Sign-off is real state, not DOM swaps.
