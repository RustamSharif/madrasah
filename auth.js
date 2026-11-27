(function () {
  // Вписывайте каждый новый ID с новой строки (без кавычек и запятых):
  var ALLOWED_IDS_TEXT = `
    859435297
  `;

  // Список ID администраторов (полный доступ + отключение водяных знаков и защиты)
  var ADMIN_IDS = [
    "859435297"
  ];

  var ALLOWED_IDS = ALLOWED_IDS_TEXT
    .split(/[\s,;]+/)
    .map(function (id) { return id.trim(); })
    .filter(function (id) { return id.length > 0; });

  var TRIAL_KEY = "madrasah_trial_start_v1";
  var TRIAL_MS = 24 * 60 * 60 * 1000;

  function getTgUserId() {
    try {
      if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
        return String(window.Telegram.WebApp.initDataUnsafe.user.id);
      }
    } catch (e) {}
    try {
      var params = new URLSearchParams(window.location.search);
      var uid = params.get("uid");
      if (uid) return String(uid).trim();
    } catch (e) {}
    try {
      var saved = localStorage.getItem("madrasah_uid");
      if (saved) return String(saved).trim();
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

  function isAdmin(uid) {
    return Boolean(uid && ADMIN_IDS.indexOf(String(uid)) !== -1);
  }

  function checkAccess() {
    var uid = getTgUserId();
    if (uid) {
      try { localStorage.setItem("madrasah_uid", uid); } catch (e) {}
    }
    if (isAdmin(uid)) {
      return { allowed: true, mode: "admin", uid: uid };
    }
    if (uid && ALLOWED_IDS.indexOf(uid) !== -1) {
      return { allowed: true, mode: "full", uid: uid };
    }
    if (isInsideTelegram()) {
      var now = Date.now();
      var start = Number(localStorage.getItem(TRIAL_KEY) || "0");
      if (!start) {
        start = now;
        localStorage.setItem(TRIAL_KEY, String(start));
      }
      if (now - start <= TRIAL_MS) {
        return { allowed: true, mode: "trial", uid: uid || "Гость" };
      }
      return { allowed: false, mode: "expired", uid: uid || "Не определён" };
    }
    return { allowed: true, mode: "guest", uid: uid || "—" };
  }

  function appendUidToLinks(uid) {
    if (!uid || uid === "—" || uid === "Гость") return;
    var links = document.querySelectorAll("a[href]");
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute("href");
      if (!href || href.indexOf("http") === 0 || href.indexOf("#") === 0 || href.indexOf("javascript:") === 0 || href.indexOf("mailto:") === 0) continue;
      if (href.indexOf("uid=") === -1) {
        var sep = href.indexOf("?") === -1 ? "?" : "&";
        links[i].setAttribute("href", href + sep + "uid=" + encodeURIComponent(uid));
      }
    }
  }

  function updateIdBar(access) {
    var idTextEl = document.getElementById("userIdDisplay");
    var statusBadgeEl = document.getElementById("userAccessBadge") || document.getElementById("accessStatusDisplay");
    if (idTextEl) {
      idTextEl.textContent = "Ваш ID: " + access.uid;
    }
    if (statusBadgeEl) {
      if (access.mode === "admin") {
        statusBadgeEl.textContent = "Режим администратора";
      } else if (access.mode === "full") {
        statusBadgeEl.textContent = "Полный доступ";
      } else if (access.mode === "trial") {
        statusBadgeEl.textContent = "Пробный доступ (24 ч)";
      } else if (access.mode === "expired") {
        statusBadgeEl.textContent = "Доступ ограничен";
      } else {
        statusBadgeEl.textContent = "Ознакомительный режим";
      }
    }
  }

  function enableContentProtection(uid) {
    if (isAdmin(uid)) return;

    var label = uid && uid !== "—" ? ("ID: " + uid) : "MADRASAH";

    // 1. Запрет выделения текста и печати
    var style = document.createElement("style");
    style.textContent =
      "body, .container, .card, .chapter-card, .cheat-content, .sheet-body { " +
      "  -webkit-user-select: none !important; " +
      "  -moz-user-select: none !important; " +
      "  -ms-user-select: none !important; " +
      "  user-select: none !important; " +
      "  -webkit-touch-callout: none !important; " +
      "} " +
      "@media print { body { display: none !important; } }";
    document.head.appendChild(style);

    // 2. Динамический водяной знак с ID пользователя
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="140">' +
      '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" ' +
      'transform="rotate(-24 110 70)" fill="#1A281F" fill-opacity="0.065" ' +
      'font-family="sans-serif" font-size="15" font-weight="700">' +
      label +
      "</text></svg>";
    var wmOverlay = document.createElement("div");
    wmOverlay.setAttribute("aria-hidden", "true");
    wmOverlay.style.cssText =
      "position:fixed;inset:0;pointer-events:none;z-index:9998;" +
      "background-repeat:repeat;background-image:url(\"data:image/svg+xml," +
      encodeURIComponent(svg) +
      "\");";
    document.body.appendChild(wmOverlay);

    // 3. Защитная шторка при сворачивании или потере фокуса
    var blurShield = document.createElement("div");
    blurShield.style.cssText =
      "display:none;position:fixed;inset:0;z-index:99999;" +
      "background:rgba(24,62,48,0.96);backdrop-filter:blur(12px);" +
      "-webkit-backdrop-filter:blur(12px);color:#F4F7F4;" +
      "align-items:center;justify-content:center;text-align:center;" +
      "padding:24px;font-family:sans-serif;";
    blurShield.innerHTML =
      "<div><div style=\"font-size:36px;margin-bottom:10px;\">🔒</div>" +
      "<div style=\"font-size:17px;font-weight:700;margin-bottom:6px;\">Содержимое скрыто</div>" +
      "<div style=\"font-size:13.5px;color:#D7E5DC;\">Вернитесь в окно приложения для продолжения чтения</div></div>";
    document.body.appendChild(blurShield);

    function showShield() { blurShield.style.display = "flex"; }
    function hideShield() { blurShield.style.display = "none"; }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) showShield();
      else hideShield();
    });
    window.addEventListener("blur", showShield);
    window.addEventListener("focus", hideShield);

    // 4. Блокировка копирования, контекстного меню и PrintScreen
    document.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    document.addEventListener("copy", function (e) { e.preventDefault(); });
    document.addEventListener("cut", function (e) { e.preventDefault(); });
    document.addEventListener("dragstart", function (e) { e.preventDefault(); });

    document.addEventListener("keydown", function (e) {
      if (e.key === "PrintScreen") {
        showShield();
        try { navigator.clipboard.writeText(""); } catch (err) {}
        setTimeout(hideShield, 1500);
      }
      if ((e.ctrlKey || e.metaKey) && ["c", "u", "s", "p", "a"].indexOf(e.key.toLowerCase()) !== -1) {
        e.preventDefault();
      }
    });
  }

  window.protectCoursePage = function () {
    var access = checkAccess();
    appendUidToLinks(access.uid);
    if (!access.allowed) {
      document.body.innerHTML =
        '<div style="max-width:480px;margin:40px auto;padding:24px;background:#E5ECE6;color:#1A281F;border-radius:16px;border:1px solid #8FA695;text-align:center;font-family:sans-serif;">' +
        '<h2 style="margin-top:0;color:#1F523F;">Пробный период завершён</h2>' +
        '<p>Ваш ID: <strong>' + access.uid + '</strong></p>' +
        '<p style="font-size:14px;color:#435749;">Для получения постоянного доступа ко всем разделам библиотеки обратитесь в поддержку бота.</p>' +
        '</div>';
    }
  };

  document.addEventListener("DOMContentLoaded", function () {
    var access = checkAccess();
    updateIdBar(access);
    appendUidToLinks(access.uid);
    enableContentProtection(access.uid);
  });
})();
