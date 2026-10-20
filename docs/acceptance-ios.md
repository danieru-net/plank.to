# iOS simulator acceptance (task 6.9)

Automated with Maestro on the iOS Simulator (`npm run test:e2e:ios` in `app/`, stubbed weather, see `app/README.md`). Android is a separate manual check (`docs/device-test-checklist.md`).

## Automated cases

| Area | Case | Flow | Result |
| --- | --- | --- | --- |
| Tasks | Create, edit, complete | `task-lifecycle` | Pass |
| Recurrence | Create daily and weekday routines | `routine-create` | Pass |
| Recurrence | Change one day vs whole routine; skip a day | `routine-occurrence-vs-series` | Pass |
| Offline | Weather says "No connection"; create/complete tasks; search error shown | `offline-mode` | Pass (stubbed) |
| Notifications | Allow at the OS prompt; status shows allowed | `notification-permission-allow` | Pass |
| Notifications | Don't Allow; status blocked; app still usable | `notification-permission-deny` | Pass |
| Notifications | "Not now" hides the card, no OS prompt | `notification-permission-not-now` | Pass |
| Location | Denied at OS level; Settings explains; manual place works | `weather-location-denied` | Pass |
| Location | Device location via real iOS prompt, forecast shown | `weather-location-prompt` | Pass |
| Manual location | Search a place, see it on Today, turn weather off | `weather-toggle` | Pass |
| Provider failure | 503: calm note, tasks usable, Try again, recovery | `weather-provider-failure` | Pass |
| App restart | stopApp + launchApp keeps new and completed tasks and weather place | `app-restart` | Pass |
| Other | Smoke, Today order, reminder controls, visual preferences, clothing suggestions | existing flows | Pass |

Run result: full `npm run test:e2e:ios` passed 17 of 17 flows. No app defects were found.

## Not simulatable (manual steps)

1. True airplane mode / real network loss. The stub only simulates the app's view of a failed request. On a device: enable weather with a place, open Today (forecast shows), turn on airplane mode, force-quit and reopen: tasks work, weather shows the cached forecast with a "could not refresh" note or "No connection". Turn airplane mode off and tap Try again.
2. Notification delivery. The simulator does not reliably show scheduled local notifications. On a device: allow reminders, create a task with a time two minutes ahead and a reminder, lock the phone, confirm one notification arrives, tap it and confirm the right task opens; test snooze and quiet hours.
3. Device location denied after being chosen. Today's "Location is not allowed" card needs device mode set and permission then revoked. On a device: choose device location, revoke location in iOS Settings, reopen Plank, confirm the card and the manual search fallback. Covered by unit tests of the display logic.
4. "Open device settings" buttons open iOS Settings (leaves the app; not asserted).
5. Real Open-Meteo responses and rate limiting (tests use the stub; see 4.9 in the plan).
6. Local notifications surviving an app restart or reboot, and timezone/DST changes on a real clock.
