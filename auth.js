(function () {
  var ADMIN_IDS = [
    "859435297"
  ];

  var ALLOWED_IDS = [
    "859435297",
    "806762570",
    "1665058233",
    "897958974",
  ];

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

  function isAdminUser(uid) {
    return Boolean(uid && ADMIN_IDS.indexOf(String(uid).trim()) !== -1);
  }

  function isInsideTelegram() {
    try {
      return Boolean(window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData && window.Telegram.WebApp.initData.length > 0);
    } catch (e) {
      return false;
    }
  }

  function checkAccess() {
    var uid = getTgUserId();
    if (uid && isAdminUser(uid)) {
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
      if (!href || href.indexOf("http") === 0 || href.indexOf("#") === 0 || href.indexOf("javascript:") === 0) continue;
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

  function applyContentProtection(uid) {
    if (isAdminUser(uid)) {
      return;
    }

    var label = uid && uid !== "—" ? ("ID: " + uid) : "ЗАЩИЩЕНО";

    var styleEl = document.createElement("style");
    styleEl.id = "madrasah-guard-style";
    styleEl.textContent = [
      "html, body, .container, .card, .chapter-card, .cheat-content, .sheet-body, .question-text, .option-btn {",
      "  -webkit-user-select: none !important;",
      "  -moz-user-select: none !important;",
      "  -ms-user-select: none !important;",
      "  user-select: none !important;",
      "  -webkit-touch-callout: none !important;",
      "}",
      "@media print {",
      "  html, body { display: none !important; }",
      "}",
      "#madrasah-watermark-layer {",
      "  position: fixed;",
      "  inset: 0;",
      "  pointer-events: none;",
      "  z-index: 99998;",
      "  overflow: hidden;",
      "  opacity: 0.085;",
      "  display: flex;",
      "  flex-wrap: wrap;",
      "  align-content: space-around;",
      "  justify-content: space-around;",
      "  transform: rotate(-24deg) scale(1.25);",
      "}",
      ".madrasah-wm-item {",
      "  font-family: sans-serif;",
      "  font-size: 13px;",
      "  font-weight: 700;",
      "  color: #1A281F;",
      "  padding: 26px 32px;",
      "  white-space: nowrap;",
      "}",
      "#madrasah-blur-shield {",
      "  position: fixed;",
      "  inset: 0;",
      "  background: rgba(24, 62, 48, 0.96);",
      "  backdrop-filter: blur(14px);",
      "  -webkit-backdrop-filter: blur(14px);",
      "  z-index: 99999;",
      "  display: none;",
      "  align-items: center;",
      "  justify-content: center;",
      "  text-align: center;",
      "  color: #F4F7F4;",
      "  font-family: sans-serif;",
      "  padding: 24px;",
      "}",
      "#madrasah-blur-shield.active {",
      "  display: flex;",
      "}"
    ].join("\n");
    (document.head || document.documentElement).appendChild(styleEl);

    function mountOverlays() {
      if (!document.body) return;

      if (!document.getElementById("madrasah-watermark-layer")) {
        var wmLayer = document.createElement("div");
        wmLayer.id = "madrasah-watermark-layer";
        var html = "";
        for (var i = 0; i < 36; i++) {
          html += '<span class="madrasah-wm-item">' + label + "</span>";
        }
        wmLayer.innerHTML = html;
        document.body.appendChild(wmLayer);
      }

      if (!document.getElementById("madrasah-blur-shield")) {
        var shield = document.createElement("div");
        shield.id = "madrasah-blur-shield";
        shield.innerHTML =
          "<div>" +
          '<div style="font-size:38px;margin-bottom:10px;">🛡️</div>' +
          '<div style="font-size:17px;font-weight:700;margin-bottom:6px;">Материалы защищены от копирования</div>' +
          '<div style="font-size:13.5px;color:#CFE0D6;">Вернитесь в окно приложения для продолжения обучения</div>' +
          "</div>";
        document.body.appendChild(shield);
      }
    }

    if (document.body) {
      mountOverlays();
    } else {
      document.addEventListener("DOMContentLoaded", mountOverlays);
    }

    function setShield(visible) {
      var shield = document.getElementById("madrasah-blur-shield");
      if (!shield) return;
      if (visible) shield.classList.add("active");
      else shield.classList.remove("active");
    }

    document.addEventListener("contextmenu", function (e) {
      e.preventDefault();
    });

    document.addEventListener("copy", function (e) {
      e.preventDefault();
    });

    document.addEventListener("cut", function (e) {
      e.preventDefault();
    });

    document.addEventListener("selectstart", function (e) {
      e.preventDefault();
    });

    document.addEventListener("dragstart", function (e) {
      e.preventDefault();
    });

    document.addEventListener("keydown", function (e) {
      var key = (e.key || "").toLowerCase();
      if (e.key === "PrintScreen" || e.keyCode === 44) {
        setShield(true);
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText("");
          }
        } catch (err) {}
        setTimeout(function () {
          setShield(false);
        }, 1600);
      }
      if ((e.ctrlKey || e.metaKey) && (key === "c" || key === "u" || key === "s" || key === "p" || key === "a" || key === "x")) {
        e.preventDefault();
      }
      if (e.key === "F12" || ((e.ctrlKey || e.metaKey) && e.shiftKey && (key === "i" || key === "j" || key === "c"))) {
        e.preventDefault();
      }
    });

    document.addEventListener("visibilitychange", function () {
      setShield(document.hidden);
    });

    window.addEventListener("blur", function () {
      setShield(true);
    });

    window.addEventListener("focus", function () {
      setShield(false);
    });
  }

  window.getCurrentUserId = function () {
    return getTgUserId() || "guest";
  };

  window.protectCoursePage = function () {
    var access = checkAccess();
    appendUidToLinks(access.uid);
    if (!access.allowed) {
      document.body.innerHTML =
        '<div style="max-width:480px;margin:40px auto;padding:24px;background:#E5ECE6;color:#1A281F;border-radius:16px;border:1px solid #8FA695;text-align:center;font-family:sans-serif;">' +
        '<h2 style="margin-top:0;color:#1F523F;">Пробный период завершён</h2>' +
        "<p>Ваш ID: <strong>" + access.uid + "</strong></p>" +
        '<p style="font-size:14px;color:#435749;">Для получения постоянного доступа ко всем разделам библиотеки обратитесь к администратору бота.</p>' +
        "</div>";
      return;
    }
    applyContentProtection(access.uid);
  };

  document.addEventListener("DOMContentLoaded", function () {
    var access = checkAccess();
    updateIdBar(access);
    appendUidToLinks(access.uid);
    if (access.allowed) {
      applyContentProtection(access.uid);
    }
  });
})();
