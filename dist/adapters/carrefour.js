/**
 * Carrefour Kenya Retailer Adapter
 * Implements IRetailerAdapter contract
 * Primary ID: numeric product ID from anchor href "/p/<id>"
 * Fallback:   name_hash
 */

const CarrefourAdapter = {
  getRetailerCode() {
    return "CARREFOUR";
  },

  // Confirmed real container id for the "My Cart" list -- also reused
  // by detectProducts()/getObserveTarget() to scope badging away from
  // the Best Sellers carousel. content.js uses this to decide whether
  // a successful scan should be logged to shopping history.
  isCartPage() {
    return !!document.getElementById("entries-SLOTTED");
  },

  getObserveTarget() {
    return document.getElementById("entries-SLOTTED")
      || document.querySelector("[data-testid='product-grid']")
      || document.querySelector(".css-19y7shm")?.parentElement
      || document.body;
  },

  detectProducts() {
    const products = [];

    // On the cart page, "My Cart" line items live inside a confirmed
    // real container (id="entries-SLOTTED") -- scoping detection to
    // just that excludes the "Best Sellers" upsell carousel and
    // anything else on the page that also happens to contain product
    // links. Falls back to a full-page search when that container
    // isn't present (i.e. everywhere that isn't the cart page).
    const cartList = document.getElementById("entries-SLOTTED");
    const searchRoot = cartList || document;

    // Most robust way: find ALL product links first. A product link is an anchor containing "/p/" or "/product/".
    const productLinks = searchRoot.querySelectorAll("a[href*='/p/'], a[href*='/product/']");
    const processedCards = new Set();

    productLinks.forEach(anchor => {
      // Find the closest container that likely represents the whole card
      let card = anchor.closest("li") ||
                 anchor.closest("[data-testid='product-card']") || 
                 anchor.closest(".cl-product-card") || 
                 anchor.closest("li[class*='product']") ||
                 anchor.closest("div[class*='product-card']") ||
                 anchor.closest("div[class*='ProductCard']") ||
                 anchor.closest("div[class*='css-']");

      if (!card) card = anchor.parentElement;
      if (!card || processedCards.has(card)) return;
      if (card.hasAttribute("data-nutriscore-scanned") && !this.isCartPage()) return;

      processedCards.add(card);

      // 1. Extract Product ID from the href
      let retailerProductId = null;
      const match = anchor.href.match(/\/(?:p|product)\/(\d+)/);
      if (match) retailerProductId = match[1];
      if (!retailerProductId) {
        retailerProductId = card.getAttribute("data-product-id") || card.getAttribute("data-id") || null;
      }

      // 2. Extract Name
      let name = "";
      const nameEl = card.querySelector("[data-testid='product-title'], h2, h3, h4, [class*='title'], [class*='name']");
      if (nameEl) name = nameEl.textContent?.trim() || "";
      
      if (!name) {
        name = anchor.getAttribute("title") || anchor.getAttribute("aria-label") || "";
      }
      
      if (!name) {
         const text = anchor.textContent?.trim() || "";
         if (text && !text.match(/^kes\s*[\d,.]+$/i)) {
             name = text;
         }
      }

      if (!name) return;

      // 3. Extract Price
      let priceNumeric = 0;
      const priceEl = card.querySelector("[data-testid='product-price'], [class*='price'], [class*='Price'], .css-10n2u0s, .css-1bndvqp");
      if (priceEl) {
        const priceText = priceEl.textContent?.trim() || "";
        priceNumeric = parseFloat(priceText.replace(/[^0-9.]/g, "")) || 0;
      }

      products.push({
        domElement:         card,
        id:                 retailerProductId,
        name:               name,
        nameHash:           null,
        price:              priceNumeric,
        scrapedCategory:    "",
        url:                anchor.href
      });
    });

    return products;
  },

  // Climbs up from a detected product element to find the actual
  // full-width row/card container. detectProducts() sometimes matches
  // a narrower inner wrapper (e.g. just the image+name column) rather
  // than the whole card, which would anchor the badge too far from
  // the row's real edge -- but on grid listing pages, climbing too far
  // would land on the entire grid instead of one tile. Growth is
  // capped both in absolute width and per-step ratio so it stops at a
  // single row/card either way.
  findRowAnchor(el, maxWidth = 700, maxStepRatio = 2.5) {
    let bestNode = el;
    let bestWidth = el.getBoundingClientRect().width;
    let node = el;
    for (let i = 0; i < 6 && node && node !== document.body; i++) {
      const parent = node.parentElement;
      if (!parent) break;
      const parentWidth = parent.getBoundingClientRect().width;
      if (parentWidth > maxWidth || parentWidth > bestWidth * maxStepRatio) break;
      bestNode = parent;
      bestWidth = parentWidth;
      node = parent;
    }
    return bestNode;
  },

  // ── Shared UI renderer (same design as NaivasAdapter) ──────────────────
  injectBadge(card, productResult, price) {
    // On the cart page a card can be re-verified on every mutation (see
    // content.js reconcileCart) even when it already has a badge -- clear
    // any prior one first so re-verification updates in place instead of
    // stacking duplicates.
    card.querySelectorAll(".nutriscore-isolated-root").forEach(el => el.remove());

    const anchorEl = this.findRowAnchor(card);
    if (anchorEl !== card) {
      const currentPosition = getComputedStyle(anchorEl).position;
      if (currentPosition === "static") anchorEl.style.position = "relative";
    }

    const badgeContainer = document.createElement("div");
    badgeContainer.className  = "nutriscore-isolated-root";
    badgeContainer.style.cssText = "position:absolute;top:8px;right:8px;z-index:1000;";

    const shadow = badgeContainer.attachShadow({ mode: "open" });

    const gradeColors = {
      A: { bg: "#008246", txt: "#ffffff", label: "Excellent" },
      B: { bg: "#3cb371", txt: "#ffffff", label: "Good" },
      C: { bg: "#ffcc00", txt: "#111111", label: "Moderate" },
      D: { bg: "#ff6600", txt: "#ffffff", label: "Poor" },
      E: { bg: "#e63b2e", txt: "#ffffff", label: "Very Poor" },
    };

    const grade  = (productResult.nutriscore_grade || "C").toUpperCase();
    const info   = gradeColors[grade] || gradeColors.C;
    const name   = this.escapeHTML(productResult.product_name || "");
    const prof   = productResult.nutritional_profile_display || {};
    const diseaseWarnings = productResult.diseaseWarnings || [];
    const disclaimer      = productResult.diseaseDisclaimer || "";

    // ── Ingredient Quantities Panel ──────────────────────────────────
    const rawRows = [
      { label: "Energy",        val: prof.energy_kj,  unit: "kJ" },
      { label: "Fat",           val: prof.fat_g,      unit: "g" },
      { label: "Saturated Fat", val: prof.sat_fat_g,  unit: "g" },
      { label: "Carbohydrates", val: prof.carbs_g,    unit: "g" },
      { label: "Sugars",        val: prof.sugars_g,   unit: "g" },
      { label: "Fibre",         val: prof.fibre_g,    unit: "g" },
      { label: "Protein",       val: prof.protein_g,  unit: "g" },
      { label: "Sodium",        val: prof.sodium_mg,  unit: "mg" },
    ];

    const rows = rawRows
      .filter(r => r.val != null && r.val !== 0 && r.val !== "0")
      .map(r => ({ label: r.label, value: `${r.val} ${r.unit}` }));

    const nutriRowsHTML = rows.map(r => `
      <div class="ns-row">
        <span class="ns-label">${r.label}</span>
        <span class="ns-value">${r.value}</span>
      </div>`).join("");

    // ── Disease Warning Pills ────────────────────────────────────────
    const diseaseHTML = diseaseWarnings.length ? `
      <div class="ns-disease-block">
        <div class="ns-disease-title">⚠ Dietary Flags</div>
        ${diseaseWarnings.map(w => `
          <div class="ns-disease-pill">
            <strong>${this.escapeHTML(w.disease)}</strong> — ${this.escapeHTML(w.condition)}
            <span class="ns-qty">${this.escapeHTML(w.triggerQuantity)}</span>
          </div>`).join("")}
        ${disclaimer ? `<div class="ns-disclaimer">${this.escapeHTML(disclaimer)}</div>` : ""}
      </div>` : "";

    // ── Confidence indicator ─────────────────────────────────────────
    const conf = productResult.confidence || "";
    const confLabel = conf === "retailer_label" ? "📊 From label"
                    : conf === "category_default" ? "📋 Category est."
                    : conf ? "⚠ Estimated" : "";

    const styles = `
      *{box-sizing:border-box;margin:0;padding:0}
      .badge-trigger{
        font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
        background:var(--ns-bg);color:var(--ns-txt);
        font-weight:800;font-size:15px;
        width:32px;height:32px;border-radius:10px;
        box-shadow:0 2px 6px rgba(0,0,0,.2);
        cursor:pointer;display:grid;place-items:center;
        transition:transform .15s;user-select:none;
      }
      .badge-trigger:hover{transform:scale(1.05)}
      .flyout{
        display:none;position:absolute;top:calc(100% + 6px);left:0;
        width:268px;background:#fff;border-radius:10px;
        box-shadow:0 10px 30px rgba(0,0,0,.18);
        padding:14px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
        color:#222;font-size:12px;z-index:9999;
        border:1px solid #e8e8e8;
      }
      .flyout.open{display:block}
      .ns-header{
        background:var(--ns-bg);color:var(--ns-txt);
        padding:8px 10px;border-radius:7px;margin-bottom:10px;
      }
      .ns-header-name{font-weight:700;font-size:13px;line-height:1.3;margin-bottom:2px;}
      .ns-header-grade{font-size:11px;opacity:.9}
      .ns-section-title{
        font-size:10px;font-weight:700;text-transform:uppercase;
        letter-spacing:.8px;color:#777;margin:8px 0 4px;
      }
      .ns-row{
        display:flex;justify-content:space-between;align-items:center;
        padding:4px 0;border-bottom:1px solid #f0f0f0;
      }
      .ns-row:last-child{border-bottom:none}
      .ns-label{color:#555;font-size:11px}
      .ns-value{font-weight:600;font-size:11px;color:#111}
      .ns-conf{font-size:9px;color:#aaa;margin-top:6px;font-style:italic;}
      .ns-disease-block{
        margin-top:10px;padding-top:8px;border-top:2px solid #ffe8e8;
      }
      .ns-disease-title{font-weight:700;color:#c62828;font-size:11px;margin-bottom:5px;}
      .ns-disease-pill{
        background:#fff3f3;border:1px solid #ffd0d0;color:#c62828;
        padding:5px 7px;border-radius:5px;margin-bottom:4px;font-size:10px;
        display:flex;justify-content:space-between;align-items:center;
      }
      .ns-qty{
        background:#c62828;color:#fff;padding:1px 5px;
        border-radius:3px;font-size:9px;font-weight:700;flex-shrink:0;margin-left:6px;
      }
      .ns-disclaimer{font-size:9px;color:#999;margin-top:4px;font-style:italic;}
    `;

    if (!this.sharedStyleSheet) {
      this.sharedStyleSheet = new CSSStyleSheet();
      this.sharedStyleSheet.replaceSync(styles);
    }
    shadow.adoptedStyleSheets = [this.sharedStyleSheet];

    shadow.innerHTML = `
      <div class="badge-trigger" style="--ns-bg: ${info.bg}; --ns-txt: ${info.txt};" title="NutriScore ${grade} — ${info.label}">${grade}</div>
      <div class="flyout">
        <button class="ns-close" style="display:none"></button>
        <div class="ns-header" style="--ns-bg: ${info.bg}; --ns-txt: ${info.txt};">
          <div class="ns-header-name">${name}</div>
          <div class="ns-header-grade">NutriScore ${grade} — ${info.label}</div>
        </div>
        <div class="ns-section-title">Per 100g / 100ml</div>
        ${nutriRowsHTML}
        ${confLabel ? `<div class="ns-conf">${confLabel}</div>` : ""}
        ${diseaseHTML}
      </div>
    `;

    const trigger = shadow.querySelector(".badge-trigger");
    const flyout  = shadow.querySelector(".flyout");

    trigger.addEventListener("click", e => {
      e.preventDefault(); e.stopPropagation();
      flyout.classList.toggle("open");
    });
    const closeBtn = shadow.querySelector(".ns-close");
    if (closeBtn) closeBtn.addEventListener("click", () => flyout.classList.remove("open"));

    // Force relative positioning without reading computed style to avoid Layout Thrashing
    card.setAttribute("data-nutriscore-id", productResult.productId || "");
    anchorEl.appendChild(badgeContainer);
    return shadow;
  },

  extractCartAction(target) {
    const btn = target.closest("button, a");
    if (!btn) return null;
    const txt = (btn.textContent || "").toLowerCase();
    if (!txt.includes("add") && !txt.includes("cart") && !(btn.className || "").includes("tocart")) return null;
    
    const card = btn.closest("[data-testid='product-card'], .cl-product-card, li[class*='product'], div[class*='product-card'], div[class*='ProductCard']");
    if (!card) return null;
    if (card.getAttribute("data-nutriscore-scanned") !== "complete") return null;
    
    const productId = card.getAttribute("data-nutriscore-id");
    if (!productId) return null;
    
    const priceEl = card.querySelector("[data-testid='product-price'], [class*='price'], [class*='Price'], .css-10n2u0s, .css-1bndvqp");
    const price = priceEl ? parseFloat((priceEl.textContent || "").replace(/[^0-9.]/g, "")) : 0;
    
    return {
      productId,
      retailer: "CARREFOUR",
      priceSnapshot: price || null
    };
  },

  escapeHTML(str) {
    if (typeof str !== "string") return String(str ?? "");
    return str.replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  }
};

window.RetailerAdapter = CarrefourAdapter;