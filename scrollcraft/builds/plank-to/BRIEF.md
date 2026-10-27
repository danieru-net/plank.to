# plank.to homepage brief

Partly interviewed (motion, aesthetic, peak, screenshots answered by the owner on 2026-10-27).
The remaining topics are authored from the request, the repo (plan.md MVP decisions) and the app itself, and are marked as such.

## The eight topics

1. **Vibe** (owner: "Playful & bright"; authored words): bright, friendly, orderly, calm underneath. References: a well-made picture schedule on a fridge; the app's own Playful theme.
2. **Journey** (owner request: "use screenshots from the mobile application explaining how it works, create mock links to App Store and Google Play"): see the app, recognise the jumble of a day, watch the app put it in order, learn routines, choose a look, get the app.
3. **Energy** (owner: "Cinematic"; authored curve): lively hero, quieter recognition, loudest at the peak, steady through routines, playful in looks, settled close.
4. **Feeling and the one moment** (owner: "The day assembles"): a phone holds still while scroll walks pieces of the Today screen into place.
5. **What no other site does** (authored): the real app screenshot assembles itself from its own pieces, and one control on the page regrades the whole site into the app's themes.
6. **Range** (owner): Playful & bright. Taste floor holds: Atkinson Hyperlegible body text (the app's own face), 4.5:1 body contrast, reduced motion keeps everything readable.
7. **World** (authored): one continuous page with drifting grounds (filmic), no hard chapter cuts.
8. **Assets** (owner approved capture): real screenshots from the iPhone simulator, seeded sample data, captured 2026-10-27. No generated imagery.

## Feeling curve

| Act | Feeling | Cause on screen |
|---|---|---|
| Hero | Welcome, curiosity | Layered phone with floating pieces of a real day, drifting apart as you scroll |
| Recognition | "That's me" | Three short lines about a day arriving all at once, landing one by one |
| Peak: the day assembles | Relief, order | Pieces of Today fly into the phone in time order, notes explain each piece |
| Routines | Trust | Routine screens wipe into view; copy about changing one day without breaking the series |
| Looks | Play, agency | Rail of themed phones; a control that regrades the whole page |
| Close | Settled, ready | Calm promises (no account, no streaks), store links, held on a dark ground |

## The peak

"It's the site where the app's Today screen builds itself while you scroll." Lives in act 3, largest span (4.2 viewport heights).

## Tell-someone sentence

It's the site where you watch a messy day snap into a calm, ordered list.

## Authored silence

None. The recognition act is short and quiet on purpose (flow, no pin) so the peak lands harder.

## Constraints from the repo

- No invented numbers, no clinical claims, no streak or pressure language, no em dashes.
- Store links are mocks until launch (config in web/src/config.ts).
- The site must pass web/scripts/check-independence.mjs: no fetch, no storage APIs. The scrollcraft engine uses fetch, so the page uses its own small scroll driver instead.
