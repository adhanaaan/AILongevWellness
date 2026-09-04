# Going live: Supabase + OpenAI + real accounts

This app runs in two modes with zero config changes:

- **Mock mode** (default, nothing set): in-memory data, one demo participant,
  always "signed in" — this is what every preview/demo deploy uses today.
- **Real mode** (env vars set below): real Supabase-backed accounts for every
  participant and every care team member, real file storage, real OpenAI-powered
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
- `supabase/migrations/0009_wearable_ingest.sql` — adds the `wearable_connections`
  table and `participants.ingest_token`, for the Terra + health-export ingestion
  (see "Wearables & health data" below). Only needed if you wire those up.
- `supabase/migrations/0010_optional_capture_and_xml_upload.sql` — relaxes
  `submit_capture` (with 0012) and allows the Apple Health `export.xml` MIME.
- `supabase/migrations/0011_enable_realtime.sql` — turns on Postgres realtime for
  participants/pipeline/reviews/ai_draft. **Without it a two-device live demo
  won't update across clients** (sign-off/release look stuck on the other screen).
- `supabase/migrations/0012_submit_requires_questionnaire.sql` — **required.**
  Redefines `submit_capture` to gate only on the `manual` channel being complete.
  **Without it every new participant is blocked at quiz finish** ("All capture
  channels must be complete").
- `supabase/migrations/0014_*.sql` — run if present, in order.
- `supabase/migrations/0013_gate_care_team_role.sql` — **SECURITY, required.**
  Adds the `care_team_allowlist` table and stops anyone from self-asserting the
  `care_team` role at signup (which has full read/write to every participant's
  health data). Without it, the admin role is not safe.
- `supabase/migrations/0015_require_care_team_approval.sql` — superseded by 0016;
  safe to skip if you run 0016 (0016 redefines the same function).
- `supabase/migrations/0016_admin_created_care_team.sql` — **SECURITY, required
  (run after 0013).** Care-team accounts are admin-created, not self-service. The
  signup trigger decides the role **solely from the allowlist** (client metadata
  is ignored): an allowlisted email becomes `care_team`, everyone else becomes a
  participant. The admin login is sign-in only — there is no public admin sign-up.
- `supabase/migrations/0017_questionnaire_biomarker_source.sql` — **required for
  the Mental health capture.** Adds `'questionnaire'` to the `biomarkers.source`
  CHECK. Without it the WHO-5/PSS-4 submit 500s.
- `supabase/migrations/0018_admin_create_participant.sql` — **required for the
  admin "New participant" button.** Adds the `create_participant` RPC (and seeds
  the new participant's `manual` channel complete so it can reach sign-off).
- `supabase/migrations/0019_genetic_reports.sql` — **required for genetic report
  upload.** Creates the private `genetic-reports` storage bucket + RLS. Without it
  the upload fails with "Bucket not found".

Any future numbered migration file works the same way: run it once, in
order, after pulling new code that references it.

## Creating admin (care-team) accounts

Admin access is **not self-service** — you create each account yourself. Two
steps, both in the Supabase Dashboard, in this order:

1. **SQL Editor** — allowlist the email first:
   ```sql
   insert into public.care_team_allowlist (email) values ('dr.smith@clinic.example');
   ```
2. **Authentication → Users → Add user** — create the account with that email and
   a password (or send an invite). The signup trigger sees the allowlisted email
   and grants `care_team` automatically (no participant row is created). Hand the
   credentials to the clinician; they sign in at `/admin/login`.

Do step 1 before step 2. If you create the user first, they'll be provisioned as
a participant — delete that user + its participant row, add the allowlist entry,
then recreate the user. To revoke access later, delete the person's `user_roles`
row and their `care_team_allowlist` entry (and the auth user).

## 3. Email confirmation + redirect URLs (REQUIRED)

Email confirmation is **kept ON**. Keep it enabled at Dashboard →
**Authentication** → **Providers** → **Email** → **Confirm email** = on.

Because it's on, the confirmation link MUST point at your real app, or it
dead-ends. Fresh Supabase projects default their **Site URL** to
`http://localhost:3000`, so a link clicked from anywhere else lands nowhere.
Fix it at Dashboard → **Authentication** → **URL Configuration**:
- **Site URL** → your deployed URL (production domain, or the PR preview URL
  you're testing on).
- **Redirect URLs** → add that same URL. Wildcards work, e.g.
  `https://*.vercel.app/**` — useful since every PR/branch gets its own preview
  URL.

How the flow behaves with confirmation on (this is intended):
sign up (email + password + consent) → the app shows a "Check your inbox"
screen → the participant opens the link **in the same browser** → they're
signed in automatically and taken straight to the quiz (no manual re-login).
If they open the link on a different device, they just return to the app and
sign in. The app handles all of this — your only job is the Site/Redirect URL
config above.

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
- Since **Confirm email** is on, the **Confirm signup** template is the first
  email every participant receives — brand it well; it's their first impression.

## 4. Collect your keys

Dashboard → **Project Settings** → **API**:

- **Project URL**
- **anon / public** key (safe to embed client-side — protected by RLS)
- **service_role / secret** key (server-only, never goes in client code)

Then platform.openai.com → **API keys** → **Create new secret key** for your OpenAI
key. (This is what the deployed app calls at runtime for lab/body-comp
extraction, the AI draft narrative, and AVA. OpenAI reads PDFs and images
natively.)

## 5. Set environment variables on Vercel

Project → **Settings** → **Environment Variables**:

| Name | Value | Notes |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Project URL | client-safe |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | anon key | client-safe |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key | server-only — used only inside `/api/*.ts` |
| `OPENAI_API_KEY` | your OpenAI secret key | server-only — used only inside `/api/*.ts` |

Leave `EXPO_PUBLIC_API_BASE_URL` unset. The web deploy calls `/api/*` on its own
origin, and the native shell loads that same deployed origin in a WebView, so
relative paths resolve correctly there too.

## 5b. Vercel project settings (monorepo)

The app lives in `packages/web`, so the Vercel project needs two settings under
Project → **Settings** → **General** → **Root Directory**:

| Setting | Value |
|---|---|
| Root Directory | `packages/web` |
| Include source files outside of the Root Directory | **ON** |

The second one is not optional. npm workspaces hoist dependencies to the
repo-root `node_modules`, which is *outside* `packages/web` — and `@vercel/node`
traces each `api/*.ts` function's imports from the build context to decide what
to bundle. With the toggle off, install fails or the hoisted packages
(`@supabase/supabase-js`, `openai`, `jszip`, `fast-xml-parser`) never get
bundled, and every serverless function dies at runtime with `MODULE_NOT_FOUND`
while the static site still loads fine — so it looks like the app deployed
correctly right up until something calls the API.

After changing these, redeploy and **verify by making a real request to
`/api/ava`**, not just by loading the page.

Note that `packages/web/vercel.json` deliberately has no `installCommand`. A
custom install command runs with cwd = the Root Directory, where there is no
lockfile, so `npm ci` fails there; Vercel's default install walks up to the
workspace root, which is what we want.

## 6. Redeploy

Trigger a new Vercel deployment so the build picks up the new environment
variables (Expo inlines `EXPO_PUBLIC_*` vars at build time, so a redeploy is
required after changing them — a running deployment won't pick them up live).

## 7. Verify

- Visit the deployed URL → **Get started** → create an account (email + password
  + consent) → the quiz (name, goal, then the required basics: sex/age/height/
  weight) → you should land on the Insights card, with a real Supabase user
  created (check Dashboard → Authentication → Users).
- Create an admin account (see "Creating admin (care-team) accounts" above:
  allowlist your email, then add the user in Authentication → Users), then visit
  `/admin/login` → sign in → you should land on the admin participant list
  (initially empty until participants sign up). Confirm there is no sign-up option
  on that screen.
- Upload a real lab report PDF/photo during capture → within a few seconds,
  check Dashboard → Table Editor → `biomarkers` for new rows with
  `source = lab_extract`, `status = needs_review` — the care team confirms or
  edits these before they reach the participant's card.
- Once a participant's card is signed off and released, ask AVA a question on
  their card — replies should come from OpenAI, grounded in that card's data.

## Wearables & health data (Terra + Health Auto Export)

Three ways to get device/health data in, all landing as biomarkers through the
same normalize → score path (`lib/data/writeWearableBiomarkers.ts`). All three
are optional; the manual export upload works with nothing extra configured.

### A. Terra — live wearable sync (Oura, Garmin, Fitbit, Whoop, ...)

1. Create a Terra account at **dashboard.tryterra.co** and grab your **Dev ID**
   and **API Key**.
2. Add a **webhook / data destination** pointing at
   `https://<your-app>/api/terra-webhook`. Terra shows a per-destination
   **Signing Secret** — copy it.
3. Set the env vars on Vercel (see `.env.example`): `TERRA_DEV_ID`,
   `TERRA_API_KEY`, `TERRA_SIGNING_SECRET`, optionally `TERRA_PROVIDERS`
   (comma-separated allow-list), and `EXPO_PUBLIC_TERRA_ENABLED=true` to show the
   "Connect a wearable" button in the app. **Redeploy** (the `EXPO_PUBLIC_` flag
   is inlined at build time).
4. Run migration `0009`. Then in the app: Wearables capture → **Connect a
   device** → pick a provider → authorize. Terra sends an `auth` webhook (we
   store the connection) and then data webhooks, which write biomarkers tagged
   `source = wearable`.

Signature verification is enforced: `/api/terra-webhook` reads the raw body and
checks the `terra-signature` HMAC, so it rejects anything not signed with your
Signing Secret.

### B. Health Auto Export — Apple Health auto-sync from iPhone (DEFERRED)

> **Not enabled yet — we're shipping Terra first.** This path is fully built but
> gated off by `EXPO_PUBLIC_HEALTH_EXPORT_ENABLED` (unset = hidden). To turn it on
> later, set that flag to `true` and redeploy — no code change. The steps below
> apply once it's enabled.

For iPhone health data without a manual export, use the **Health Auto Export –
JSON+CSV** app (App Store, Premium tier does REST API automations).

1. Run migration `0009` (adds `participants.ingest_token`).
2. In the app: Wearables capture → **Get my sync link** → copy the private URL
   (it embeds a per-participant token).
3. In Health Auto Export: add a **REST API automation**, paste that URL, set
   format **JSON**, and pick a schedule. It POSTs Apple Health JSON to
   `/api/health-ingest`, which writes biomarkers tagged `source = apple_health`.

⚠️ **Verify the metric names once, live.** A few Health Auto Export metric
`name` strings (resting HR, HRV, body fat) follow the documented convention but
weren't confirmable from an authoritative list. `/api/health-ingest` returns the
`metricNames` it saw in each payload — send one real export and check the names
against the map in `lib/wearables/healthAutoExport.ts`, adjusting if needed.

### C. Manual Apple Health export upload

The original path still works with no setup: Wearables capture → upload the
`.zip` (or `export.xml`) from Health app's "Export All Health Data".

## What's still mock-only / not yet built

- Everything else in capture is now real: the questionnaire saves real profile
  data, ReCOGnAIze runs a real reaction-time test (`api/submit-recognize.ts`),
  lab reports and body-composition scans are both parsed by OpenAI vision
  (`api/extract-lab.ts`, `api/extract-body-comp.ts`), and each write re-derives
  the AI draft's scores + narrative.
