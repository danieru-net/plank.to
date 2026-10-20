# Plank app

Expo SDK 58 (React Native, TypeScript). Expo Go is not supported; use a development build.

## Commands

| Command                           | Purpose                                                          |
| --------------------------------- | ---------------------------------------------------------------- |
| `npm install`                     | Install dependencies                                             |
| `npm run ios`                     | Build and run the dev build on an iOS Simulator                  |
| `npm run android`                 | Build and run on an Android emulator/device                      |
| `npm start`                       | Start Metro for an installed dev build                           |
| `npm run lint`                    | ESLint (`eslint-config-expo` + Prettier)                         |
| `npm run typecheck`               | `tsc --noEmit`                                                   |
| `npm run format` / `format:check` | Prettier                                                         |
| `npm run check:contrast`          | Verify theme color contrast (WCAG)                               |
| `npm test`                        | Unit tests (Jest via `jest-expo`)                                |
| `npm run test:ui`                 | Run Maestro UI flows on the booted iOS Simulator                 |
| `npm run test:e2e:ios`            | Full runner: simulator, build, Metro, per-flow video and reports |
| `npm run check`                   | Run every automated check below in one go                        |

## Automated checks

`npm run check` runs typecheck, lint, format check, contrast check, and unit tests. CI ([.github/workflows/ci.yml](../.github/workflows/ci.yml)) runs the same steps on pushes to `main` and on pull requests. Tests live next to the code as `*.test.ts(x)`. `.npmrc` sets `legacy-peer-deps` because `react-dom` (pulled in by Expo) currently conflicts with the pinned React version.

## Known issue: iOS precompiled modules

On Xcode with iOS 27 simulators, the default precompiled Expo modules crash at launch
(`Symbol not found: ...ExpoModulesCore...Record...decode` from `ExpoFileSystem`).
`npm run ios` sets `EXPO_USE_PRECOMPILED_MODULES=0` so modules build from source.
If you run `npx expo prebuild` or `pod install` yourself, set the same variable.

## Design tokens and primitives

- Tokens live in [src/theme/](src/theme/): light/dark palettes (`colors.ts`), spacing, radius, typography, and the 48pt minimum touch target (`tokens.ts`). Use `useTheme()` for colors.
- Primitives live in [src/components/](src/components/): `Text`, `Button`, `TextField`, `EmptyState`, `Screen`. Prefer these over raw React Native components.
- Text scales with system settings (capped at 2x); controls use `minHeight`, never fixed heights, so they grow with text.
- Required contrast pairs are declared in `contrastRequirements`; `npm run check:contrast` fails if a palette change drops below WCAG AA (4.5:1 text, 3:1 borders/focus).
- Errors are shown as text (prefixed "Error:") and not by color alone.

## iOS UI automation (Maestro)

