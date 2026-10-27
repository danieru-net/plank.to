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


## Audience: autistic people and people with ADHD

Widen the stated audience from autistic people to also include people with ADHD (attention deficit). Both groups benefit from predictability and visual supports. ADHD adds needs around time blindness, getting started on tasks, and quickly capturing thoughts. Every support stays optional and configurable, and no one setup is assumed to suit everyone.

### Decisions

- Name themes by look, not by who they're for: "Playful (bright colors)" and "Blossom (pink)". Anyone can pick either, which matches the project's rule of never assuming things about people by gender.
- Both themes must pass `npm run check:contrast` in light and dark mode. Bright does not mean low contrast.
- Playful can also change shape (rounder corners, larger icons), but must not add motion beyond what the Animations setting allows.

### Tasks



### Decisions

- Name ADHD next to autism in the README, the store listing, and the website. Make no clinical or therapeutic claims.
- New supports are off by default unless co-design shows a default helps most people. Each can be turned off on its own.
- Keep the existing tone rules: no streaks, no shame, no countdowns that read as pressure, and no repeated nagging.

### Tasks


## Color themes: Playful (kids) and Blossom (pink)

Add two full-palette themes. The current accent themes (`sage`, `plum`, `clay`) only replace `primary`/`onPrimary`/`focus`. These two also tint `background`, `surface` and `separator`, so they need full light and dark palettes in [colors.ts](app/src/theme/colors.ts).



## Kids and caregiver support

If children are a target audience, the app needs a caregiver setup flow, and the App Store Kids Category has extra rules.

### Tasks


## Review

Tasks an agent cannot do: they need the owner, real people, or a business decision.

- [ ] Run co-design and usability sessions with people with ADHD, and with autistic children and their caregivers, alongside the existing sessions with autistic adults. Record findings in `docs/`.
- [ ] Decide whether to list the app in the App Store Kids Category or Google Play's Families program. Both restrict external links, require a parental gate before leaving the app (including the feedback `mailto:`), and set rules for third-party network calls (check the weather API). Record the decision in [docs/release/](docs/release/).
- [ ] Add screenshots of both themes to [docs/release/screenshots.md](docs/release/screenshots.md). This needs the app running on a simulator or device.
