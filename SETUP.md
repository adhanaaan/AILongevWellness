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

- Wearable device integration (capture channel still self-reports "complete").
- The manual questionnaire and ReCOGnAIze cognitive assessment channels are
  still tap-to-complete placeholders, not real data-collection flows.
- Body composition capture uploads a file but doesn't yet parse values from it
  the way lab reports do (no vision extraction wired for that channel).
