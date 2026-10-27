# Release checklist

Order is a suggestion. "Owner" items need the owner's accounts or decisions.

## A. Owner input (from plan.md "Owner input needed")

- [x] Support contact (5.3): `danielsilvajobs@gmail.com` is set in `shared/support.json` with `mailboxLive` true.
- [ ] Firebase project (5.4): create it; set repo variable `FIREBASE_PROJECT_ID` and secret `FIREBASE_SERVICE_ACCOUNT`; replace the id in `.firebaserc`.
- [ ] Open-Meteo attribution and terms (4.1/4.9): approve the attribution line, confirm caching and non-commercial terms on the live license page.
- [ ] Privacy policy legal review (5.2) for the release countries; remove the draft notice.
- [ ] Android verification: first emulator/device pass using `docs/device-test-checklist.md`.
- [ ] Real-device and usability work (3.9, 4.9, 6.10).

## B. Accounts and records

- [ ] Apple Developer Program membership; App Store Connect record for `to.plank.app`.
- [ ] Google Play Console developer account; app record for `to.plank.app`.
- [ ] Expo account and EAS project (`eas build:configure`).
- [ ] Confirm the name "Plank" is available in both stores.

## C. Site and URLs

- [ ] Site deployed (5.4, 5.6); privacy, contact, accessibility pages live at the final URLs.
- [ ] Replace every `[[PLACEHOLDER` in `docs/release/` with real values.

## D. Listing

- [ ] Final copy from [store-listing.md](store-listing.md) reviewed (no clinical claims).
- [ ] Screenshots captured per [screenshots.md](screenshots.md); feature graphic and icon uploaded.
- [ ] App Privacy and Data safety forms completed from [privacy-answers.md](privacy-answers.md), re-checked against the traffic capture (4.9).
- [ ] Content rating questionnaires; target audience; export compliance.

## E. Quality gates

- [ ] `cd app && npm run check` passes; `npm run test:e2e:ios` passes.
- [ ] Web checks pass.
- [ ] Remaining manual checks done: 3.9, 4.9, 6.4, 6.9, 6.13.
- [ ] Usability sessions (6.10) triaged (6.11); no open privacy, safety or accessibility blockers.
- [ ] Release build has no test mode: `plank://test-seed` redirects to Today.
- [ ] Final merged Android manifest and iOS Info.plist checked ([permissions.md](permissions.md)).

## F. Build and submit

- [ ] `eas build --profile preview`; smoke test on a real iPhone and an Android device.
- [ ] `eas build --profile production`; submit to TestFlight and Play internal testing.
- [ ] Review feedback, then submit for review with the "What's new" text.

## G. After release (6.14)

- [ ] Release the site and app; keep a visible way to report issues.
- [ ] Monitor only operational info (store crash stats); add no analytics.
