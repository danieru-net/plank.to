# Backups and data expectations (task 6.13)

Decided: 2026-10-19. This is a design note, not legal advice. Real-device restore is still unverified (see plan.md 6.13).

## Where the data lives

All planner data is in one SQLite file, `plank.db` (opened with `openDatabaseAsync('plank.db')` in `app/src/db/database.ts`, WAL mode, so `-wal` and `-shm` files sit beside it). That includes tasks, routines, notes, and the `preferences` table (display, reminder, and clothing settings, the saved weather place, and the one cached forecast under `weather.forecastCache`). There are no separate preference files and no other app-owned data stores we write to.

- iOS: `<container>/Documents/SQLite/plank.db`. expo-sqlite's `defaultDatabaseDirectory` is the app Documents directory plus `SQLite` (`app/node_modules/expo-sqlite/ios/SQLiteModule.swift`; tvOS uses Caches instead). Verified on the iPhone 17 / iOS 27 simulator: the three files are in `Documents/SQLite/` and carry no extended attributes, so none is flagged excluded from backup (`xattr -l` empty; an excluded item would have `com.apple.MobileBackup`).
- Android: `getFilesDir()/SQLite/plank.db` (`SQLiteModule.kt`, `androidContext.filesDir + "/SQLite"`), which is internal app storage.

## What the OS backs up

- iOS: Documents and Library/Application Support are included in iCloud and encrypted device (computer) backups; Caches and tmp are not. `isExcludedFromBackup` can exclude a file. Source: https://developer.apple.com/documentation/foundation/optimizing-your-app-s-data-for-icloud-backup (the page did not render fully here; the directory rules are Apple's long-standing guidance, to be re-confirmed).
- Android: Auto Backup (API 23+) is on unless `android:allowBackup="false"`. By default it includes shared preferences, `getFilesDir()` internal storage, and databases from `getDatabasePath()`; it excludes cache, code cache, and `getNoBackupFilesDir()`. Limit 25 MB per app, stored privately in the user's Google Drive, end-to-end encrypted with the device lock on Android 9+, roughly once per 24 hours on an idle device on Wi-Fi. Android 12+ apps use `android:dataExtractionRules` (cloud-backup, device-transfer); a missing section means everything except cache/no-backup is included. Some manufacturers allow device-to-device transfer even when `allowBackup` is false. Source: https://developer.android.com/identity/data/autobackup
- expo-sqlite docs say nothing about backup and do not state the directories; the paths above come from the module source. Source: https://docs.expo.dev/versions/latest/sdk/sqlite/

## Policy

1. Keep OS backup on. A phone restore bringing back someone's routines is a benefit, and Plank has no account or server to restore from.
2. Set `android.allowBackup: true` in `app/app.json` explicitly (it is also the Expo default; being explicit stops a template change from silently altering it). No custom `dataExtractionRules` or `fullBackupContent` file: the default includes `plank.db` for both cloud backup and device transfer, which is what we want.
3. Do not exclude the forecast cache. It is a row in the same database as everything else, so excluding it would need a second file or store. It is small, holds only public forecast numbers for one place (the place itself is already in the database), and is discarded after 24 hours of age. Revisit if the cache ever moves to its own file.
4. Public wording: never say data "never leaves your device". Say it is stored on the device, Plank does not send it anywhere, and the phone's own backup (iCloud, Google, or a computer backup) may include a copy under Apple's or Google's terms, depending on the user's backup settings. Plank cannot see, control, or delete those backups.

## Not verified (needs real devices)

- That an iCloud backup actually contains `Documents/SQLite/plank.db` and a restore to a second device returns tasks, routines, and settings (including the WAL file case: a backup taken while the app is open).
- That a Google Auto Backup restore after reinstall returns the same on Android, and the effect on notifications (restored data does not restore scheduled OS notifications; reminders are re-created when the app next reconciles, which should be checked).
- Behavior with backup disabled in the OS settings.
