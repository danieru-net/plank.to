# Privacy questionnaire answers (draft)

Based on actual behavior as of 2026-10-19 ([../location-privacy.md](../location-privacy.md), [../weather-provider.md](../weather-provider.md), [../backups.md](../backups.md)). Facts: no accounts, no analytics, no ads, no crash reporter, no Plank server. Planner data stays in a local SQLite file. The only network calls are the optional weather calls to Open-Meteo directly from the device. Re-verify with the traffic capture in the device checklist (4.9) before submitting.

## Apple App Privacy ("nutrition label")

Question: do you or third-party partners collect data from this app?

Apple defines "collect" as transmitting data off the device in a way that lets you or partners access it for longer than needed to serve the request in real time. Open-Meteo is a third-party service that receives an approximate location (rounded to ~1 km) with no identifier, and Plank does not store it server-side. Two defensible options; pick one with the owner:

- Conservative (recommended): declare Coarse Location, purpose App Functionality, not linked to the user, not used for tracking, because a third party receives it. Declare only if the user enables location weather (the label cannot be conditional, so it is always declared).
- Narrow: "Data Not Collected", on the argument that it is transient and not retained by Plank. Riskier if Open-Meteo logs requests.

Recommended answers:

| Item | Answer |
|---|---|
| Data collected | Coarse Location (App Functionality only) |
| Linked to the user's identity | No |
| Used for tracking | No |
| Contact info, identifiers, usage data, diagnostics, user content (tasks are not sent), purchases | Not collected |
| Manual city search text | Sent to Open-Meteo geocoding; treat as Coarse Location/Search term purpose App Functionality, not linked. Covered by the same Coarse Location declaration. |
| Tracking (ATT) | Not used; no `NSUserTrackingUsageDescription` |
| Privacy manifest | `PrivacyInfo.xcprivacy` shows `NSPrivacyTracking` false, no collected types (generated). Update `NSPrivacyCollectedDataTypes` to match the chosen option if the build tooling allows. |

Privacy policy URL: `[[PLACEHOLDER: https://plank.to/privacy]]`

## Google Play Data safety

| Question | Answer |
|---|---|
| Does the app collect or share required user data types? | Yes, only if you follow the conservative option; location is sent to a third party for a feature the user turns on. |
| Data collected | Approximate location. Collected: yes. Shared: yes (with Open-Meteo, a service provider acting for the app functionality). |
| Is collection optional? | Yes. Weather is off by default; users can use manual search or none. |
| Purpose | App functionality |
| Processed ephemerally? | Plank does not retain it on a server; on-device it is stored as rounded coordinates. Open-Meteo's retention is outside Plank's control, so do not claim "ephemeral". |
| Precise location | Not collected (fine location is blocked in the manifest). |
| Personal info, financial, health, messages, photos, audio, files, calendar, contacts, app activity, web history, device IDs | Not collected |
| Data encrypted in transit | Yes (HTTPS only) |
| Users can request data deletion | Not applicable: no account and no server copy. Local data is removed by turning weather off, Settings reset, or uninstalling. State this in the policy. Device backups (Google) are under Google's control. |
| Independent security review | No |
| Families / children | Not targeted at children `[[PLACEHOLDER: owner confirms target audience]]` |
| Ads | No ads |

## Other store forms

- Content rating: all audiences expected; no user-generated content, no ads, no purchases.
- Export compliance: standard HTTPS only; exempt. `[[PLACEHOLDER: owner confirms]]`
- Account deletion requirement: not applicable, there are no accounts.
- Health apps declaration (Play): not a health app. Do not select health features.
