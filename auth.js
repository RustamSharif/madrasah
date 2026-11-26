// Единый чистый модуль доступа по ID, 24-часового триала и полноэкранного режима
const ALLOWED_USERS = {
  "859435297": ["all"]
  // Добавляйте сюда ID братьев в формате:
  // "123456789": ["all"],
  // "987654321": ["sira", "fiqh", "quran"],
};

const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000;

function getTelegramUserId() {
  try {
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe &&
        window.Telegram.WebApp.initDataUnsafe.user && window.Telegram.WebApp.initDataUnsafe.user.id) {
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
    const urlUid = params.get("uid");
    if (urlUid && /^\d+$/.test(urlUid.trim())) {
      localStorage.setItem("madrasah_uid", urlUid.trim());
      return urlUid.trim();
    }
    const saved = localStorage.getItem("madrasah_uid");
    if (saved && /^\d+$/.test(saved.trim())) return saved.trim();
  } catch (e) {}
  return "guest";
}

let serverTimeOffsetMs = 0;

function syncServerTime() {
  try {
    fetch(window.location.pathname + "?ping=" + Date.now(), { method: "HEAD", cache: "no-store" })
      .then((res) => {
        const d = res.headers.get("Date");
        if (d) {
          const ms = new Date(d).getTime();
          if (!isNaN(ms)) {
            serverTimeOffsetMs = ms - Date.now();
            updateMaxSeenTime(getTrustedNow());
          }
        }
      })
      .catch(() => {});
  } catch (e) {}
}

function getTrustedNow() {
  return Date.now() + serverTimeOffsetMs;
}

function updateMaxSeenTime(nowMs) {
  try {
    const prevMax = Number(localStorage.getItem("madrasah_max_seen") || "0");
    if (nowMs > prevMax) localStorage.setItem("madrasah_max_seen", String(nowMs));
  } catch (e) {}
}

function isClockTampered() {
  try {
    const prevMax = Number(localStorage.getItem("madrasah_max_seen") || "0");
    const now = getTrustedNow();
    if (prevMax > 0 && now + 60000 < prevMax) return true;
    updateMaxSeenTime(now);
  } catch (e) {}
  return false;
}

function getTrialState() {
  const uid = getCurrentUserId();
  if (!isInsideTelegram() || uid === "guest") return { status: "unavailable", remainingMs: 0 };
  if (isClockTampered()) return { status: "expired", remainingMs: 0 };
  try {
    const rawStart = localStorage.getItem("madrasah_trial_start_" + uid);
    if (!rawStart) return { status: "available", remainingMs: TRIAL_DURATION_MS };
    const elapsed = getTrustedNow() - Number(rawStart);
    if (elapsed >= TRIAL_DURATION_MS || elapsed < -60000) return { status: "expired", remainingMs: 0 };
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
  if (Array.isArray(perms) && (perms.includes("all") || perms.includes(courseCode))) return true;
  return getTrialState().status === "active";
}

function protectCoursePage(courseCode) {
  syncServerTime();
  const check = () => {
    if (!hasCourseAccess(courseCode)) {
      document.body.innerHTML = `
        <div style="max-width:440px;margin:48px auto;padding:24px;background:#E5ECE6;border:1px solid #8FA695;border-radius:16px;text-align:center;font-family:system-ui,-apple-system,sans-serif;color:#1A281F;">
          <div style="font-size:40px;margin-bottom:12px;">🔒</div>
          <h2 style="margin:0 0 10px;font-size:20px;color:#1F523F;">Доступ к курсу закрыт</h2>
          <p style="margin:0 0 18px;font-size:14px;line-height:1.5;color:#435749;">
            Ваш ID: <b>${getCurrentUserId()}</b>.<br>
            Вернитесь на главную страницу, чтобы активировать ознакомительный доступ (в Telegram) или обратитесь к администратору.
          </p>
          <a href="../index.html?uid=${encodeURIComponent(getCurrentUserId())}" class="back-btn">
            Назад
          </a>
        </div>
      `;
    }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", check);
  else check();
}
window.checkAccess = protectCoursePage;

// Разворачивание окна на ПК: сначала пробуем встроенный Fullscreen, а на узком окне Telegram Desktop открываем широко в браузере
function openWideMode() {
  const uid = getCurrentUserId();
  const url = new URL(window.location.href);
  if (uid && uid !== "guest") {
    url.searchParams.set("uid", uid);
  }
  const fullUrl = url.toString();

  try {
    if (window.Telegram && window.Telegram.WebApp) {
      const tg = window.Telegram.WebApp;
      if (typeof tg.requestFullscreen === "function" && !tg.isFullscreen) {
        tg.requestFullscreen();
      }
      if (typeof tg.expand === "function") {
        tg.expand();
      }
      // Telegram Desktop на ПК фиксирует узкое мобильное окно (~400px); если окно осталось узким — открываем широко в браузере ПК
      setTimeout(() => {
        if (window.innerWidth < 540 && typeof tg.openLink === "function") {
          tg.openLink(fullUrl);
        }
      }, 250);
      return;
    }
  } catch (e) {}

  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  } catch (e) {}
}

function initDesktopFullscreen() {
  try {
    if (window.Telegram && window.Telegram.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      if (typeof tg.expand === "function") tg.expand();
      if (tg.setHeaderColor) tg.setHeaderColor("#1F523F");
      if (tg.setBackgroundColor) tg.setBackgroundColor("#364B3D");
    }
  } catch (e) {}

  const addWideBtn = () => {
    const isDesktop =
      (window.Telegram && window.Telegram.WebApp &&
        ["tdesktop", "macos", "web", "weba", "webk"].includes(window.Telegram.WebApp.platform)) ||
      !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (!isDesktop || document.getElementById("wideModeBtn")) return;

    const btn = document.createElement("button");
    btn.id = "wideModeBtn";
    btn.type = "button";
    btn.textContent = "⛶ Широкое окно";
    btn.title = "Развернуть на весь экран компьютера";
    btn.style.cssText =
      "padding:6px 12px;border-radius:16px;border:1px solid #8FA695;background:#DCE5DD;" +
      "color:#1A281F;font-size:12.5px;font-weight:700;cursor:pointer;white-space:nowrap;flex-shrink:0;";
    btn.onclick = openWideMode;

    // На главной странице (index.html) вставляем в .top-bar рядом со статусом, внутри курсов — в .top-nav
    const topNav = document.querySelector(".top-nav, .topbar");
    const topBar = document.querySelector(".top-bar");
    if (topNav) {
      topNav.appendChild(btn);
    } else if (topBar) {
      topBar.appendChild(btn);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addWideBtn);
  } else {
    addWideBtn();
  }
}

initDesktopFullscreen();
syncServerTime();
