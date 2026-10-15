# Mobile verification — 2026-10-15

Implemented on `codex/sachmuch-expo-ios` in the separate Sachmuch checkout.

## Verified

- `pnpm -r test`: 218 tests passed across the repository; mobile 41 tests in seven suites.
- `pnpm -r typecheck`: all packages passed.
- Expo Doctor: 21/21 checks passed after configuration and dependency cleanup.
- iOS and Android JavaScript exports passed; final iOS export repeated after review fixes.
- Native debug iOS simulator build succeeded with zero errors and zero warnings; installed on iPhone 18 Pro simulator.
- Independent final code review found two issues: large text could hide reader controls, and rapid removal could re-add a bookmark. Both now have regression tests observed failing before the fixes and passing afterward.

## Limits

The simulator stalled at its boot screen on the final walkthrough; launch/open-URL calls timed out. Native visual interaction, VoiceOver, real-device haptics, and the full device/accessibility matrix are not claimed as verified. The development server supports the explicitly labelled sample preview.

Web production compilation and type checking passed, but existing home-page prerendering failed because local Postgres was unavailable. Live API integration requires DATABASE_URL and the deployed public API origin. No live database credentials were available. Sample preview is development-only and does not replace failed live requests.

No signed physical-device build, TestFlight upload or App Store submission has been performed.

## Implementation decisions

1. Used a separate clone because the parent repository was empty and the approved plan targeted Sachmuch. Cost: this checkout is not managed by the app worktree lifecycle.
2. Aligned mobile native dependencies with Expo SDK 57 compatibility. Cost: existing React Native dependency versions changed; web keeps its own supported dependencies.
3. Restored Expo's default monorepo Metro config, removed retired app configuration fields, and removed the unused mobile UI-package dependency that exposed duplicate React versions. Cost: native visual components are maintained separately while core logic remains shared.
4. Preserved the existing web homepage's database requirement. Cost: full web production build and live integration remain dependent on provisioned Postgres.

See [MOBILE.md](MOBILE.md) for launch and release setup.

## Physical-device startup investigation

The initial USB installation succeeded, but launch immediately crashed. The iPhone report `Sachmuch-2026-10-15-104059.ips` identified `UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`; the earlier simulator report showed the same failure. Thus the earlier simulator startup limitation was an application lifecycle incompatibility, not only simulator boot instability.

Enabled Expo's SDK 57 `expo-build-properties` option `ios.enableSceneSupport`. Regenerated native output now declares `EXExpoAppSceneDelegate` and makes AppDelegate conform to `ExpoReactNativeFactoryProvider`, with window creation delegated to the scene. The same failure was reproduced on-device before this change. All 41 mobile tests and mobile type checking passed after the configuration change. Physical-device reinstallation verification is recorded below when complete.

The first corrected native build exposed a second startup error: Expo development JavaScript refused to initialize devtools websocket connections in an embedded environment. Added a dedicated `preview.js` entry and bundled it with `--dev false`, preserving the standard production entry's live-feed behavior. Rebuilt, signed, and installed over USB. On 2026-10-15 at 10:48 IST, a device screenshot confirmed the rendered Discover screen, labelled sample preview, source/save/share controls, and all three tabs on the physical iPhone 14 Pro Max. Launch monitoring showed no termination during this check. All 41 mobile tests passed again; type checking passed. This verifies startup and visible rendering, not the full interaction/accessibility matrix.

## Live release and icon / vertical feed — 2026-10-15

- Resumed the existing paused Supabase project; dashboard reported Healthy.
- Staged Vercel deployment `dpl_BQmkMWUnYqxAm6R6uUn4i7eRcG6Z` built successfully against production data, then was promoted to the existing domain.
- Both staged and unauthenticated public `/api/feed` returned HTTP 200. The shared mobile parser accepted 153 facts, 140 Hindi renderings, and 9 categories.
- Repository tests: 219 passed, including 42 mobile tests. All package type checks passed.
- Native Release build succeeded, installed on the iPhone 14 Pro Max, and launched. Screenshot `verification/iphone-live.png` confirms 01 / 153, live source/image content, the vertical feed, and no sample banner.
- AppIcon asset catalog contains the generated opaque 1024px app icon. Configuration points to the persisted project asset.
- Native paging regression verifies settled page selection and separate full-text reading. Physical swipe smoothness and the complete accessibility matrix are not exhaustively measured.

No TestFlight upload or App Store submission was performed. The backend remains on its existing free infrastructure; no paid upgrade was selected.
