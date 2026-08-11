var NutriScoreDB = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/ui/src/app/lib/products.ts
  var products_exports = {};
  __export(products_exports, {
    PRODUCTS: () => PRODUCTS
  });
  var PRODUCTS;
  var init_products = __esm({
    "src/ui/src/app/lib/products.ts"() {
      PRODUCTS = [
        {
          id: "p1",
          name: "Brookside Fresh Milk 500ml",
          brand: "Brookside",
          category: "Beverages \u2014 Dairy",
          price: "KSh 65",
          imageUrl: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=80",
          grade: "B",
          negativePoints: 4,
          confidence: "measured",
          perUnit: "100ml",
          nutrients: {
            energyKj: 268,
            fatG: 3.4,
            satFatG: 2.1,
            carbsG: 4.8,
            sugarsG: 4.8,
            fibreG: 0,
            proteinG: 3.3,
            sodiumMg: 44
          }
        },
        {
          id: "p2",
          name: "Coca-Cola Soda 500ml",
          brand: "Coca-Cola",
          category: "Beverages \u2014 Soft Drinks",
          price: "KSh 70",
          imageUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80",
          grade: "E",
          negativePoints: 22,
          confidence: "measured",
          perUnit: "100ml",
          nutrients: {
            energyKj: 190,
            fatG: 0,
            satFatG: 0,
            carbsG: 10.6,
            sugarsG: 10.6,
            fibreG: null,
            proteinG: 0,
            sodiumMg: 8
          }
        },
        {
          id: "p3",
          name: "Daima Fresh Spinach 250g",
          brand: "Daima",
          category: "Vegetables \u2014 Fresh",
          price: "KSh 40",
          imageUrl: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&q=80",
          grade: "A",
          negativePoints: 0,
          confidence: "measured",
          perUnit: "100g",
          nutrients: {
            energyKj: 97,
            fatG: 0.4,
            satFatG: 0.05,
            carbsG: 3.6,
            sugarsG: 0.4,
            fibreG: 2.2,
            proteinG: 2.9,
            sodiumMg: 79
          }
        },
        {
          id: "p4",
          name: "Tropical Heat Crisps 100g",
          brand: "Tropical Heat",
          category: "Snacks \u2014 Salty",
          price: "KSh 120",
          imageUrl: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&q=80",
          grade: "D",
          negativePoints: 15,
          confidence: "derived",
          perUnit: "100g",
          nutrients: {
            energyKj: 2210,
            fatG: 34,
            satFatG: 12,
            carbsG: 50,
            sugarsG: 1.2,
            fibreG: 4.1,
            proteinG: 6,
            sodiumMg: 540
          }
        },
        {
          id: "p5",
          name: "Weetabix Whole Grain 500g",
          brand: "Weetabix",
          category: "Cereals \u2014 Breakfast",
          price: "KSh 480",
          imageUrl: "https://images.unsplash.com/photo-1614961233913-a5113a4a34ed?w=400&q=80",
          grade: "A",
          negativePoints: 2,
          confidence: "measured",
          perUnit: "100g",
          nutrients: {
            energyKj: 1500,
            fatG: 2,
            satFatG: 0.6,
            carbsG: 69,
            sugarsG: 4.4,
            fibreG: 10,
            proteinG: 12,
            sodiumMg: 110
          }
        },
        {
          id: "p6",
          name: "Blue Band Margarine 250g",
          brand: "Blue Band",
          category: "Fats & Spreads",
          price: "KSh 195",
          imageUrl: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&q=80",
          grade: "D",
          negativePoints: 14,
          confidence: "fallback",
          perUnit: "100g",
          nutrients: {
            energyKj: 2400,
            fatG: 60,
            satFatG: 18,
            carbsG: 0.5,
            sugarsG: 0.5,
            fibreG: null,
            proteinG: 0.2,
            sodiumMg: 640
          }
        },
        {
          id: "p7",
          name: "Kenchic Chicken Sausages 400g",
          brand: "Kenchic",
          category: "Meat \u2014 Processed",
          price: "KSh 350",
          imageUrl: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=400&q=80",
          grade: "C",
          negativePoints: 9,
          confidence: "derived",
          perUnit: "100g",
          nutrients: {
            energyKj: 920,
            fatG: 16,
            satFatG: 5.5,
            carbsG: 4,
            sugarsG: 1,
            fibreG: 0.5,
            proteinG: 13,
            sodiumMg: 780
          }
        },
        {
          id: "p8",
          name: "Del Monte Orange Juice 1L",
          brand: "Del Monte",
          category: "Beverages \u2014 Juices",
          price: "KSh 250",
          imageUrl: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&q=80",
          grade: "C",
          negativePoints: 8,
          confidence: "measured",
          perUnit: "100ml",
          nutrients: {
            energyKj: 188,
            fatG: 0.1,
            satFatG: 0.02,
            carbsG: 10.5,
            sugarsG: 9.8,
            fibreG: 0.2,
            proteinG: 0.7,
            sodiumMg: 5
          }
        }
      ];
    }
  });

  // src/ui/src/app/lib/db.ts
  var db_exports = {};
  __export(db_exports, {
    DEFAULT_SETTINGS: () => DEFAULT_SETTINGS,
    cacheProduct: () => cacheProduct,
    clearScans: () => clearScans,
    countEntries: () => countEntries,
    getAllEntries: () => getAllEntries,
    getAllScans: () => getAllScans,
    getCachedProduct: () => getCachedProduct,
    getHistoricalTrends: () => getHistoricalTrends,
    getSettings: () => getSettings,
    importDatasets: () => importDatasets,
    logCartEvent: () => logCartEvent,
    purgeAll: () => purgeAll,
    removeCartEventsByProductId: () => removeCartEventsByProductId,
    resolveDisplayCategory: () => resolveDisplayCategory,
    resolveProductMatch: () => resolveProductMatch,
    saveProduct: () => saveProduct,
    saveSettings: () => saveSettings,
    seedIfEmpty: () => seedIfEmpty
  });

  // node_modules/idb/build/index.js
  var instanceOfAny = (object, constructors) => constructors.some((c) => object instanceof c);
  var idbProxyableTypes;
  var cursorAdvanceMethods;
  function getIdbProxyableTypes() {
    return idbProxyableTypes || (idbProxyableTypes = [
      IDBDatabase,
      IDBObjectStore,
      IDBIndex,
      IDBCursor,
      IDBTransaction
    ]);
  }
  function getCursorAdvanceMethods() {
    return cursorAdvanceMethods || (cursorAdvanceMethods = [
      IDBCursor.prototype.advance,
      IDBCursor.prototype.continue,
      IDBCursor.prototype.continuePrimaryKey
    ]);
  }
  var transactionDoneMap = /* @__PURE__ */ new WeakMap();
  var transformCache = /* @__PURE__ */ new WeakMap();
  var reverseTransformCache = /* @__PURE__ */ new WeakMap();
  function promisifyRequest(request) {
    const promise = new Promise((resolve, reject) => {
      const unlisten = () => {
        request.removeEventListener("success", success);
        request.removeEventListener("error", error);
      };
      const success = () => {
        resolve(wrap(request.result));
        unlisten();
      };
      const error = () => {
        reject(request.error);
        unlisten();
      };
      request.addEventListener("success", success);
      request.addEventListener("error", error);
    });
    reverseTransformCache.set(promise, request);
    return promise;
  }
  function cacheDonePromiseForTransaction(tx) {
    if (transactionDoneMap.has(tx))
      return;
    const done = new Promise((resolve, reject) => {
      const unlisten = () => {
        tx.removeEventListener("complete", complete);
        tx.removeEventListener("error", error);
        tx.removeEventListener("abort", error);
      };
      const complete = () => {
        resolve();
        unlisten();
      };
      const error = () => {
        reject(tx.error || new DOMException("AbortError", "AbortError"));
        unlisten();
      };
      tx.addEventListener("complete", complete);
      tx.addEventListener("error", error);
      tx.addEventListener("abort", error);
    });
    transactionDoneMap.set(tx, done);
  }
  var idbProxyTraps = {
    get(target, prop, receiver) {
      if (target instanceof IDBTransaction) {
        if (prop === "done")
          return transactionDoneMap.get(target);
        if (prop === "store") {
          return receiver.objectStoreNames[1] ? void 0 : receiver.objectStore(receiver.objectStoreNames[0]);
        }
      }
      return wrap(target[prop]);
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
    has(target, prop) {
      if (target instanceof IDBTransaction && (prop === "done" || prop === "store")) {
        return true;
      }
      return prop in target;
    }
  };
  function replaceTraps(callback) {
    idbProxyTraps = callback(idbProxyTraps);
  }
  function wrapFunction(func) {
    if (getCursorAdvanceMethods().includes(func)) {
      return function(...args) {
        func.apply(unwrap(this), args);
        return wrap(this.request);
      };
    }
    return function(...args) {
      return wrap(func.apply(unwrap(this), args));
    };
  }
  function transformCachableValue(value) {
    if (typeof value === "function")
      return wrapFunction(value);
    if (value instanceof IDBTransaction)
      cacheDonePromiseForTransaction(value);
    if (instanceOfAny(value, getIdbProxyableTypes()))
      return new Proxy(value, idbProxyTraps);
    return value;
  }
  function wrap(value) {
    if (value instanceof IDBRequest)
      return promisifyRequest(value);
    if (transformCache.has(value))
      return transformCache.get(value);
    const newValue = transformCachableValue(value);
    if (newValue !== value) {
      transformCache.set(value, newValue);
      reverseTransformCache.set(newValue, value);
    }
    return newValue;
  }
  var unwrap = (value) => reverseTransformCache.get(value);
  function openDB(name, version, { blocked, upgrade, blocking, terminated } = {}) {
    const request = indexedDB.open(name, version);
    const openPromise = wrap(request);
    if (upgrade) {
      request.addEventListener("upgradeneeded", (event) => {
        upgrade(wrap(request.result), event.oldVersion, event.newVersion, wrap(request.transaction), event);
      });
    }
    if (blocked) {
      request.addEventListener("blocked", (event) => blocked(
        // Casting due to https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/1405
        event.oldVersion,
        event.newVersion,
        event
      ));
    }
    openPromise.then((db) => {
      if (terminated)
        db.addEventListener("close", () => terminated());
      if (blocking) {
        db.addEventListener("versionchange", (event) => blocking(event.oldVersion, event.newVersion, event));
      }
    }).catch(() => {
    });
    return openPromise;
  }
  var readMethods = ["get", "getKey", "getAll", "getAllKeys", "count"];
  var writeMethods = ["put", "add", "delete", "clear"];
  var cachedMethods = /* @__PURE__ */ new Map();
  function getMethod(target, prop) {
    if (!(target instanceof IDBDatabase && !(prop in target) && typeof prop === "string")) {
      return;
    }
    if (cachedMethods.get(prop))
      return cachedMethods.get(prop);
    const targetFuncName = prop.replace(/FromIndex$/, "");
    const useIndex = prop !== targetFuncName;
    const isWrite = writeMethods.includes(targetFuncName);
    if (
      // Bail if the target doesn't exist on the target. Eg, getAll isn't in Edge.
      !(targetFuncName in (useIndex ? IDBIndex : IDBObjectStore).prototype) || !(isWrite || readMethods.includes(targetFuncName))
    ) {
      return;
    }
    const method = async function(storeName, ...args) {
      const tx = this.transaction(storeName, isWrite ? "readwrite" : "readonly");
      let target2 = tx.store;
      if (useIndex)
        target2 = target2.index(args.shift());
      return (await Promise.all([
        target2[targetFuncName](...args),
        isWrite && tx.done
      ]))[0];
    };
    cachedMethods.set(prop, method);
    return method;
  }
  replaceTraps((oldTraps) => ({
    ...oldTraps,
    get: (target, prop, receiver) => getMethod(target, prop) || oldTraps.get(target, prop, receiver),
    has: (target, prop) => !!getMethod(target, prop) || oldTraps.has(target, prop)
  }));
  var advanceMethodProps = ["continue", "continuePrimaryKey", "advance"];
  var methodMap = {};
  var advanceResults = /* @__PURE__ */ new WeakMap();
  var ittrProxiedCursorToOriginalProxy = /* @__PURE__ */ new WeakMap();
  var cursorIteratorTraps = {
    get(target, prop) {
      if (!advanceMethodProps.includes(prop))
        return target[prop];
      let cachedFunc = methodMap[prop];
      if (!cachedFunc) {
        cachedFunc = methodMap[prop] = function(...args) {
          advanceResults.set(this, ittrProxiedCursorToOriginalProxy.get(this)[prop](...args));
        };
      }
      return cachedFunc;
    }
  };
  async function* iterate(...args) {
    let cursor = this;
    if (!(cursor instanceof IDBCursor)) {
      cursor = await cursor.openCursor(...args);
    }
    if (!cursor)
      return;
    cursor = cursor;
    const proxiedCursor = new Proxy(cursor, cursorIteratorTraps);
    ittrProxiedCursorToOriginalProxy.set(proxiedCursor, cursor);
    reverseTransformCache.set(proxiedCursor, unwrap(cursor));
    while (cursor) {
      yield proxiedCursor;
      cursor = await (advanceResults.get(proxiedCursor) || cursor.continue());
      advanceResults.delete(proxiedCursor);
    }
  }
  function isIteratorProp(target, prop) {
    return prop === Symbol.asyncIterator && instanceOfAny(target, [IDBIndex, IDBObjectStore, IDBCursor]) || prop === "iterate" && instanceOfAny(target, [IDBIndex, IDBObjectStore]);
  }
  replaceTraps((oldTraps) => ({
    ...oldTraps,
    get(target, prop, receiver) {
      if (isIteratorProp(target, prop))
        return iterate;
      return oldTraps.get(target, prop, receiver);
    },
    has(target, prop) {
      return isIteratorProp(target, prop) || oldTraps.has(target, prop);
    }
  }));

  // src/ui/src/app/lib/db.ts
  var DEFAULT_SETTINGS = {
    diabetes: true,
    hypertension: true,
    cardiovascular: true,
    kidney: true
  };
  var SETTINGS_KEY = "warning-modules";
  var DB_NAME = "nut04-nutriscore";
  var DB_VERSION = 6;
  var dbPromise = null;
  function getDB() {
    if (!dbPromise) {
      dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion, newVersion, transaction) {
          if (oldVersion < 1) {
            const store = db.createObjectStore("shopping_history", { keyPath: "id" });
            store.createIndex("by-viewedAt", "viewedAt");
          }
          if (oldVersion < 2) {
            db.createObjectStore("user_settings");
          }
          if (oldVersion < 3) {
            db.createObjectStore("product_cache");
            if (db.objectStoreNames.contains("ledger")) {
              db.deleteObjectStore("ledger");
            }
            if (db.objectStoreNames.contains("settings")) {
              db.deleteObjectStore("settings");
            }
          }
          if (oldVersion < 4) {
            const cStore = db.createObjectStore("carrefourProducts", { keyPath: "Identity.ProductID" });
            cStore.createIndex("by-url", "Identity.RetailerProductUrl");
            const nStore = db.createObjectStore("naivasProducts", { keyPath: "Identity.ProductID" });
            nStore.createIndex("by-url", "Identity.RetailerProductUrl");
            db.createObjectStore("kfctReference", { keyPath: "Identity.FoodCode" });
          }
          if (oldVersion < 5) {
            const cStore = transaction.objectStore("carrefourProducts");
            cStore.createIndex("by-name", "Identity.ProductName");
            const nStore = transaction.objectStore("naivasProducts");
            nStore.createIndex("by-name", "Identity.ProductName");
          }
          if (oldVersion < 6) {
            if (db.objectStoreNames.contains("shopping_history")) {
              db.deleteObjectStore("shopping_history");
            }
            const ledgerStore = db.createObjectStore("shopping_ledger", { keyPath: "id" });
            ledgerStore.createIndex("by-addedAt", "addedAt");
            db.createObjectStore("dataset_metadata", { keyPath: "retailer" });
          }
        }
      });
    }
    return dbPromise;
  }
  async function getSettings() {
    const db = await getDB();
    const stored = await db.get("user_settings", SETTINGS_KEY);
    return { ...DEFAULT_SETTINGS, ...stored ?? {} };
  }
  async function saveSettings(settings) {
    const db = await getDB();
    await db.put("user_settings", settings, SETTINGS_KEY);
  }
  async function logCartEvent(row) {
    const db = await getDB();
    await db.put("shopping_ledger", row);
  }
  // Cart line-item ids are stored as `${productId}-${timestamp}` (see
  // content.js), so there's no direct keyPath lookup for "everything
  // logged for this product" -- scan the (typically small, session-sized)
  // store and match by prefix instead of adding a new index/DB version
  // bump just for this.
  async function removeCartEventsByProductId(productId) {
    if (!productId) return 0;
    const db = await getDB();
    const all = await db.getAll("shopping_ledger");
    const matches = all.filter(row => typeof row.id === "string" && row.id.startsWith(`${productId}-`));
    await Promise.all(matches.map(row => db.delete("shopping_ledger", row.id)));
    return matches.length;
  }
  async function getAllEntries() {
    const db = await getDB();
    const all = await db.getAllFromIndex("shopping_ledger", "by-addedAt");
    return all.reverse();
  }
  async function countEntries() {
    const db = await getDB();
    return db.count("shopping_ledger");
  }
  async function getCachedProduct(id) {
    const db = await getDB();
    const cached = await db.get("product_cache", id);
    if (cached && cached.cachedAt && cached.cachedAt > Date.now() - 7 * 24 * 60 * 60 * 1e3) {
      return cached;
    }
    return null;
  }
  async function cacheProduct(id, product) {
    const db = await getDB();
    product.cachedAt = Date.now();
    await db.put("product_cache", product, id);
    if (Math.random() < 0.05) {
      const tx = db.transaction("product_cache", "readwrite");
      let cursor = await tx.store.openCursor();
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1e3;
      while (cursor) {
        if (!cursor.value.cachedAt || cursor.value.cachedAt < sevenDaysAgo) {
          await cursor.delete();
        }
        cursor = await cursor.continue();
      }
      await tx.done;
    }
  }
  async function purgeAll() {
    const db = await getDB();
    await Promise.all([
      db.clear("shopping_ledger"),
      db.clear("product_cache")
    ]);
  }
  async function saveProduct(key, result) {
    await cacheProduct(key, result);
  }
  async function getAllScans() {
    return await getAllEntries();
  }
  async function getHistoricalTrends() {
    const entries = await getAllEntries();
    return { count: entries.length };
  }
  async function clearScans() {
    await purgeAll();
  }
  async function seedIfEmpty() {
    const db = await getDB();
    const existing = await db.count("shopping_ledger");
    if (existing > 0) return;
    const { PRODUCTS: PRODUCTS2 } = await Promise.resolve().then(() => (init_products(), products_exports));
    const grades = ["A", "B", "C", "D", "E"];
    const now = Date.now();
    const day = 24 * 60 * 60 * 1e3;
    const tx = db.transaction("shopping_history", "readwrite");
    for (let i = 0; i < 45; i++) {
      const p = PRODUCTS2[i % PRODUCTS2.length];
      const daysAgo = Math.floor(i / 45 * 30);
      const jitter = (n) => n === null ? null : Math.max(0, Math.round(n * (0.85 + Math.random() * 0.3)));
      const entry = {
        id: `seed-${i}`,
        productId: p.id,
        name: p.name,
        category: p.category,
        grade: grades[Math.floor(Math.random() * grades.length)],
        sodiumMg: jitter(p.nutrients.sodiumMg),
        sugarsG: jitter(p.nutrients.sugarsG),
        satFatG: jitter(p.nutrients.satFatG),
        viewedAt: now - daysAgo * day - Math.floor(Math.random() * day)
      };
      await tx.store.put(entry);
    }
    await tx.done;
  }
  async function importDatasets() {
    const db = await getDB();
    const cCount = await db.count("carrefourProducts");
    const nCount = await db.count("naivasProducts");
    const kCount = await db.count("kfctReference");
    const importStore = async (count, storeName, path) => {
      if (count === 0) {
        console.log(`[NutriScoreDB] Importing ${storeName}...`);
        const res = await fetch(chrome.runtime.getURL(path));
        if (res.ok) {
          const data = await res.json();
          const chunkSize = 500;
          for (let i = 0; i < data.length; i += chunkSize) {
            const chunk = data.slice(i, i + chunkSize);
            const tx = db.transaction(storeName, "readwrite");
            chunk.forEach((p) => tx.store.put(p));
            await tx.done;
            await new Promise((r) => setTimeout(r, 0));
          }
          const mTx = db.transaction("dataset_metadata", "readwrite");
          mTx.store.put({
            retailer: storeName.replace("Products", "").replace("Reference", "").toUpperCase(),
            datasetVersion: "v1.0.0",
            // Hardcoded for now
            generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
            recordCount: data.length
          });
          await mTx.done;
        }
      }
    };
    await Promise.all([
      importStore(cCount, "carrefourProducts", "data/carrefour_validated.json"),
      importStore(nCount, "naivasProducts", "data/naivas_validated.json"),
      importStore(kCount, "kfctReference", "data/kfct2018_reference_validated.json")
    ]);
  }
  function resolveDisplayCategory(record) {
    if (!record || !record.Classification) return "Uncategorized";
    const { NutritionCategory, CanonicalFoodClass, FSACategoryCode } = record.Classification;
    if (NutritionCategory) return NutritionCategory;
    if (CanonicalFoodClass) return CanonicalFoodClass;
    if (FSACategoryCode) return FSACategoryCode;
    return "Uncategorized";
  }
  async function resolveProductMatch(retailer, retailerProductId, url, productName) {
    const db = await getDB();
    const storeName = retailer.toUpperCase() === "CARREFOUR" ? "carrefourProducts" : "naivasProducts";
    const tx = db.transaction(storeName, "readonly");
    const store = tx.store;
    if (retailerProductId) {
      const hit = await store.get(retailerProductId);
      if (hit) return { matched: true, matchMethod: "product_id", confidence: "high", product: hit };
    }
    if (url) {
      const urlHit = await store.index("by-url").get(url);
      if (urlHit) return { matched: true, matchMethod: "url", confidence: "high", product: urlHit };
    }
    if (productName) {
      const nameHit = await store.index("by-name").get(productName);
      if (nameHit) return { matched: true, matchMethod: "exact_name", confidence: "medium", product: nameHit };
      const lower = productName.toLowerCase().trim();
      let cursor = await store.openCursor();
      while (cursor) {
        const pName = cursor.value.Identity?.ProductName;
        if (pName && pName.toLowerCase().trim() === lower) {
          return { matched: true, matchMethod: "case_insensitive_name", confidence: "medium", product: cursor.value };
        }
        cursor = await cursor.continue();
      }
      const normalize = (name) => name.toLowerCase().replace(/\s*[0-9]+(?:\.[0-9]+)?\s*(g|kg|ml|l|pc|pcs)/g, "").replace(/\s*pack/g, "").replace(/\s*p\/kg/g, "").replace(/\s+/g, " ").trim();
      const normSearch = normalize(productName);
      if (normSearch) {
        let fCursor = await store.openCursor();
        while (fCursor) {
          const pName = fCursor.value.Identity?.ProductName;
          if (pName && normalize(pName) === normSearch) {
            return { matched: true, matchMethod: "normalized_name", confidence: "low", product: fCursor.value };
          }
          fCursor = await fCursor.continue();
        }
      }
    }
    return { matched: false, matchMethod: "none", confidence: "none", reason: "No matching record found" };
  }
  return __toCommonJS(db_exports);
})();