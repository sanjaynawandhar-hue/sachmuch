# Sachmuch Expo iOS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a working bilingual Sachmuch iPhone app with a live facts feed, saved copies, sharing, source details, and accessible modern styling, retaining Android compatibility.

**Architecture:** Extend apps/mobile in the existing monorepo. Add a read-only Next.js feed endpoint; share a framework-independent wire contract and reuse the existing feed-ranking functions. Keep bookmarks, preferences, and reading affinity on the device behind a serialized storage boundary.

**Tech Stack:** Existing Expo/React Native/TypeScript; React Navigation bottom tabs; Expo-compatible safe-area, blur, haptics, gesture-handler and AsyncStorage packages; existing Vitest for pure logic and server tests; jest-expo and React Native Testing Library for native components.

**Spec:** [Approved specification](../specs/2026-10-14-sachmuch-expo-ios-design.md).

## Global Constraints

- Use three bottom destinations: Discover, Saved, Settings.
- Device-local storage, no login, and no paid features define this first version.
- Cap the feed at the existing 300-fact limit.
- Database credentials remain server-side.
- The app uses EXPO_PUBLIC_API_URL for the server origin; this is a public URL, never a secret.
- Hindi mode only includes facts with complete Hindi content.
- Present provenance as 'Sourced from'; do not claim independent verification.
- Reduced-motion mode removes spatial transitions.
- The default appearance follows the device.
- Do not add coins, quizzes, paid tiers, notifications, background music, or bulk offline packs to this first scope.
- Retain com.sachmuch.app and existing tablet support. Preserve web behavior and Android compatibility.
- Resolve native dependency versions with Expo compatibility tooling. Do not upgrade Expo solely to chase a newer release.
- Report native checks that could not run; a web preview is not an iOS verification.

## Review Focus

1. A delayed refresh must not replace a newer response or reset a newly selected language (Task 4).
2. A failed bookmark write must not display a successful save; a later successful write must still work (Task 2).
3. Long Hindi text and maximum text size must scroll without advancing the feed accidentally (Tasks 3–4).
4. Corrupt storage and unknown storage versions must recover without erasing unrelated valid saved facts (Task 2).
5. Malformed API content, duplicate IDs, and unsafe source URLs must not crash or open executable URLs (Tasks 1 and 4).

## File boundaries and execution setup

All product paths below are relative to a separate Sachmuch checkout at `sachmuch/` within this workspace, unless the worktree tool supplies a different isolated directory. Do not replace the enclosing empty repository or attach it to Sachmuch's remote.

At execution start, use using-git-worktrees, inspect available attached worktrees, and obtain an isolated checkout of https://github.com/sanjaynawandhar-hue/sachmuch on `codex/sachmuch-expo-ios`. Read applicable AGENTS.md files, compare main against the inspected revision 69b9ab6d5b0be8dd44cbf181ce64dd79d612bd0a, and adapt only when newer code requires it. Copy the approved spec and plan into that checkout. Record baseline tests and available Node, pnpm, Xcode, and simulators. Do not claim pre-existing failures were introduced by this work.

Shared wire types belong in `packages/core/src/mobile-feed.ts`; mobile imports UI types using `import type` only where needed. Avoid a core-to-ui dependency cycle: the wire type is structural and framework-independent. Existing `FactCardData` assignments must typecheck against it. New screen and component files stay in apps/mobile/src. Existing UI primitives are reused when accessible and compatible, otherwise composed into mobile-specific components without changing web styling.

---

### Task 1: Validated feed contract and read-only API

**Files:** Create `packages/core/src/mobile-feed.ts`, `packages/core/test/mobile-feed.test.ts`, `apps/web/app/api/feed/route.ts`, `apps/web/lib/feed-response.ts`, `apps/web/test/feed-response.test.ts`, and `apps/web/vitest.config.ts`. Modify `packages/core/src/index.ts`, `apps/web/lib/facts.ts` only as needed for type alignment and lazy database initialization, and `apps/web/package.json` for the test command.

