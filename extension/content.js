/**
 * Content Script
 * Component Layer: Client / Frontend Extension Layer
 * Constraints (Component Diagram v1.0):
 *   - NO business logic, classification, or disease evaluation
 *   - Only: adapter routing, MutationObserver, message relay, badge injection via adapter
 */

class NutriScoreContentEngine {
  constructor() {
    this.adapter      = window.RetailerAdapter || null;
    this.processedElements = new Set();
    this.observer     = null;
    this.debounceTimer = null;
    // Guards against re-logging the same cart line item if the retailer's
    // page re-renders the DOM (e.g. on quantity change) within one visit.
    this.loggedThisSession = new Set();
    // Keys missing from the live cart on the most recent reconcileCart()
    // pass, not yet confirmed removed -- see reconcileCart() for why.
    this.pendingRemoval = new Set();
    // Cached CHECK_PRODUCT_SCORE results, keyed the same way as
    // loggedThisSession (prodInfo.id || prodInfo.name) -- lets the cart
    // reconciliation pass re-badge a card whose DOM node got reused by the
    // retailer's framework without re-fetching the score over the network.
    this.productResultCache = new Map();
  }

  init() {
    if (!this.adapter) {
      console.warn("[NutriScore] No RetailerAdapter found on window.RetailerAdapter. Aborting.");
      return;
    }
    console.log(`[NutriScore] Adapter loaded: ${this.adapter.getRetailerCode()}`);
    this.activeFlyouts = new Set();

    document.addEventListener("click", (e) => {
      if (this.adapter && this.adapter.extractCartAction) {
        const cartAction = this.adapter.extractCartAction(e.target);
        if (cartAction) {
          chrome.runtime.sendMessage({
            action: "LOG_CART_EVENT",
            payload: cartAction
          });
        }
      }
      if (this.activeFlyouts.size === 0) return;
      const path = e.composedPath();
      for (const shadow of this.activeFlyouts) {
        // Garbage collect detached shadows
        if (!shadow.host || !document.contains(shadow.host)) {
          this.activeFlyouts.delete(shadow);
          continue;
        }
        if (!path.includes(shadow.host)) {
          const flyout = shadow.querySelector(".flyout");
          if (flyout && flyout.classList.contains("open")) {
            flyout.classList.remove("open");
          }
        }
      }
    });

    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.action === "GET_PAGE_STATS") {
        const count = document.querySelectorAll('[data-nutriscore-scanned="complete"]').length;
        const retailer = this.adapter ? this.adapter.getRetailerCode() : null;
        sendResponse({ count, retailer });
      }
    });

    // 150ms debounce per topology specification (NFR-002, EV-002 lazy-loaded grids)
    this.observer = new MutationObserver(mutations => {
      const isCart = this.adapter.isCartPage && this.adapter.isCartPage();

      if (isCart) {
        // On the cart page, any change (add OR remove) needs a full
        // reconciliation pass -- see reconcileCart() for why removal
        // can't be inferred from raw MutationObserver removedNodes here
        // (the retailer's framework reuses/reindexes DOM nodes when the
        // list shrinks, so "which node was removed" doesn't reliably
        // correspond to "which product the customer removed").
        const changed = mutations.some(m => m.addedNodes.length > 0 || m.removedNodes.length > 0);
        if (changed) {
          if (this.debounceTimer) clearTimeout(this.debounceTimer);
          this.debounceTimer = setTimeout(() => this.reconcileCart(), 300);
        }
        return;
      }

      if (mutations.some(m => m.addedNodes.length > 0)) {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => this.scanAndInject(), 300);
      }
    });

    const observeTarget = (this.adapter.getObserveTarget && this.adapter.getObserveTarget()) || document.body;
    this.observer.observe(observeTarget, { childList: true, subtree: true });

    this.notFoundCache = new Set();
    if (this.adapter.isCartPage && this.adapter.isCartPage()) {
      this.reconcileCart();
    } else {
      this.scanAndInject();
    }
  }

  scanAndInject() {
    if (!this.adapter) return;

    const products = this.adapter.detectProducts();

    products.forEach(prodInfo => {
      const card = prodInfo.domElement;
      const cacheKey = prodInfo.id || prodInfo.name;

      if (this.processedElements.has(card)) return;
      if (cacheKey && this.notFoundCache.has(cacheKey)) {
        card.setAttribute("data-nutriscore-scanned", "not-found");
        return;
      }

      // Mark pending to prevent duplicate async fetches
      card.setAttribute("data-nutriscore-scanned", "pending");
      this.processedElements.add(card);
      

      chrome.runtime.sendMessage(
        {
          action:  "CHECK_PRODUCT_SCORE",
          retailer: this.adapter.getRetailerCode(),
          payload: {
            product_name:        prodInfo.name,
            name_hash:           prodInfo.nameHash || null,
            retailer_product_id: prodInfo.id || null,
            url:                 prodInfo.url || null
          }
        },
        response => {
          if (chrome.runtime.lastError) {
            console.warn("[NutriScore] SW message error:", chrome.runtime.lastError.message);
            card.removeAttribute("data-nutriscore-scanned");
            this.processedElements.delete(card);
            return;
          }

          if (response && response.status === "SUCCESS" && response.data) {
            const product = response.data;
            card.setAttribute("data-nutriscore-scanned", "complete");
            card.setAttribute("data-nutriscore-grade",   product.nutriscore_grade);
            // Delegate all UI rendering to the adapter (no logic here)
            const shadowRoot = this.adapter.injectBadge(card, product, prodInfo.price);
            if (shadowRoot) this.activeFlyouts.add(shadowRoot);
            // Cart-page logging lives in reconcileCart()/applyBadgeAndLog()
            // now -- this method is only ever called for listing pages.
          } else {
            card.setAttribute("data-nutriscore-scanned", "not-found");
            if (cacheKey) this.notFoundCache.add(cacheKey);
          }
        }
      );
    });
  }

  // Compares the cart's current live contents against what we've logged
  // this session, instead of trying to interpret which DOM node was
  // structurally removed. This is what actually makes removal detection
  // reliable: the retailer's cart re-renders by index, so removing one
  // item can reuse/reindex the remaining items' DOM nodes rather than
  // cleanly removing just the one node for the removed product -- raw
  // MutationObserver removedNodes ends up pointing at the wrong product
  // (or the wrong number of products) when that happens. detectProducts()
  // always reads current DOM content fresh, so re-running it and diffing
  // against loggedThisSession is accurate regardless of node reuse.
  reconcileCart() {
    if (!this.adapter) return;

    const products = this.adapter.detectProducts();
    const currentKeys = new Set(products.map(p => p.id || p.name).filter(Boolean));

    // Don't act on a single snapshot -- the retailer's own cart usually
    // recalculates (subtotal, delivery threshold, etc.) via its own API
    // call after each removal, which can render the list empty or
    // partial for a moment before the real updated one arrives. Reading
    // that transient state as "everything was removed" was very likely
    // what caused this to work for a while and then misbehave again
    // partway through a sequence of removals -- it only goes wrong when
    // reconciliation happens to land inside that window. Requiring a key
    // to be missing on two consecutive passes (300ms apart) before
    // treating it as a real removal filters that out, at the cost of one
    // extra debounce cycle of latency on genuine removals.
    const missingNow = new Set();
    for (const key of this.loggedThisSession) {
      if (!currentKeys.has(key)) missingNow.add(key);
    }
    for (const key of this.pendingRemoval) {
      if (missingNow.has(key)) {
        this.loggedThisSession.delete(key);
        this.productResultCache.delete(key);
        chrome.runtime.sendMessage({ action: "REMOVE_CART_EVENT", payload: { productId: key } });
      }
    }
    this.pendingRemoval = missingNow;

    // The second confirmation pass above normally arrives on its own,
    // triggered by whatever mutation the retailer's real update causes
    // (there's almost always at least one, since anything involving a
    // server round-trip is inherently a separate mutation batch from the
    // initial optimistic DOM update). But a purely local, single-shot
    // removal with no follow-up render wouldn't generate a second
    // mutation at all -- without this, that key would stay stuck in
    // pendingRemoval forever, waiting on a confirmation pass that never
    // comes. This guarantees one arrives regardless.
    if (missingNow.size > 0) {
      if (this.removalConfirmTimer) clearTimeout(this.removalConfirmTimer);
      this.removalConfirmTimer = setTimeout(() => this.reconcileCart(), 800);
    } else if (this.removalConfirmTimer) {
      clearTimeout(this.removalConfirmTimer);
      this.removalConfirmTimer = null;
    }

    products.forEach(prodInfo => this.processCartItem(prodInfo));
  }

  // Per-item half of reconcileCart(). Split out so a cached result (from
  // an earlier CHECK_PRODUCT_SCORE this visit) can re-badge a reused DOM
  // node instantly, without waiting on -- or repeating -- a network call.
  processCartItem(prodInfo) {
    const card = prodInfo.domElement;
    const cacheKey = prodInfo.id || prodInfo.name;
    if (!cacheKey) return;

    const cached = this.productResultCache.get(cacheKey);
    if (cached) {
      this.applyBadgeAndLog(card, cacheKey, prodInfo, cached);
      return;
    }

    // A reused node re-enters this on every reconciliation pass until its
    // lookup resolves -- avoid firing a second one while it's in flight.
    if (card.getAttribute("data-nutriscore-scanned") === "pending") return;
    card.setAttribute("data-nutriscore-scanned", "pending");

    chrome.runtime.sendMessage(
      {
        action:  "CHECK_PRODUCT_SCORE",
        retailer: this.adapter.getRetailerCode(),
        payload: {
          product_name:        prodInfo.name,
          name_hash:           prodInfo.nameHash || null,
          retailer_product_id: prodInfo.id || null,
          url:                 prodInfo.url || null
        }
      },
      response => {
        if (chrome.runtime.lastError) {
          console.warn("[NutriScore] SW message error:", chrome.runtime.lastError.message);
          card.removeAttribute("data-nutriscore-scanned");
          return;
        }
        if (response && response.status === "SUCCESS" && response.data) {
          this.productResultCache.set(cacheKey, response.data);
          this.applyBadgeAndLog(card, cacheKey, prodInfo, response.data);
        } else {
          card.setAttribute("data-nutriscore-scanned", "not-found");
        }
      }
    );
  }

  // Shared tail of both the cached and freshly-fetched paths in
  // processCartItem(): paints the badge and, the first time this cacheKey
  // is seen this visit, logs it to shopping_ledger. Row shape is matched
  // exactly to what the dashboard's compiled bundle reads (flat
  // sodiumMg/sugarsG/satFatG fields, not nested; name/category/grade for
  // the table; addedAt for sorting). The `id` prefix here (cacheKey) is
  // the same key REMOVE_CART_EVENT matches against in db.js, so it must
  // stay derived from prodInfo (retailer-scraped identity), not from
  // product.productId (our own catalog-matching id) -- the two aren't
  // guaranteed to agree, and reconciliation depends on one consistent key.
  applyBadgeAndLog(card, cacheKey, prodInfo, product) {
    card.setAttribute("data-nutriscore-scanned", "complete");
    card.setAttribute("data-nutriscore-grade",   product.nutriscore_grade);

    // injectBadge() adds a DOM node, which the same MutationObserver that
    // called reconcileCart() is watching -- re-running it every pass even
    // when nothing changed would re-trigger reconcileCart() forever (badge
    // added -> mutation fires -> reconcile -> badge "re"-added -> ...).
    // Skipping when the badge is already correct breaks that loop.
    // injectBadge() appends the badge to findRowAnchor(card), which can be
    // an ancestor of card rather than card itself -- check there, not on
    // card, or an already-correct badge would never be found and this
    // would re-inject (and re-trigger the mutation loop) every pass.
    const badgeAnchor = (this.adapter.findRowAnchor && this.adapter.findRowAnchor(card)) || card;
    const badgeCurrent =
      badgeAnchor.querySelector(":scope > .nutriscore-isolated-root") &&
      card.getAttribute("data-nutriscore-grade") === product.nutriscore_grade;
    if (!badgeCurrent) {
      const shadowRoot = this.adapter.injectBadge(card, product, prodInfo.price);
      if (shadowRoot) this.activeFlyouts.add(shadowRoot);
    }

    if (!this.loggedThisSession.has(cacheKey)) {
      this.loggedThisSession.add(cacheKey);
      const nutrition = product.nutritional_profile_display || {};
      chrome.runtime.sendMessage({
        action: "LOG_CART_EVENT",
        payload: {
          id:       `${cacheKey}-${Date.now()}`,
          addedAt:  Date.now(),
          name:     product.product_name || prodInfo.name,
          category: product.fsaCategory || "GENERAL_FOOD",
          grade:    product.nutriscore_grade,
          sodiumMg: Number(nutrition.sodium_mg) || 0,
          sugarsG:  Number(nutrition.sugars_g)  || 0,
          satFatG:  Number(nutrition.sat_fat_g) || 0
        }
      });
    }
  }
}

// Boot after a short delay to let the adapter script fully initialise
setTimeout(() => {
  const engine = new NutriScoreContentEngine();
  engine.init();
}, 300);