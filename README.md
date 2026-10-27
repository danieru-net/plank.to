# plank.to

## Product plan

Build a configurable daily planner for autistic people, people with ADHD, and others who benefit from clear routines and visual supports. Personalization and user control are core requirements; no single layout, reminder style, or set of supports should be assumed to work for everyone.

The app and website have separate responsibilities:

- **Expo app:** local-first planner, routines, and on-device reminders.
- **Astro website:** static product information, help, and privacy pages, hosted on Firebase Hosting. It does not collect or display planner data.

The cited research in the product brief is a starting point for requirements, not evidence that this particular app is clinically effective. Involve autistic people and people with ADHD, with varied needs and preferences in co-design and usability testing. Avoid therapeutic or efficacy claims unless supported by suitable evidence.

## MVP features

### Today view and tasks

- Show the day as an easy-to-scan agenda or timeline.
- Keep text primary, with optional pictures.
- Let people create, edit, reorder, reschedule, complete, or dismiss tasks.
- Support optional times, notes, and images on tasks.
- Use neutral language; avoid streaks, guilt, and failure states.

### Weekly routines and reminders

Make recurring tasks quick to create. A person can enter a task such as “Shower,” choose a time such as 7:00 PM, and select the days it repeats:

- Choose any combination of weekdays, or select every day.
- Set an optional reminder for the recurring task; reminders use the same configurable advance notice, snooze, sound, vibration, and quiet-hours settings as other tasks.
- Make it easy to edit or pause a routine, including choosing whether a change applies to one occurrence or the recurring schedule.
- Let a person reschedule, complete, or dismiss an occurrence without changing the whole routine or triggering repeated prompts.

The weekly schedule is the initial recurrence scope. Handle timezone and daylight-saving changes predictably, and ensure edits or deleted routines update or cancel their scheduled notifications.

### Weather and clothing suggestions

- Offer an optional visual weather summary for the user’s chosen location, such as an icon and a concise temperature/conditions description.
- Request location permission only when the user enables location-based weather. Provide a manual location option and a way to disable weather; the planner must remain useful without location access.
- Use a weather provider with a suitable free offering. Before choosing it, verify current usage limits, attribution requirements, permitted caching, and whether an API key can be safely used by a mobile client. Avoid sending planner data to the provider.
- Make clothing suggestions simple and non-prescriptive, based on the forecast and clothing options the user says they want included. For example: “Warm today: T-shirt and shorts” or, if the user has enabled skirts in their clothing preferences, “T-shirt and skirt.”
- Provide a basic profile for clothing suggestions, with explicit preferences such as which clothing types to include. Do not infer clothing choices from gender; profile details are optional, editable, and stored locally. Let users dismiss suggestions.
- Explain that weather and clothing suggestions are approximate, and may not account for indoor temperatures, personal comfort, or local conditions.

### Personalization

- Provide adjustable text size, visual density, colors, and notification preferences.
- Offer understandable starting choices while allowing settings to be changed individually.
- Do not label any one configuration “autism-friendly” or imply it suits everyone.

### Privacy and data controls

- Keep schedules, task details, profile preferences, and app settings on the device by default.
- Use on-device notifications so routines work without an account or network connection.
- Explain device backup behavior and any export or restore options plainly.
- Keep location access optional and limited to the weather feature. Clearly disclose what location information the chosen weather provider receives; prefer coarse/manual location or an approach that minimizes location sharing where feasible.
- Avoid analytics or crash reporting that could capture personal planner data.

## Architecture

- **Mobile:** Expo with React Native and TypeScript.
- **Local storage:** SQLite via `expo-sqlite` for tasks, recurrence rules, profile preferences, and settings. Store image references locally where practical.
- **Notifications:** `expo-notifications` for on-device reminders. Reconcile scheduled notifications after task changes, routine edits, app restarts, timezone changes, and daylight-saving transitions.
- **Weather:** a replaceable provider integration with clear attribution, rate-limit handling, and caching that follows provider terms. Fetch only when the weather feature is enabled; do not couple weather availability to core planner functionality.
- **Website:** Astro static site with product overview, getting-started help, accessibility notes, privacy policy, and contact information.
- **Hosting:** Firebase Hosting for the generated Astro site. The site has no connection to the planner’s local database.
- **Firebase services:** use Firebase Hosting in the first release. Defer Firebase Auth and Firestore until a defined, opt-in cloud-sync or backup feature exists. If introduced later, explain the privacy trade-off and provide per-user access controls, deletion, and export paths.

