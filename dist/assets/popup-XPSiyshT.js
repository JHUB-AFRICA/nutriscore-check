// popup.js — vanilla JS version of the popup logic (no build step required)

document.addEventListener("DOMContentLoaded", () => {
  const statusDot = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");
  const scoreCount = document.getElementById("scoreCount");

  const signInBtn = document.getElementById("signInBtn");
  const accountSignedIn = document.getElementById("accountSignedIn");
  const signOutBtn = document.getElementById("signOutBtn");
  const accountEmail = document.getElementById("accountEmail");
  const avatarImg = document.getElementById("avatarImg");
  const avatarFallback = document.getElementById("avatarFallback");

  const dashboardBtn = document.getElementById("dashboardBtn");
  const healthDetailsBtn = document.getElementById("healthDetailsBtn");
  const healthDetailsPanel = document.getElementById("healthDetailsPanel");
  let healthPanelOpen = false;
  let currentHealthProfile = null;

  function renderSiteStatus(active, siteName) {
    statusDot.classList.toggle("active", !!active);
    statusText.textContent = active ? `Active on ${siteName}` : "Not a supported store";
  }

  function renderScoreCount(count) {
    scoreCount.textContent = count || 0;
  }

  function renderAccount(user) {
    if (user) {
      signInBtn.hidden = true;
      accountSignedIn.hidden = false;
      accountEmail.textContent = user.email || "";

      if (user.picture) {
        avatarImg.src = user.picture;
        avatarImg.hidden = false;
        avatarFallback.hidden = true;
      } else {
        avatarFallback.textContent = (user.email || "?")[0].toUpperCase();
        avatarFallback.hidden = false;
        avatarImg.hidden = true;
      }
    } else {
      signInBtn.hidden = false;
      accountSignedIn.hidden = true;
      healthDetailsBtn.classList.remove("has-data");
      currentHealthProfile = null;
      healthPanelOpen = false;
      healthDetailsPanel.style.display = "none";
    }
  }

  function formatList(items) {
    if (!items || items.length === 0) return "None selected";
    return items
      .map((v) => v.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))
      .join(", ");
  }

  function renderHealthProfile(health) {
    healthDetailsBtn.classList.toggle("has-data", !!health);
    currentHealthProfile = health;

    if (healthPanelOpen) {
      paintHealthPanel();
    }
  }

  function renderChipGroup(label, items) {
    const chips =
      items && items.length
        ? items
            .map(
              (v) =>
                `<span style="display:inline-block; padding:3px 10px; border-radius:999px; background:var(--accent-soft); color:var(--accent); font-size:0.74rem; font-weight:700; margin:2px 4px 2px 0;">${v
                  .replace(/-/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase())}</span>`
            )
            .join("")
        : '<span style="color:var(--muted);">None selected</span>';

    return `<div style="margin-bottom:10px;">
      <p style="margin:0 0 6px; font-weight:700; color:var(--text); font-size:0.78rem;">${label}</p>
      <div>${chips}</div>
    </div>`;
  }

  function paintHealthPanel() {
    if (!currentHealthProfile) {
      healthDetailsPanel.innerHTML =
        '<p style="margin:0; color:var(--muted);">No health details saved yet. Add them on the NutriScore website and they\'ll show up here.</p>';
      return;
    }

    healthDetailsPanel.innerHTML =
      renderChipGroup("Health conditions", currentHealthProfile.conditions) +
      renderChipGroup("Dietary preferences", currentHealthProfile.dietaryPreferences);
  }

  // --- Site status + scored count ---------------------------------------
  if (typeof chrome !== "undefined" && chrome.tabs) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab || !tab.id || !tab.url) return;

      const url = new URL(tab.url);
      chrome.tabs.sendMessage(tab.id, { action: "GET_PAGE_STATS" }, (res) => {
        if (chrome.runtime.lastError) {
          renderSiteStatus(false);
          return;
        }
        if (res) {
          const hostname = url.hostname.replace("www.", "");
          renderSiteStatus(true, hostname);
          renderScoreCount(res.count || 0);
        }
      });
    });
  }

  // --- Account state on load ----------------------------------------------
  if (typeof chrome !== "undefined" && chrome.runtime) {
    chrome.runtime.sendMessage({ action: "GET_SIGNED_IN_USER" }, (res) => {
      if (res && res.status === "SUCCESS" && res.data) {
        renderAccount(res.data);
      }
    });

    chrome.runtime.sendMessage({ action: "GET_HEALTH_PROFILE" }, (res) => {
      if (res && res.status === "SUCCESS") {
        renderHealthProfile(res.data);
      }
    });
  }

  // --- Sign in / out --------------------------------------------------------
  // Sign-in happens directly in the extension via launchWebAuthFlow, which
  // opens Google's own account picker — see signInWithGooglePicker() in
  // background.js.
  signInBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "SIGN_IN" }, (res) => {
      if (res && res.status === "SUCCESS") {
        renderAccount(res.data);
      } else {
        console.error("Sign-in failed:", res && res.error);
      }
    });
  });

  signOutBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "SIGN_OUT" }, (res) => {
      if (res && res.status === "SUCCESS") {
        renderAccount(null);
      }
    });
  });

  // --- Health details --------------------------------------------------------
  healthDetailsBtn.addEventListener("click", () => {
    healthPanelOpen = !healthPanelOpen;
    healthDetailsPanel.style.display = healthPanelOpen ? "block" : "none";
    if (healthPanelOpen) {
      paintHealthPanel();
    }
  });

  // --- Dashboard --------------------------------------------------------
  dashboardBtn.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
});