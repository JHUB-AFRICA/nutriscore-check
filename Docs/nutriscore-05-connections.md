# NutriScore — How the Foundations Connect

## Purpose

This ties [[Website]], [[Extension]], [[Database]], and [[Dashboard]] together into one system view: where the boundary between "cloud/account" and "local/on-device" sits, and how a single cart scan turns into a dashboard update.

## In short

- The **website** owns identity (Firebase Auth) and the canonical **health profile** (Firestore).
- The **extension** owns everything that happens in-browser while shopping: detecting cart items, scoring them, and logging events.
- The **database layer** splits in two: Firestore (cloud, health profile only) and NutriScoreDB/IndexedDB (local, product cache + shopping ledger + settings).
- The **dashboard** is a read-heavy consumer: it reads the local ledger directly and reads the health profile (via the background worker) to personalize its alerts.

## UML — full system component diagram

```mermaid
flowchart TB
    subgraph Cloud["Cloud (Vercel + Firebase)"]
      Website["Website<br/>(Landing, Auth, Health Profile Form)"]
      FirebaseAuth["Firebase Auth"]
      Firestore["Firestore<br/>users/uid/settings/health"]
    end

    subgraph Browser["Chrome Extension"]
      Content["Content Script<br/>+ Retailer Adapter"]
      Background["Background Service Worker<br/>(message hub)"]
      Popup["Popup UI"]
      Dashboard["Dashboard<br/>(React bundle)"]
      NutriDB[("NutriScoreDB<br/>IndexedDB")]
    end

    RetailerSite["Retailer Website<br/>(Carrefour / Naivas)"]

    Website <--> FirebaseAuth
    Website <--> Firestore
    Background <-->|AUTH_SYNC, SIGN_IN| FirebaseAuth
    Background -->|GET_HEALTH_PROFILE| Firestore

    RetailerSite -->|DOM / cart events| Content
    Content -->|CHECK_PRODUCT_SCORE, LOG_CART_EVENT| Background
    Background <--> NutriDB
    Background -->|SHOPPING_LEDGER_UPDATED| Popup
    Background -->|SHOPPING_LEDGER_UPDATED| Dashboard
    Popup -->|request stats/profile| Background
    Dashboard -->|reads directly| NutriDB
```

## UML — end-to-end sequence: shop → score → analyze

```mermaid
sequenceDiagram
    actor U as User
    participant Web as Website
    participant FS as Firestore
    participant Site as Retailer Site
    participant CS as Content Script
    participant BG as Background Worker
    participant DB as NutriScoreDB
    participant Dash as Dashboard

    U->>Web: Sign in + save health profile
    Web->>FS: write users/{uid}/settings/health

    U->>Site: Add items to cart
    Site->>CS: DOM mutation
    CS->>BG: CHECK_PRODUCT_SCORE(cart items)
    BG->>FS: GET_HEALTH_PROFILE (uid)
    FS-->>BG: conditions + preferences
    BG->>DB: read product_cache
    BG-->>CS: grade per item (personalized)
    CS-->>Site: render badge

    BG->>DB: write shopping_ledger event
    BG-->>Dash: broadcast SHOPPING_LEDGER_UPDATED
    U->>Dash: Open dashboard
    Dash->>DB: read shopping_ledger
    Dash-->>U: Basket Quality, Nutrient Trends, Category Insights, Health Alerts
```

## Boundary summary

| Layer | Owns | Storage | Synced? |
|---|---|---|---|
| Website | Identity, health profile UI | Firestore | Yes (cloud) |
| Extension (content + background) | Cart detection, scoring, message routing | — (in-memory + writes to NutriScoreDB) | No |
| Database | Health profile (Firestore) / product cache + ledger + settings (IndexedDB) | Split cloud/local | Health profile only |
| Dashboard | Analytics presentation | Reads NutriScoreDB directly | No — local only, user-deletable |
