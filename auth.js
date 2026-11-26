// Единый модуль доступа и полноширинного окна без скрытия панели задач Windows
const ALLOWED_USERS = {
  "859435297": ["all"]
  // Добавляйте сюда ID братьев в формате:
  // "123456789": ["all"],
  // "987654321": ["sira", "fiqh", "quran"],
};

const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000;

function getTelegramUserId() {
  try {
    if (
      window.Telegram &&
      window.Telegram.WebApp &&
      window.Telegram.WebApp.initDataUnsafe &&
      window.Telegram.WebApp.initDataUnsafe.user &&
      window.Telegram.WebApp.initDataUnsafe.user.id
    ) {
      return String(window.Telegram.WebApp.initDataUnsafe.user.id);
    }
  } catch (e) {}
  return null;
}

function isInsideTelegram() {
  return Boolean(getTelegramUserId());
}

function getCurrentUserId() {
  const tgId = getTelegramUserId();
  if (tgId) {
    try { localStorage.setItem("madrasah_uid", tgId); } catch (e) {}
    return tgId;
  }
  try {
    const params = new URLSearchParams(window.location.search);
    const urlUid = params.get("uid") || params.get("id");
    if (urlUid && /^\d+$/.test(urlUid.trim())) {
      localStorage.setItem("madrasah_uid", urlUid.trim());
      return urlUid.trim();
    }
    const saved = localStorage.getItem("madrasah_uid");
    if (saved && /^\d+$/.test(saved.trim())) {
      return saved.trim();
    }
  } catch (e) {}
  return "guest";
}

// Синхронизация серверного времени для защиты 24-часового триала
let serverTimeOffsetMs = 0;

function syncServerTime() {
  try {
    fetch(window.location.pathname + "?ping=" + Date.now(), {
      method: "HEAD",
      cache: "no-store"
    })
      .then(function (res) {
        const d = res.headers.get("Date");
        if (d) {
          const ms = new Date(d).getTime();
          if (!isNaN(ms)) {
            serverTimeOffsetMs = ms - Date.now();
            updateMaxSeenTime(getTrustedNow());
          }
        }
      })
      .catch(function () {});
  } catch (e) {}
}

function getTrustedNow() {
  return Date.now() + serverTimeOffsetMs;
}

function updateMaxSeenTime(nowMs) {
  try {
    const prevMax = Number(localStorage.getItem("madrasah_max_seen") || "0");
    if (nowMs > prevMax) {
      localStorage.setItem("madrasah_max_seen", String(nowMs));
    }
  } catch (e) {}
}

function isClockTampered() {
  try {
    const prevMax = Number(localStorage.getItem("madrasah_max_seen") || "0");
    const now = getTrustedNow();
    if (prevMax > 0 && now + 60000 < prevMax) {
      return true;
    }
    updateMaxSeenTime(now);
  } catch (e) {}
  return false;
}

function getTrialState() {
  const uid = getCurrentUserId();
  if (!isInsideTelegram() || uid === "guest") {
    return { status: "unavailable", remainingMs: 0 };
  }
  if (isClockTampered()) {
    return { status: "expired", remainingMs: 0 };
  }
  try {
    const rawStart = localStorage.getItem("madrasah_trial_start_" + uid);
    if (!rawStart) {
      return { status: "available", remainingMs: TRIAL_DURATION_MS };
    }
    const elapsed = getTrustedNow() - Number(rawStart);
    if (elapsed >= TRIAL_DURATION_MS || elapsed < -60000) {
      return { status: "expired", remainingMs: 0 };
    }
    return { status: "active", remainingMs: TRIAL_DURATION_MS - elapsed };
  } catch (e) {
    return { status: "available", remainingMs: TRIAL_DURATION_MS };
  }
}

function startTrial24h() {
  const uid = getCurrentUserId();
  if (!isInsideTelegram() || uid === "guest") return false;
  const state = getTrialState();
  if (state.status === "expired") return false;
  if (state.status === "active") return true;
  try {
    const now = getTrustedNow();
    localStorage.setItem("madrasah_trial_start_" + uid, String(now));
    updateMaxSeenTime(now);
    return true;
  } catch (e) {
    return false;
  }
}

function hasCourseAccess(courseCode) {
  const uid = getCurrentUserId();
  const perms = ALLOWED_USERS[uid];
  if (Array.isArray(perms) && (perms.includes("all") || perms.includes(courseCode))) {
    return true;
  }
  return getTrialState().status === "active";
}