**Interfaces:** Export `MobileFact`, `BilingualMobileFact = { en: MobileFact; hi?: MobileFact }`, `FeedEnvelope = { version: 1; fetchedAt: string; facts: BilingualMobileFact[] }`, and `parseFeedEnvelope(input: unknown): FeedEnvelope`. MobileFact carries the currently used fact-card fields, including provenance and optional image attribution. Export server `createFeedResponse(read: (limit: number) => Promise<BilingualMobileFact[]>, configured: boolean): Promise<Response>`.

- [ ] Write parser tests asserting version 1, a valid ISO timestamp, at most 300 facts, matching translation IDs, complete Hindi text, unique nonempty IDs, valid category IDs, and HTTP(S) source/image URLs. Assert rejection of malformed required fields, unknown versions, duplicates, and javascript URLs. Preserve optional attribution and image credit.
- [ ] Run `pnpm --filter @sachmuch/core test -- mobile-feed`; expect failure because the contract/parser is missing.
- [ ] Implement the wire types and parser with explicit type guards. Keep absent Hindi optional; malformed provided Hindi is a validation error. Do not silently invent translations or provenance.
- [ ] Write API tests: injected reader called with 300; success returns version 1 and JSON; missing configuration never calls the reader and returns 503 with `{ error: { code: 'FEED_UNAVAILABLE' } }`; reader failures return the same safe response, never the underlying error text.
- [ ] Add Vitest configuration and run `pnpm --filter @sachmuch/web test -- feed-response`; expect failures for the missing implementation.
- [ ] Implement the response factory and GET route with `Cache-Control: no-store`. Import/initialize database access only when configured. Reuse getFeedFacts and ensure public content only is returned. Do not fall back to sample data.
- [ ] Run both test files and core/web type checks; expect success. Commit these files and the approved planning documents with `feat: expose validated mobile facts feed`.

### Task 2: Device storage and preference hydration

**Files:** Create `apps/mobile/src/state/storage.ts`, `apps/mobile/src/state/AppStateProvider.tsx`, `apps/mobile/src/state/storage.test.ts`, `apps/mobile/src/state/AppStateProvider.test.tsx`, `apps/mobile/jest.config.js`; modify mobile package.json and pnpm-lock.yaml.

**Interfaces:** `Preferences = { language: 'en' | 'hi'; appearance: 'system' | 'light' | 'dark'; haptics: boolean }`; `SavedFact = { fact: BilingualMobileFact; savedAt: string }`; `AppSnapshot = { version: 1; preferences: Preferences; saved: SavedFact[]; affinity: Affinity }`. `StorageAdapter = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> }`. `createAppStore(adapter: StorageAdapter)` exposes `load(): Promise<AppSnapshot>` and `update(change: (current: AppSnapshot) => AppSnapshot): Promise<AppSnapshot>`. Provider exposes hydrated state and async mutations through `useAppState()`.

- [ ] Install Expo-compatible AsyncStorage and jest-expo; add React Native Testing Library and its compatible peers. Add `test: jest --runInBand` to mobile scripts. Verify dependencies using Expo checks; avoid unrelated upgrades.
- [ ] Write tests: defaults are English/system/haptics enabled; hydration restores Hindi without a default write; save English then Hindi for the same ID yields one bookmark; save/reload/remove persists; corrupt JSON recovers; invalid saved entries are removed while valid ones survive; unknown version shows recovery notice and does not auto-overwrite the original blob.
- [ ] Add deferred-write tests proving queued functional mutations see the newest committed snapshot. Reject one write: state is unchanged, error reaches caller, and the next write succeeds. Validate finite affinity scores/counts before using shared ranker functions.
- [ ] Run `pnpm --filter @sachmuch/mobile test -- storage`; expect missing-function failures, then implement store with a promise queue that recovers after rejection. Use key `sachmuch.app.v1` and publish mutations only after successful persistence.
- [ ] Write provider hydration/unmount/error tests, run them red, then implement the provider. Hold screen rendering until initial hydration finishes, with a retry state for read failures. Do not overwrite unknown-version data without an explicit reset action.
- [ ] Run mobile tests and typecheck; expect success. Commit `feat: persist mobile bookmarks and reading preferences`.

