# Sachmuch Expo iOS app

Date: 14 October 2026
Status: Approved by the user on 14 October 2026. Implementation plan pending review.

## Purpose and success criteria

Turn Sachmuch's existing Expo demonstration into a usable iPhone facts app for English and Hindi readers, while retaining Android-compatible shared code. The first release lets someone discover sourced facts, change language, inspect sources, save facts, and share them without an account. It must look polished on iPhone and remain readable with large text, VoiceOver, reduced motion, and reduced transparency.

The user chose Expo over SwiftUI and approved the proposed Discover, Saved, and Settings scope. Device-local storage, no login, and no paid features define this first version. This specification does not claim App Store submission or a signed device build is already possible.

## Existing project evidence

Repository: https://github.com/sanjaynawandhar-hue/sachmuch
Inspected main revision: 69b9ab6d5b0be8dd44cbf181ce64dd79d612bd0a.

- apps/mobile/App.tsx contains two static demonstration cards.
- apps/mobile/app.json already identifies the iOS app as com.sachmuch.app and enables tablet support.
- apps/web/lib/facts.ts reads published bilingual facts on the server using DATABASE_URL. It returns English and optional complete Hindi representations of each fact.
- The inspected repository tree exposes a boost endpoint but no mobile feed endpoint.
- packages/core and packages/ui provide shared logic, fact types, and design primitives. Reuse these where compatible; do not import database code into mobile.
- The local workspace currently contains an empty Git repository, not a Sachmuch checkout. Implementation must obtain a separate Sachmuch checkout and inspect its repository instructions before editing product files.

## App experience

### Discover

Show one primary fact card with category, hook, body, and clearly labelled source attribution. Retain Sachmuch's warm clay-inspired identity with lavender accents, generous spacing, rounded surfaces, and restrained depth. Use translucent navigation where supported, with a solid high-contrast fallback. Genuine native glass effects depend on the installed Expo SDK, OS, and supported libraries; a blur effect must not be represented as native Liquid Glass.

Vertical swipes advance between facts, with visible previous/next controls offering the same functionality. Long text remains scrollable, and reading scrolls must not accidentally advance cards. Respect safe areas and use responsive layout rather than fixed screen dimensions. Haptics are subtle and optional. Reduced-motion mode removes spatial transitions.

Provide save, share, source details, and a persistent English/Hindi selector. Source details open in an accessible sheet and link to the original publisher using the system browser. Share sends the displayed fact text and its source URL through the native share sheet. Present provenance as 'Sourced from'; do not claim independent verification.

Hindi mode only includes facts with complete Hindi content. Changing language retains the current fact when that translation exists; otherwise selects the first eligible fact and explains when none are available. Labels, errors, and empty states are translated too.

### Saved

Bookmarks are keyed by stable fact ID and persist across restarts. Store the bilingual fact snapshot and saved time so deliberately saved facts can be read without a connection. Explain that these are saved copies; do not present cached values as current live statistics. Allow opening, sharing, and removing saved facts. A missing Hindi translation is explicitly labelled rather than silently substituted.

No sync or account is required. Empty state links back to Discover. Saving failures must remain visible and must not falsely report success.

### Settings

Persist language, appearance (system/light/dark), and haptics preference. Provide a clear saved-copy storage explanation. The default appearance follows the device. Avoid unnecessary permissions, onboarding, or account screens.

## Navigation and structure

Use three bottom destinations: Discover, Saved, Settings. Keep existing shared packages intact and introduce focused mobile modules for screens, fact presentation, source sheets, feed fetching, persistence, and preferences. Select navigation and native UI dependencies compatible with the actual installed Expo version during planning; use Expo's dependency compatibility tooling instead of arbitrary version upgrades.

Use shared feed-ranking logic if its interfaces support the mobile feed. Store reading affinity locally; do not add analytics collection. Do not add coins, quizzes, paid tiers, notifications, background music, or bulk offline packs to this first scope.

## Backend and data boundary

Add a read-only GET /api/feed endpoint to the existing Next.js app, backed by getFeedFacts. Return a versioned envelope with bilingual facts and a retrieval timestamp. Cap the feed at the existing 300-fact limit; this first version refreshes a bounded collection and does not imply infinite pagination.

The endpoint exposes published content only. It must preserve publisher, source URL, attribution, image credit, and translation completeness. Database credentials remain server-side. The app uses EXPO_PUBLIC_API_URL for the server origin; this is a public URL, never a secret. Validate the origin and returned payload, allow local HTTP only for development, and use HTTPS for release configuration.

Missing database configuration or database errors produce a structured service-unavailable response without stack traces or connection details. Do not return demonstration facts as if they were live content. A distinct development fixture mode may be provided for repeatable tests and screenshots, clearly marked as sample data.

## State, loading, and failure behavior

Show a loading placeholder during the first fetch, an actionable empty state for an empty corpus, and a retry control for failures. Cancel obsolete requests, apply a timeout, and prevent older responses from replacing newer language or refresh state. A refresh failure can retain already loaded content with an explicit notice.

Hydrate persisted preferences and bookmarks before applying defaults. Validate and version stored data; recover corrupt entries without crashing. Serialize storage writes so rapid changes cannot overwrite newer state. Treat a finite feed's end honestly and offer refresh or revisit.

## Accessibility and visual checks

All actionable elements have descriptive accessibility labels and adequate touch areas. Support dynamic text and long Hindi content without clipping. Do not rely on color, animation, or swipe alone. Respect reduced motion and transparency settings. Test light/dark themes, small iPhones, safe areas, and the existing tablet configuration.

## Validation and delivery

Run appropriate shared-package tests and type checks. Add behavior tests for feed parsing and failure handling, complete-Hindi filtering, stable bookmark identity, preference hydration, storage failures, and the new API's success/error contract. Check save/restart/remove, sharing, source opening, navigation, and language transitions in the running app.

Run Expo dependency checks and a JavaScript bundle/export check. If Xcode and an iOS simulator are available, build and inspect the app there, including accessibility and interaction checks. If unavailable, report exactly which native checks could not run; a web preview is not an iOS verification.

Deliver reviewable source changes, setup instructions, documented API configuration, and the checks actually performed. Preserve Android compatibility and verify the existing web app still builds. Signed device builds and TestFlight distribution require the user's Apple/Expo account setup and are separate from local implementation validation.

## Review outcome

Self-reviewed for scope, consistent language handling, server/client boundaries, finite-feed behavior, honest source attribution, and explicit build limitations. The user approved the written specification. No implementation has started. Written implementation-plan review and execution-method selection are next under the requested Superpowers workflow.
