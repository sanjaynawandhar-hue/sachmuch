# Deploying, and getting an APK

Two stages: put the web app on the internet, then wrap it as an Android package.

Nothing here costs money. The only paid step in the whole plan is the Play Console
developer account (₹2,000, one time), and that is only needed to publish — not to
install an APK on your own phone.

---

## Stage 1 — Deploy to Vercel

### 1. Push the repo to GitHub

Vercel deploys from a repository. This is the step that is still outstanding.

### 2. Import the project

At **vercel.com → Add New → Project**, pick the repo, then set:

| Setting | Value |
|---|---|
| Framework Preset | Next.js |
| **Root Directory** | `apps/web` |
| Include files outside root directory | **on** |

That last switch matters: this is a pnpm workspace, and `apps/web` imports
`@sachmuch/ui`, `@sachmuch/core` and `@sachmuch/db` from outside its own folder.
Without it the build fails on a missing module.

### 3. Environment variables

Add these under **Settings → Environment Variables**, for Production and Preview:

| Name | Value |
|---|---|
| `DATABASE_URL` | the Supabase **session pooler** URI, password percent-encoded |
| `SACHMUCH_USER_AGENT` | `SachmuchBot/0.1 (https://<your-domain>; sanjay.nawandhar@gmail.com) node-fetch` |

`DATABASE_URL` is needed **at build time**, not just at runtime: the feed page is
statically generated with hourly revalidation, so the build itself reads the facts.

### 4. Deploy

You get `https://<project>.vercel.app`. Open it on an Android phone, and Chrome
offers **Add to Home Screen** — icon, fullscreen, no browser chrome. For many
users that is already the app.

---

## Stage 2 — Build the APK

### The easy route: PWABuilder

This machine has no Java runtime and no Android SDK, and installing them is about
10 GB. **PWABuilder does the build in the cloud instead.**

1. Go to **pwabuilder.com**
2. Enter your Vercel URL
3. Package for stores → **Android**
4. Options: package id `com.sachmuch.app`, and leave **signing key: create new**
5. Download the zip

It contains `app-release-signed.apk` (sideload this onto your phone),
`app-release-bundle.aab` (for the Play Store), and `signing.keystore` with a
`signing-key-info.txt`.

**Keep the keystore and its passwords somewhere safe and backed up.** Lose them
and you can never update the app on Play under the same listing — you would have
to publish a new one and lose your installs and reviews. This is the single most
irreversible thing in the whole project.

### Remove the URL bar

Out of the box the wrapper shows a browser address bar at the top, which no one
will mistake for an app. Removing it takes one step:

1. Open `signing-key-info.txt` and copy the **SHA-256 fingerprint**
2. In Vercel, add env var `ANDROID_CERT_FINGERPRINT` with that value
3. Redeploy

`/.well-known/assetlinks.json` then serves a statement linking the package to the
domain, Android verifies it on next launch, and the bar disappears.

### Install it

Copy the `.apk` to the phone and open it. Android will ask permission to install
from an unknown source; that is expected for a sideloaded build.

---

## What the wrapper cannot do

Worth knowing before you judge the result. Offline packs, the home-screen widget,
scheduled notifications carrying fact text, and full device TTS control all need
the native build. See `docs/DECISIONS.md`.

---

## Stage 3 — the native app, later

`apps/mobile` is an Expo project that currently renders the Phase 0 clay-card
demo. Porting the feed to it and building with EAS is the eventual path. EAS
builds in the cloud too, so no Android SDK is needed locally then either.