function protectCoursePage(courseCode) {
  syncServerTime();
  const check = function () {
    if (!hasCourseAccess(courseCode)) {
      const uid = getCurrentUserId();
      document.body.innerHTML =
        '<div style="max-width:440px;margin:48px auto;padding:24px;background:#E5ECE6;border:1px solid #8FA695;border-radius:16px;text-align:center;font-family:system-ui,-apple-system,sans-serif;color:#1A281F;">' +
        '<div style="font-size:40px;margin-bottom:12px;">🔒</div>' +
        '<h2 style="margin:0 0 10px;font-size:20px;color:#1F523F;">Доступ к курсу закрыт</h2>' +
        '<p style="margin:0 0 18px;font-size:14px;line-height:1.5;color:#435749;">' +
        "Ваш ID: <b>" + uid + "</b>.<br>" +
        "Вернитесь в главное меню, чтобы активировать ознакомительный доступ (в Telegram) или обратитесь к администратору." +
        "</p>" +
        '<a href="../index.html?uid=' + encodeURIComponent(uid) + '" style="display:inline-block;padding:12px 22px;background:#1F523F;color:#F5F8F5;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">' +
        "Назад" +
        "</a>" +
        "</div>";
    }
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", check);
  } else {
    check();
  }
}

window.checkAccess = protectCoursePage;

// Проверка, что запуск идёт на ПК (Windows / macOS / Linux)
function isDesktopDevice() {
  try {
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.platform) {
      const p = String(window.Telegram.WebApp.platform).toLowerCase();
      if (p === "tdesktop" || p === "macos" || p === "linux" || p === "web" || p === "weba" || p === "webk") {
        return true;
      }
      if (p === "android" || p === "ios") {
        return false;
      }
    }
  } catch (e) {}
  return !/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
}

// Переключатель широкого окна на ПК БЕЗ скрытия панели задач Windows (не использует requestFullscreen)
function toggleDesktopWindow() {
  const isWideMode = window.innerWidth >= 700 || Boolean(window.opener);

  if (isWideMode) {
    // Если открыто как отдельное широкое окно — закрываем его и возвращаемся в компактное окно
    if (window.opener) {
      window.close();
      return;
    }
    try {
      window.resizeTo(430, Math.min(820, screen.availHeight));
    } catch (e) {}
    return;
  }

  // Формируем ссылку с сохранением ID пользователя
  const url = new URL(window.location.href);
  const uid = getCurrentUserId();
  if (uid && uid !== "guest") {
    url.searchParams.set("uid", uid);
  }

  // Размеры рабочей области экрана за вычетом панели задач Windows (availWidth x availHeight)
  const w = Math.min(1180, screen.availWidth - 40);
  const h = screen.availHeight - 20;
  const left = Math.max(0, Math.round((screen.availWidth - w) / 2));
  const top = 0;

  const popup = window.open(
    url.toString(),
    "madrasah_desktop_window",
    "width=" + w + ",height=" + h + ",left=" + left + ",top=" + top + ",resizable=yes,scrollbars=yes"
  );

  if (!popup) {
    try {
      if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.openLink) {
        window.Telegram.WebApp.openLink(url.toString());
      } else {
        window.open(url.toString(), "_blank");
      }
    } catch (e) {}
  }
}

function initDesktopRoundToggle() {
  if (!isDesktopDevice()) return;
  if (document.getElementById("madrasahWinToggle")) return;

  const btn = document.createElement("button");
  btn.id = "madrasahWinToggle";
  btn.type = "button";
  btn.style.cssText =
    "width:34px;height:34px;min-width:34px;border-radius:50%;" +
    "background:#E5ECE6;border:1px solid #8FA695;color:#1F523F;" +
    "display:inline-flex;align-items:center;justify-content:center;" +
    "cursor:pointer;padding:0;flex-shrink:0;" +
    "box-shadow:0 2px 6px rgba(0,0,0,0.12);";

  const svgExpand =
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="2.4 1.8">' +
    '<rect x="2.5" y="2.5" width="11" height="11" rx="2"/>' +
    "</svg>";

  const svgRestore =
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6">' +
    '<rect x="4.5" y="2.5" width="9" height="9" rx="1.5" stroke-dasharray="2.2 1.6"/>' +
    '<path d="M2.5 5.5v7a1.5 1.5 0 0 0 1.5 1.5h7" stroke-linecap="round"/>' +
    "</svg>";

  function syncIcon() {
    const isWide = window.innerWidth >= 700 || Boolean(window.opener);
    btn.innerHTML = isWide ? svgRestore : svgExpand;
    btn.title = isWide ? "Свернуть в компактное окно" : "Развернуть в широкое окно (с панелью задач)";
  }

  syncIcon();
  window.addEventListener("resize", syncIcon);
  btn.addEventListener("click", toggleDesktopWindow);

  // Встраиваем кругляшок в верхнюю панель (главной или любого курса)
  const topBar = document.querySelector(".top-bar, .top-nav, .topbar");
  if (topBar) {
    topBar.appendChild(btn);
  }
}

// Инициализация Telegram WebApp (только expand по высоте, без requestFullscreen)
(function initTelegramSafe() {
  try {
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
      if (window.Telegram.WebApp.setHeaderColor) {
        window.Telegram.WebApp.setHeaderColor("#1F523F");
      }
      if (window.Telegram.WebApp.setBackgroundColor) {
        window.Telegram.WebApp.setBackgroundColor("#364B3D");
      }
    }
  } catch (e) {}
})();

document.addEventListener("DOMContentLoaded", initDesktopRoundToggle);
syncServerTime();
