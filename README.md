# NutriScore Checkout Tool (Kenya)

A Chrome extension (Manifest V3, v1.1.0) that surfaces real-time NutriScore grades — with disease-specific dietary flags — while shoppers check out on Kenyan grocery retailer sites, paired with a companion web app.

## Overview

This project consists of two connected components:

- **Browser Extension** — "NutriScore Checkout Tool (Kenya)", built on Manifest V3, grades cart items A–E and flags disease-specific dietary concerns (diabetes, hypertension, allergies, and more) while checking out on **Naivas** and **Carrefour Kenya** online stores.
- **Website** — [nutriscore-check.vercel.app](https://nutriscore-check.vercel.app), which works alongside the extension and publishes the [Free & Premium plan breakdown](https://nutriscore-check.vercel.app/#premium).

Each component signs in independently (its own Google OAuth / picker flow) and reads the shopper's saved health profile (conditions, allergies, preferences) directly from storage — rather than mirroring a single signed-in session across the two — so the extension can guide the customer before checkout even if the website session differs.

The extension and website are still linked via:
- **Google OAuth** (shared client ID) for authentication on each side
- **Extension messaging** via `externally_connectable`, allowing the website to communicate directly with the extension

## Extension layout

The extension's real, running source lives directly under `extension/` (`background.js`, `content.js`, `db.js`, `popup.html`, `dashboard.html`, plus `adapters/`, `engine/`, `data/`, and `icons/`):

- **Popup** — shows the graded badge for the current page/cart and a "Reload" control to refresh stored data.
- **Dashboard** (`dashboard.html`, the extension's options page) — a hand-built **Shopping Analytics** view reading the `shopping_ledger` IndexedDB store, with its own reload action for refreshing analytics.
- **Adapters** — per-retailer scrapers/content scripts (currently `naivas.js`, `carrefour.js`) that run on each store's pages.

`src/App.tsx` is a separate in-repo **Simulation Suite** dev tool and is not the code wired up as the extension's options page — don't confuse it with `dashboard.html`.

## Free & Premium

The core grading experience is free, permanently, on both the extension and website. Ads/tracking are never on the extension; the website may show minimal ads on the free tier, with premium removing them.

| | Free | Premium *(coming soon)* |
|---|---|---|
| A–E grade badges & nutrient breakdown popup | ✅ | ✅ |
| Health profile storage (conditions, allergies, preferences) | ✅ | ✅ |
| Naivas support | ✅ | ✅ |
| Personalized, disease-specific warnings | — | ✅ |
| Trends dashboard (basket history & grade-distribution charts) | — | ✅ |
| Multi-retailer support (Carrefour, Quickmart, cross-store comparison) | — | ✅ |
| Smart alternatives (better-graded swaps) | — | ✅ |

Monetization is planned as subscription-based; billing isn't wired up yet. Fast-food retailer support is a planned expansion, not yet started.

## Status

- Extension is not yet published to the Chrome Web Store; publishing prep (store zip/listing, then a privacy policy page) is next.
- Website/dashboard is deployed via Docker.

## Repository

- Repo name: `nutriscore-check`
- Hosted across two collaborating GitHub accounts: `robinwanyoa7` and `JHUB-AFRICA`

## License

_Not yet specified._
____
