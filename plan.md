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


## In-app feedback

Let users request features or report problems from inside the app without adding an account, a backend, or analytics. Feedback is always user-initiated and never prompted by streaks, usage counts, or pop-ups.

### Decisions

- Send feedback through the device's mail composer (`expo-mail-composer`, falling back to a `mailto:` link) addressed to a dedicated support address. No feedback data is stored on a server we run, and nothing is sent without the user pressing Send in their own mail app.
- Diagnostic details (app version, build number, OS and version, device model, text size and theme settings) are shown to the user and included only if they leave the "Include device details" toggle on. Never attach task, routine, location, or clothing data.
- The website contact page offers the same address so people without a configured mail app can still reach us.

### Tasks

- [ ] Create the `feedback@plank.to` mailbox, confirm it receives mail, then set `mailboxLive` to `true` in [shared/support.json](shared/support.json). This is an owner task (it also completes 5.3).
- [ ] Integrate `expo-mail-composer`; when no mail account is available, fall back to `mailto:`, and if that also fails, show the address with a copy-to-clipboard button.
- [ ] Keep a local draft of the message so leaving the screen or switching to the mail app does not lose what was typed; clear it after the composer reports the mail was sent.
- [ ] Show a calm confirmation after sending ("Thanks — we read every message") with no follow-up prompts or rating requests.
- [ ] Check accessibility: screen reader labels, dynamic text size, focus order, and keyboard avoidance on the feedback screen.
- [ ] Update [contact.astro](web/src/pages/contact.astro) and [help.astro](web/src/pages/help.astro) with the feedback address and what to include in a request.
- [ ] Update [privacy.astro](web/src/pages/privacy.astro) and [docs/location-privacy.md](docs/location-privacy.md) to describe what a feedback email contains and that device details are optional.
- [ ] Add feedback flow steps (send with and without diagnostics, no mail account configured) to [docs/device-test-checklist.md](docs/device-test-checklist.md).
- [ ] Set up a lightweight triage process: label incoming emails as idea, improvement, or problem and review them during co-design and usability sessions.

## Audience: autistic people and people with ADHD

Widen the stated audience from autistic people to also include people with ADHD (attention deficit). Both groups benefit from predictability and visual supports. ADHD adds needs around time blindness, getting started on tasks, and quickly capturing thoughts. Every support stays optional and configurable, and no one setup is assumed to suit everyone.

### Decisions

- Name ADHD next to autism in the README, the store listing, and the website. Make no clinical or therapeutic claims.
- New supports are off by default unless co-design shows a default helps most people. Each can be turned off on its own.
- Keep the existing tone rules: no streaks, no shame, no countdowns that read as pressure, and no repeated nagging.

### Tasks

- [ ] Update the product description in [README.md](README.md), [index.astro](web/src/pages/index.astro), [help.astro](web/src/pages/help.astro) and [docs/release/store-listing.md](docs/release/store-listing.md) to name autistic people and people with ADHD, with no efficacy claims.
- [ ] Bring back **task steps** (the `steps` table was dropped in a migration): optional ordered sub-steps on tasks and routines, ticked off one at a time on Today, with progress shown as "2 of 5 steps". Add a new migration and tests, and don't revert the old one.
- [ ] Add a **Now / Next view**: one large card for the current task (with its steps) and a smaller "Next" card, reachable from Today and from a reminder notification. Helps people who find a full list overwhelming.
- [ ] Add an optional **visual time indicator** for time blindness: a shrinking ring or bar showing time until the next task and, for tasks with a duration, time left. Neutral wording ("20 min until Lunch"), no red or alarm styling, and it follows the Animations setting.
- [ ] Add optional **task duration** (e.g. 15 min) to tasks and routines so the time indicator and the timeline can show how long things take.
- [ ] Add a **timeline layout** for Today (time down the side, blocks sized by duration) as a choice next to the current list, saved in Appearance.
- [ ] Add a **transition heads-up** reminder ("In 5 minutes: getting ready for school") separate from the task reminder, so changes between activities are predictable. Reuse reminder reconciliation.
- [ ] Show **pictures and symbols** on tasks, which the README promises but no screen renders: an emoji or symbol picker plus the existing local image (`imageUri`), shown on Today, Now/Next and the timeline. Add a "Pictures first" option that makes the picture larger than the text, for people who read pictures more easily than text.
- [ ] Add **reordering** for untimed tasks (drag plus accessible "Move up" and "Move down" actions), as the README promises.
- [ ] Add a **quick capture inbox**: a one-field "Add a thought" that saves undated tasks to an Inbox list, to be scheduled later. Reachable from Today in one tap.
- [ ] Add a **"What changed" notice**: when a routine occurrence was moved, edited or skipped, Today shows a calm note at the top ("Swimming moved to 17:00 today") so changes are never a surprise.
- [ ] Add **read aloud** (`expo-speech`) for a task's title and steps, for people who prefer listening, younger users, and anyone who finds reading tiring.
- [ ] Add an optional, gentle **completion moment** (a short check animation and sound, or nothing). Off by default, never a streak or score, and it follows the Animations and Haptics settings.
- [ ] Add a **Simple mode** that hides weather, clothing and the Routines tab, leaving only Today, for people who want fewer choices on screen.
- [ ] Add **appearance presets** in [appearance.tsx](app/src/app/(tabs)/settings/appearance.tsx): "Calm (low stimulation)" (muted colors, no animation, no haptics, no emoji), "Focus" (Now/Next, larger text, labelled buttons) and "Playful" (the kids theme below). A preset only fills in the existing settings, and each one can still be changed afterwards.
- [ ] Add a **readable font option** (e.g. Atkinson Hyperlegible, bundled locally) and a "More line spacing" toggle; update the [tokens.ts](app/src/theme/tokens.ts) typography to scale with it.
- [ ] Add routine **templates** (Morning, Bedtime, School day, Leaving the house) with example steps. These are starting points that people can change, not prescriptions.
- [ ] Run co-design and usability sessions with people with ADHD, and with autistic children and their caregivers, alongside the existing sessions with autistic adults. Record findings in `docs/`.