### Task 3: Accessible navigation and visual foundation

**Files:** Modify `apps/mobile/App.tsx`, mobile package.json, app.json only where required, and pnpm-lock.yaml. Create `apps/mobile/src/navigation/AppNavigator.tsx`, `src/theme.ts`, `src/i18n.ts`, `src/components/Surface.tsx`, `src/components/FactReader.tsx`, `src/components/SourceSheet.tsx`, and `src/components/FactReader.test.tsx`.

**Interfaces:** `AppNavigator` owns Discover/Saved/Settings routes. `FactReader({ fact: MobileFact, language, saved, onSave, onShare, onSource })` presents content and accessible actions. `SourceSheet({ fact: MobileFact | null, onClose })` displays provenance, licence, attribution and safe external links. `useAppTheme()` combines device settings, appearance preference, and accessibility settings; `strings(language)` returns complete screen copy.

- [ ] Install @react-navigation/native and @react-navigation/bottom-tabs plus Expo-compatible react-native-screens, safe-area-context, expo-blur, expo-haptics and gesture-handler. Use the stable bottom-tabs API, keeping the existing App.tsx entry point. Native glass is an optional enhancement only if the SDK-compatible expo-glass-effect API is verified; solid/blur rendering remains supported.
- [ ] Write component tests for English/Hindi labels, selected save state, labelled actions, visible attribution, source-sheet dismissal, and unsupported URL rejection. Assert no fixed text-height clipping and no font-scaling disablement. Run mobile tests and observe failure before implementing.
- [ ] Build lavender-accented light/dark surfaces and spacious rounded content cards. Keep readable content opaque, use translucent navigation only where appropriate, provide at least 44-point action targets, and respect safe areas. Use platform/system fonts with Devanagari support and shared brand tokens where suitable.
- [ ] Implement scrollable fact content, sheet focus/dismiss behavior, and screen-reader labels. Observe reduce-motion and reduce-transparency setting changes, using solid navigation when transparency is reduced. Do not cap text scaling to hide layout problems.
- [ ] Compose the state provider and navigator in App.tsx; screens are implemented in Task 4. Run component tests and typecheck once routes exist. Verify long Hindi text and large fonts visually in Task 5. Commit with Task 4 if screen imports are not yet resolvable; never commit a broken entry point.

### Task 4: Feed, saved facts, settings and native actions

**Files:** Create `apps/mobile/src/feed/client.ts`, `src/feed/useFeed.ts`, `src/feed/selection.ts`, `src/feed/client.test.ts`, `src/feed/useFeed.test.tsx`, `src/feed/selection.test.ts`, `src/screens/DiscoverScreen.tsx`, `src/screens/SavedScreen.tsx`, `src/screens/SettingsScreen.tsx`, and `src/screens/screens.test.tsx`.

**Interfaces:** `fetchFeed(origin: string, options: { signal?: AbortSignal; development: boolean }): Promise<FeedEnvelope>`; `useFeed(origin: string)` returns `{ facts, status, error, refresh }`; `selectLanguageFacts(facts: BilingualMobileFact[], language: 'en' | 'hi'): MobileFact[]`; `resolveCurrentId(facts: MobileFact[], previousId: string | null): string | null`. Screens consume useAppState and these helpers.

