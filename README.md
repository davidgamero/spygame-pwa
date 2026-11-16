# Spy Pass · spygame-pwa

A static, offline-capable pass-the-phone party game for 3+ players.

**Play:** https://davidgamero.github.io/spygame-pwa/

## Play

Each player secretly adds one name. Deal the cards and pass the phone in order.
Everyone sees one randomly selected name except one randomly selected spy.
Cards hide after **3.5 seconds**; a **0.7-second hand-off lock** prevents accidental
reveals. Discuss, give clues, then reveal the answer or deal again.

Names are masked in setup, never sent to a server, and never written to browser
storage. Reloading starts a fresh game. Switching apps while a card is revealed
hides it and advances to the next player. Duplicate names are allowed.

## Install / offline

Tap **Install** in the top banner to open the dismissible install popup. It never
opens automatically on launch or when the browser reports installation is available.
It uses the browser install prompt when supported; on iPhone/iPad it explains
Safari → Share → Add to Home Screen. Installed apps hide the Install button.
The service worker caches the app, fonts, and icons
for offline play after the first successful load. It never caches game state.

## Reference

Based on the supplied **Spy Pass** game/design specification and the reference
artifact: https://claude.ai/artifact/FnMSqCQnDM93h4yuodmbAT . The artifact’s source
could not be retrieved through its verification screen during implementation;
this is a recreation from that specification, not a verified byte-for-byte export.

Big Shoulders Display and Hanken Grotesk are self-hosted Google Fonts. Their
SIL Open Font Licenses are included in `fonts/`. There are no runtime CDNs,
analytics, accounts, API keys, or backend services.

## Develop and test

```sh
npm ci
npm start                 # http://127.0.0.1:4173/spygame-pwa/
npm test                 # deterministic game/timer/privacy tests
npx playwright install chromium
npm run test:ui          # browser flows and real offline reloads
```

The app itself has no runtime dependencies or build step. GitHub Pages serves
the repository’s `main` branch at `/`; `.nojekyll` keeps the static files intact.
All URLs and the PWA scope are relative so the project works at `/spygame-pwa/`.

When releasing changed assets, increment the cache version and asset query
versions in `sw.js`, `index.html`, and the `app.js` import. Online navigation
checks for the current page; offline navigation uses the cached release. New
workers activate promptly. An empty setup screen may reload automatically;
entered names and active rounds are preserved until the player chooses to reload.
