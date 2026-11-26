(function() {
  var ALLOWED_IDS = [
    "859435297"
  ];
  var TRIAL_DURATION_MS = 24 * 60 * 60 * 1000;
  var TRIAL_STORAGE_KEY = "madrasah_trial_start_v1";

  function getUid() {
    try {
      var tg = window.Telegram && window.Telegram.WebApp;
      if (tg) {
        if (typeof tg.ready === "function") tg.ready();
        if (typeof tg.expand === "function") tg.expand();
        if (tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id) {
          return String(tg.initDataUnsafe.user.id);
        }
      }
    } catch (e) {}

    try {
      var params = new URLSearchParams(window.location.search);
      var urlUid = params.get("uid");
      if (urlUid) return String(urlUid).trim();
    } catch (e) {}

    return "";
  }

  function hasAccess(uid) {
    if (uid && ALLOWED_IDS.indexOf(uid) !== -1) {
      return true;
    }
    try {
      var start = localStorage.getItem(TRIAL_STORAGE_KEY);
      var now = Date.now();
      if (!start) {
        localStorage.setItem(TRIAL_STORAGE_KEY, String(now));
        return true;
      }
      if (now - Number(start) <= TRIAL_DURATION_MS) {
        return true;
      }
    } catch (e) {
      return true;
    }
    return false;
  }

  var currentUid = getUid();
  window.MADRASAH_UID = currentUid;

  function appendUidToLinks() {
    if (!currentUid) return;
    var links = document.querySelectorAll("a[href]");
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      var href = a.getAttribute("href");
      if (!href || href.indexOf("http") === 0 || href.indexOf("#") === 0 || href.indexOf("mailto:") === 0) {
        continue;
      }
      if (href.indexOf("uid=") === -1) {
        var sep = href.indexOf("?") === -1 ? "?" : "&";
        a.setAttribute("href", href + sep + "uid=" + encodeURIComponent(currentUid));
      }
    }
  }

  window.protectCoursePage = function() {
    if (!hasAccess(currentUid)) {
      document.body.innerHTML =
        '<div style="max-width:480px;margin:60px auto;padding:24px;background:#E5ECE6;border:1px solid #8FA695;border-radius:16px;text-align:center;color:#1A281F;font-family:sans-serif;">' +
        '<h2 style="margin:0 0 10px;font-size:20px;">Пробный период завершён</h2>' +
        '<p style="margin:0;font-size:15px;color:#435749;">Для получения постоянного доступа ко всем разделам библиотеки обратитесь к администратору бота.</p>' +
        '</div>';
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", appendUidToLinks);
  } else {
    appendUidToLinks();
  }
})();
