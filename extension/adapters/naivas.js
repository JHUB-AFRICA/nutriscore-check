/**
 * Naivas Retailer Adapter
 * Implements IRetailerAdapter contract
 */

const NaivasAdapter = {
  getRetailerCode() {
    return "NAIVAS";
  },

  // No confirmed selector yet for Naivas' actual cart page/list (the
  // Carrefour equivalent, #entries-SLOTTED, was found via a live
  // DevTools inspection -- Naivas hasn't had the same check done).
  // Returns false for now, so cart-page logging simply doesn't fire
  // here yet rather than risk logging things that aren't really in
  // the cart. Same diagnostic approach as Carrefour would confirm the
  // real container if/when needed.
  isCartPage() {
    return false;
  },

  getObserveTarget() {
    return document.querySelector(".products.wrapper.grid.products-grid") || document.querySelector(".page-main") || document.body;
  },

  detectProducts() {
    const products = [];
    const productSelector = "[class*='border-naivas-bg'], .product-item";
    const nameSelector = "span.line-clamp-2, [class*='line-clamp'], .product-item-name a, a[href*='.html'], h3, h4";
    const priceSelector = "span[class*='text-naivas-green'], .product-price, .price-box .price, .price";
    const categorySelector = ".category-description, .items.breadcrumbs, .breadcrumb, .page-title-wrapper";
    
    // Category extraction
    let categoryText = "";
    document.querySelectorAll(categorySelector).forEach(el => {
      categoryText += " " + (el?.textContent?.trim() || "");
    });
    const pageCategory = categoryText.toLowerCase();

    const cards = document.querySelectorAll(productSelector);

    cards.forEach((card) => {
      if (card.hasAttribute("data-nutriscore-scanned") && !this.isCartPage()) return;

      const nameEl = card.querySelector(nameSelector);
      let name = nameEl?.textContent?.trim() || "";
      if (!name && nameEl?.tagName?.toLowerCase() === 'a') {
        name = nameEl?.getAttribute("title") || nameEl?.getAttribute("aria-label") || "";
      }

      if (!name) return;

      let priceNumeric = 0;
      const priceEl = card.querySelector(priceSelector);
      if (priceEl) {
        let priceText = priceEl?.textContent?.trim() || "";
        priceNumeric = parseFloat(priceText.replace(/[^0-9.]/g, "")) || 0;
      }

      const id = card.getAttribute("data-product-id") || card.getAttribute("data-sku") || null;
      const hash = card.getAttribute("data-original-hash") || null;

      // Pull the URL from the anchor that actually wraps the product name
      // (nameEl), not just "the first a[href] in the card". Naivas cards
      // also contain a wishlist-heart anchor (href="javascript:void(0)")
      // that appears earlier in the DOM than the real product link -- a
      // blind card.querySelector("a[href]") grabs that instead, and since
      // every card's wishlist anchor has the identical "javascript:void(0)"
      // href, every product on the page ended up sharing the same url and
      // therefore the same product_cache key in db.js, causing every badge
      // after the first to silently display the first scanned product's
      // info (Aug 2026).
      let productUrl = null;
      const nameAnchor = nameEl?.closest ? nameEl.closest("a[href]") : null;
      if (nameAnchor && !/^javascript:/i.test(nameAnchor.getAttribute("href") || "")) {
        productUrl = nameAnchor.href;
      } else {
        const realLink = [...card.querySelectorAll("a[href]")]
          .find(a => !/^javascript:/i.test(a.getAttribute("href") || ""));
        productUrl = realLink ? realLink.href : null;
      }

      products.push({
        domElement: card,
        id: id,
        name: name,
        nameHash: hash,
        price: priceNumeric,
        scrapedCategory: pageCategory,
        url: productUrl
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
    badgeContainer.className = "nutriscore-isolated-root";
    badgeContainer.style.cssText = "position:absolute;top:8px;right:8px;z-index:1000;";

    const shadow = badgeContainer.attachShadow({ mode: "open" });

    const gradeColors = {
      A: { bg: "#008246", txt: "#ffffff", label: "Excellent" },
      B: { bg: "#3cb371", txt: "#ffffff", label: "Good" },
      C: { bg: "#ffcc00", txt: "#111111", label: "Moderate" },
      D: { bg: "#ff6600", txt: "#ffffff", label: "Poor" },
      E: { bg: "#e63b2e", txt: "#ffffff", label: "Very Poor" },
    };

    const rawGrade = (productResult.nutriscore_grade || "UNKNOWN").toUpperCase();
    // A product with no score (UNKNOWN/NULL -- e.g. excluded categories or
    // unmatched items) must never silently fall back to gradeColors.C: that
    // renders as a real yellow "Moderate" badge, which misrepresents an
    // unscored product as an actually-scored moderate one.
    const isNoData = rawGrade === "UNKNOWN" || rawGrade === "NULL" || !gradeColors[rawGrade];
    const grade = isNoData ? "—" : rawGrade;
    const info  = isNoData ? { bg: "#e0e0e0", txt: "#555555", label: "No data" } : gradeColors[grade];
    const name   = this.escapeHTML(productResult.product_name || "");
    const prof   = productResult.nutritional_profile_display || {};
    const diseaseWarnings = productResult.diseaseWarnings || [];
    const disclaimer      = productResult.diseaseDisclaimer || "";

    // Ingredient Quantities (per 100g/100ml) — NOVA removed
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
      .badge-trigger.badge-nodata{
        width:auto;padding:0 8px;border-radius:8px;font-size:10px;font-weight:700;
        letter-spacing:.2px;
      }
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
      <div class="badge-trigger${isNoData ? ' badge-nodata' : ''}" style="--ns-bg: ${info.bg}; --ns-txt: ${info.txt};" title="NutriScore ${isNoData ? 'No data' : grade + ' — ' + info.label}">${isNoData ? 'No data' : grade}</div>
      <div class="flyout">
        <button class="ns-close" style="display:none"></button>
        <div class="ns-header" style="--ns-bg: ${info.bg}; --ns-txt: ${info.txt};">
          <div class="ns-header-name">${name}</div>
          <div class="ns-header-grade">${isNoData ? 'No NutriScore data available' : 'NutriScore ' + grade + ' — ' + info.label}</div>
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

    card.setAttribute("data-nutriscore-id", productResult.productId || "");
    anchorEl.appendChild(badgeContainer);
    return shadow;
  },

  extractCartAction(target) {
    const btn = target.closest("button, a");
    if (!btn) return null;
    const txt = (btn.textContent || "").toLowerCase();
    if (!txt.includes("add") && !txt.includes("cart") && !(btn.className || "").includes("tocart")) return null;
    
    const card = btn.closest("[class*='border-naivas-bg'], .product-item");
    if (!card) return null;
    if (card.getAttribute("data-nutriscore-scanned") !== "complete") return null;
    
    const productId = card.getAttribute("data-nutriscore-id");
    if (!productId) return null;
    
    const priceEl = card.querySelector("span[class*='text-naivas-green'], .product-price, .price-box .price, .price");
    const price = priceEl ? parseFloat((priceEl.textContent || "").replace(/[^0-9.]/g, "")) : 0;
    
    return {
      productId,
      retailer: "NAIVAS",
      priceSnapshot: price || null
    };
  },

  escapeHTML(str) {
    if (typeof str !== "string") return String(str ?? "");
    return str.replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  }
};

window.RetailerAdapter = NaivasAdapter;