# Permission explanation review

Reviewed against the code on 2026-10-19.

## Behavior

- Location: requested only after the user enables location-based weather (`requestForegroundPermissionsAsync`), one fix with `Accuracy.Low`, rounded to 2 decimals, no background or watching. See [../location-privacy.md](../location-privacy.md).
- Notifications: permission is requested only when the user turns reminders on. Reminders are local; there is no push service.
- No camera, microphone, contacts, photos, tracking, motion, or Bluetooth use.

## iOS (`app/app.json` -> `Info.plist`)

| Key | Value | Verdict |
|---|---|---|
| `NSLocationWhenInUseUsageDescription` | "Plank uses your approximate location, only while the app is open, to find a nearby weather forecast." | Matches. Says why, when, and approximate. Kept. |
| `NSLocationDefaultAccuracyReduced` | true (`isIosReducedAccuracyByDefault`) | Matches. |
| `NSLocationAlways*` | absent (plugin options set false) | Correct, never needed. |
| `NSMotionUsageDescription` | absent (`motionUsagePermission: false`) | Correct. |
| `NSLocationTemporaryUsageDescriptionDictionary` | Plugin default `ExpoLocationFullAccuracy` string | Never used (no full-accuracy request). Harmless; ignore. |
| Notifications | No usage string exists on iOS | The in-app explanation before the system prompt is the only copy; see the Maestro flows `notification-permission-*`. |
| `ITSAppUsesNonExemptEncryption` | false (added as `ios.config.usesNonExemptEncryption`) | Only standard HTTPS. Avoids the export-compliance prompt. Owner to confirm. |
| `NSAllowsLocalNetworking` | present in the dev build only | Expo dev-client setting; confirm absent in the production archive. |

## Android

Merged permissions from the libraries before this change:

| Permission | Source | Decision |
|---|---|---|
| `ACCESS_COARSE_LOCATION` | expo-location | Keep. Matches approximate location. |
| `ACCESS_FINE_LOCATION` | expo-location | Removed via `android.blockedPermissions`. The app rounds to ~1 km and uses low accuracy, so precise location is not needed, and it would contradict the listing. |
| `POST_NOTIFICATIONS` | expo-notifications | Keep. Runtime permission, asked only when reminders are enabled. |
| `RECEIVE_BOOT_COMPLETED` | expo-notifications | Keep. Needed to re-create scheduled reminders after a reboot. Disclose in Data safety notes; no data is collected by it. |
| `VIBRATE`, `INTERNET`, `ACCESS_NETWORK_STATE` and similar | libraries | Expected. Verify the final list from the built AAB (`bundletool dump manifest`) and that no exact-alarm permission appears. |

Android has no free-text permission string. The rationale shown before the system dialog is the in-app copy (same wording as the iOS string). Play also requires the Data safety form and, for location, no background declaration (not applicable).

`android.allowBackup: true` is deliberate (see [../backups.md](../backups.md)).

## Open items

- Confirm the final merged Android manifest after the first real build.
- Confirm the iOS production `Info.plist` after `eas build`.
