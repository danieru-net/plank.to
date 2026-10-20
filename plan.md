# MVP implementation plan

## Goal and boundaries

Deliver an Expo mobile planner that works offline without an account, supports daily tasks and weekly routines with local reminders, and optionally shows weather-based clothing suggestions. Build a separate Astro static website and host it on Firebase Hosting.

### MVP decisions

- Store planner data, settings, weather preferences, and clothing preferences locally on the device. Do not add Firebase Auth, Firestore, cloud sync, analytics, or advertising.
- Weather is optional. Users can use device location with permission, select a location manually, or turn the feature off.
- Clothing suggestions use explicit clothing preferences. Do not infer clothing or profile settings from gender.
- Weekly recurrence supports selected weekdays. A single task occurrence can be changed or dismissed without silently changing its recurring series.
- Use calm, neutral wording and avoid streaks, shame, pressure, or repeated nagging.
- Treat weather and clothing output as informational suggestions, not health or safety advice.
- Co-design and usability testing are release activities, not optional polish. Do not claim clinical or therapeutic effectiveness.

## Phase 1 — Project foundation

**Exit criteria:** The app and site build independently; the app runs on target platforms; automated checks are available and documented.

## Phase 2 — Local planner data and task flows


**Exit criteria:** Users can create and manage today's tasks offline; app restart preserves tasks and settings; failures are visible rather than silently ignored.

## Phase 3 — Weekly routines and notifications

- [ ] **3.9 Test calendar edge cases on devices.** DST and timezone planning logic is now covered by unit tests (done, see done.md). Still to do by a person with real devices, following [docs/device-test-checklist.md](docs/device-test-checklist.md): timezone travel, real DST transitions, permission denial/re-enabling, reboot/app restart, and notification limits (64 on iOS) on iOS and Android.

**Exit criteria:** A daily routine such as “Shower, 7:00 PM, every day” produces the expected local occurrences and reminders; edits do not leave stale notifications; reminders remain optional.

## Phase 4 — Optional weather and clothing suggestions

- [ ] **4.9 Test privacy and provider behavior.** Automated tests are done (see done.md, "4.9 (partial)"). Still to do by a person with a device and network access, following the "Manual checks: weather privacy and provider" section of [docs/device-test-checklist.md](docs/device-test-checklist.md): a live Open-Meteo call, real traffic capture (hosts, headers, cookies, coordinates), the exact attribution/caching wording on Open-Meteo's license page, OS location permission flows, offline behavior, and the Settings clear-on-off behavior.

**Exit criteria:** Weather is entirely optional; users can use manual location or no location; suggestions reflect explicit preferences and can be dismissed; core planner features work when weather is offline or unavailable.

## Phase 5 — Astro website and Firebase Hosting

- [ ] **5.2 Have the privacy policy reviewed for the intended release jurisdictions.** The draft is written at [web/src/pages/privacy.astro](web/src/pages/privacy.astro). A human must review it for the intended release jurisdictions, then remove the draft notice, replace the contact placeholder (see 5.3), and confirm the Open-Meteo attribution wording, caching terms (4.9), and backup statement (6.13).
- [ ] **5.3 Replace the contact placeholder with a maintained contact route.** The owner must choose a real support route, then update the single constant in [web/src/config.ts](web/src/config.ts) (set `isPlaceholder` to false). The accessibility and contact pages already exist.
- [ ] **5.4 Create the Firebase project and verify the first deploy.** Config and workflows are in place (see [web/README.md](web/README.md)). The owner must create the Firebase project, replace the placeholder in `.firebaserc`, set the `FIREBASE_PROJECT_ID` variable and `FIREBASE_SERVICE_ACCOUNT` secret, then confirm a preview and the first production deploy succeed.
- [ ] **5.6 Deploy a preview and review it.** Deploy a preview to Firebase and re-review there.

**Exit criteria:** Astro pages build and deploy to Firebase Hosting as static content without planner data or Firebase database services.

## Phase 6 — Automated testing, quality, and release