## Color themes: Playful (kids) and Blossom (pink)

Add two full-palette themes. The current accent themes (`sage`, `plum`, `clay`) only replace `primary`/`onPrimary`/`focus`. These two also tint `background`, `surface` and `separator`, so they need full light and dark palettes in [colors.ts](app/src/theme/colors.ts).

### Decisions

- Name themes by look, not by who they're for: "Playful (bright colors)" and "Blossom (pink)". Anyone can pick either, which matches the project's rule of never assuming things about people by gender.
- Both themes must pass `npm run check:contrast` in light and dark mode. Bright does not mean low contrast.
- Playful can also change shape (rounder corners, larger icons), but must not add motion beyond what the Animations setting allows.

### Tasks

- [ ] Extend the theme model in [colors.ts](app/src/theme/colors.ts) so a theme can override the whole `Palette` per scheme, not just the accent. Make sure `resolvePalette` and `allPalettes` cover the new themes.
- [ ] Add a **Blossom** theme: soft pink background (e.g. `#FFF4F7`), white surface, deep rose primary (e.g. `#A3335F`) for light mode, and a dark plum/rose variant for dark mode. Check every pair in `contrastRequirements`.
- [ ] Add a **Playful** theme: warm light background, white surface, strong blue or violet primary, with a secondary accent color used only for decoration, never as the only cue. Provide a dark variant.
- [ ] Add optional shape tokens (`radius.card`, `radius.button`, icon size) to [tokens.ts](app/src/theme/tokens.ts) so Playful can use rounder cards and larger icons; [Card.tsx](app/src/components/Card.tsx) and [Button.tsx](app/src/components/Button.tsx) read them from appearance context.
- [ ] Update the Swatch and Preview in [appearance.tsx](app/src/app/(tabs)/settings/appearance.tsx) to show the tinted background and shape, so people can judge a theme before choosing it.
- [ ] Add unit tests in [settings.test.ts](app/src/features/appearance/settings.test.ts) and [contrast.test.ts](app/src/theme/contrast.test.ts) for parsing the new theme values and checking their contrast, and extend [visual-preferences.yaml](app/.maestro/visual-preferences.yaml) to switch to each new theme.
- [ ] Add screenshots of both themes to [docs/release/screenshots.md](docs/release/screenshots.md).

## Kids and caregiver support

If children are a target audience, the app needs a caregiver setup flow, and the App Store Kids Category has extra rules.

### Tasks

- [ ] Decide whether to list the app in the App Store Kids Category or Google Play's Families program. Both restrict external links, require a parental gate before leaving the app (including the feedback `mailto:`), and set rules for third-party network calls (check the weather API). Record the decision in [docs/release/](docs/release/).
- [ ] Add an optional **caregiver lock**: a simple parental gate (e.g. hold a button and answer a question) before Settings, routine editing and deleting, so a child can complete tasks without changing the schedule by accident.
- [ ] Add a **picture-first kids layout** option: large picture cards, read-aloud on tap, labelled Complete buttons, and no text-only rows.
- [ ] Add a help page for caregivers on [help.astro](web/src/pages/help.astro) covering how to set up routines, pictures and the caregiver lock together with the child.

## Housekeeping

- [ ] Delete the committed `*.ts-E` files in `app/src` (leftover backups from `sed -i -E` on macOS) and add `*-E` to [app/.gitignore](app/.gitignore).
- [ ] Remove `imageUri` from the task model or ship the picture UI above. Either way, don't keep fields that no screen uses.