UI tests use the open-source [Maestro](https://maestro.mobile.dev) CLI against the iOS Simulator. Everything runs locally and needs no paid device farm or cloud service. Flows live in [.maestro/](.maestro/).

### Prerequisites (macOS)

1. Xcode with an iOS Simulator runtime (`xcode-select --install` for the command line tools).
2. Java 17 or newer (`java -version`); Homebrew installs it as a Maestro dependency.
3. Maestro: `brew install mobile-dev-inc/tap/maestro` (check with `maestro --version`; tested with 2.11.0).
4. Optional: `export MAESTRO_CLI_NO_ANALYTICS=1` to turn off Maestro's anonymous analytics.

### Run the flows

1. Boot a simulator (for example `xcrun simctl boot "iPhone 17"` or open Simulator.app).
2. Build and install the development build once, and again after native dependency changes: `npm run ios`. This also starts Metro.
3. Keep Metro running on port 8081 (`npm start` if `npm run ios` has exited).
4. Run `npm run test:ui` (or `maestro test .maestro/smoke.yaml` for a single flow).

The app is a development build, so each flow opens `plank://expo-development-client/?url=...` to load the bundle from Metro and confirms the iOS "Open in Plank?" prompt by position (the prompt hides its button label from a plain text match). The `smoke` flow clears app state, checks Today's empty state, switches tabs, and opens the editor. Passing takes about 15 seconds.

### One-command runner with videos (`npm run test:e2e:ios`)

`npm run test:e2e:ios` does everything in one go: picks the booted simulator (or boots the newest iPhone; override with `E2E_DEVICE=<name or UDID>`), installs the development build if `to.plank.app` is not installed (reuses it otherwise; `E2E_REBUILD=1` forces `expo run:ios`), starts Metro in test mode on port 8081 (it stops when done; port 8081 must be free), then runs every flow in `.maestro/`. Each flow clears app data and seeds test data through `helpers/launch.yaml`, so no real user data is used. Run chosen flows with `npm run test:e2e:ios -- smoke task-lifecycle`.

For each flow the runner records the simulator with `xcrun simctl io <device> recordVideo`, stops the recording with SIGINT after the flow ends (pass or fail, and on Ctrl-C) so the MP4 is finalized, and carries on with the next flow after a failure. The exit status is 0 only if every flow passed, 1 if any failed, 2 for setup errors.

### Review artifacts

Output goes to `artifacts/e2e/<timestamp>/`, with `artifacts/e2e/latest` pointing at the newest run. The whole `artifacts/` folder is git-ignored. Open a video with `open artifacts/e2e/latest/task-lifecycle/task-lifecycle.mp4`.

```
artifacts/e2e/latest/
  summary.txt            PASS/FAIL line per flow
  metro.log, build.log   Metro output (and build output when a build ran)
  <flow>/<flow>.mp4      screen recording named for the functionality
  <flow>/report.xml      JUnit report
  <flow>/maestro.log     Maestro console output
  <flow>/maestro-debug/  Maestro debug output: command log, screenshots on failure, driver logs
```

Videos show only the simulator with seeded fake data. Delete old runs with `rm -rf artifacts/e2e` when disk space matters (a video is roughly 5 to 50 MB).

### Deterministic test setup

1. Build (repeatable, from source modules): `npm run ios`. This runs `EXPO_USE_PRECOMPILED_MODULES=0 expo run:ios`, so the installed dev build includes ExpoSQLite, expo-notifications, and expo-location. Rebuild after native dependency changes; a stale build crashes with missing native modules.
2. Start Metro in test mode: `npm run start:test` (sets `EXPO_PUBLIC_PLANK_TEST_MODE=1`). Metro must be restarted to turn test mode on or off.
3. Reset and seed with the test-only deep link `plank://test-seed?scenario=<name>` (Maestro: `openLink`). It wipes tasks, routines, preferences (including the forecast cache), clothing choices, and the weather place, loads the scenario, then opens Today.
   - `empty`: first-run state.
   - `seeded` (default): today's tasks "Seed: Pay rent" (09:00), "Seed: Pack gym bag" (17:30, three steps), "Seed: Call the dentist", one task dated tomorrow, a daily routine "Seed: Morning stretch", a weekday routine "Seed: Weekday standup", light theme, reminders prompt dismissed. Weather off.
   - `seeded-weather`: `seeded` plus weather on with a manual place, "Testville, Testshire, Testland" (51.51, -0.13).
4. Weather is stubbed in test mode: forecast and place-search requests are answered in-process with fixed data (12C and rain now, high 14C, low 8C, 70% chance of precipitation) and any other URL fails. No live network. Edit [src/testing/stubFetch.ts](src/testing/stubFetch.ts) to change it.
5. Permissions: [scripts/sim-permissions.sh](scripts/sim-permissions.sh) `all-granted | all-denied | reset [device]` wraps `xcrun simctl privacy ... grant|revoke|reset` for location (bundle `to.plank.app`) and sets the simulator location to the stub place. `simctl privacy` has no notification service, so the notification prompt is answered in the flow (or reappears after `reset`).

### End-to-end flows (task 6.6)

`npm run test:ui` runs every flow in `.maestro/` (about 9 minutes). All flows except `smoke` need Metro in test mode (`npm run start:test`). Each one starts with [helpers/launch.yaml](.maestro/helpers/launch.yaml), which clears app state, connects the dev client, opens `plank://test-seed?scenario=${SCENARIO}` and waits for the seed screen's "Test data ready" marker to go away. Helpers sit in a subfolder so `maestro test .maestro` does not run them as tests.

| Flow                                | Scenario       | Covers                                                                                    |
| ----------------------------------- | -------------- | ----------------------------------------------------------------------------------------- |
| `smoke.yaml`                        | none           | Launch, empty Today, tabs, editor opens                                                   |
| `today-order.yaml`                  | seeded-weather | Weather, then clothing ideas, then Scheduled, Any time and Routines (`below:` assertions) |
| `task-lifecycle.yaml`               | seeded         | Create, edit and complete a task                                                          |
| `routine-create.yaml`               | empty          | Create a daily and a Monday-to-Friday routine; Today and list show them                   |
| `routine-occurrence-vs-series.yaml` | seeded         | Change one day, then the whole routine; skip a day; the single-day change survives        |
| `reminder-controls.yaml`            | seeded         | Suggested notice, snooze, quiet hours, sound, reset; per-task reminder needs a time       |
| `visual-preferences.yaml`           | seeded         | Text size, spacing, colors, reset; screenshot of dark/largest/compact Today               |
| `weather-toggle.yaml`               | seeded         | Enable weather, search a place (stubbed), see it on Today, disable                        |
| `clothing-suggestions.yaml`         | seeded-weather | Review ideas, dismiss one, "never suggest" in Settings, dismiss all                       |
| `weather-provider-failure.yaml`     | seeded-weather | Provider 503: calm note, tasks usable, Try again, recovery (`NETWORK=error`)              |
| `offline-mode.yaml`                 | seeded-weather | No connection note; create and complete a task; place search error (`NETWORK=offline`)    |
| `weather-location-denied.yaml`      | seeded         | OS location denied: Settings explains, manual place still works (`LOCATION_PERM=never`)   |
| `weather-location-prompt.yaml`      | seeded         | Device location through the real iOS prompt (`LOCATION_PERM=unset`)                       |
| `notification-permission-*.yaml`    | empty          | Allow, Don't Allow, and Not now paths (`NOTIFICATION_PERM=unset`), three flows            |
| `app-restart.yaml`                  | seeded-weather | stopApp + launchApp keeps tasks, completion and the weather place                         |

Selector notes for writing flows:

- Buttons and rows are matched by their accessible name (for example `Dismiss Umbrella`, `Seed: Morning stretch, routine, 07:30. Change`). Text matching is a full-string regex.
- A text field's label and the field share one name, so a tap hits the label. Use the `testID`s `occurrence-title` and `weather-search`, or the placeholder text.
- iOS reports a checkbox's state in its value (`checkbox, checked` / `checkbox, unchecked`), not Maestro's `checked` flag. Radio groups work with `selected: true`.
- Long screens: follow `scrollUntilVisible` with `centerElement: true` so the target is not under the tab bar. On the long Settings page, scroll to a nearer element first (see `weather-toggle.yaml`).
- Pushed screens' back button is named "Back".

Test-only controls: `plank://test-seed?scenario=...&network=ok|offline|error` and `plank://test-network?mode=ok|offline|error` change how the stubbed weather network behaves (offline throws, error answers 503); the mode resets to `ok` when the app process restarts. `helpers/launch.yaml` also takes `LOCATION_PERM` (`inuse|never|unset`) and `NOTIFICATION_PERM` (`allow|deny|unset`), passed to Maestro's `launchApp: permissions`. The runner sets the simulator location to the stub place before the flows.

Release safety: test mode requires `__DEV__` and the env variable ([src/testing/testMode.ts](src/testing/testMode.ts)). Release bundles have `__DEV__` false, so the stub and seed code never run; the `test-seed` route redirects to Today without touching data, and weather uses the real `fetch`. Unit tests assert the default is off. Seeding does not cancel already-scheduled OS notifications.
