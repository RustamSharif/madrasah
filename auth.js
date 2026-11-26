(function () {
  var ALLOWED_IDS = [
    "859435297"
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
    return "";
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
    var statusBadgeEl = document.getElementById("userAccessBadge");
    if (idTextEl) {
      idTextEl.textContent = "Ваш ID: " + access.uid;
    }
    if (statusBadgeEl) {
      if (access.mode === "full") {
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

  window.protectCoursePage = function () {
    var access = checkAccess();
    appendUidToLinks(access.uid);
    if (!access.allowed) {
      document.body.innerHTML =
        '<div style="max-width:480px;margin:40px auto;padding:24px;background:#E5ECE6;color:#1A281F;border-radius:16px;border:1px solid #8FA695;text-align:center;font-family:sans-serif;">' +
        '<h2 style="margin-top:0;color:#1F523F;">Пробный период завершён</h2>' +
        '<p>Ваш ID: <strong>' + access.uid + '</strong></p>' +
        '<p style="font-size:14px;color:#435749;">Для получения постоянного доступа ко всем разделам библиотеки обратитесь к администратору бота.</p>' +
        '</div>';
    }
  };

  document.addEventListener("DOMContentLoaded", function () {
    var access = checkAccess();
    updateIdBar(access);
    appendUidToLinks(access.uid);
  });
})();