## Delivery phases

1. **Co-design and requirements:** Validate the agenda, routine creation, reminder controls, weather/location permission flow, and clothing-profile choices with autistic people, people with ADHD, and other intended users. Include varied support needs, sensory preferences, and attitudes to location sharing.
2. **Prototype and usability testing:** Test whether participants can understand and change the schedule, create a weekly routine, control reminders, interpret weather, and understand or dismiss clothing suggestions. Ask whether location and profile controls feel clear and optional.
3. **App foundation:** Set up Expo, local storage and migrations, navigation, design tokens, recurring schedule representation, and notification scheduling.
4. **Planner MVP:** Build the Today view, task and routine editing, personalization, and local reminders. Core planner use must not require sign-in, location, or connectivity.
5. **Weather and suggestions:** Add the selected weather provider, explicit permission and manual-location paths, visual forecast, and preference-based clothing suggestions. Verify provider terms, attribution, caching, and privacy disclosures before release.
6. **Website and release readiness:** Build the Astro site and deploy it to Firebase Hosting. Publish accurate privacy and help content. Test supported iOS and Android versions, including notification permissions and timezone changes.
7. **Evaluate and iterate:** Gather feedback on schedule comprehension, routine setup, reminder usefulness or disruption, weather clarity, suggestion relevance, and sense of control. Improve based on findings; do not claim improved daily functioning without suitable outcome evidence.

## Initial acceptance criteria

- A user can create and change tasks and weekly routines without an account or network connection.
- A routine can repeat on selected weekdays or every day, with an optional reminder at a chosen time.
- Editing a single occurrence does not unintentionally alter the recurring schedule; editing the schedule does not leave stale notifications.
- Users can control text size, visual density, colors, and reminders; preferences persist locally.
- Weather is opt-in, location permission is requested only for that feature, and users can choose a manual location or turn weather off.
- Clothing suggestions use explicit user-selected clothing preferences rather than inferred gender, are easy to dismiss, and are presented as suggestions.
- The selected weather provider’s free-tier limits and terms are documented and its attribution requirements are met.
- The static website can be served independently and receives no planner data.
- Privacy information accurately describes local storage, location use, weather-provider data sharing, device backups, and any future optional cloud features.
- Usability testing asks participants whether the schedule and routines are understandable, reminders are useful or disruptive, weather and suggestions are clear, and the app feels helpful and under their control.

## Store listings

Copy for App Store Connect and the Google Play Console. Paste the text blocks as they are; neither store renders Markdown. Follow the claims rules in [docs/release/store-listing.md](docs/release/store-listing.md): no clinical, therapeutic or efficacy claims, weather is described as optional, and nothing says data "never leaves your device".

### Apple App Store

| Field | Text | Limit |
|---|---|---|
| Name | Plank | 30 |
| Subtitle | Calm daily planner, no account | 30 |
| Primary category | Productivity | |
| Secondary category | Lifestyle | |

**Promotional text** (170 characters, can be changed without review)

```text
Plan today and your weekly routines at your own pace. Pictures, read aloud and reminders are all optional, and everything works offline without an account.
```

**Keywords** (100 characters, comma-separated, no spaces)

```text
planner,routine,visual,schedule,checklist,reminders,daily,tasks,weekly,to-do,offline,pictures
```

**Description**

