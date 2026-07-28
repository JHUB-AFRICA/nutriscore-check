/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BackgroundServiceWorker ? Component Architecture v2.0
 * Orchestrates: FoodClassifier -> ScoreEngine -> DiseaseEngine
 */

importScripts(
  "db.js",
  "engine/food-classifier.js",
  "engine/score-engine.js",
  "engine/disease-engine.js",
  "engine/alternatives-engine.js"
);

console.log("[NutriScore SW] Component Architecture v2.0 active.");

let dataReady = false;
async function initializeDatabases() {
  if (dataReady) return;
  if (typeof NutriScoreDB !== "undefined" && NutriScoreDB.importDatasets) {
    try {
      await NutriScoreDB.importDatasets();
      dataReady = true;
      console.log("[NutriScore SW] IndexedDB Datasets imported and ready.");
    } catch (err) {
      console.error("[NutriScore SW] Dataset import failed:", err);
    }
  } else {
    console.warn("[NutriScore SW] NutriScoreDB not available.");
  }
}

initializeDatabases();

function resolveBadgeSignal(groceryProduct) {
  const validation = groceryProduct.Validation || {};
  const checks = validation.ConsistencyChecks || {};
  const prov = groceryProduct.NutritionProvenance || {};
  
  // All relevant checks must pass (or be not_checked, but failures are fatal)
  const isFailed = Object.values(checks).some(v => v === "failed");
  
  // Evidence level must be one of these trusted levels
  const trustedLevels = ["product_specific", "international_fct", "category_reference"];
  const isTrusted = trustedLevels.includes(prov.EvidenceLevel);
  
  if (isFailed || !isTrusted) {
    throw new Error("Product validation failed or evidence level insufficient.");
  }
  
  let confidenceMap = {
    "product_specific": "measured",
    "international_fct": "derived",
    "category_reference": "fallback"
  };
  
  return confidenceMap[prov.EvidenceLevel] || "fallback";
}

