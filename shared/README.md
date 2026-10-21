# Shared config

Values used by both the app ([app/](../app/)) and the website ([web/](../web/)). Keep each value in one place here instead of copying it.

- [support.json](support.json): the support and feedback address.
  - `feedbackEmail`: the address in-app feedback is sent to and the website shows on its contact and privacy pages.
  - `mailboxLive`: set to `true` only once the mailbox exists and someone reads it. While it is `false`, the website labels the address as not yet working.

The app reads these through [app/src/features/feedback/support.ts](../app/src/features/feedback/support.ts) ([app/metro.config.js](../app/metro.config.js) lets Metro bundle files from this folder). The website reads them through [web/src/config.ts](../web/src/config.ts).
