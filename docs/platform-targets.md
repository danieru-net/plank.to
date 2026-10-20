# Platform and release target (task 1.1)

Decided 2026-10-19. Revisit at each Expo SDK upgrade.

## Framework

| Item | Decision | Basis |
| --- | --- | --- |
| Expo SDK | **58** (`expo@~58.0.15`, `latest` on npm) | Newest stable SDK at decision time |
| React Native | 0.88 (the version SDK 58 pins) | Do not pin separately; use `npx expo install` |
| Language | TypeScript | Plan 1.2 |
| Architecture | Expo-managed workflow with development builds. Expo Go is not a target. | Needed for `expo-notifications` and `expo-location` behavior |

## Minimum OS versions

| Platform | Minimum | Basis |
| --- | --- | --- |
| iOS | **16.4** | `expo-modules-core@58` podspec deployment target |
| Android | **API 24 (Android 7.0)** | `expo-modules-core@58` default `minSdkVersion`; compile/target SDK 36 |

Confirm both values against the generated native config in task 1.2. If Expo or React Native raises them, adopt the new floor.

## Distribution

- **iOS:** TestFlight for usability sessions (6.10), then the App Store.
- **Android:** Google Play internal testing, then production. APK sideloading for local checks only.
- Builds come from EAS Build. Local simulator builds are used for development and automated tests.
- Web is not a target. The Astro site is separate.

## Minimum device requirements

- Any device that can run the OS minimums above. No special hardware.
- Works with no network and no account.
- Location and notification permissions are optional.
- Local storage need is small (SQLite plus optional image references).

## Verification scope

- **Automated UI tests:** macOS plus iOS Simulator with Maestro (plan 1.7, 6.5-6.9).
- **Android:** manual verification on one emulator and one physical device, run as a separate check (plan 3.9, 6.9). No automated Android UI suite in the MVP.
- **Simulator for development:** latest iOS runtime in the installed Xcode, plus one runtime at the iOS 16.4 floor if available.

## Open items

- Pick the exact simulator device models for tests in task 1.7.
- Confirm the Android floor in the generated project (task 1.2).
