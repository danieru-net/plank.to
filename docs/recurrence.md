# Recurrence semantics (task 3.1)

Implemented as pure functions in [app/src/features/routines/recurrence.ts](../app/src/features/routines/recurrence.ts), tested in `recurrence.test.ts`. Storage is defined in [app/src/db/schema.ts](../app/src/db/schema.ts).

## Model

- A routine has a local wall-clock time (`HH:MM`), a weekday bitmask (bit 0 = Sunday ... bit 6 = Saturday; 127 = every day; 0 is invalid), a `start_date`, and a `paused` flag.
- Occurrences are derived from the routine on demand and are not stored. Only exceptions are stored, in `occurrence_overrides`, keyed by routine ID and the generated `occurrence_date`. That pair is the stable identity of an occurrence (and the basis for notification IDs in 3.6).
- Weekdays are computed from the calendar date, never from the device timezone.

## Rules

- **Start date:** nothing is generated before `start_date`; past days are never backfilled when a routine is created.
- **Paused:** a paused routine generates no occurrences, including ones previously moved. Resuming restores the schedule from the current day on; days missed while paused are not created.
- **Skipped or dismissed dates:** dismissing one occurrence stores an override with status `dismissed`. The routine and all other dates are unchanged. Completed works the same way (status `completed`). Both can be undone by setting the status back to `pending`.
- **Overrides:** a null override field means "use the routine's value". An override can change title, notes, reminder, or move the occurrence (`moved_date`/`moved_time`). A moved occurrence appears on its new date only, keeps its original `occurrence_date` identity, and may move at most 366 days.
- **Editing the series:** later series edits (time, weekdays, title) apply to every occurrence without an override for that field. Overrides are kept. If a weekday change means the routine no longer generates an overridden date, that override is ignored but not deleted, so it comes back if the weekday is re-added.
- **Deleting a routine** deletes its overrides (foreign key cascade).

## Timezones

Times are stored as wall-clock text with no zone. If the device timezone changes (travel), "7:00 PM" means 7:00 PM in the new zone. Nothing is migrated. Notifications are scheduled from local wall-clock values, so reconciliation (3.7) must re-run on startup and when the timezone changes, to recompute absolute fire times.

## Daylight saving

Dates advance by calendar arithmetic, so a day is never skipped or repeated at a transition. Converting a date and time to an instant (`toLocalDate`, used only when scheduling) follows the JavaScript `Date` local-time rules:

- **Spring forward** (time inside the skipped hour, such as 02:30): fires after the gap, at the first valid time (03:30 for a one-hour gap).
- **Fall back** (time that happens twice): fires at the first (earlier) occurrence only; it does not fire twice.

These behaviors are asserted in unit tests under several timezones (`app/src/features/routines/timezone.test.ts`); how the OS delivers the notifications is checked on devices (docs/device-test-checklist.md).

## Out of scope here

Interval repeats (every 2 weeks), monthly repeats, end dates, and time-of-day ranges are not supported in the MVP.
