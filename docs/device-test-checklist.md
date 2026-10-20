# Device test checklist: calendar edge cases (plan task 3.9)

Automated coverage exists for DST and timezone logic (see below). Everything on this page needs a person with real devices. Record the device, OS version, and result next to each step.

## Already covered by automated tests

`app/src/features/routines/timezone.test.ts` runs `timezone.cases.ts` under `TZ` = America/New_York, Europe/London, Europe/Berlin, Australia/Sydney, Asia/Kolkata, and UTC. It asserts:

- Spring-forward: a time inside the skipped hour (02:30) fires at the first valid instant after the gap.
- Fall-back: a time in the repeated hour (01:30) fires once, at the first occurrence.
- A daily routine yields exactly one occurrence per calendar day across both transitions, with the same weekdays in every timezone.
- A reminder keeps its wall-clock time; its UTC instant follows the device timezone.
- A 7-day reminder plan over the fall-back week has one reminder per day at 01:30 local.

These test the planning logic only. They do not test what the OS does with the scheduled notifications.

## Not yet verified (manual)

Use a development or TestFlight/Play build. Reminders need to be on for the test items.

### Timezone travel
- [ ] iOS: create a routine at 09:00 with a reminder. Change the device timezone (Settings > General > Date & Time, turn off Set Automatically). Open the app. The reminder should now fire at 09:00 in the new zone, and Today shows 09:00.
- [ ] Android: same steps (Settings > System > Date & time).
- [ ] Optional: a real flight or VPN-free timezone change while the app is closed, then open it.

### Daylight-saving transitions
Use a device whose timezone has DST and set the clock to the evening before the change (turn off automatic date and time).
- [ ] iOS spring forward: a 02:30 routine reminder fires once at 03:30.
- [ ] iOS fall back: a 01:30 routine reminder fires once.
- [ ] Android spring forward and fall back: same two checks.
- [ ] Reminders on the days after the change still fire at the same local time.

### Permission denial and re-enabling
- [ ] iOS: deny the prompt. Settings shows "blocked" and "Open device settings". No reminders are scheduled; the planner still works.
- [ ] iOS: enable notifications in device settings, return to the app. Status updates to allowed and reminders are scheduled without restarting.
- [ ] iOS: allowed, then disable in device settings and return. Status updates; no crash.
- [ ] Android 13+: deny the prompt, then check the same three steps. Also check that denying twice leads to the "Open device settings" path.
- [ ] Android 12 or lower: notifications are on by default; turn them off in app settings and check the status.

### Reboot and app restart
- [ ] iOS: schedule reminders, force-quit the app, confirm a reminder still fires.
- [ ] iOS: reboot the phone, confirm a pending reminder still fires.
- [ ] Android: force-stop, then reboot. Confirm a pending reminder still fires after reboot. Expo's scheduled notifications are restored after boot; confirm on your device and OEM (some manufacturers kill background work).
- [ ] After either: open the app, and confirm reminders are not duplicated (the Notification Center or `adb shell dumpsys notification` should show one per item).
- [ ] Force-quit the app and tap the Snooze action on a delivered reminder.

### Notification limits
- [ ] iOS: create more than 64 reminders in the next 7 days (for example 10 daily routines with reminders). The app schedules at most 60, earliest first. Confirm the soonest 60 fire and the app does not error. Open the app again after some fire and confirm the later ones are scheduled.
- [ ] Android: same with 60+ reminders. Some OEMs also cap alarms; note any limit seen.
- [ ] Android 12+: check whether exact-alarm permission is needed for on-time delivery and note any delay.

## Simulator note
Permission denial and re-enable can be driven on the iOS Simulator (Settings > Notifications > Plank, or `xcrun simctl privacy` does not cover notifications, so use the Settings app). That was not done in the automated pass for 3.9.

# Manual checks: weather privacy and provider (plan task 4.9)

