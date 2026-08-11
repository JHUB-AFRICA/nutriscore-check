# NUT-04 — Nutri-Score Checkout Tool
## API Reference — Internal Extension Message Contract

> **Document Owner:** Kibet — Project Lead, NUT-04
> **Status:** In Review — Consolidated against evidence-linked requirements
> **Related Docs:** [PRD](./01_PRD_NUT-04.md) · [System Architecture](./02_System_Architecture_NUT-04.md) · [Engineering Runbook](./04_Engineering_Runbook_NUT-04.md)

---

## Change Log

| Version | Date | Author | Summary of Changes |
|---|---|---|---|
| 0.1 | — | — | Initial OpenAPI skeleton created |
| 1.0 | 2026-08-08 | Claude (doc pass) | Rewritten to document the real internal message-passing contract |
| 1.1 | 2026-08-10 | Claude (consolidation pass) | Replaced illustrative `DiseaseWarning` threshold examples with the actual verified DR-001–DR-006 values from `engine/disease-engine.js`; documented the confirmed FR-011/FR-012 divergence (independent single-nutrient warnings vs. the spec's combined AND-condition warnings); replaced the placeholder AI-003 disclaimer text with the verbatim shipped string; noted the FR-002 architectural pivot (no Open Food Facts call — see Architecture doc ADR-005) |

---

## A note on scope

This system has no HTTP backend. Every "endpoint" is a `chrome.runtime.sendMessage` / `chrome.runtime.onMessage` action between a content script and the background service worker (plus one `onMessageExternal` action reserved for a future companion website). It is documented in OpenAPI shape for structural clarity only — `servers` and `securitySchemes` are intentionally empty, since neither concept has a real analogue here.

**Also note:** the requirements specification (`NutriScore_Requirements_v2_Evidence_Linked.md`, FR-002) describes an architecture where the background worker calls the Open Food Facts REST API and falls back to a local database. The shipped build contains no such call anywhere — every lookup below resolves entirely against the bundled local dataset. See the System Architecture document, ADR-005, for the reasoning and status of this divergence. No OFacts-related message action is documented below because none exists in the source.

---

```yaml
openapi: 3.1.0

info:
  title: NUT-04 NutriScore Internal Extension Message API
  description: >
    Documents the chrome.runtime.sendMessage / onMessage contract between
    NUT-04's content scripts and its background service worker. There is no
    network transport and no live third-party nutrition API call (see the
    System Architecture document's ADR-005).
  version: "1.1.0"
  contact:
    name: Kibet — Project Lead, NUT-04

servers: []
# No servers exist. All "calls" execute in-process via chrome.runtime.sendMessage.

tags:
  - name: Scoring
    description: Product scoring / classification / disease-flag / alternatives lookup
  - name: Cart
    description: Shopping-ledger cart lifecycle events
  - name: Sync
    description: Optional cross-device Firestore sync (currently unreachable — see Code Review companion doc, Issue #4)

components:
  securitySchemes: {}
  # Chrome scopes chrome.runtime messages to the extension's own origin
  # automatically. AUTH_SYNC is intended to be gated by Firebase
  # Authentication, but manifest.json does not declare externally_connectable,
  # so no external caller can reach it today.

  schemas:

    ProductScorePayload:
      type: object
      required: [product_name]
      properties:
        product_name: { type: string }
        name_hash: { type: [string, "null"] }
        retailer_product_id: { type: [string, "null"] }
        url: { type: [string, "null"] }
        price: { type: [number, "null"], description: "Not currently sent by content.js — required to fix the Alternatives Engine's price filter (see Code Review Issue #2)" }

    CartActionPayload:
      type: object
      required: [retailer, productId, product_name]
      properties:
        retailer: { type: string, enum: [NAIVAS, CARREFOUR] }
        productId: { type: string }
        product_name: { type: string }
        priceSnapshot: { type: number }
        quantity: { type: integer, default: 1 }
        url: { type: [string, "null"] }

    CartSyncPayload:
      type: object
      required: [retailer, items]
      properties:
        retailer: { type: string, enum: [NAIVAS, CARREFOUR] }
        items:
          type: array
          items: { $ref: "#/components/schemas/CartActionPayload" }

    RemoveCartItemPayload:
      type: object
      required: [retailer, productId]
      properties:
        retailer: { type: string, enum: [NAIVAS, CARREFOUR] }
        productId: { type: string }

    NutrientBreakdown:
      type: object
      properties:
        energy_kj: { type: number }
        fat_g: { type: number }
        sat_fat_g: { type: number }
        carbs_g: { type: number }
        sugars_g: { type: number }
        fibre_g: { type: number }
        protein_g: { type: number }
        sodium_mg: { type: number }
        # ⚠ No potassium field exists on the wire — DR-005 (kidney/potassium)
        # can never fire; the source object also has no PotassiumMG field
        # (see System Architecture §6.1). Cross-reference: PRD §4, FR-012.

    DiseaseWarning:
      type: object
      description: >
        One entry per DR-00x rule that fired, sourced from engine/disease-engine.js.
        Verified directly against source — these are the actual shipped values,
        not illustrative placeholders.
      properties:
        disease: { type: string, enum: [Diabetes, Hypertension, "Heart Disease (CVD)", "Kidney Disease"] }
        condition: { type: string }
        triggerQuantity: { type: string }
      x-verified-rules:
        DR-001 (Diabetes):      "settings.diabetes && sugars > 22.5"   # condition: "High sugar linked to glucose spikes"; triggerQuantity: ">22.5g"
        DR-002 (Hypertension):  "settings.hypertension && sodium > 600" # condition: "High sodium linked to high BP"; triggerQuantity: ">600mg"
        DR-003 (CVD):           "settings.cardiovascular && sat_fat > 5" # condition: "High sat fat increases LDL"; triggerQuantity: ">5g"
        DR-004 (CVD):           "settings.cardiovascular && sodium > 400 && sodium <= 600" # condition: "Moderate-high sodium impacts heart"; triggerQuantity: ">400mg"
        DR-005 (Kidney):        "settings.kidney && potassium > 200"   # condition: "High potassium needs monitoring"; triggerQuantity: ">200mg" — NEVER FIRES: potassium is hardcoded to 0 in background.js's calcData object (see Code Review Issue #6), and the source schema has no PotassiumMG field to read it from even if fixed
        DR-006 (Kidney):        "settings.kidney && sodium > 600"      # condition: "High sodium strains compromised kidneys"; triggerQuantity: ">600mg"
      x-requirement-divergence: >
        FR-011 specifies ONE combined cardiovascular warning firing only when
        sat_fat > 5g AND sodium > 400mg are BOTH true. The shipped engine
        instead fires DR-003 and DR-004 as two independent single-nutrient
        warnings, neither requiring the other's condition. FR-012 has the
        same divergence for the two kidney rules (DR-005/DR-006).

    AlternativeProduct:
      type: object
      properties:
        AlternativeGroceryProductID: { type: string }
        LetterGrade: { type: string, enum: [A, B, C, D, E] }
        FSAProductCategoryMatch: { type: boolean }
        RelevanceScore: { type: string, description: "0.60*GradeRank + 0.30*CategoryMatch + 0.10*PriceProximity, formatted to 2dp — AI-001's multi-factor ranking, as designed" }
        ExplanationText: { type: string, description: "AI-002's explanation requirement" }
        PriceKES: { type: number }
      x-status: "This array is ALWAYS empty in the shipped build — NutriScoreDB.getAllProducts() does not exist. See Code Review Issue #1 and PRD §4, FR-013."

    ScoredProduct:
      type: object
      properties:
        productId: { type: string }
        product_name: { type: string }
        retailer: { type: string, enum: [NAIVAS, CARREFOUR] }
        nutriscore_grade: { type: string, enum: [A, B, C, D, E, UNKNOWN] }
        score: { type: number }
        score_details: { type: object, properties: { N_Points: { type: number }, P_Points: { type: number } } }
        fsaCategory: { type: string, enum: [GENERAL_FOOD, RED_MEAT, CHEESE, ADDED_FAT, BEVERAGE] }
        # ⚠ No KNPM 25-category code field — EV-KE-001 requires one alongside
        # fsaCategory; not present in the shipped schema (see PRD §5.2).
        displayCategory: { type: string }
        isExcluded: { type: boolean, description: "SPF/DATA-005 exclusion gate result, computed at request time by FoodClassifier rather than read from a pre-tagged dataset field" }
        algorithmVersion: { type: string, example: "FSA-NPS-2023" }
        diseaseWarnings:
          type: array
          items: { $ref: "#/components/schemas/DiseaseWarning" }
        diseaseDisclaimer:
          type: string
          example: "This information is based on standard thresholds and is not medical advice. Consult a healthcare provider."
          description: >
            Verbatim shipped text (engine/disease-engine.js DISCLAIMER constant).
            AI-003's spec-suggested text is: "General nutritional information
            only — not medical advice. Consult a qualified nutritionist or
            physician for personalised dietary guidance." Functionally
            equivalent, not verbatim; not independently Flesch-Kincaid scored.
        alternatives:
          type: array
          items: { $ref: "#/components/schemas/AlternativeProduct" }
          description: "Always empty in the current build — see Code Review Issue #1"
        nutritional_profile_display: { $ref: "#/components/schemas/NutrientBreakdown" }
        confidence: { type: string, description: "See System Architecture §6.3 for the gap between this value's actual vocabulary and the spec's official 7-tier hierarchy" }
        canDisplayGrade: { type: boolean }
        validationStatus: { type: string }
        evidenceTier: { type: string }
        matchInfo:
          type: object
          properties:
            matched: { type: boolean }
            matchMethod: { type: string, enum: [product_id, url_path_fragment, url, exact_name, case_insensitive_name, normalized_name, none] }
            confidence: { type: string, enum: [high, medium, low, none] }

    ErrorResponse:
      type: object
      properties:
        status: { type: string, enum: [NOT_FOUND, ERROR] }
        data: { type: object }
        error: { type: string }

paths:

  /CHECK_PRODUCT_SCORE:
    post:
      tags: [Scoring]
      operationId: checkProductScore
      summary: Score a single product detected on a listing page
      description: >
        Sent by content.js for every newly detected, unscanned product card.
        Resolves the product via NutriScoreDB.resolveProductMatch against the
        LOCAL dataset only (see ADR-005 — no live API call), then runs
        FoodClassifier -> ScoreEngine -> DiseaseEngine -> AlternativesEngine.
      x-dispatch: "chrome.runtime.sendMessage({ action: 'CHECK_PRODUCT_SCORE', retailer, payload })"
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/ProductScorePayload" }
      responses:
        "200":
          description: Callback-delivered response (sendResponse), status SUCCESS or NOT_FOUND
          content:
            application/json:
              schema:
                oneOf:
                  - type: object
                    properties: { status: { const: SUCCESS }, data: { $ref: "#/components/schemas/ScoredProduct" } }
                  - $ref: "#/components/schemas/ErrorResponse"

  /LOG_CART_ADD:
    post:
      tags: [Cart]
      operationId: logCartAdd
      summary: Log a single add-to-cart event to the local shopping ledger
      x-dispatch: "chrome.runtime.sendMessage({ action: 'LOG_CART_ADD', payload })"
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/CartActionPayload" }
      responses:
        "204":
          description: No response is sent (fire-and-forget)

  /SYNC_CART_STATE:
    post:
      tags: [Cart]
      operationId: syncCartState
      summary: Reconcile the full observed cart against the local ledger
      x-dispatch: "chrome.runtime.sendMessage({ action: 'SYNC_CART_STATE', payload })"
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/CartSyncPayload" }
      responses:
        "200":
          description: "{ status: SUCCESS } or { status: ERROR, error }"

  /REMOVE_CART_ITEM:
    post:
      tags: [Cart]
      operationId: removeCartItem
      x-dispatch: "chrome.runtime.sendMessage({ action: 'REMOVE_CART_ITEM', payload })"
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/RemoveCartItemPayload" }
      responses:
        "204":
          description: No response is sent

  /CART_CLEARED:
    post:
      tags: [Cart]
      operationId: cartCleared
      x-dispatch: "chrome.runtime.sendMessage({ action: 'CART_CLEARED', retailer })"
      responses:
        "204":
          description: No response is sent

  /ORDER_PLACED:
    post:
      tags: [Cart]
      operationId: orderPlaced
      x-dispatch: "chrome.runtime.sendMessage({ action: 'ORDER_PLACED', retailer })"
      responses:
        "204":
          description: No response is sent

  /GET_PAGE_STATS:
    post:
      tags: [Scoring]
      operationId: getPageStats
      x-dispatch: "chrome.runtime.sendMessage({ action: 'GET_PAGE_STATS' })"
      responses:
        "200":
          description: "{ count: number, retailer: string | null }"

  /AUTH_SYNC:
    post:
      tags: [Sync]
      operationId: authSync
      summary: Authenticate the current user for cross-device Firestore ledger sync
      description: >
        Intended sender: the not-yet-built companion website. **Not reachable
        today** — manifest.json declares no externally_connectable entry.
        See Code Review companion doc, Issue #4.
      x-dispatch: "chrome.runtime.sendMessage(EXTENSION_ID, { type: 'AUTH_SYNC', user })"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                type: { const: AUTH_SYNC }
                user: { type: object, properties: { id: { type: string }, email: { type: string } } }
      responses:
        "200":
          description: "{ status: 'OK' } — unreachable in practice"
```

---

## Appendix — Fields Deliberately Left Out

- **`servers`** — omitted: there is no network transport.
- **`securitySchemes`** — omitted: Chrome enforces message-origin isolation natively.
- **Any OFacts-related action** — omitted: FR-002 as written describes calling this API; the shipped build does not (System Architecture, ADR-005).
- **Admin scoring-rule endpoints** — removed: there is no configurable scoring-rule service; FSA-NPS thresholds are hardcoded constants.
