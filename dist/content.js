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
      if (mutations.some(m => m.addedNodes.length > 0)) {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => this.scanAndInject(), 300);
      }
    });

    const observeTarget = (this.adapter.getObserveTarget && this.adapter.getObserveTarget()) || document.body;
    this.observer.observe(observeTarget, { childList: true, subtree: true });

    this.notFoundCache = new Set();
    this.scanAndInject();
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
          } else {
            card.setAttribute("data-nutriscore-scanned", "not-found");
            if (cacheKey) this.notFoundCache.add(cacheKey);
          }
        }
      );
    });
  }
}

// Boot after a short delay to let the adapter script fully initialise
setTimeout(() => {
  const engine = new NutriScoreContentEngine();
  engine.init();
}, 300);
