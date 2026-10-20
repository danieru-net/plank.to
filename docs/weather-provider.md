# Weather provider evaluation (task 4.1)

Retrieved: 2026-10-19. Terms were read from the provider pages listed below (summarised by a fetch tool, not read in full by a person) and change often. Re-check them before release (see task 4.9). This is not legal advice.

## Requirements from plan.md

- Weather is optional and off by default; no accounts, analytics, ads, or cloud sync.
- Only coordinates (coarse is fine) go to the provider. No task, routine, or profile data.
- Needs current conditions plus a short forecast (hours to a few days) for clothing suggestions.
- Attribution must be shown on Today; caching only as terms allow.
- Prefer no secret in the app binary (anything embedded in a mobile app can be extracted).

## Comparison

| | Open-Meteo (free) | MET Norway Locationforecast | NWS (api.weather.gov) | OpenWeatherMap (free) | WeatherAPI.com (free) |
|---|---|---|---|---|---|
| Cost | Free | Free | Free | Free | Free |
| Commercial use | **No. Non-commercial only** (no ads, no subscriptions); paid plans for commercial | Not restricted on the pages read; data is CC BY 4.0 / NLOD 2.0 | "Open data, free to use for any purpose" | Page says allowed on all self-service plans | Allowed |
| Rate limits | 600/min, 5,000/hour, 10,000/day, 300,000/month, per IP | 20 requests/s per application in total, above that needs an agreement; 429 on throttling | Exists, values not published; retry after about 5 s | 60/min, 1,000,000/month (Current, 5-day/3-hour forecast, geocoding) | 100,000/month |
| Coverage | Global (global models plus regional ones) | Global (from memory; not re-verified on the pages read) | United States and territories only (inferred from the NWS source; the page does not say) | Global | Global |
| Forecast | Hourly and daily, 7 days by default, up to 16 | Hourly then 6-hourly, about 9 days (from memory; unverified) | 7 days, 12-hour and hourly | 5 days in 3-hour steps | 3 days |
| API key | None for free use | None; a identifying User-Agent with contact is required | None now; User-Agent required, key "in the future" | Key required | Key required |
| Attribution | Free users accept CC BY 4.0; exact wording not found on the pages read | Required: credit MET Norway ("Data from MET Norway"), link to the license, state changes | Not required | Required, visible in the app: "Weather data (c) OpenWeather" | Link or credit to WeatherAPI.com required for free users |
| Caching rules | Not addressed on the pages read | Must honour `Expires` / `If-Modified-Since`; do not re-request before expiry; truncate coordinates to 4 decimals (5+ returns 403) | Cache-friendly; may cache grid lookup, re-check `/points` periodically | Not addressed on the pages read | Current conditions up to 60 min, forecasts up to 24 h; more is a breach |
| Mobile direct call | Allowed in practice (no key, limit is per IP, so per user device) | **Discouraged**: terms say mobile apps should generally use a caching proxy; shared User-Agent; do not fetch while app is inactive | Allowed, but exact limits unknown | Key would ship in the binary and be extractable | Terms forbid keys in client code without access controls; one key per app |

## Source URLs

- Open-Meteo terms: https://open-meteo.com/en/terms
- Open-Meteo pricing: https://open-meteo.com/en/pricing
- Open-Meteo docs: https://open-meteo.com/en/docs (license page https://open-meteo.com/en/license returned no body text)
- MET Norway terms: https://api.met.no/doc/TermsOfService
- MET Norway license: https://api.met.no/doc/License
- NWS API: https://www.weather.gov/documentation/services-web-api
- OpenWeatherMap pricing: https://openweathermap.org/price and https://openweathermap.org/full-price
- WeatherAPI pricing: https://www.weatherapi.com/pricing.aspx
- WeatherAPI terms: https://www.weatherapi.com/terms.aspx

## Assessment

- **NWS**: US only; the app is not limited to the US. Rejected as the main provider (could be a US-only supplement, not worth the complexity).
- **WeatherAPI.com**: 3-day forecast, a key that would ship in the app, and a one-key-per-app term that conflicts with client-side use. A proxy would fix the key but adds a backend.
- **OpenWeatherMap**: needs a key in the app or a proxy, 3-hour steps only, forecast limited to 5 days. Workable but no advantage.
- **MET Norway**: best terms for commercial use and good data, but its own terms steer mobile apps to a caching proxy and a shared User-Agent, so every install would share one application quota and identity. It needs a small backend (Firebase Functions or Cloudflare Worker), which plan.md and task 4.2 treat as a last resort.
- **Open-Meteo**: no key, global, hourly and daily, generous limits per device IP, simple JSON, so the app can call it directly with only coordinates. The only blocker is the non-commercial condition.

## Decision (confirmed by the owner, see "Owner decisions" below)

**Use Open-Meteo's free API, called directly from the app, provided Plank stays non-commercial** (no ads, no paid tier or subscription, as plan.md already states for ads). Request only `latitude`, `longitude`, and weather fields; no key to protect. Behind a small provider adapter (task 4.4) so it can be swapped.

Terms to honour:
- Non-commercial use only. If the app is ever sold, has in-app purchases, subscriptions, or ads, move to a paid Open-Meteo plan (price shown only at checkout) or switch provider.
- Accept CC BY 4.0: show "Weather data by Open-Meteo.com" with a link on Today (task 4.5) and in the privacy policy. Confirm exact wording at https://open-meteo.com/en/license before release; it could not be read here.
- Stay within the limits (600/min, 5,000/hour, 10,000/day per IP). A forecast refresh at most every 30 to 60 minutes per device is far below that. Keep coordinates coarse (about 2 decimals).
- No caching rule was found, so a short on-device cache of the last forecast (needed for stale-data and offline states, task 4.5) is expected to be fine; confirm in the license page.
- The free API has no uptime guarantee and Open-Meteo may block abusive IPs without notice, so the UI must degrade gracefully.

Fallback if the owner wants commercial use without paying: MET Norway behind a small caching proxy (CC BY 4.0 credit, User-Agent with contact, 4-decimal coordinates, honour `Expires`). Second fallback: OpenWeatherMap with ODbL attribution and a key held by a proxy.

## Owner decisions (2026-10-19)

1. **Open-Meteo is the provider, called directly from the app.** No backend proxy.
2. **Plank stays non-commercial:** free to download, no ads, no subscription, no in-app purchases. If this ever changes, Open-Meteo free can no longer be used; move to a paid Open-Meteo plan or MET Norway with a proxy. A one-time paid download remains a grey area; ask Open-Meteo in writing before ever doing that.
3. Location handling is set in [location-privacy.md](location-privacy.md) (task 4.2): coarse coordinates (2 decimals), manual search via Open-Meteo geocoding, no identifying headers, short on-device cache.

Still open: approve the exact attribution line ("Weather data by Open-Meteo.com", linked) and its placement on Today once the license wording is confirmed.

## Not verified

- Open-Meteo's license page returned no content, so attribution wording and any caching or storage terms are unconfirmed.
- MET Norway global coverage and forecast length are from memory. Its commercial-use and storage terms point to a separate Licensing and Crediting Policy that was not read.
- NWS rate limits are unpublished; US-only coverage is inferred.
- OpenWeatherMap and WeatherAPI terms pages were only partly read (WeatherAPI's disclaimer wording for end users was not checked).
- Nothing was called live; no real request or response was tested.
