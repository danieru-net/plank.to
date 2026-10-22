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
- [ ] Touch targets feel adequate (48pt) for the day chips, and Remove buttons.
- [ ] Contrast in light, dark, and every color scheme, outdoors brightness and with Increase Contrast on.
- [ ] State is understandable in grayscale or with color filters (selected, completed, paused, errors).
- [ ] Reduce Motion and Bold Text on iOS do not break layout. Native Alert dialogs (delete confirmations) are announced and focus returns afterward.

## Pictures and symbols

Automated coverage: `features/pictures/` (which files the app may delete), the task and routine repository tests (symbol and photo validation, the photo-in-use check), `routineTasks.test.ts` (a routine passes its symbol and photo to the tasks it creates), and the Maestro flow `task-symbol` (choose and remove a symbol). The photo picker is a system screen, so these need a person on a dev build:

- [ ] Choose a photo for a new task: the square crop appears, and after saving the photo shows on Today next to the title. No permission prompt appears on iOS or Android.
- [ ] Close the picker without choosing: nothing changes and no error shows.
- [ ] Replace a task's photo and save, then remove it and save: Today shows the new photo, then the symbol (or nothing). In the simulator, `xcrun simctl get_app_container booted to.plank.app data` then `Documents/pictures` holds only photos still in use.
- [ ] Pick a photo and then Cancel the editor: the new copy is deleted from `Documents/pictures`.
- [ ] Give a routine a photo: the next generated task shows it. Deleting the routine removes the copy.
- [ ] Delete the photo file by hand: Today falls back to the symbol, and the editor says the photo could not be found and offers another or Remove.
- [ ] Settings > Appearance > Pictures first: the preview and Today show the picture large above the title, at every text size, and done tasks fade their picture.
- [ ] VoiceOver and TalkBack: the symbols read as a radio group named "Symbol" with each symbol's name and the selected one; a task row reads its symbol's name after the title; photos are not read on their own.

## Reordering "Any time" tasks

Automated coverage: the task repository tests (saved order, new tasks at the end, a task leaving the order when it gets a time or moves day), `agenda.test.ts` (`moveItem`), and the Maestro flow `task-reorder` ("Move up" from the menu, order kept after a restart). Dragging by the handle was tried once with a Maestro swipe on the iOS simulator. Still to check by hand:

- [ ] Drag a task by its handle on a real iPhone and Android phone: the row follows the finger, the other rows make room, the page does not scroll while dragging, and the new order stays after letting go.
- [ ] Drag with "Haptic feedback" on and off: a light tap when the drag starts and when the row passes another, and nothing when it is off.
- [ ] With "Task actions" set to labelled buttons, "Move up" and "Move down" show under each "Any time" task (no "Move up" on the first, no "Move down" on the last) and work.
- [ ] VoiceOver and TalkBack: the handle is not read out, and the row's actions include "Move up" and "Move down".
- [ ] With large text, the handle and buttons still fit and the row can still be dragged.

## Feedback screen

Open Settings > Feedback > Suggest a feature or improvement (and Report a problem). Static fixes are described in done.md. These still need a person:

- [ ] VoiceOver and TalkBack: each text field is read once, as its label then its hint (the visible label and hint above it are skipped). The type control reads as "Feedback type" with Idea, Improvement and Problem as radio buttons, one selected.
- [ ] With the message empty, "Open in mail app" reads as dimmed or disabled with the hint "Write a message first". After typing, the hint is "Opens your mail app with this message filled in".
- [ ] "Include device details" reads as a switch with its on/off state and description. With it on, the details card reads as one item listing every detail.
- [ ] Focus order follows the screen: type, message, (for problems) "What were you trying to do?", device details, the button, the note under it.
- [ ] With no mail account set up, pressing the button reads out "No mail app found" and the message. "Copy address" then reads out "Address copied".
- [ ] After sending from the mail composer (iOS), "Thanks — we read every message" is read out and Done returns to Settings.
- [ ] Largest text size (in-app Largest plus system Accessibility sizes): the type options stack one per line, no label breaks mid-word, and the details card wraps without overlap.
- [ ] Keyboard: the field being typed in stays visible above the keyboard, including the optional second field for problems, and the screen can still scroll to the button with the keyboard open. Drag down to dismiss on iOS. Check on Android 15+ (edge to edge) and an older Android version.

## Feedback flow

Automated coverage is in `app/src/features/feedback/`: `feedbackMessage.test.ts` (subject and body, device details only when the toggle is on), `diagnostics.test.ts`, `sendFeedback.test.ts` (composer statuses, the `mailto:` fallback, `unavailable`), and `feedbackDraft.test.ts`. These stub the mail APIs, so nothing below has been tried with a real mail app. Use a dev or TestFlight/Play build on a real device; the iOS Simulator has no Mail app. Send test mail to an address you control (or to `feedback@plank.to` once `mailboxLive` is true in `shared/support.json`), and record the device, OS version, mail app, and result next to each step.

### Send with device details
- [ ] iOS with Mail set up: Settings > Feedback > Report a problem. Write a message and fill in "What were you trying to do?". Leave "Include device details" on and press "Open in mail app". The Mail composer opens addressed to the support address, with the subject "Plank problem: " plus the first line of the message, and the body has the message, "What I was trying to do:" and "Device details:".
- [ ] The device details in the email match the card on screen exactly: app version and build, system, device, text size, colors. Nothing else is added: no tasks, routines, notes, reminders, location, weather, clothing, or identifiers.
- [ ] Press Send. The app shows "Thanks — we read every message" and Done returns to Settings. Open the feedback screen again: it is empty (the draft was cleared). The email arrives with the same subject and body.
- [ ] Android with Gmail (or another mail app): same steps. The mail app opens with the address, subject and body filled in. After sending and returning, the app shows "If you sent your message, thanks — we read every message." under the button (Android can't report whether it was sent), and the draft is kept.

### Send without device details
- [ ] Suggest a feature or improvement: switch the type to Improvement, write a message, and turn "Include device details" off. The details card is replaced by "No device details will be added. Only what you write is sent."
- [ ] Open in mail app: the subject starts with "Plank improvement: ", and the body is only the message, with no "Device details:" section. The optional "What were you trying to do?" field is not shown and its text is not added for ideas and improvements, even if it was filled in before switching away from Problem.
- [ ] A long first line (more than 60 characters) is shortened with "…" in the subject; the full text is in the body.

### Cancel, save, and drafts
- [ ] iOS: open the composer, then Cancel (Delete Draft). The app returns to the form with the message still there and no confirmation screen. Repeat with Save Draft: same result, and the draft is in Mail's Drafts.
- [ ] Write a message, go back to Settings, and reopen the feedback screen: the type, message, second field and toggle are restored. Force-quit the app and reopen: still restored.

### No mail account configured
- [ ] iOS with no account in Mail (or Mail deleted): press "Open in mail app". If the `mailto:` fallback opens another mail app (for example Gmail or Outlook), the message is filled in there. If none is installed, "No mail app found" appears above the button with the address shown.
- [ ] "Copy address" changes to "Address copied", and pasting in another app gives exactly the support address. Long-pressing the address also lets you select and copy it.
- [ ] Android with no mail app that handles `mailto:` (for example a work profile or an emulator without Gmail): the same "No mail app found" notice and copy steps.
- [ ] After "No mail app found", the message is still on screen and kept as a draft; nothing was sent.
