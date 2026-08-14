# Going live: Supabase + Claude + real accounts

This app runs in two modes with zero config changes:

- **Mock mode** (default, nothing set): in-memory data, one demo participant,
  always "signed in" — this is what every preview/demo deploy uses today.
- **Real mode** (env vars set below): real Supabase-backed accounts for every
  participant and every care team member, real file storage, real Claude-powered
  lab extraction and AVA chat.

Nothing in the codebase needs to change to switch modes — it's entirely driven
by which environment variables are set on Vercel.

## 1. Create a Supabase project

supabase.com → sign in → **New Project** → name it, set a DB password (save
it somewhere safe), pick a region close to Nanjing (Singapore `ap-southeast-1`
is closest). Takes ~2 minutes to provision.

## 2. Run the schema migration

Dashboard → **SQL Editor** → paste the entire contents of
`supabase/migrations/0001_init.sql` → **Run**.

This creates every table, RLS policy, and the RPC functions the app calls for
sign-off/release/etc. Safe to re-run (uses `create table if not exists`).

**If you already ran `0001_init.sql` before**, also run these in order, the
same way:
- `supabase/migrations/0002_consent_tracking.sql` — adds
  `consent_given`/`consented_at` to `participants`.
- `supabase/migrations/0003_upload_limits.sql` — adds a file-size cap and
  allowed MIME types to the storage buckets (previously unlimited).
- `supabase/migrations/0004_care_plan.sql` — adds `medications` (self-reported
  catalog) to `participants` and `care_plan` (doctor-verified, per-category
  plan) to `ai_draft`.
- `supabase/migrations/0005_care_team_roster.sql` — lets care team accounts
  read the full `user_roles` table (previously own-row-only), needed for the
  admin Settings page's real registered-teammate count.
- `supabase/migrations/0006_async_review.sql` — replaces the `sign_off()` RPC so
  GP and TCM can sign off independently, in either order. **Required**, or
  sign-off breaks. Safe to re-run (it's `create or replace function`).
- `supabase/migrations/0007_biomarker_history.sql` — adds the `biomarker_readings`
  history table (and `measured_at` on `biomarkers`) that every lab/wearable/
  body-comp extraction writes to. **Required**, or uploads fail. Run once (its
  `create policy` lines error harmlessly if it's already applied).
- `supabase/migrations/0008_consent_withdrawal.sql` — adds `consent_withdrawn_at`
  to `participants`, set when a participant withdraws consent from Settings →
  Privacy & consent. Without it, the withdrawal action errors.

Any future numbered migration file works the same way: run it once, in
order, after pulling new code that references it.

## 3. Turn off email confirmation (recommended for this pilot)

Dashboard → **Authentication** → **Providers** → **Email** → turn off
**Confirm email**.

Why: with it on, `signUp()` doesn't produce a live session until the user
clicks a confirmation link, so a participant can't fill in their profile or
start capture right after creating their account — they'd have to check email
first. For a small, known group of ~20 executives at a retreat, turning this
off gives a frictionless sign-up → profile → capture flow. The app already
handles either setting (it shows a "check your email" screen if confirmation
is required) — this step is a UX recommendation, not a hard requirement.

**If you already hit "confirm email" going to a broken/localhost link**: fresh
Supabase projects default their **Site URL** to `http://localhost:3000`, so a
confirmation link clicked from anywhere else lands nowhere. Either turn off
Confirm Email as above (simplest — makes this a non-issue), or fix it properly
at Dashboard → **Authentication** → **URL Configuration**:
- **Site URL** → your deployed URL (production domain, or the PR preview URL
  you're testing on)
- **Redirect URLs** → add that same URL (wildcards work, e.g.
  `https://*.vercel.app/**`, useful since every PR/branch gets its own preview
  URL)

Any account stuck mid-confirmation from before this fix: Dashboard →
**Authentication** → **Users** → delete that row and sign up again.

### Brand the auth emails (verification / password reset)

Testers flagged the sign-up emails as unbranded (generic Supabase sender +
template). These emails are **not in this repo** — they're transactional emails
Supabase Auth sends, configured in the dashboard, so branding them is a
dashboard task, not a code change:

- **Sender name / address & deliverability** → Dashboard → **Project Settings**
  → **Authentication** → **SMTP Settings**. The built-in Supabase mailer is
  rate-limited and sends from a Supabase address — for a real launch, plug in
  custom SMTP (e.g. Resend, Postmark, SendGrid) with a **from-address on your
  own domain** so the email reads as coming from the retreat/AI Wellness, not
  Supabase. Set up SPF/DKIM on that domain or the mail lands in spam.
- **Template copy & look** → Dashboard → **Authentication** → **Email
  Templates**. Edit the **Confirm signup**, **Magic Link**, **Reset password**,
  and **Change email** templates: replace the default subject/body with
  AI-Wellness-branded copy (they support HTML, so you can add a logo, the sage
  palette, and a footer). Keep the `{{ .ConfirmationURL }}` token intact.
- If you followed step 3 and turned **Confirm email** off, the confirmation
  email isn't sent at all — but password-reset still is, so branding the reset
  template is still worthwhile.

## 4. Collect your keys

Dashboard → **Project Settings** → **API**:

- **Project URL**
- **anon / public** key (safe to embed client-side — protected by RLS)
- **service_role / secret** key (server-only, never goes in client code)

Then console.anthropic.com → **API Keys** → **Create Key** for your Anthropic
key. (This is separate from any Claude Code subscription — it's what the
deployed app calls at runtime for lab extraction and AVA.)

## 5. Set environment variables on Vercel

Project → **Settings** → **Environment Variables**:

| Name | Value | Notes |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Project URL | client-safe |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | anon key | client-safe |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key | server-only — used only inside `/api/*.ts` |
| `ANTHROPIC_API_KEY` | your Anthropic key | server-only — used only inside `/api/*.ts` |

Leave `EXPO_PUBLIC_API_BASE_URL` unset unless you're building a native
(iOS/Android) app — the web deploy calls `/api/*` on its own origin.

## 6. Redeploy

Trigger a new Vercel deployment so the build picks up the new environment
variables (Expo inlines `EXPO_PUBLIC_*` vars at build time, so a redeploy is
required after changing them — a running deployment won't pick them up live).

## 7. Verify

- Visit the deployed URL → **Begin Assessment** → consent → create an account
  → you should land on the profile screen with a real Supabase user created
  (check Dashboard → Authentication → Users).
- Visit `/admin/login` → create a care team account → you should land on the
  admin participant list (initially empty until participants sign up).
- Upload a real lab report PDF/photo during capture → within a few seconds,
  check Dashboard → Table Editor → `biomarkers` for new rows with
  `source = lab_extract`, `status = needs_review` — the care team confirms or
  edits these before they reach the participant's card.
- Once a participant's card is signed off and released, ask AVA a question on
  their card — replies should come from Claude, grounded in that card's data.

## What's still mock-only / not yet built

- **Live wearable device sync** (an aggregator "connect your device" integration)
  is still on the roadmap. Today wearable data is captured by uploading an Apple
  Health export file, which *is* parsed (`api/extract-wearables.ts`).
- Everything else in capture is now real: the questionnaire saves real profile
  data, ReCOGnAIze runs a real reaction-time test (`api/submit-recognize.ts`),
  lab reports and body-composition scans are both parsed by Claude vision
  (`api/extract-lab.ts`, `api/extract-body-comp.ts`), and each write re-derives
  the AI draft's scores + narrative.
