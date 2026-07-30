/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BackgroundServiceWorker — Component Architecture v2.0
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

// ---------------------------------------------------------------------------
// Google sign-in via launchWebAuthFlow — this opens Google's own account
// picker (same "choose an account" screen as health.js's runGooglePopup),
// unlike chrome.identity.getAuthToken which silently reuses whatever
// account is already signed into the Chrome browser profile.
//
// Uses the "Web application" OAuth client (NOT the Chrome Extension one),
// because launchWebAuthFlow needs a custom redirect_uri, which only the Web
// application client type supports. That redirect URI —
// https://<extension-id>.chromiumapp.org/ — must be added under
// "Authorized redirect URIs" for that client in Google Cloud Console.
// ---------------------------------------------------------------------------
const GOOGLE_WEB_CLIENT_ID = "923932588057-v6m40br659aabs7kaft90auc02sevjek.apps.googleusercontent.com";

function signInWithGooglePicker() {
  return new Promise((resolve, reject) => {
    const redirectUri = chrome.identity.getRedirectURL();
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", GOOGLE_WEB_CLIENT_ID);
    authUrl.searchParams.set("response_type", "token");
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("prompt", "select_account");

    chrome.identity.launchWebAuthFlow(
      { url: authUrl.toString(), interactive: true },
      (redirectedTo) => {
        if (chrome.runtime.lastError || !redirectedTo) {
          reject(new Error(chrome.runtime.lastError?.message || "Sign-in was cancelled"));
          return;
        }

        const params = new URLSearchParams(new URL(redirectedTo).hash.slice(1));
        const accessToken = params.get("access_token");
        if (!accessToken) {
          reject(new Error("No access token returned"));
          return;
        }

        fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
          .then((res) => res.json())
          .then((profile) => {
            chrome.storage.local.set({ user: profile, token: accessToken }, () => {
              resolve(profile);
            });
          })
          .catch(reject);
      }
    );
  });
}

// ---------------------------------------------------------------------------
// Direct pull: read the health profile straight from an open website tab's
// localStorage, instead of relying solely on the HEALTH_SYNC push message
// having already arrived. More reliable — works even if the push was
// missed (e.g. website not rebuilt yet, message timing, tab not focused).
// Requires "https://nutriscore-check.vercel.app/*" in host_permissions.
// ---------------------------------------------------------------------------
function getFreshestHealthProfile() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ url: "https://nutriscore-check.vercel.app/*" }, (tabs) => {
      if (chrome.runtime.lastError || !tabs || tabs.length === 0) {
        reject(new Error("No open NutriScore website tab"));
        return;
      }

      const tabId = tabs[0].id;
      chrome.scripting.executeScript(
        {
          target: { tabId },
          func: () => {
            try {
              const raw = localStorage.getItem("nutriscoreHealthProfile");
              return raw ? JSON.parse(raw) : null;
            } catch (e) {
              return null;
            }
          }
        },
        (results) => {
          if (chrome.runtime.lastError || !results || !results[0]) {
            reject(new Error("Could not read health profile from tab"));
            return;
          }
          const data = results[0].result;
          // Cache it too, so it's available even after the tab closes.
          chrome.storage.local.set({ healthProfile: data });
          resolve(data);
        }
      );
    });
  });
}

// ---------------------------------------------------------------------------
// Internal messages (popup, content scripts, options/dashboard page)
// ---------------------------------------------------------------------------
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[NutriScore SW] Action:", message.action);

  if (message.action === "SIGN_IN") {
    signInWithGooglePicker()
      .then((profile) => sendResponse({ status: "SUCCESS", data: profile }))
      .catch((err) => sendResponse({ status: "ERROR", error: err.message }));
    return true;
  }

  if (message.action === "SIGN_OUT") {
    chrome.storage.local.get(["token"], ({ token }) => {
      const finish = () =>
        chrome.storage.local.remove(["user", "token"], () => sendResponse({ status: "SUCCESS" }));
      if (token) {
        chrome.identity.removeCachedAuthToken({ token }, finish);
      } else {
        finish();
      }
    });
    return true;
  }

  if (message.action === "GET_SIGNED_IN_USER") {
    chrome.storage.local.get(["user"], ({ user }) => {
      sendResponse({ status: "SUCCESS", data: user || null });
    });
    return true;
  }

  if (message.action === "GET_HEALTH_PROFILE") {
    getFreshestHealthProfile()
      .then((data) => sendResponse({ status: "SUCCESS", data }))
      .catch(() => {
        // Pull failed (no open tab, script injection blocked, etc.) —
        // fall back to whatever was last pushed via HEALTH_SYNC.
        chrome.storage.local.get(["healthProfile"], ({ healthProfile }) => {
          sendResponse({ status: "SUCCESS", data: healthProfile || null });
        });
      });
    return true;
  }

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

// ---------------------------------------------------------------------------
// External messages (nutriscore-check.vercel.app website)
// Requires "externally_connectable" in manifest.json to whitelist the origin.
// ---------------------------------------------------------------------------
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (sender.origin !== "https://nutriscore-check.vercel.app") return;

  if (message.type === "PING") {
    chrome.storage.local.get(["user"], (result) => {
      sendResponse({
        status: "connected",
        signedIn: !!result.user,
        user: result.user || null
      });
    });
    return true;
  }

  // Website pushes its signed-in Google profile here after its own
  // sign-in flow completes. The extension trusts the website as the
  // source of truth for identity — no separate chrome.identity call.
  if (message.type === "AUTH_SYNC") {
    const user = message.user || null;
    if (user) {
      chrome.storage.local.set({ user }, () => {
        sendResponse({ status: "SUCCESS" });
      });
    } else {
      chrome.storage.local.remove(["user"], () => {
        sendResponse({ status: "SUCCESS" });
      });
    }
    return true;
  }

  // Website pushes the saved health profile here after loading or saving
  // it in Firestore, so the extension popup can display the same details
  // without needing its own Firestore access.
  if (message.type === "HEALTH_SYNC") {
    const health = message.health || null;
    if (health) {
      chrome.storage.local.set({ healthProfile: health }, () => {
        sendResponse({ status: "SUCCESS" });
      });
    } else {
      chrome.storage.local.remove(["healthProfile"], () => {
        sendResponse({ status: "SUCCESS" });
      });
    }
    return true;
  }
});