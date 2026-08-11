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
  const refreshBtn = document.getElementById("refreshBtn");
  const healthDetailsBtn = document.getElementById("healthDetailsBtn");
  const healthDetailsPanel = document.getElementById("healthDetailsPanel");
  let healthPanelOpen = false;
  let currentHealthProfile = null;

  // Re-pulls signed-in user + health profile from the background worker and
  // re-renders. Used after sign-in, by the manual refresh button, and by
  // the auto-update listener below.
  function reloadAccountState() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "GET_SIGNED_IN_USER" }, (userRes) => {
        renderAccount(userRes && userRes.status === "SUCCESS" ? userRes.data : null);
        chrome.runtime.sendMessage({ action: "GET_HEALTH_PROFILE" }, (healthRes) => {
          renderHealthProfile(healthRes && healthRes.status === "SUCCESS" ? healthRes.data : null);
          resolve();
        });
      });
    });
  }

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
    reloadAccountState();
  }


  // --- Sign in / out --------------------------------------------------------
  // Sign-in happens directly in the extension via launchWebAuthFlow, which
  // opens Google's own account picker — see signInAndLoadHealthProfile() in
  // background.js. That flow opens a separate OAuth window, which steals
  // focus and closes this popup before the sign-in finishes — so instead of
  // relying on this click handler's own callback (which may never fire on a
  // closed popup), we rely on two things to keep the badge current:
  //   1) reloadAccountState() here, for the (less common) case this popup is
  //      still open when sign-in completes.
  //   2) the chrome.storage.onChanged listener below, which live-updates any
  //      popup that happens to be open the moment background.js writes the
  //      new user/healthProfile — no manual reopen or extension reload needed.
  signInBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "SIGN_IN" }, (res) => {
      if (res && res.status === "SUCCESS") {
        reloadAccountState();
      } else if (res) {
        console.error("Sign-in failed:", res.error);
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

  // Auto-update: whenever background.js writes a fresh user/healthProfile to
  // storage (e.g. sign-in completing in a separate OAuth window after this
  // popup lost focus, or a refreshed profile), any popup instance still open
  // picks it up immediately — this is the "auto-reload" behavior.
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      if (changes.user) renderAccount(changes.user.newValue || null);
      if (changes.healthProfile) renderHealthProfile(changes.healthProfile.newValue || null);
    });
  }

  // Manual refresh button: re-pulls account + health profile on demand —
  // useful right after signing in from a closed popup (the case the
  // auto-update above can't catch), or after editing the health profile on
  // the website and wanting it reflected here without waiting.
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      refreshBtn.classList.add("spinning");
      reloadAccountState().finally(() => {
        setTimeout(() => refreshBtn.classList.remove("spinning"), 300);
      });
    });
  }

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