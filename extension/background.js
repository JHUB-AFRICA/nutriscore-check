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
// Sign-in, entirely inside the extension — no website tab required.
//
// Step 1: Google's own account picker via launchWebAuthFlow, same as
// before. Step 2: exchange that Google access token for a FIREBASE
// identity (via Identity Toolkit's signInWithIdp) instead of just raw
// Google userinfo. This matters because the website's Firestore documents
// are keyed by *Firebase* uid, not the raw Google account id — signing in
// through Firebase here (for the same Google account) mints the same
// Firebase uid the website would, so step 3 can read the exact same
// Firestore document the customer already filled in on the website.
//
// Uses the "Web application" OAuth client (NOT the Chrome Extension one),
// because launchWebAuthFlow needs a custom redirect_uri, which only the Web
// application client type supports. That redirect URI —
// https://<extension-id>.chromiumapp.org/ — must be added under
// "Authorized redirect URIs" for that client in Google Cloud Console.
// ---------------------------------------------------------------------------
const GOOGLE_WEB_CLIENT_ID = "923932588057-v6m40br659aabs7kaft90auc02sevjek.apps.googleusercontent.com";
const FIREBASE_API_KEY = "AIzaSyB05umupSWPt96qNWaevFJnS4ovaj907Gc";
const FIREBASE_PROJECT_ID = "nutriscore-check";

function getGoogleAccessToken() {
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
        resolve(accessToken);
      }
    );
  });
}

// Exchanges a Google access token for a Firebase identity (same project the
// website uses). Returns the Firebase uid plus a short-lived ID token that
// can read Firestore directly, and a refresh token to renew it later.
async function exchangeForFirebaseIdentity(googleAccessToken) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postBody: `access_token=${googleAccessToken}&providerId=google.com`,
        requestUri: chrome.identity.getRedirectURL(),
        returnSecureToken: true
      })
    }
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || "Firebase sign-in failed");
  }
  return {
    uid: data.localId,
    email: data.email,
    picture: data.photoUrl || "",
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    expiresAt: Date.now() + Number(data.expiresIn) * 1000
  };
}

// Unwraps Firestore's typed REST field format ({stringValue}, {arrayValue},
// etc.) into a plain JS object matching what the website reads/writes via
// the Firestore SDK.
function firestoreFieldsToObject(fields) {
  const unwrap = (v) => {
    if (v.stringValue !== undefined) return v.stringValue;
    if (v.integerValue !== undefined) return Number(v.integerValue);
    if (v.doubleValue !== undefined) return v.doubleValue;
    if (v.booleanValue !== undefined) return v.booleanValue;
    if (v.arrayValue !== undefined) return (v.arrayValue.values || []).map(unwrap);
    if (v.mapValue !== undefined) return firestoreFieldsToObject(v.mapValue.fields || {});
    if (v.nullValue !== undefined) return null;
    return null;
  };
  const out = {};
  for (const [key, value] of Object.entries(fields)) out[key] = unwrap(value);
  return out;
}

// Reads users/{uid}/settings/health straight from Firestore — the exact
// document webpage/health.js saves to via setDoc(doc(db, "users", uid,
// "settings", "health"), ...). Returns null if the customer hasn't filled
// in a health profile yet (no 404 thrown).
async function fetchHealthProfileFromFirestore(uid, idToken) {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}/settings/health`,
    { headers: { Authorization: `Bearer ${idToken}` } }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore read failed: ${res.status}`);
  const data = await res.json();
  return firestoreFieldsToObject(data.fields || {});
}

