(function() {
  const ALLOWED_IDS = [
    "859435297"
  ];

  const TRIAL_KEY = "madrasah_trial_start_v1";
  const TRIAL_HOURS = 24;

  function getTelegramUser() {
    try {
      if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
        return window.Telegram.WebApp.initDataUnsafe.user;
      }
    } catch (e) {}
    return null;
  }

  function getUserId() {
    const params = new URLSearchParams(window.location.search);
    const urlUid = params.get("uid");
    if (urlUid && /^\d+$/.test(urlUid.trim())) {
      try { localStorage.setItem("madrasah_uid", urlUid.trim()); } catch (e) {}
      return urlUid.trim();
    }
    const tgUser = getTelegramUser();
    if (tgUser && tgUser.id) {
      const idStr = String(tgUser.id);
      try { localStorage.setItem("madrasah_uid", idStr); } catch (e) {}
      return idStr;
    }
    try {
      const saved = localStorage.getItem("madrasah_uid");
      if (saved && /^\d+$/.test(saved)) return saved;
    } catch (e) {}
    return "";
  }

  function isInsideTelegram() {
    try {
      return Boolean(window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData && window.Telegram.WebApp.initData.length > 0);
    } catch (e) {
      return false;
    }
  }

  function checkTrialStatus() {
    if (!isInsideTelegram()) return { active: false, remainingHours: 0 };
    try {
      let start = Number(localStorage.getItem(TRIAL_KEY) || "0");
      const now = Date.now();
      if (!start) {
        start = now;
        localStorage.setItem(TRIAL_KEY, String(start));
      }
      const elapsedMs = now - start;
      const limitMs = TRIAL_HOURS * 3600 * 1000;
      if (elapsedMs < limitMs) {
        const rem = Math.max(1, Math.ceil((limitMs - elapsedMs) / (3600 * 1000)));
        return { active: true, remainingHours: rem };
      }
    } catch (e) {}
    return { active: false, remainingHours: 0 };
  }

  function checkAccess() {
    const uid = getUserId();
    if (uid && ALLOWED_IDS.includes(uid)) {
      return { allowed: true, mode: "full", uid: uid };
    }
    const trial = checkTrialStatus();
    if (trial.active) {
      return { allowed: true, mode: "trial", uid: uid, remainingHours: trial.remainingHours };
    }
    return { allowed: false, mode: "locked", uid: uid };
  }

  function initTelegramExpand() {
    try {
      if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
      }
    } catch (e) {}
  }

  window.toggleWideWindow = function() {
    const containers = document.querySelectorAll(".container, .wrap");
    const isWide = document.body.classList.toggle("wide-view");
    containers.forEach(function(el) {
      el.style.maxWidth = isWide ? "1120px" : "720px";
    });
    try {
      if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.expand();
      }
    } catch (e) {}
  };

  window.getMadrasahAuth = function() {
    return checkAccess();
  };

  window.protectCoursePage = function(courseKey) {
    initTelegramExpand();
    const auth = checkAccess();
    const uid = auth.uid;

    if (uid) {
      document.querySelectorAll('a[href*="index.html"]').forEach(function(link) {
        const href = link.getAttribute("href");
        if (href && href.indexOf("uid=") === -1) {
          link.setAttribute("href", href + (href.indexOf("?") === -1 ? "?" : "&") + "uid=" + encodeURIComponent(uid));
        }
      });
    }

    if (!auth.allowed) {
      document.body.innerHTML = '<div style="max-width:480px;margin:40px auto;padding:24px;background:#E5ECE6;color:#1A281F;border-radius:16px;border:1px solid #8FA695;text-align:center;font-family:sans-serif;">' +
        '<h2 style="margin:0 0 10px;color:#1F523F;">Доступ ограничен</h2>' +
        '<p style="margin:0 0 14px;font-size:14px;line-height:1.5;">Пробный 24-часовой доступ завершён или страница открыта вне бота.</p>' +
        '<p style="margin:0;font-size:13px;color:#435749;">Ваш ID: <strong>' + (uid || "не определён") + '</strong></p>' +
        '</div>';
    }
  };

  initTelegramExpand();
})();