- [ ] **6.4 Run accessibility checks (remaining: manual).** The static audit and automated guards are done (see done.md 6.4 partial). Still needed on real devices: VoiceOver and TalkBack passes, large Dynamic Type/font scale layout on iOS and Android, and contrast/focus order checks on both platforms. Checklist in `docs/device-test-checklist.md`.
- [ ] **6.9 Remaining iOS acceptance cases (manual).** Simulator automation is done (17 Maestro flows pass; see [docs/acceptance-ios.md](docs/acceptance-ios.md)). Still to verify by hand on a device: true airplane mode with a cached forecast, notification delivery, tap and snooze, device location revoked after being chosen, and notifications across restart/reboot. Android stays a separate platform check.
- [ ] **6.10 Conduct usability sessions.** Ask participants whether the day is understandable, routines are easy to create/change, reminders are useful or disruptive, weather and suggestions are clear, and the app feels optional and under their control.
- [ ] **6.11 Triage findings and fix release blockers.** Prioritize safety/privacy issues, confusing recurrence/reminder behavior, and accessibility blockers. Retest affected flows with participants where possible.
- [ ] **6.12 Prepare release materials (remaining: owner steps).** Drafts are done in [docs/release/](docs/release/) (see done.md, "6.12 (partial)"). Still to do by the owner: create store and Expo accounts, capture final screenshots, replace the `[[PLACEHOLDER` URLs and contact, confirm the privacy-label choice, run a first real EAS build, and work through [docs/release/release-checklist.md](docs/release/release-checklist.md).
- [ ] **6.13 Verify backups on real devices.** Policy, config, and wording are done (see [docs/backups.md](docs/backups.md)). Remaining: on real devices, confirm an iCloud backup restore and a Google Auto Backup restore return tasks, routines, and settings (including a backup taken while the app is open), that reminders are re-created after a restore, and behavior with backup disabled.
- [ ] **6.14 Publish and monitor.** Release the mobile app and static site; monitor only operational information that does not collect planner content or sensitive location/profile data, and maintain a clear way for users to report issues.

**Exit criteria:** Unit tests and the documented macOS/iOS Simulator automation pass; each automated feature flow produces a reviewable MP4; high-priority usability/privacy issues are resolved; and user-facing privacy and permission disclosures match the shipped behavior.

## MVP acceptance checklist

- [ ] Tasks and routines can be created, changed, and viewed without an account or network connection.
- [ ] A routine can repeat on selected weekdays or every day at a chosen local time.
- [ ] A user can choose whether a change affects one occurrence or the recurring series.
- [ ] Reminders are optional; users can reschedule or dismiss occurrences without nagging or accidentally altering the routine.
- [ ] Task/routine edits and deletes reconcile their scheduled notifications without stale or duplicate alerts.
- [ ] Text size, visual density, colors, and reminder preferences persist locally.
- [ ] The initial screen presents weather first, the clothing suggestion next, and today's task agenda after them; disabling or failing weather does not block access to tasks.
- [ ] Weather is opt-in, location access is requested only for location-based weather, and manual-location and off options exist.
- [ ] Weather-provider terms, current free-tier limits, attribution, caching, and privacy implications are verified and documented.
- [ ] Clothing suggestions use explicit user choices, are non-prescriptive, and can be dismissed; gender is never inferred.
- [ ] Weather and clothing features failing or being disabled never prevent access to the planner.
- [ ] A free, locally runnable macOS/iOS Simulator UI automation command verifies core user flows and produces a separate MP4 video for each tested functionality.
- [ ] Automated tests use deterministic local data and mocked weather, and generated videos/reports are not committed as source files.
- [ ] Astro privacy, help, and product pages deploy to Firebase Hosting independently of planner data.
- [ ] Co-design/usability testing includes varied preferences and evaluates understandability, reminder disruption, weather clarity, and user control.

## Owner input needed (proceeding with the recommendation unless changed)

- [ ] **Support contact (5.3).** Using a placeholder in `web/src/config.ts`. Recommendation: a dedicated support address (not a personal inbox) before publishing.
- [ ] **Firebase project (5.4).** Create the project, set repo variable `FIREBASE_PROJECT_ID` and secret `FIREBASE_SERVICE_ACCOUNT`, replace the id in `.firebaserc`. Recommendation: one project, preview channels for PRs.
- [ ] **Open-Meteo attribution and terms (4.1/4.9).** Approve the attribution line and confirm caching/commercial terms on the live license page. Decision made: non-commercial, called directly, no proxy.
- [ ] **Privacy policy legal review (5.2).** Needs review for the intended release jurisdictions; remove the draft notice afterwards.
- [ ] **Android verification.** No emulator/SDK has been used yet; Android checks remain manual (see `docs/device-test-checklist.md`).
- [ ] **Real-device and usability work (3.9, 4.9, 6.10).** Needs people and devices; checklists live in `docs/`.