// Firebase ID tokens expire after 1 hour — exchange the stored refresh
// token for a new one instead of forcing the customer to sign in again.
async function refreshFirebaseIdToken(refreshToken) {
  const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=refresh_token&refresh_token=${refreshToken}`
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Token refresh failed");
  return {
    idToken: data.id_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + Number(data.expires_in) * 1000
  };
}

// Returns a currently-valid Firebase ID token, refreshing it first if it's
// expired (or about to expire in the next minute).
async function getValidIdToken() {
  const { firebaseAuth } = await chrome.storage.local.get(["firebaseAuth"]);
  if (!firebaseAuth) throw new Error("Not signed in");
  if (Date.now() < firebaseAuth.expiresAt - 60000) return firebaseAuth.idToken;

  const refreshed = await refreshFirebaseIdToken(firebaseAuth.refreshToken);
  await chrome.storage.local.set({ firebaseAuth: refreshed });
  return refreshed.idToken;
}

// Full sign-in: Google picker -> Firebase identity -> pull the customer's
// saved health profile -> cache everything locally so the popup and content
// scripts can use it immediately, offline, without hitting Firestore again
// on every checkout page.
async function signInAndLoadHealthProfile() {
  const googleAccessToken = await getGoogleAccessToken();
  const identity = await exchangeForFirebaseIdentity(googleAccessToken);
  const healthProfile = await fetchHealthProfileFromFirestore(identity.uid, identity.idToken);

  const user = { id: identity.uid, email: identity.email, picture: identity.picture };
  await chrome.storage.local.set({
    user,
    firebaseAuth: {
      idToken: identity.idToken,
      refreshToken: identity.refreshToken,
      expiresAt: identity.expiresAt
    },
    healthProfile
  });

  return { user, healthProfile };
}

// Re-pulls the health profile with a valid (refreshed if needed) token —
// call this whenever the popup opens, so edits made on the website show up
// at checkout without requiring another full sign-in.
async function refreshHealthProfile() {
  const { user } = await chrome.storage.local.get(["user"]);
  if (!user) return null;
  const idToken = await getValidIdToken();
  const healthProfile = await fetchHealthProfileFromFirestore(user.id, idToken);
  await chrome.storage.local.set({ healthProfile });
  return healthProfile;
}

// ---------------------------------------------------------------------------
// Internal messages (popup, content scripts, options/dashboard page)
// ---------------------------------------------------------------------------
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[NutriScore SW] Action:", message.action);

  if (message.action === "SIGN_IN") {
    signInAndLoadHealthProfile()
      .then((result) => sendResponse({ status: "SUCCESS", data: result.user }))
      .catch((err) => sendResponse({ status: "ERROR", error: err.message }));
    return true;
  }

  if (message.action === "SIGN_OUT") {
    chrome.storage.local.remove(["user", "firebaseAuth", "healthProfile"], () =>
      sendResponse({ status: "SUCCESS" })
    );
    return true;
  }

  if (message.action === "GET_SIGNED_IN_USER") {
    chrome.storage.local.get(["user"], ({ user }) => {
      sendResponse({ status: "SUCCESS", data: user || null });
    });
    return true;
  }

  if (message.action === "GET_HEALTH_PROFILE") {
    refreshHealthProfile()
      .then((data) => sendResponse({ status: "SUCCESS", data }))
      .catch(() => {
        // Live refresh failed (offline, token issue, etc.) — fall back to
        // whatever was cached from the last successful sign-in/refresh.
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
        .then(() => {
          sendResponse({ status: "SUCCESS" });
          // Let any open dashboard tab know there's new data, so it can
          // refresh itself without the person needing to manually
          // reload (the dashboard is a separate page that only reads
          // IndexedDB once on load, so it has no other way to know).
          chrome.runtime.sendMessage({ action: "SHOPPING_LEDGER_UPDATED" }).catch(() => {
            // No dashboard tab currently open/listening -- fine, ignore.
          });
        })
        .catch(err => sendResponse({ status: "ERROR", error: err.message }));
    } else {
      sendResponse({ status: "ERROR", error: "DB not initialized" });
    }
    return true;
  }

  if (message.action === "REMOVE_CART_EVENT") {
    if (typeof NutriScoreDB !== "undefined" && NutriScoreDB.removeCartEventsByProductId) {
      NutriScoreDB.removeCartEventsByProductId(message.payload && message.payload.productId)
        .then((removedCount) => {
          sendResponse({ status: "SUCCESS", removedCount });
          if (removedCount > 0) {
            // Same reasoning as the LOG_CART_EVENT broadcast above -- let
            // any open dashboard tab know the ledger changed so it can
            // reflect the removal without a manual reload.
            chrome.runtime.sendMessage({ action: "SHOPPING_LEDGER_UPDATED" }).catch(() => {
              // No dashboard tab currently open/listening -- fine, ignore.
            });
          }
        })
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