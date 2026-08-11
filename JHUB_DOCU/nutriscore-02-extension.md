# NutriScore — Chrome Extension (Manifest V3)

## Purpose

The extension is the in-store layer: it runs on supported Kenyan grocery sites, watches the user's cart (not the whole page), scores items, and surfaces results as a badge, popup, and dashboard.

## Core functions

- **Content script (`content.js`):** runs in the retailer page context; watches the page via a DOM scan / MutationObserver loop (needed because retailer sites render dynamically via JS); delegates site-specific detection to a retailer adapter.
- **Retailer adapter:** site-specific layer (Naivas/Carrefour) that detects products on the page, detects whether the current view is a cart page, extracts cart actions/events, and injects the score badge. Carrefour's cart container is `#entries-SLOTTED` (confirmed); Naivas's is still pending.
- **Scoping rule:** scanning and badging only run on items actually in the cart — not every product on the page (e.g. a "Best Sellers" carousel is correctly ignored).
- **Badge:** small grade badge (`.badge-a` through `.badge-e`), 32px rounded to match the popup's icon-button styling, anchored to the actual product row at the same spot as the existing colored status dot.
- **Background service worker (`background.js`):** the message hub — routes `CHECK_PRODUCT_SCORE`, `LOG_CART_EVENT`, `SIGN_IN`/`SIGN_OUT`, `GET_HEALTH_PROFILE`, and broadcasts `SHOPPING_LEDGER_UPDATED` so open tabs can react to new data.
- **Popup UI (`popup.html`):** shows store-support status, items scored on the current page, signed-in account, and a link into the dashboard.

## Tech / build notes

- Manifest V3.
- **Important:** the build actually loaded in Chrome is unpacked from `dist/`, not `extension/` — `dist/` is ahead (has OAuth + Carrefour support `extension/` lacks). All extension changes need to target `dist/`.
- Manifest V3's default CSP blocks inline scripts, which currently blocks automatic dashboard tab refresh on new ledger events; fix identified, not yet finalized/verified.
- Docker image for the dev environment: `docker pull robinwanyoa7/nutriscore-check:latest`.

## Open blockers

- Naivas cart selector not yet confirmed.
- Dashboard auto-reload blocked by MV3 CSP.

## UML — extension component structure

```mermaid
classDiagram
    class ContentScript {
      +observeDOM()
      +delegateToAdapter()
      +renderBadge()
    }
    class RetailerAdapter {
      <<interface>>
      +detectProducts()
      +isCartPage()
      +extractCartEvents()
      +injectBadge()
    }
    class CarrefourAdapter
    class NaivasAdapter

    class BackgroundWorker {
      +onMessage(type)
      +CHECK_PRODUCT_SCORE()
      +LOG_CART_EVENT()
      +SIGN_IN()
      +SIGN_OUT()
      +GET_HEALTH_PROFILE()
      +broadcast(SHOPPING_LEDGER_UPDATED)
    }
    class PopupUI {
      +requestPageStats()
      +requestHealthProfile()
    }

    RetailerAdapter <|.. CarrefourAdapter
    RetailerAdapter <|.. NaivasAdapter
    ContentScript --> RetailerAdapter : uses
    ContentScript --> BackgroundWorker : sends CHECK_PRODUCT_SCORE / LOG_CART_EVENT
    PopupUI --> BackgroundWorker : requests stats / profile
    BackgroundWorker --> PopupUI : SHOPPING_LEDGER_UPDATED
```

## UML — cart scan sequence

```mermaid
sequenceDiagram
    participant Page as Retailer Cart Page
    participant CS as Content Script
    participant RA as Retailer Adapter
    participant BG as Background Worker
    participant DB as NutriScoreDB (IndexedDB)

    Page->>CS: DOM mutation (cart updated)
    CS->>RA: isCartPage() / detectProducts()
    RA-->>CS: cart item list
    CS->>BG: CHECK_PRODUCT_SCORE(items)
    BG->>DB: read product_cache
    DB-->>BG: cached nutrition data (or miss)
    BG-->>CS: score + grade per item
    CS->>RA: injectBadge(grade)
    RA-->>Page: badge rendered on row
    CS->>BG: LOG_CART_EVENT(item, grade)
    BG->>DB: write shopping_ledger
    BG-->>BG: broadcast SHOPPING_LEDGER_UPDATED
```