```text
Plank is a calm daily planner for tasks and weekly routines. It is made for autistic people, people with ADHD, and anyone who wants a clear, predictable day. You don't need an account, and it works without a connection.

TODAY
• See the day as one clear list, with the next thing easy to spot.
• Add a task with an optional time, notes, steps, a symbol or a photo from your library.
• Complete, move or dismiss a task. Nothing is marked as failed.
• Reorder tasks that don't have a set time.

WEEKLY ROUTINES
• Repeat a routine every day or only on the days you choose.
• Start from a template (Morning, Bedtime, School day, Leaving the house) and change it to suit you.
• Change or skip one day without touching the rest of the routine. When you edit, you choose: just this day, or the whole routine.

REMINDERS, IF YOU WANT THEM
• Reminders are notifications that stay on your device. They are off until you turn them on.
• No streaks, no scores and no repeated nagging.

MAKE IT YOURS
• Text size, spacing, density and color theme, including Playful (bright colors) and Blossom (pink).
• A readable font option (Atkinson Hyperlegible) and more line spacing.
• Starting presets such as Calm (low stimulation) and Focus. Every setting can still be changed on its own.
• Read aloud: have a task's title and notes spoken to you.
• Picture cards: each task becomes a large card with its picture first.
• Simple mode hides routines and weather for a shorter screen.
• An optional check, with or without a sound, when you finish a task.

SETTING IT UP FOR SOMEONE ELSE
• A caregiver lock stops settings, routines and tasks being edited by accident. Tasks can still be completed. It is optional and off by default.

WEATHER AND CLOTHING IDEAS (OPTIONAL)
• Weather is off by default. Use your approximate location, or type a city instead.
• See a short forecast and a clothing idea based on the clothes you choose to include. Suggestions are only ideas, and you can dismiss them.
• Turning weather off removes the saved location and forecast.
• Forecast data by Open-Meteo.com.

PRIVACY
• Your tasks, routines and settings are stored on your device. Plank has no accounts, ads, analytics or subscriptions.
• Your phone's own backup may include a copy, depending on your settings.
• Feedback is sent from your own mail app, only when you press Send.

Privacy policy: https://plank.to/privacy
```

**What's new in 1.0.0**

```text
First release: daily tasks, weekly routines with templates, optional reminders, pictures and read aloud, and optional weather with clothing ideas.
```

| Field | Value |
|---|---|
| Support URL | https://plank.to/contact |
| Marketing URL | https://plank.to |
| Privacy policy URL | https://plank.to/privacy |

### Google Play

| Field | Text | Limit |
|---|---|---|
| App name | Plank: Calm Daily Planner | 30 |
| Category | Productivity | |
| Contact email | danielsilvajobs@gmail.com | |
| Website | https://plank.to | |
| Privacy policy | https://plank.to/privacy | |

**Short description** (80 characters)

```text
A calm daily planner with visual routines and optional reminders. No account.
```

**Full description** (4000 characters)

```text
Plank is a calm daily planner for tasks and weekly routines. It is made for autistic people, people with ADHD, and anyone who wants a clear, predictable day. You don't need an account, and it works offline.

★ Today, in one clear list
• See what's planned for today, with the next thing easy to spot.
• Add a task with an optional time, notes, steps, a symbol or a photo from your gallery.
• Complete, move or dismiss a task. Nothing is marked as failed.
• Reorder tasks that don't have a set time.

★ Weekly routines
• Repeat a routine every day or only on the days you pick.
• Start from a template (Morning, Bedtime, School day, Leaving the house) and make it your own.
• Change or skip one day without touching the rest. When you edit, you choose: just this day, or the whole routine.

★ Reminders only if you want them
• Reminders are notifications that stay on your phone. They are off until you turn them on.
• No streaks, no scores and no repeated nagging.

★ Make it yours
• Text size, spacing, density and color theme, including Playful (bright colors) and Blossom (pink).
• A readable font option (Atkinson Hyperlegible) and more line spacing.
• Starting presets such as Calm (low stimulation) and Focus. You can still change each setting on its own.
• Read aloud: have a task's title and notes spoken to you.
• Picture cards: each task shows as a large card with its picture first.
• Simple mode hides routines and weather for a shorter screen.
• An optional check, with or without a sound, when you finish a task.

★ Setting it up for someone else
• An optional caregiver lock stops settings, routines and tasks being edited by accident. Tasks can still be completed.

★ Weather and clothing ideas (optional)
• Weather is off by default. Use your approximate location, or type a city instead.
• See a short forecast and a clothing idea based on the clothes you choose to include. Suggestions are only ideas, and you can dismiss them.
• Turning weather off removes the saved location and forecast.
• Forecast data by Open-Meteo.com.

★ Privacy
• Your tasks, routines and settings are stored on your phone. Plank has no accounts, ads, analytics or subscriptions.
• Android's own backup may include a copy, depending on your settings.
• Feedback is sent from your own email app, only when you press Send.

Privacy policy: https://plank.to/privacy
```

**Release notes for 1.0.0**

```text
First release: daily tasks, weekly routines with templates, optional reminders, pictures and read aloud, and optional weather with clothing ideas.
```
