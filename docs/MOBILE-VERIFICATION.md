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
