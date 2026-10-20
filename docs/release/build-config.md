# Build configuration

Config files: [../../app/app.json](../../app/app.json), [../../app/eas.json](../../app/eas.json) (new).

| Field | Value | Notes |
|---|---|---|
| Name / slug | Plank / plank | |
| iOS bundle id | to.plank.app | Must match the App Store Connect record. |
| Android package | to.plank.app | Cannot change after the first Play upload. |
| Version (`expo.version`) | 1.0.0 | User-facing; same on both platforms. |
| iOS `buildNumber` | "1" | Local starting value. |
| Android `versionCode` | 1 | Local starting value. |
| Version source | `appVersionSource: remote` | EAS tracks build numbers; production profile has `autoIncrement: true`. |
| Encryption | `usesNonExemptEncryption: false` | HTTPS only. |
| Android permissions | fine location blocked | See [permissions.md](permissions.md). |
| Backup | `allowBackup: true` | See [../backups.md](../backups.md). |
| Test mode | `EXPO_PUBLIC_PLANK_TEST_MODE` unset | Must be unset in every release build so `plank://test-seed` is inert. Do not set it in `eas.json` env. |

## EAS profiles

- `development`: dev client, internal distribution, iOS simulator build, Android APK.
- `preview`: internal distribution, release JS, Android APK (for testers; iOS needs registered devices or TestFlight `[[PLACEHOLDER: Apple team and device registration]]`).
- `production`: store build (iOS archive, Android AAB), build numbers auto-incremented.

## Commands (after the owner has an Expo account and store accounts)

```
cd app
npx eas-cli login
npx eas-cli build:configure       # links the EAS project id (writes extra.eas.projectId into app.json)
npx eas-cli build --profile preview --platform all
npx eas-cli build --profile production --platform all
npx eas-cli submit --profile production --platform ios      # needs Apple credentials
npx eas-cli submit --profile production --platform android  # needs a Play service account key
```

Signing keys and the Play service account JSON stay out of git (`*.jks`, `*.p8`, `*.p12`, `*.key` are already ignored; also ignore the service account JSON). Not run here: no accounts exist yet, so `eas.json` is untested against a real build.

`app/ios` is generated and git-ignored; EAS prebuilds in the cloud.
