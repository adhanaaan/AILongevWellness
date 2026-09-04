# @aiw/shell

The native iOS/Android app. It has **one screen**: a WebView onto the deployed
web app (`packages/web`, served from Vercel). No product code lives here — every
participant and admin feature is built once in `packages/web` and is
automatically present on native.

What *does* live here is the handful of things a browser can't do: secure session
storage, local notifications, offline detection, and OAuth flows that providers
refuse to run inside an embedded WebView. Those are exposed to the web app over
the typed bridge in `packages/shared`.

## Running it

```bash
cd packages/shell
npm install          # own lockfile — NOT part of the root workspaces
npm start
```

By default it loads the production URL from [src/config.ts](src/config.ts).
Point it somewhere else per-machine:

```bash
EXPO_PUBLIC_WEB_APP_URL=https://your-preview.vercel.app npm start
```

It deliberately does not default to a LAN `expo start --web` server: that serves
over http, and both platforms block cleartext content in a WebView.

## Why this isn't an npm workspace

The root `package.json` lists only `packages/web` and `packages/shared`. This
package keeps its own `node_modules` and lockfile on purpose.

Expo autolinking searches the project's `node_modules` **and every ancestor**.
Under npm workspace hoisting, `packages/web`'s native modules (`expo-blur`,
`expo-video`, `expo-document-picker`, `react-native-svg`, …) would sit in the
repo-root `node_modules` and get linked into *this* build — pinning both packages
to a single Expo SDK, and failing the build outright when their
`expo-modules-core` majors differ.

Keeping the shell standalone means the two can move independently. The cost is
that `@aiw/shared` is resolved by path (see `metro.config.js`) rather than by
npm, which is why that package must stay dependency-free.

## Before the first store build

- [ ] **App icons and splash.** Still needed: a 1024×1024 `icon.png`, an Android
      adaptive-icon foreground, and a splash image, under `assets/`, then wired
      into `app.json`. They're deliberately not referenced there yet — pointing
      at missing files breaks `expo start`.
- [ ] **Set the production URL.** `src/config.ts`'s `PLACEHOLDER_WEB_APP_URL` is
      an unconfirmed guess. A release build that still points at it renders
      `ConfigErrorView` instead of loading anything, so this fails loudly rather
      than silently shipping the wrong environment — but it does have to be set.
- [ ] **Run `supabase/migrations/0020_delete_account.sql`** on the Supabase
      project, or in-app account deletion will fail at the RPC call.
- [x] **In-app account deletion** — App Store 5.1.1(v). Lives in the web app at
      `app/privacy.tsx`.
- [x] **Biometric app lock** — `expo-local-authentication`, toggled from the web
      app's Settings under "On this device".
- [x] **A real offline screen** with retry (`OfflineView`).

Reviewers looking for guideline 4.2 ("is this just a website?") should be pointed
at Settings → On this device: the daily reminder and the Face ID lock are both
native-only and user-configurable in three taps.
