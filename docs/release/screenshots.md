# Screenshot plan

Final screenshots are an owner step (device sizes, review of copy and content). This plan lists the states to capture. Output goes in `app/screenshots/`, which is git-ignored.

## Required sizes (confirm against current store requirements before capture)

- iPhone 6.9" (and 6.5" if required) and iPad 13" because `supportsTablet` is true. Either capture iPad shots or set `supportsTablet` to false.
- Play: phone screenshots (2 to 8, 16:9 to 9:16, min 320 px); tablet optional. Feature graphic 1024x500 `[[PLACEHOLDER: design asset]]`. Hi-res icon 512x512 from `app/assets/icon.png`.

## States (all use fixed seed data, titles prefixed "Seed:")

Deep link, with the app running in test mode (`npm run start:test` in `app/`, a dev build installed on the simulator):

`xcrun simctl openurl booted "plank://test-seed?scenario=<scenario>"`

| # | Screenshot | Scenario | Steps after seeding | Related flow |
|---|---|---|---|---|
| 1 | Today with weather, clothing idea and tasks | `seeded-weather` | Wait for the forecast (stubbed network) | `today-order`, `clothing-suggestions` |
| 2 | Today agenda without weather (shows the app works without it) | `seeded` | None | `smoke`, `task-lifecycle` |
| 3 | Task editor | `seeded` | Tap "Seed: Pack gym bag" | `task-lifecycle` |
| 4 | New routine, weekday picker | `empty` | Add a task or routine, choose routine | `routine-create` |
| 5 | Edit one occurrence vs the series | `seeded` | Open "Seed: Morning stretch" and start an edit | `routine-occurrence-vs-series` |
| 6 | Settings: reminders and appearance | `seeded` | Settings and profile | `reminder-controls`, `visual-preferences` |
| 7 | Weather settings (off, device, manual) | `seeded` | Settings, weather section | `weather-toggle` |
| 8 | Large text / dark theme variant | `seeded` | Set text size and theme in Settings | `visual-preferences` |

Optionally also the empty Today state (`empty`) for the first-run look.

## Capture commands

```
cd app
npm run start:test          # terminal 1
xcrun simctl openurl booted "plank://test-seed?scenario=seeded-weather"
mkdir -p screenshots/ios
xcrun simctl io booted screenshot screenshots/ios/01-today-weather.png
```

Maestro alternative: add `- takeScreenshot: screenshots/ios/<name>` to a copy of a flow. The existing runner `npm run test:e2e:ios` writes videos under `app/artifacts/` (also git-ignored).

Status bar: use `xcrun simctl status_bar booted override --time 9:41 --batteryState charged --batteryLevel 100 --cellularBars 4`.

## Content rules

- Replace "Seed:" titles with natural sample titles for store images (or edit the seed locally; do not commit store-only copy into the seed).
- Do not use real names, places, or locations. The stub place is a fixed sample.
- No claims in captions beyond the listing copy.
- Android shots are a separate manual pass on an emulator or device (not yet set up).

Status: no screenshots captured yet. `[[PLACEHOLDER: owner captures final screenshots]]`
