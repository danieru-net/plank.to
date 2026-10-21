# Location privacy design (task 4.2)

Decided: 2026-10-19. Provider choice and its terms are in [weather-provider.md](weather-provider.md). This is a design, not legal advice; the privacy policy (task 5.2) needs jurisdiction review.

## Decisions

- The app calls Open-Meteo directly. There is no Plank backend or proxy, so Plank never sees or stores a user's location.
- Plank stays non-commercial (no ads, subscriptions, or in-app purchases). If that changes, revisit the provider.
- Weather is off by default. No weather or geocoding request is made until the user turns it on.
- Two ways to set a location, plus off: device location (coarse), manual city/postcode search, or no weather.

## Location sources

### Device location (coarse)

- Request foreground ("while using") permission only after the user enables location-based weather, never at install or first launch. Request the approximate/coarse level where the OS offers it (Android `ACCESS_COARSE_LOCATION`; iOS reduced accuracy is acceptable). Never request background location.
- Take one position fix when needed (on enabling, and on refresh if the stored one is old). Do not track continuously or watch position changes.
- Round immediately, before storing or sending: latitude and longitude to 2 decimal places (about 1 km). Discard the precise fix; it is never stored or logged.
- If permission is denied or blocked, show the manual search option. Do not re-prompt repeatedly; offer "Open device settings" only when the user asks.

### Manual city/postcode search

- Use the Open-Meteo geocoding API (`geocoding-api.open-meteo.com/v1/search`), called directly from the app, on user action (submit button, or typing with a debounce of at least 500 ms and at least 3 characters).
- Sent: the search text only, plus `count`, `language` (the app's UI language), and `format=json`.
- The user picks a result; store its name, region/country, and coordinates rounded to 2 decimals. Show the chosen place name so the user knows what is used.
- A search string can be a postcode or place name; it is the user's own input and is not stored after selection.

## Exactly what is sent

Forecast request (`api.open-meteo.com/v1/forecast`):

| Field | Value |
|---|---|
| `latitude`, `longitude` | Rounded to 2 decimals |
| `current` / `hourly` / `daily` | Weather variable names only (for example temperature, apparent temperature, precipitation, weather code, wind) |
| `timezone` | `auto` (derived by the provider from the coordinates; do not send the device timezone name) |
| `forecast_days`, units | Small integers or unit choices |

Geocoding request: the search text, `count`, `language`, `format`.

Never sent: task, routine, note, or reminder content; clothing preferences; dismissed suggestions; settings; any user, device, or install identifier; precise coordinates; the date or time of tasks.

Not avoidable: the provider sees the device's IP address and the request time, as with any HTTPS request. Say so in the disclosure; do not claim the provider learns nothing.

## What is stored locally

In the existing `weather_location_settings` row (see [app/src/db/schema.ts](../app/src/db/schema.ts)) and cache:

- Mode: off, device location, or manual.
- Rounded coordinates (2 decimals) and, for manual, the place label.
- Last forecast response and its fetch time (for stale-data and offline states; see Cache policy).

Not stored: the precise fix, search history, previous locations, or raw request logs. Turning weather off, switching mode, or "Remove location" deletes the coordinates, label, and cached forecast. "Reset" in Settings does the same. The data lives in the app's local database, so it may be included in OS device backups (see task 6.13).

## Request headers and identifiers to avoid

- No API key, account, or token (none is needed).
- No custom headers carrying an app, user, or install identifier. Do not generate or send a device ID, advertising ID, or analytics ID.
- Do not add a custom User-Agent with contact or version details. Use the platform default HTTP client User-Agent; a unique per-install value would be an identifier.
- No cookies: do not enable or persist cookie storage for these requests.
- No referrer or origin (not applicable to native fetch; do not add one).
- Use HTTPS only. No third-party SDKs, analytics, or crash reporters that would send the location elsewhere.
- Do not log coordinates or search text to the console, files, or crash reports.

## Cache policy

- Keep only the most recent forecast for the one current location, on device.
- Refresh no more often than every 30 minutes while the app is open and Today is visible; do not fetch in the background and do not poll when the app is inactive. Also refresh when the location changes.
- A cached forecast is shown as stale with its age once older than 3 hours, and is not shown as current beyond the end of the forecast data. Discard the cache at 24 hours.
- Provider limits (600/min, 5,000/hour, 10,000/day per IP) are far above this use. On HTTP 429 or errors, back off and show the cached forecast as stale; do not retry in a loop.
- Open-Meteo's caching terms could not be read (see weather-provider.md). This short on-device cache is expected to be acceptable; confirm before release (task 4.9).
- No server-side cache exists since there is no proxy.

## What to tell users

Place a short disclosure before the permission prompt and in Settings, and repeat it in the privacy policy (task 5.2) and help pages (5.1). Suggested wording:

> **Weather is optional and off.** If you turn it on, Plank asks Open-Meteo for the forecast near you. It sends only an approximate location (rounded to about 1 km) and which weather details to return. It never sends your tasks, routines, or settings. Open-Meteo can see your device's IP address, like any website you visit. Plank does not run its own server and cannot see your location. You can search for a city or postcode instead of sharing your device location, or turn weather off at any time, which deletes the saved location and forecast from this device.

Also state in the privacy policy: the provider's name and link, the attribution line ("Weather data by Open-Meteo.com", wording to confirm), what is cached and for how long, that the saved location may be in device backups, and that Open-Meteo's own terms and privacy policy apply to its handling of requests.

Pre-prompt screen for device location: explain why (nearby forecast), that it is approximate, that it is only checked while the app is open, and give "Search for a place instead" and "Not now" with equal weight.

## Verification (for task 4.9)

- With weather off, no request to Open-Meteo is made (assert in tests with a stubbed network).
- Captured request URLs contain only the fields above, with coordinates at 2 decimals.
- No custom identifying headers or cookies are present.
- Denied or blocked location permission leads to the manual path without repeated prompts.
- Switching mode or turning weather off clears stored location and cache.