async function getProductInfo(payload, retailerCode) {
  await initializeDatabases();

  const { product_name, name_hash, retailer_product_id, url } = payload;
  
  const settings = await (NutriScoreDB.getSettings ? NutriScoreDB.getSettings() : { diabetes: true, hypertension: true, cardiovascular: true, kidney: true });

  const cacheKey = retailer_product_id || url || product_name;
  if (cacheKey && typeof NutriScoreDB !== "undefined" && NutriScoreDB.getCachedProduct) {
    const cached = await NutriScoreDB.getCachedProduct(cacheKey);
    if (cached) {
      const diseaseResult = DiseaseEngine.evaluate(cached, settings);
      cached.diseaseWarnings = diseaseResult.warnings;
      cached.diseaseDisclaimer = diseaseResult.disclaimer;
      return cached;
    }
  }

  const matchResult = await NutriScoreDB.resolveProductMatch(
    retailerCode,
    retailer_product_id || null,
    url                 || null,
    product_name        || null
  );

  if (!matchResult.matched) {
    throw new Error(`Product not found: "${product_name}" [${retailerCode}]`);
  }

  const groceryProduct = matchResult.product;
  const mappedConfidence = resolveBadgeSignal(groceryProduct);

  const nutrition = groceryProduct.Nutrition || {};
  const classification = groceryProduct.Classification || {};
  const identity = groceryProduct.Identity || {};

  const parseNumeric = (val) => {
    if (val == null) return 0;
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  };

  const fsaCategoryCode = classification.FSACategoryCode || "GENERAL_FOOD";
  
  const calcData = {
    name:          identity.ProductName || product_name,
    category:      fsaCategoryCode,
    is_beverage:   fsaCategoryCode === "BEVERAGE",
    is_raw_food:   false,
    energy:        parseNumeric(nutrition.EnergyKJ),
    sugars:        parseNumeric(nutrition.SugarsG),
    sat_fat:       parseNumeric(nutrition.SaturatedFatG),
    sodium:        parseNumeric(nutrition.Sodium?.ValueMG),
    fiber:         parseNumeric(nutrition.FibreG),
    protein:       parseNumeric(nutrition.ProteinG),
    fruits_veg_pct: parseNumeric(nutrition.FVL?.Percentage),
    potassium:     0,
    total_fat:     parseNumeric(nutrition.FatG),
    carbs:         parseNumeric(nutrition.CarbohydratesG),
    nova_group:    3,
    confidence:    mappedConfidence,
  };

  const classResult = FoodClassifier.classify(calcData);
  const isExcluded = classResult.isExcluded || classResult.IsExcluded;

  const scoreResult = ScoreEngine.score(calcData, fsaCategoryCode);
  const diseaseResult = DiseaseEngine.evaluate(calcData, settings);
  
  const altsResult = AlternativesEngine.getAlternatives(
    { productId: identity.ProductID, fsaCategory: fsaCategoryCode, score: scoreResult.NumericScore },
    []
  );

  const displayCategory = NutriScoreDB.resolveDisplayCategory(groceryProduct);

  const result = {
    productId:                   identity.ProductID || groceryProduct.GroceryProductID || payload.retailer_product_id,
    product_name:                calcData.name,
    retailer:                    retailerCode,
    nutriscore_grade:            scoreResult.LetterGrade || "UNKNOWN",
    score:                       scoreResult.NumericScore || 0,
    score_details:               scoreResult.breakdown || {},
    fsaCategory:                 fsaCategoryCode,
    displayCategory:             displayCategory,
    isExcluded:                  isExcluded,
    algorithmVersion:            scoreResult.AlgorithmVersion || "FSA-NPS-2023",
    diseaseWarnings:             diseaseResult.warnings,
    diseaseDisclaimer:           diseaseResult.disclaimer,
    alternatives:                altsResult.alternatives,
    nutritional_profile_display: {
      energy_kj:  nutrition.EnergyKJ,
      fat_g:      nutrition.FatG,
      sat_fat_g:  nutrition.SaturatedFatG,
      carbs_g:    nutrition.CarbohydratesG,
      sugars_g:   nutrition.SugarsG,
      fibre_g:    nutrition.FibreG,
      protein_g:  nutrition.ProteinG,
      sodium_mg:  nutrition.Sodium?.ValueMG,
    },
    confidence:                  calcData.confidence,
    matchInfo: {
      matched: matchResult.matched,
      matchMethod: matchResult.matchMethod,
      confidence: matchResult.confidence,
    },
    ...calcData,
  };

  if (cacheKey && typeof NutriScoreDB !== "undefined" && NutriScoreDB.saveProduct) {
    NutriScoreDB.saveProduct(cacheKey, result).catch(e => console.warn("[NutriScore SW] IndexedDB save:", e.message));
  }

  return result;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[NutriScore SW] Action:", message.action);

  if (message.action === "CHECK_PRODUCT_SCORE") {
    const retailerCode = message.retailer || "NAIVAS";

    getProductInfo(message.payload, retailerCode)
      .then(prod => {
        sendResponse({ status: "SUCCESS", data: prod });
      })
      .catch(err => {
        console.warn(`[NutriScore SW] Processing failed: ${err.message}`);
        sendResponse({
          status: "NOT_FOUND",
          data:   { product_name: message.payload.product_name, nutriscore_grade: "UNKNOWN" },
          error:  err.message
        });
      });

    return true;
  }

  if (message.action === "LOG_CART_EVENT") {
    if (typeof NutriScoreDB !== "undefined" && NutriScoreDB.logCartEvent) {
      NutriScoreDB.logCartEvent(message.payload)
        .then(() => sendResponse({ status: "SUCCESS" }))
        .catch(err => sendResponse({ status: "ERROR", error: err.message }));
    } else {
      sendResponse({ status: "ERROR", error: "DB not initialized" });
    }
    return true;
  }
});