Automated coverage (stubbed network, no live calls) is in `app/src/features/weather/weatherPrivacy.test.ts`, `locationService.test.ts`, `weatherService.test.ts`, `forecast.test.ts`, and `geocoding.test.ts`. It asserts: no request or cache read while weather is off or no place is set (even when forced); request URLs have only the allowed parameters, HTTPS, the two Open-Meteo hosts, coordinates at 2 decimals or fewer, and no labels or task data; `fetch` gets only `credentials: 'omit'` and a signal (no headers, body, or identifiers); the attribution constant and its use in the Today conditions view; the 30-minute reuse, 3-hour stale, and 24-hour discard rules; one request and no retry on 429, 400, 5xx, offline, and malformed bodies, with the cached forecast kept as stale; location never prompts when reading a position, rounds the fix, and times out after 10 s.

Not covered by automation. Needs a person with a dev or TestFlight/Play build and network access:

- [ ] Live Open-Meteo call: the forecast and geocoding responses parse with the real API (variable names, `forecast_days=2`, `timezone=auto`, imperial/metric params) and Today shows sensible data.
- [ ] Capture real traffic (for example a proxy such as Proxyman or mitmproxy on a test device): only the two Open-Meteo hosts are contacted; no cookies, no custom headers, no identifiers; only the platform default User-Agent; coordinates at 2 decimals. Confirm nothing is sent while weather is off, including after relaunch.
- [ ] Check Open-Meteo's license page for the exact attribution wording and any caching/storage terms (the page returned no text during task 4.1); update `WEATHER_ATTRIBUTION` if needed. Confirm the link opens in the browser on iOS and Android.
- [ ] Attribution is visible on Today, readable at large text sizes and with a screen reader, when weather data (fresh, stale, or cached after a failed refresh) is shown.
- [ ] Device location: the OS prompt appears only after choosing device location in Settings, never at install or first launch; denying leads to the manual search path and does not re-prompt; "Open device settings" works; re-allowing in device settings updates the status on return.
- [ ] Location services off at OS level, or no fix indoors: Today shows the position-failed message and tasks still work.
- [ ] Airplane mode: Today shows the cached forecast as stale (or the "no connection" message with no cache) and recovers when back online.
- [ ] Turning weather off, "Remove location", switching mode, and Settings reset remove the saved place and cached forecast (the Settings hook is not covered by an automated test; only the repositories are).
- [ ] The 30-minute refresh holds on a real device: repeatedly switching tabs and foregrounding the app does not send a request within 30 minutes (check in the proxy).
- [ ] Rate limits and provider downtime cannot be provoked safely; confirm by code review only, or with a proxy that returns 429/503.

# Manual checks: accessibility (plan task 6.4)

Static guards are in `app/src/accessibility.test.ts`. Still needed on devices:

- [ ] VoiceOver (iOS) and TalkBack (Android): swipe through Today, task and routine editors, routines, and Settings. Every control announces a name, role, and state (checkbox checked, radio selected, button disabled). Task and routine cards read as one item with their status; the weather card reads as one item; errors are announced when they appear.
- [ ] Reading and focus order matches the visual order on each screen, including after saving, deleting, or dismissing an item (focus does not get lost). Keyboard open on a text field does not hide the Save button.
- [ ] Largest Dynamic Type (iOS, Accessibility sizes) and Android font size and display size at maximum: no clipped or overlapping text, action rows wrap, tab labels stay readable, everything remains reachable by scrolling. Rebuild the dev client first (`npm run ios`); the simulator build seen in 6.4 was stale.
- [ ] Text size setting in Settings combined with system large text still caps sensibly.
- [ ] Touch targets feel adequate (48pt) for the day chips, symbol picker, and Remove buttons.
- [ ] Contrast in light, dark, and every color scheme, outdoors brightness and with Increase Contrast on.
- [ ] State is understandable in grayscale or with color filters (selected, completed, paused, errors).
- [ ] Reduce Motion and Bold Text on iOS do not break layout. Native Alert dialogs (delete confirmations) are announced and focus returns afterward.
