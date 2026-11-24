// Единый модуль доступа, защищённого 24-часового триала и оформления библиотеки
window.ALLOWED_USERS = {
  // Раскомментируйте строку ниже после проверки триал-доступа, чтобы вернуть себе постоянный доступ:
  // "859435297": ["all"],
};

(function () {
  const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000;
  const STORAGE_TRIAL_PREFIX = "madrasah_trial_v3_";
  const STORAGE_MAX_TIME_KEY = "madrasah_max_seen_time_v3";
  const STORAGE_MANUAL_UID = "madrasah_manual_uid_v1";

  let serverTimeOffset = 0;
  let serverTimeSynced = false;

  // 1. Принудительный сброс старой ночной темы и внедрение единого арабского фона + скрытие лишних кнопок
  try {
    localStorage.removeItem("theme");
    localStorage.removeItem("darkMode");
    localStorage.removeItem("madrasah_theme");
  } catch (e) {}

  const globalStyle = document.createElement("style");
  globalStyle.id = "madrasah-unified-theme";
  globalStyle.textContent = `
    html, body {
      background-color: #f6f3eb !important;
      background-image: url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%230d6e4e' stroke-width='0.8' stroke-opacity='0.08'%3E%3Cpath d='M40 0L49.5 14.5L66.5 13.5L65.5 30.5L80 40L65.5 49.5L66.5 66.5L49.5 65.5L40 80L30.5 65.5L13.5 66.5L14.5 49.5L0 40L14.5 30.5L13.5 13.5L30.5 14.5Z'/%3E%3Ccircle cx='40' cy='40' r='14'/%3E%3Cpath d='M40 20L45 35L60 40L45 45L40 60L35 45L20 40L35 35Z'/%3E%3C/g%3E%3C/svg%3E") !important;
      background-repeat: repeat !important;
      color: #1e293b !important;
    }
    /* Скрываем старые переключатели день/ночь во всех курсах */
    #themeToggle, .theme-toggle, .theme-btn, [onclick*="toggleTheme"], [onclick*="setTheme"] {
      display: none !important;
    }
    /* Скрываем кнопки Глава (PDF), Экспорт, Импорт в 40 хадисах */
    [onclick*="exportPDF"], [onclick*="printChapter"], [onclick*="exportData"], [onclick*="importData"],
    button[title*="PDF"], button[title*="Экспорт"], button[title*="Импорт"] {
      display: none !important;
    }
  `;
  (document.head || document.documentElement).appendChild(globalStyle);

  function cleanLegacyButtons() {
    document.querySelectorAll("button, a").forEach((el) => {
      const txt = (el.textContent || "").trim();
      if (
        txt === "🌙" || txt === "☀️" || txt === "🌓" ||
        txt.includes("Тёмная тема") || txt.includes("Светлая тема") ||
        txt.includes("Глава (PDF)") || txt === "Экспорт" || txt === "Импорт"
      ) {
        el.style.setProperty("display", "none", "important");
      }
    });
  }

  // 2. Синхронизация времени с сервером для защиты от перевода часов
  function syncServerTime() {
    try {
      fetch(window.location.href.split("#")[0], { method: "HEAD", cache: "no-store" })
        .then((res) => {
          const dateHdr = res.headers.get("Date");
          if (dateHdr) {
            const srvMs = Date.parse(dateHdr);
            if (!isNaN(srvMs)) {
              serverTimeOffset = srvMs - Date.now();
              serverTimeSynced = true;
              recordMaxTime(srvMs);
              if (typeof window.onMadrasahAuthUpdate === "function") {
                window.onMadrasahAuthUpdate();
              }
            }
          }
        })
        .catch(() => {});
    } catch (e) {}
  }

  function recordMaxTime(ts) {
    try {
      const prev = parseInt(localStorage.getItem(STORAGE_MAX_TIME_KEY) || "0", 10);
      if (ts > prev) {
        localStorage.setItem(STORAGE_MAX_TIME_KEY, String(ts));
      }
    } catch (e) {}
  }

  function getTrustedNow() {
    const localNow = Date.now();
    const estimatedNow = serverTimeSynced ? localNow + serverTimeOffset : localNow;
    let maxSeen = 0;
    try {
      maxSeen = parseInt(localStorage.getItem(STORAGE_MAX_TIME_KEY) || "0", 10);
    } catch (e) {}
    const trusted = Math.max(estimatedNow, maxSeen);
    recordMaxTime(trusted);
    return trusted;
  }

  // 3. Определение ID пользователя (Telegram WebApp -> URL -> localStorage)
  function getUserId() {
    try {
      if (window.Telegram && window.Telegram.WebApp) {
        try { window.Telegram.WebApp.ready(); } catch (e) {}
        const tgUser = window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user;
        if (tgUser && tgUser.id) {
          const idStr = String(tgUser.id);
          try { localStorage.setItem(STORAGE_MANUAL_UID, idStr); } catch (e) {}
          return idStr;
        }
      }
    } catch (e) {}

    try {
      const params = new URLSearchParams(window.location.search);
      const urlUid = params.get("uid");
      if (urlUid && urlUid.trim()) {
        const clean = urlUid.trim();
        try { localStorage.setItem(STORAGE_MANUAL_UID, clean); } catch (e) {}
        return clean;
      }
    } catch (e) {}

    try {
      const saved = localStorage.getItem(STORAGE_MANUAL_UID);
      if (saved && saved.trim()) return saved.trim();
    } catch (e) {}

    return "guest";
  }

  function setManualUserId(id) {
    const clean = String(id || "").trim();
    if (!clean) return;
    try { localStorage.setItem(STORAGE_MANUAL_UID, clean); } catch (e) {}
    if (typeof window.onMadrasahAuthUpdate === "function") {
      window.onMadrasahAuthUpdate();
    }
  }

  function isTelegramEnv() {
    return !!(window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData);
  }

  // 4. Проверка прав и управление 24-часовым триалом
  function getUserEntry(uid) {
    if (!uid || uid === "guest") return null;
    return window.ALLOWED_USERS[String(uid)] || null;
  }

  function hasPermanentCourseAccess(uid, courseCode) {
    const entry = getUserEntry(uid);
    if (!entry) return false;
    if (Array.isArray(entry)) {
      return entry.includes("all") || (courseCode && entry.includes(courseCode));
    }
    if (typeof entry === "object" && Array.isArray(entry.courses)) {
      if (entry.expires) {
        const expMs = Date.parse(entry.expires);
        if (!isNaN(expMs) && getTrustedNow() > expMs) return false;
      }
      return entry.courses.includes("all") || (courseCode && entry.courses.includes(courseCode));
    }
    return false;
  }

  function getTrialState(uid) {
    const key = STORAGE_TRIAL_PREFIX + (uid || "guest");
    let startMs = 0;
    try {
      startMs = parseInt(localStorage.getItem(key) || "0", 10);
    } catch (e) {}
    if (!startMs || isNaN(startMs)) {
      return { status: "available", remainingMs: TRIAL_DURATION_MS, endMs: 0 };
    }
    const endMs = startMs + TRIAL_DURATION_MS;
    const now = getTrustedNow();
    if (now < startMs) {
      // Обнаружен откат часов назад
      return { status: "expired", remainingMs: 0, endMs: endMs };
    }
    const remaining = endMs - now;
    if (remaining > 0) {
      return { status: "active", remainingMs: remaining, endMs: endMs };
    }
    return { status: "expired", remainingMs: 0, endMs: endMs };
  }

  function startTrial24h() {
    const uid = getUserId();
    const state = getTrialState(uid);
    if (state.status === "available") {
      const now = getTrustedNow();
      try {
        localStorage.setItem(STORAGE_TRIAL_PREFIX + uid, String(now));
      } catch (e) {}
    }
    if (typeof window.onMadrasahAuthUpdate === "function") {
      window.onMadrasahAuthUpdate();
    }
    updateTopCourseTimer();
    return getTrialState(uid);
  }

  function hasCourseAccess(courseCode) {
    const uid = getUserId();
    if (hasPermanentCourseAccess(uid, courseCode)) return true;
    const trial = getTrialState(uid);
    return trial.status === "active";
  }

  function formatDuration(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (n) => (n < 10 ? "0" + n : String(n));
    return `${pad(h)} ч ${pad(m)} мин ${pad(s)} сек`;
  }

  // 5. Плашка таймера внутри внутренних страниц курсов
  function isIndexPage() {
    const p = window.location.pathname.toLowerCase();
    return p.endsWith("/madrasah/") || p.endsWith("/madrasah/index.html") || p === "/" || p === "/index.html";
  }

  function updateTopCourseTimer() {
    if (isIndexPage()) return;
    const uid = getUserId();
    if (hasPermanentCourseAccess(uid, null)) {
      const oldBar = document.getElementById("madrasah-course-trial-bar");
      if (oldBar) oldBar.remove();
      return;
    }
    const state = getTrialState(uid);
    let bar = document.getElementById("madrasah-course-trial-bar");
    if (state.status === "active") {
      if (!bar) {
        bar = document.createElement("div");
        bar.id = "madrasah-course-trial-bar";
        bar.style.cssText =
          "position:sticky;top:0;z-index:9999;background:#ecfdf5;border-bottom:1px solid #a7f3d0;color:#065f46;padding:7px 12px;font-size:12px;font-weight:600;text-align:center;font-family:system-ui,-apple-system,sans-serif;";
        document.body.insertBefore(bar, document.body.firstChild);
      }
      bar.textContent = "⏳ Пробный доступ (24 ч) • Осталось: " + formatDuration(state.remainingMs);
    } else if (bar) {
      bar.remove();
    }
  }

  function protectCoursePage(courseCode) {
    if (hasCourseAccess(courseCode)) return true;
    const uid = getUserId();
    const renderLock = () => {
      document.body.innerHTML = `
        <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;font-family:system-ui,-apple-system,sans-serif;">
          <div style="max-width:400px;width:100%;background:#fff;border-radius:18px;padding:28px 22px;text-align:center;box-shadow:0 10px 25px rgba(0,0,0,0.08);border:1px solid #e2e8f0;">
            <div style="font-size:44px;margin-bottom:12px;">🔒</div>
            <h2 style="margin:0 0 10px;font-size:20px;color:#0f172a;">Доступ к курсу закрыт</h2>
            <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.5;">
              Для открытия этого тренажёра активируйте 24-часовой пробный период на главной странице или отправьте ваш ID администратору.
            </p>
            <div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:10px;padding:10px;margin-bottom:18px;font-size:13px;color:#334155;">
              Ваш ID: <strong>${uid}</strong>
            </div>
            <a href="../index.html?uid=${encodeURIComponent(uid)}" style="display:inline-block;width:100%;box-sizing:border-box;background:#0d6e4e;color:#fff;text-decoration:none;padding:12px 16px;border-radius:12px;font-weight:600;font-size:15px;">
              ← Вернуться в каталог курсов
            </a>
          </div>
        </div>
      `;
    };
    if (document.body) renderLock();
    else document.addEventListener("DOMContentLoaded", renderLock);
    return false;
  }

  window.MadrasahAuth = {
    getUserId,
    setManualUserId,
    isTelegramEnv,
    hasPermanentCourseAccess,
    hasCourseAccess,
    getTrialState,
    startTrial24h,
    formatDuration,
    protectCoursePage,
    cleanLegacyButtons
  };

  window.hasCourseAccess = hasCourseAccess;
  window.protectCoursePage = protectCoursePage;
  window.checkAccess = protectCoursePage;

  syncServerTime();

  document.addEventListener("DOMContentLoaded", () => {
    cleanLegacyButtons();
    updateTopCourseTimer();
    setInterval(() => {
      updateTopCourseTimer();
    }, 1000);

    // Повторная проверка инициализации Telegram WebApp на мобильных устройствах
    [150, 500, 1200, 2500].forEach((delay) => {
      setTimeout(() => {
        cleanLegacyButtons();
        if (typeof window.onMadrasahAuthUpdate === "function") {
          window.onMadrasahAuthUpdate();
        }
      }, delay);
    });
  });
})();
