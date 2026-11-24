// ============================================================================
// ЕДИНЫЙ МОДУЛЬ ДОСТУПА, ТРИАЛ-ТАЙМЕРА И ТЕМЫ ОФОРМЛЕНИЯ (auth.js)
// ============================================================================

const ALLOWED_USERS = {
  "859435297": ["all"], // Администратор (полный доступ ко всем 6 курсам)

  // Примеры добавления других пользователей:
  // "123456789": ["all"], // Полный постоянный доступ ко всем курсам
  // "987654321": ["sira", "nawawi", "fiqh", "tajweed", "adab", "aqeedah"], // Доступ к выбранным курсам
  // "555444333": { courses: ["all"], expires: "2026-12-31T23:59:59" }, // Временный доступ до даты
};

const ALL_COURSE_CODES = ["sira", "nawawi", "fiqh", "tajweed", "adab", "aqeedah"];
const ADMIN_CONTACT = "@sira_exam_bot";

(function () {
  "use strict";

  const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000;
  const KEY_SAVED_UID = "madrasah_saved_uid_v2";
  const KEY_MAX_TIME = "madrasah_max_seen_time_v2";
  const KEY_THEME = "madrasah_global_theme_v2";

  let serverTimeOffsetMs = 0;
  let clockTampered = false;

  // Инициализация Telegram WebApp (если открыто внутри ТГ)
  try {
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
  } catch (e) {}

  function getQueryParam(name) {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get(name);
    } catch (e) {
      return null;
    }
  }

  function safeGetStorage(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function safeSetStorage(key, val) {
    try {
      window.localStorage.setItem(key, String(val));
    } catch (e) {}
  }

  // Получение ID пользователя (Telegram -> URL -> localStorage)
  function getUserId() {
    try {
      const tgUser = window.Telegram &&
        window.Telegram.WebApp &&
        window.Telegram.WebApp.initDataUnsafe &&
        window.Telegram.WebApp.initDataUnsafe.user;
      if (tgUser && tgUser.id) {
        const idStr = String(tgUser.id);
        safeSetStorage(KEY_SAVED_UID, idStr);
        return idStr;
      }
    } catch (e) {}

    const urlUid = getQueryParam("uid") || getQueryParam("id");
    if (urlUid && urlUid.trim()) {
      const cleanId = urlUid.trim();
      safeSetStorage(KEY_SAVED_UID, cleanId);
      return cleanId;
    }

    const saved = safeGetStorage(KEY_SAVED_UID);
    if (saved && saved.trim()) {
      return saved.trim();
    }

    return "";
  }

  function setManualUserId(newId) {
    if (!newId) return "";
    const clean = String(newId).trim();
    safeSetStorage(KEY_SAVED_UID, clean);
    return clean;
  }

  // Текущее защищённое время (с учётом серверного смещения и защиты от отмотки часов)
  function getTrustedNow() {
    const localNow = Date.now();
    const adjustedNow = localNow + serverTimeOffsetMs;
    const prevMax = Number(safeGetStorage(KEY_MAX_TIME) || "0");

    if (prevMax > 0 && adjustedNow < prevMax - 60000) {
      clockTampered = true;
      return prevMax;
    }

    clockTampered = false;
    if (adjustedNow > prevMax) {
      safeSetStorage(KEY_MAX_TIME, adjustedNow);
    }
    return adjustedNow;
  }

  // Сверка времени с заголовком сервера GitHub (Date)
  function syncServerTime(callback) {
    try {
      fetch(window.location.pathname + "?t=" + Date.now(), {
        method: "HEAD",
        cache: "no-store"
      })
        .then(function (res) {
          const dateHeader = res.headers.get("Date");
          if (dateHeader) {
            const serverMs = Date.parse(dateHeader);
            if (!isNaN(serverMs)) {
              serverTimeOffsetMs = serverMs - Date.now();
              const realNow = Date.now() + serverTimeOffsetMs;
              const prevMax = Number(safeGetStorage(KEY_MAX_TIME) || "0");
              if (realNow >= prevMax - 60000) {
                clockTampered = false;
              }
              if (realNow > prevMax) {
                safeSetStorage(KEY_MAX_TIME, realNow);
              }
            }
          }
          if (typeof callback === "function") callback();
        })
        .catch(function () {
          if (typeof callback === "function") callback();
        });
    } catch (e) {
      if (typeof callback === "function") callback();
    }
  }

  // Работа с 24-часовым триалом (несбрасываемый)
  function getTrialStorageKeys(uid) {
    const keySuffix = uid ? uid : "browser_device";
    return {
      start: "madrasah_trial_start_" + keySuffix,
      end: "madrasah_trial_end_" + keySuffix
    };
  }

  function getTrialState(uid) {
    const userId = uid || getUserId();
    const keys = getTrialStorageKeys(userId);
    const startVal = Number(safeGetStorage(keys.start) || "0");
    const endVal = Number(safeGetStorage(keys.end) || "0");

    if (!startVal || !endVal) {
      return { status: "available", remainingMs: 0, endAt: 0 };
    }

    const now = getTrustedNow();
    if (clockTampered) {
      return { status: "tampered", remainingMs: 0, endAt: endVal };
    }

    const remaining = endVal - now;
    if (remaining > 0) {
      return { status: "active", remainingMs: remaining, endAt: endVal };
    }

    return { status: "expired", remainingMs: 0, endAt: endVal };
  }

  function startTrial24h() {
    let uid = getUserId();
    if (!uid) {
      uid = "guest_" + Math.random().toString(36).substring(2, 9);
      setManualUserId(uid);
    }

    const current = getTrialState(uid);
    if (current.status === "active" || current.status === "expired") {
      return current;
    }

    const now = getTrustedNow();
    const endAt = now + TRIAL_DURATION_MS;
    const keys = getTrialStorageKeys(uid);
    safeSetStorage(keys.start, now);
    safeSetStorage(keys.end, endAt);

    return { status: "active", remainingMs: TRIAL_DURATION_MS, endAt: endAt };
  }

  function formatDuration(ms) {
    if (ms <= 0) return "00 ч 00 мин 00 сек";
    const totalSec = Math.floor(ms / 1000);
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    const pad = function (n) {
      return n < 10 ? "0" + n : String(n);
    };
    return pad(hours) + " ч " + pad(mins) + " мин " + pad(secs) + " сек";
  }

  // Проверка прав конкретного пользователя
  function getUserRecord(uid) {
    if (!uid) return null;
    if (Object.prototype.hasOwnProperty.call(ALLOWED_USERS, uid)) {
      return ALLOWED_USERS[uid];
    }
    return null;
  }

  function hasPermanentOrManualAccess(uid, courseCode) {
    const rec = getUserRecord(uid);
    if (!rec) return false;

    if (Array.isArray(rec)) {
      return rec.includes("all") || (courseCode ? rec.includes(courseCode) : rec.length > 0);
    }

    if (typeof rec === "object" && rec !== null) {
      if (rec.expires) {
        const expMs = Date.parse(rec.expires);
        if (!isNaN(expMs) && getTrustedNow() > expMs) {
          return false;
        }
      }
      const list = Array.isArray(rec.courses) ? rec.courses : [];
      return list.includes("all") || (courseCode ? list.includes(courseCode) : list.length > 0);
    }

    return false;
  }

  function hasCourseAccess(courseCode, uidOverride) {
    const uid = uidOverride || getUserId();
    if (hasPermanentOrManualAccess(uid, courseCode)) {
      return true;
    }
    const trial = getTrialState(uid);
    return trial.status === "active";
  }

  function detectCurrentCourseCode() {
    const path = (window.location.pathname || "").toLowerCase();
    for (let i = 0; i < ALL_COURSE_CODES.length; i++) {
      const code = ALL_COURSE_CODES[i];
      if (path.indexOf("/" + code + "/") !== -1 || path.endsWith("/" + code)) {
        return code;
      }
    }
    return null;
  }

  // Защита страниц курсов (если открыли напрямую без доступа)
  function protectCoursePage(courseCode) {
    const code = courseCode || detectCurrentCourseCode();
    if (!code) return true;

    const uid = getUserId();
    if (hasCourseAccess(code, uid)) {
      return true;
    }

    const renderLockScreen = function () {
      if (!document.body) return;
      document.body.innerHTML =
        '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background:#f4f7f5;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">' +
        '<div style="max-width:440px;width:100%;background:#ffffff;border-radius:18px;padding:28px 22px;box-shadow:0 10px 30px rgba(0,0,0,0.08);text-align:center;border:1px solid #e2e8f0;">' +
        '<div style="font-size:42px;margin-bottom:12px;">🔒</div>' +
        '<h2 style="margin:0 0 10px;color:#0f5132;font-size:21px;">Доступ к курсу закрыт</h2>' +
        '<p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.5;">Для открытия этого тренажёра активируйте бесплатный пробный доступ на 24 часа в главном меню или отправьте ваш ID администратору <strong>' + ADMIN_CONTACT + '</strong>.</p>' +
        '<div style="background:#f1f5f9;padding:10px 14px;border-radius:10px;font-family:monospace;font-size:15px;color:#0f172a;margin-bottom:18px;">Ваш ID: <strong>' + (uid || "не определён") + '</strong></div>' +
        '<a href="../index.html' + (uid ? "?uid=" + encodeURIComponent(uid) : "") + '" style="display:inline-block;width:100%;box-sizing:border-box;background:#0f5132;color:#ffffff;text-decoration:none;padding:13px 18px;border-radius:12px;font-weight:600;font-size:15px;">← Вернуться в главное меню</a>' +
        "</div></div>";
    };

    if (document.body) {
      renderLockScreen();
    } else {
      document.addEventListener("DOMContentLoaded", renderLockScreen);
    }
    return false;
  }

  // ==========================================================================
  // ЕДИНЫЙ ПЕРЕКЛЮЧАТЕЛЬ ТЕМЫ (ДЕНЬ / НОЧЬ) ДЛЯ ВСЕЙ БИБЛИОТЕКИ
  // ==========================================================================
  function getSavedTheme() {
    const t = safeGetStorage(KEY_THEME);
    if (t === "dark" || t === "light") return t;
    const legacy = safeGetStorage("theme") || safeGetStorage("darkMode");
    if (legacy === "dark" || legacy === "true") return "dark";
    return "light";
  }

  function injectUnifiedStyles() {
    if (document.getElementById("madrasah-unified-styles")) return;
    const style = document.createElement("style");
    style.id = "madrasah-unified-styles";
    style.textContent = `
      /* Скрытие дублирующих кнопок темы в старых шаблонах курсов */
      button[onclick*="toggleTheme"],
      button[onclick*="toggleDark"],
      button[onclick*="switchTheme"],
      .theme-toggle-old,
      #themeToggle {
        display: none !important;
      }

      /* Универсальная ночная палитра для всех курсов (включая Сиру и 40 хадисов) */
      html.madrasah-dark,
      html.madrasah-dark body {
        background-color: #0f172a !important;
        color: #e2e8f0 !important;
      }
      html.madrasah-dark .card,
      html.madrasah-dark .module-card,
      html.madrasah-dark .chapter-card,
      html.madrasah-dark .hadith-card,
      html.madrasah-dark .quiz-box,
      html.madrasah-dark .question-card,
      html.madrasah-dark .modal-content,
      html.madrasah-dark .top-bar,
      html.madrasah-dark .stats-bar,
      html.madrasah-dark .course-card,
      html.madrasah-dark .id-panel {
        background-color: #1e293b !important;
        color: #f1f5f9 !important;
        border-color: #334155 !important;
      }
      html.madrasah-dark h1,
      html.madrasah-dark h2,
      html.madrasah-dark h3,
      html.madrasah-dark h4,
      html.madrasah-dark .course-title,
      html.madrasah-dark .chapter-title {
        color: #f8fafc !important;
      }
      html.madrasah-dark p,
      html.madrasah-dark .course-desc,
      html.madrasah-dark .subtitle,
      html.madrasah-dark .meta-text {
        color: #cbd5e1 !important;
      }
      html.madrasah-dark .option-btn,
      html.madrasah-dark .answer-btn,
      html.madrasah-dark .nav-btn,
      html.madrasah-dark .secondary-btn {
        background-color: #263349 !important;
        color: #f1f5f9 !important;
        border-color: #475569 !important;
      }
      html.madrasah-dark .option-btn:hover,
      html.madrasah-dark .answer-btn:hover {
        background-color: #334155 !important;
      }
      html.madrasah-dark .arabic,
      html.madrasah-dark .arabic-text {
        color: #fef08a !important;
      }

      /* Единая кнопка Ночь / День */
      #madrasah-global-theme-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 7px 14px;
        border-radius: 999px;
        border: 1px solid #cbd5e1;
        background: #ffffff;
        color: #1e293b;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
        transition: all 0.2s ease;
        z-index: 9998;
      }
      html.madrasah-dark #madrasah-global-theme-btn {
        background: #1e293b !important;
        color: #f8fafc !important;
        border-color: #475569 !important;
      }

      /* Плавающий контейнер для кнопки темы внутри внутренних курсов */
      #madrasah-subpage-theme-wrap {
        position: fixed;
        top: 10px;
        right: 12px;
        z-index: 9999;
      }

      /* Верхняя полоска таймера триала внутри курсов */
      #madrasah-subpage-trial-bar {
        background: #fef3c7;
        color: #92400e;
        border-bottom: 1px solid #fde68a;
        text-align: center;
        padding: 7px 12px;
        font-size: 13px;
        font-weight: 600;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      html.madrasah-dark #madrasah-subpage-trial-bar {
        background: #422006;
        color: #fde68a;
        border-bottom-color: #713f12;
      }
    `;
    document.head.appendChild(style);
  }

  function applyGlobalTheme(themeName) {
    const theme = themeName === "dark" ? "dark" : "light";
    safeSetStorage(KEY_THEME, theme);
    safeSetStorage("theme", theme);
    safeSetStorage("darkMode", theme === "dark" ? "true" : "false");

    const htmlEl = document.documentElement;
    const bodyEl = document.body;

    if (theme === "dark") {
      htmlEl.classList.add("madrasah-dark", "dark", "dark-mode", "dark-theme");
      if (bodyEl) bodyEl.classList.add("madrasah-dark", "dark", "dark-mode", "dark-theme");
    } else {
      htmlEl.classList.remove("madrasah-dark", "dark", "dark-mode", "dark-theme");
      if (bodyEl) bodyEl.classList.remove("madrasah-dark", "dark", "dark-mode", "dark-theme");
    }

    try {
      if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.setHeaderColor(theme === "dark" ? "#0f172a" : "#0f5132");
        window.Telegram.WebApp.setBackgroundColor(theme === "dark" ? "#0f172a" : "#f4f7f5");
      }
    } catch (e) {}

    const btn = document.getElementById("madrasah-global-theme-btn");
    if (btn) {
      btn.innerHTML = theme === "dark" ? "☀️ День" : "🌙 Ночь";
    }
  }

  function toggleGlobalTheme() {
    const next = getSavedTheme() === "dark" ? "light" : "dark";
    applyGlobalTheme(next);
  }

  // Очистка лишних кнопок в "40 хадисах" (Глава PDF, Экспорт, Импорт) и дублей темы
  function cleanupSubpageButtons() {
    if (!document.body) return;
    const isSubpage = Boolean(detectCurrentCourseCode());
    const buttons = document.querySelectorAll("button, a.btn");

    buttons.forEach(function (el) {
      if (el.id === "madrasah-global-theme-btn") return;
      const txt = (el.textContent || "").trim();

      // Убираем старые кнопки переключения темы на внутренних страницах
      if (
        isSubpage &&
        (txt === "Тёмная тема" ||
          txt === "Светлая тема" ||
          txt === "Тема" ||
          txt === "Ночь" ||
          txt === "День" ||
          txt === "🌙" ||
          txt === "☀️" ||
          txt === "🌓")
      ) {
        el.style.display = "none";
      }

      // Убираем "Глава (PDF)", "Экспорт", "Импорт" в курсе 40 хадисов
      if (
        txt.indexOf("Глава (PDF)") !== -1 ||
        txt === "Экспорт" ||
        txt === "Импорт"
      ) {
        el.style.display = "none";
      }
    });

    // Размещаем единую кнопку Ночь/День на внутренних страницах курсов
    if (isSubpage && !document.getElementById("madrasah-global-theme-btn")) {
      const wrap = document.createElement("div");
      wrap.id = "madrasah-subpage-theme-wrap";
      const btn = document.createElement("button");
      btn.id = "madrasah-global-theme-btn";
      btn.type = "button";
      btn.onclick = toggleGlobalTheme;
      btn.innerHTML = getSavedTheme() === "dark" ? "☀️ День" : "🌙 Ночь";
      wrap.appendChild(btn);
      document.body.appendChild(wrap);
    }
  }

  // Полоска таймера триала наверху внутренних страниц курсов
  function initSubpageTrialBanner() {
    const code = detectCurrentCourseCode();
    if (!code || !document.body) return;

    const uid = getUserId();
    if (hasPermanentOrManualAccess(uid, code)) return;

    const updateBar = function () {
      const state = getTrialState(uid);
      let bar = document.getElementById("madrasah-subpage-trial-bar");
      if (state.status === "active") {
        if (!bar) {
          bar = document.createElement("div");
          bar.id = "madrasah-subpage-trial-bar";
          document.body.insertBefore(bar, document.body.firstChild);
        }
        bar.textContent = "⏳ Пробный доступ (24 ч) • Осталось: " + formatDuration(state.remainingMs);
      } else if (state.status === "expired" || state.status === "tampered") {
        if (bar) bar.remove();
        protectCoursePage(code);
      }
    };

    updateBar();
    setInterval(updateBar, 1000);
  }

  // Экспорт всех функций в глобальную область видимости
  window.ALLOWED_USERS = ALLOWED_USERS;
  window.ALL_COURSE_CODES = ALL_COURSE_CODES;
  window.getUserId = getUserId;
  window.setManualUserId = setManualUserId;
  window.getTrialState = getTrialState;
  window.startTrial24h = startTrial24h;
  window.formatDuration = formatDuration;
  window.hasPermanentOrManualAccess = hasPermanentOrManualAccess;
  window.hasCourseAccess = hasCourseAccess;
  window.checkAccess = hasCourseAccess;
  window.protectCoursePage = protectCoursePage;
  window.applyGlobalTheme = applyGlobalTheme;
  window.toggleGlobalTheme = toggleGlobalTheme;
  window.syncServerTime = syncServerTime;

  injectUnifiedStyles();
  applyGlobalTheme(getSavedTheme());

  const onReady = function () {
    applyGlobalTheme(getSavedTheme());
    cleanupSubpageButtons();
    initSubpageTrialBanner();
    syncServerTime();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady);
  } else {
    onReady();
  }
})();
