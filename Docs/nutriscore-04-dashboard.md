# NutriScore — Dashboard

## Purpose

The dashboard is the "so what" layer — it turns individual scanned items into a cumulative picture of a user's shopping health over time, and personalizes flags against their saved health profile.

## Core functions

- **Data source:** reads the `shopping_ledger` store in `NutriScoreDB` directly (not through the background worker), and re-renders when it receives a `SHOPPING_LEDGER_UPDATED` broadcast — auto-refresh is currently blocked by Manifest V3's CSP restriction on inline scripts (fix identified, not yet finalized/verified), so a manual reload is sometimes still needed.
- **Basket Quality** — donut chart of scanned items by grade (A–E), with a total-item count at the center.
- **Nutrient Trends** — line chart of average sodium (mg), sugar (g), and saturated fat (g) across scanned items, filterable by Today / This Week / This Month / This Year / All Time.
- **Category Insights** — bar chart of average negative points per food category (higher = worse), e.g. Red Meat vs. General Food.
- **Health Alerts & Controls** — per-condition toggles with counts of how many scanned items triggered each flag, driven by the health profile fetched from Firestore.
- **Privacy control:** "Delete all my data" clears the local ledger; an events-stored count is shown in the header.
- Built as a compiled React/Vite bundle (`dashboard.html` + JS bundle), confirmed working end-to-end on Carrefour test data.

## UML — dashboard component structure

```mermaid
classDiagram
    class Dashboard {
      +period: Today|Week|Month|Year|AllTime
      +loadLedger()
      +onLedgerUpdated()
    }
    class BasketQualityChart {
      +render(gradeCounts)
    }
    class NutrientTrendsChart {
      +render(sodium, sugar, satFat)
    }
    class CategoryInsightsChart {
      +render(avgNegativePointsByCategory)
    }
    class HealthAlertsPanel {
      +render(triggerCountsByCondition)
      +toggle(condition)
    }

    Dashboard --> BasketQualityChart
    Dashboard --> NutrientTrendsChart
    Dashboard --> CategoryInsightsChart
    Dashboard --> HealthAlertsPanel
    Dashboard --> NutriScoreDB : reads shopping_ledger
    HealthAlertsPanel --> Firestore : reads health profile (via background worker)
```

## UML — dashboard refresh sequence

```mermaid
sequenceDiagram
    participant BG as Background Worker
    participant DB as NutriScoreDB
    participant Dash as Dashboard Tab

    BG->>DB: write shopping_ledger (new cart event)
    BG-->>Dash: broadcast SHOPPING_LEDGER_UPDATED
    alt CSP allows script
        Dash->>DB: re-read shopping_ledger
        DB-->>Dash: updated events
        Dash-->>Dash: re-render charts
    else CSP blocks inline script (current bug)
        Dash-->>Dash: stale until manual reload
    end
```
