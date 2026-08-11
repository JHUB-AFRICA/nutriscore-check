# NutriScore — Database & Data Layer

## Purpose

Two separate data layers cover two separate needs: a **local, on-device store** for fast scanning/scoring and private analytics, and a **cloud store** for account identity and health profile sync across devices.

## Core functions

### Local — NutriScoreDB (IndexedDB, inside the extension)

- `product_cache` — cached nutrition data per product, so repeat scans don't need to recompute/refetch.
- `shopping_ledger` — the historical log of confirmed cart events (name, category, grade, nutrient fields per event); this is what the dashboard reads directly.
- `user_settings` — local copy of user preferences used by the extension at scan time.
- `dataset_metadata` — bookkeeping for the product dataset (versioning, last-updated, coverage).
- Fully on-device: not synced anywhere; the dashboard shows a "Delete all my data" control and an events-stored count.

### Cloud — Firestore (via the website)

- `users/{uid}/settings/health` — the canonical health profile (conditions, dietary preferences, allergies, age/gender/weight/height), protected by per-user security rules. Written by the website's health profile form; read by the extension (`GET_HEALTH_PROFILE`) to personalize scoring.
- Firebase project: `nutriscore-check`.

### Source product dataset (Kenya)

- Master list: 1,854 Carrefour products (42 broken names repaired).
- Sorted into 566 staple items — auto-filled with standard regional nutrition facts, ready for health-score testing — and 1,288 packaged items, held pending branded-label lookup.
- Open Food Facts has limited Kenya coverage, so this locally-cleaned dataset supplements it; a further supplementary verified local database is still identified as a need.

## UML — data layer structure

```mermaid
classDiagram
    class NutriScoreDB {
      <<IndexedDB>>
      +product_cache
      +shopping_ledger
      +user_settings
      +dataset_metadata
    }
    class Firestore {
      <<cloud>>
      +users/uid/settings/health
    }
    class ProductDataset {
      +master_list (1854 items)
      +staples (566, auto-filled)
      +packaged (1288, pending lookup)
    }

    BackgroundWorker --> NutriScoreDB : read/write product_cache, shopping_ledger
    Dashboard --> NutriScoreDB : read shopping_ledger
    Website --> Firestore : read/write health profile
    BackgroundWorker --> Firestore : GET_HEALTH_PROFILE (read-only)
    ProductDataset --> NutriScoreDB : seeds product_cache
```

## UML — where each store is written vs. read

```mermaid
flowchart LR
    subgraph Write
      CS[Content Script] -->|LOG_CART_EVENT| BG[Background Worker]
      WebForm[Website Health Form] -->|save| Firestore
    end
    BG -->|writes| Ledger[(shopping_ledger)]
    BG -->|writes/reads| Cache[(product_cache)]

    subgraph Read
      Dash[Dashboard] -->|reads directly| Ledger
      Popup[Popup UI] -->|via background| Cache
      BG -->|GET_HEALTH_PROFILE| Firestore
    end
```