- [ ] Write client tests for HTTPS origins, development-only localhost/private-LAN HTTP, invalid schemes/userinfo rejection, non-200 responses, invalid JSON, malformed envelopes, aborts and a 15-second timeout. Run red, then implement with fetch and AbortController.
- [ ] Write hook tests with deferred fetches: newest refresh wins, unmount cancels, refresh failure retains old content with a notice, initial failure allows retry, and empty results show an empty state. Implement request-generation guards and cleanup; fetch bilingual content independently of language selection.
- [ ] Write selection tests: Hindi excludes untranslated facts; switching keeps the same ID if eligible; otherwise selects the first eligible ID; empty results select null. Rank eligible facts via shared buildFeed, preserving order during ordinary rendering and saving. Pass an explicit count for the full finite pool.
- [ ] Implement Discover loading/error/empty/finite-end states and source/save/share actions. Save from the original bilingual record, not a language-only projection. Await persistence before displaying saved success. Native Share includes displayed text and source URL; cancellation is not reported as success.
- [ ] Implement vertical navigation gestures only outside the scrollable body (card header/gesture region), with visible previous/next buttons. Reading the body never navigates. Disable spatial transitions under reduced motion. Use optional haptics only when navigation actually changes the card.
- [ ] Persist dwell-based affinity with shared learn; count only foreground, focused Discover reading, not background time or source-sheet dwell. Re-rank only on a new feed session/refresh, not each state update.
- [ ] Implement Saved list/detail/remove, saved timestamp and saved-copy notice; show an explicit missing-Hindi message with a user-selected English viewing action. Implement Settings language, system/light/dark, haptics and storage explanation.
- [ ] Add screen tests for save failure notice, save/restart/remove, navigation, language change during fetch, failed source opening, share cancellation, finite-end controls and body-scroll isolation. Run `pnpm --filter @sachmuch/mobile test` and typecheck; expect success. Commit `feat: deliver bilingual mobile reading experience`.

### Task 5: Build checks, device verification and delivery

**Files:** Create `docs/MOBILE.md`, `apps/mobile/.env.example`, and `docs/superpowers/verification/2026-10-14-sachmuch-ios.md`. Modify mobile build configuration only when validated and necessary.

**Interfaces:** Public `EXPO_PUBLIC_API_URL` points at the deployed Next.js origin. Document local simulator and physical-device network setup separately. No database URL or service key is included in mobile config or exports.

- [ ] Run `pnpm -r test`, `pnpm -r typecheck`, and `pnpm --filter @sachmuch/web build`; distinguish baseline failures from regressions and resolve regressions before completion.
- [ ] Run `pnpm --filter @sachmuch/mobile exec expo install --check`, `pnpm --filter @sachmuch/mobile exec expo export --platform ios`, and the Android export equivalent; successful output must contain no dependency mismatch or bundle failure. Run expo-doctor from the mobile directory using a pinned resolved version.
- [ ] Inspect `xcodebuild -version` and `xcrun simctl list devices available`. If supported, run `pnpm --filter @sachmuch/mobile exec expo run:ios` against an available simulator. Record exact build and launch results. Do not replace a failed native build claim with a successful JS export.
- [ ] Exercise small/large iPhone and iPad layouts; English/Hindi, light/dark, large text, VoiceOver, reduced motion/transparency; scroll-versus-swipe; source sheet/browser; share sheet; save/restart/remove; retry; missing translations; offline saved copies. Record screenshots and results, marking unperformed checks explicitly.
- [ ] Exercise the new endpoint against configured test data if credentials are available. Verify published-only content, provenance and safe unavailable response. With no database access, report live integration unverified and retain deterministic injected-reader tests.
- [ ] Document install/run commands, origin configuration, SDK compatibility results, deployment requirement for the new API, native development build requirements, and Apple signing/TestFlight prerequisites. Never invent an EAS project ID or claim distribution is complete.
- [ ] Apply the React best-practices review and verification-before-completion skills, inspect the final diff, and perform the review required by the selected execution workflow. Fix material findings and rerun affected checks. Commit `docs: document and verify Sachmuch mobile setup`.

## Plan self-review and handoff

Coverage checked against every approved spec section. Five failure modes above have owning test steps; source attribution and translation rules remain consistent across API, Discover and Saved. All planned interfaces have producers and consumers. Task 3 joins Task 4 for the first runnable UI commit rather than leaving unresolved routes.

Recommended execution: Native (inline) because the tasks depend closely on the same feed and storage contracts. Implement in this chat, then obtain the independent final review required by the execution skill. Alternative: subagent-driven task-by-task implementation and review. The user must review this written plan and choose the execution approach before product implementation begins.

References consulted: https://reactnavigation.org/docs/bottom-tab-navigator/ and https://docs.expo.dev/versions/latest/sdk/glass-effect/. Resolve actual SDK-compatible APIs before installing; the repository currently declares Expo ~57.0.14.
