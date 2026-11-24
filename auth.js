// ============================================================================
// Единая система доступа, защищённого 24-часового триала и сквозной темы
// ============================================================================

const AUTHORIZED_USERS = {
  // === АДМИНИСТРАТОР И ПОСТОЯННЫЕ УЧЕНИКИ ===
  // "859435297": ["all"], // Раскомментируйте для возврата постоянного доступа
  "123456789": ["all"],

  // Примеры выборочного доступа:
  // "111222333": ["sira", "nawawi"],
  // "444555666": ["fiqh", "tajweed", "adab", "aqeedah"],
};

const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000; // 24 часа
const STORAGE_KEYS = {
  userId: "madrasah_user_id",
  trialStart: "madrasah_trial_start_",
  trialUsed: "madrasah_trial_used_",
  maxTime: "madrasah_max_seen_time",
  theme: "madrasah_unified_theme"
};

let serverTimeOffsetMs = 0;
let serverTimeSynced = false;

// 1. Синхронизация времени с сервером (защита от перевода системных часов)
async function syncServerTime() {
  try {
    const res = await fetch(window.location.href.split("?")[0] + "?t=" + Date.now(), {
      method: "HEAD",
      cache: "no-store"
    });
    const dateHeader = res.headers.get("Date");
    if (dateHeader) {
      const serverMs = new Date(dateHeader).getTime();
      if (!isNaN(serverMs)) {
        serverTimeOffsetMs = serverMs - Date.now();
        serverTimeSynced = true;
        updateMaxSeenTime(serverMs);
      }
    }
  } catch (e) {
    // Офлайн-режим: используем защиту через maxSeenTime
  }
}

function getTrustedNow() {
  const candidate = Date.now() + serverTimeOffsetMs;
  const maxSeen = parseInt(localStorage.getItem(STORAGE_KEYS.maxTime) || "0", 10);
  if (candidate > maxSeen) {
    updateMaxSeenTime(candidate);
    return candidate;
  }
  return maxSeen;
}

function updateMaxSeenTime(ts) {
  try {
    const prev = parseInt(localStorage.getItem(STORAGE_KEYS.maxTime) || "0", 10);
    if (ts > prev) {
      localStorage.setItem(STORAGE_KEYS.maxTime, String(ts));
    }
  } catch (e) {}
}

// 2. Определение ID пользователя (Telegram WebApp -> URL ?uid= -> localStorage)
function getCurrentUserId() {
  try {
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
      const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
      if (tgUser && tgUser.id) {
        const idStr = String(tgUser.id);
        localStorage.setItem(STORAGE_KEYS.userId, idStr);
        return idStr;
      }
    }
  } catch (e) {}

  try {
    const params = new URLSearchParams(window.location.search);
    const urlUid = params.get("uid");
    if (urlUid && urlUid.trim()) {
      const clean = urlUid.trim();
      localStorage.setItem(STORAGE_KEYS.userId, clean);
      return clean;
    }
  } catch (e) {}

  try {
    const saved = localStorage.getItem(STORAGE_KEYS.userId);
    if (saved && saved.trim()) return saved.trim();
  } catch (e) {}

  return null;
}

function setManualUserId(id) {
  if (!id) return;
  const clean = String(id).trim();
  localStorage.setItem(STORAGE_KEYS.userId, clean);
}

// 3. Проверка прав доступа и состояния 24-часового триала
function getTrialStatus(userId) {
  const uid = userId || getCurrentUserId() || "guest_browser";
  const startRaw = localStorage.getItem(STORAGE_KEYS.trialStart + uid);
  const usedFlag = localStorage.getItem(STORAGE_KEYS.trialUsed + uid);

  if (!startRaw) {
    return {
      state: usedFlag ? "expired" : "available",
      remainingMs: 0,
      uid
    };
  }

  const startMs = parseInt(startRaw, 10);
  const now = getTrustedNow();
  const elapsed = now - startMs;
  const remaining = TRIAL_DURATION_MS - elapsed;

  if (remaining > 0) {
    return {
      state: "active",
      remainingMs: remaining,
      uid
    };
  } else {
    localStorage.setItem(STORAGE_KEYS.trialUsed + uid, "1");
    return {
      state: "expired",
      remainingMs: 0,
      uid
    };
  }
}

function activateTrialAccess(userId) {
  const uid = userId || getCurrentUserId() || "guest_browser";
  const status = getTrialStatus(uid);
  if (status.state === "expired") {
    return false;
  }
  if (status.state === "available") {
    const now = getTrustedNow();
    localStorage.setItem(STORAGE_KEYS.trialStart + uid, String(now));
    localStorage.setItem(STORAGE_KEYS.trialUsed + uid, "1");
  }
  return true;
}

function getUserPermissions(userId) {
  const uid = userId || getCurrentUserId();
  if (uid && AUTHORIZED_USERS[uid]) {
    const entry = AUTHORIZED_USERS[uid];
    if (Array.isArray(entry)) {
      return { allowed: true, courses: entry, isTrial: false, isPermanent: true };
    }
    if (entry && typeof entry === "object") {
      if (entry.expires) {
        const expMs = new Date(entry.expires).getTime();
        const rem = expMs - getTrustedNow();
        if (rem > 0) {
          return { allowed: true, courses: entry.courses || ["all"], isTrial: true, remainingMs: rem };
        }
        return { allowed: false, courses: [], isTrial: false, expired: true };
      }
      return { allowed: true, courses: entry.courses || ["all"], isTrial: false, isPermanent: true };
    }
  }

  const trial = getTrialStatus(uid);
  if (trial.state === "active") {
    return {
      allowed: true,
      courses: ["all"],
      isTrial: true,
      remainingMs: trial.remainingMs
    };
  }

  return {
    allowed: false,
    courses: [],
    isTrial: false,
    trialState: trial.state
  };
}

function hasCourseAccess(courseCode, userId) {
  const perms = getUserPermissions(userId);
  if (!perms.allowed) return false;
  if (perms.courses.includes("all")) return true;
  return perms.courses.includes(courseCode);
}

// 4. Форматирование времени для живого счётчика
function formatRemainingTime(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h} ч ${String(m).padStart(2, "0")} мин ${String(s).padStart(2, "0")} сек`;
}

// 5. ЕДИНАЯ СИСТЕМА ТЕМЫ (ДЕНЬ / НОЧЬ) ДЛЯ ВСЕХ 6 КУРСОВ И МЕНЮ
function getSavedTheme() {
  const keys = [
    STORAGE_KEYS.theme,
    "theme",
    "madrasah_theme",
    "fiqh_theme",
    "tajweed_theme",
    "adab_theme",
    "aqeedah_theme",
    "sira_theme",
    "nawawi_theme"
  ];
  for (const k of keys) {
    const val = localStorage.getItem(k);
    if (val === "dark" || val === "light") return val;
  }
  return "light";
}

function applyUnifiedTheme(theme) {
  const isDark = theme === "dark";
  const mode = isDark ? "dark" : "light";

  // Синхронизируем все ключи localStorage, чтобы родные скрипты курсов тоже знали актуальную тему
  const allKeys = [
    STORAGE_KEYS.theme,
    "theme",
    "madrasah_theme",
    "fiqh_theme",
    "tajweed_theme",
    "adab_theme",
    "aqeedah_theme",
    "sira_theme",
    "nawawi_theme"
  ];
  allKeys.forEach((k) => {
    try { localStorage.setItem(k, mode); } catch (e) {}
  });
  try { localStorage.setItem("darkMode", isDark ? "true" : "false"); } catch (e) {}

  // Устанавливаем атрибуты и классы на <html> и <body>
  document.documentElement.setAttribute("data-theme", mode);
  if (document.body) {
    document.body.setAttribute("data-theme", mode);
  }

  const darkClasses = ["dark", "dark-theme", "dark-mode"];
  darkClasses.forEach((cls) => {
    document.documentElement.classList.toggle(cls, isDark);
    if (document.body) document.body.classList.toggle(cls, isDark);
  });

  // Обновляем единую кнопку
  const btn = document.getElementById("unified-theme-btn");
  if (btn) {
    btn.innerHTML = isDark ? "☀️ День" : "🌙 Ночь";
    btn.setAttribute("aria-label", isDark ? "Включить дневную тему" : "Включить ночную тему");
  }

  // Подстраиваем шапку Telegram WebApp
  try {
    if (window.Telegram && window.Telegram.WebApp) {
      const tg = window.Telegram.WebApp;
      if (tg.setHeaderColor) {
        tg.setHeaderColor(isDark ? "#0d1f17" : "#0f5132");
      }
      if (tg.setBackgroundColor) {
        tg.setBackgroundColor(isDark ? "#0b1410" : "#f4f7f5");
      }
    }
  } catch (e) {}
}

function toggleUnifiedTheme() {
  const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  applyUnifiedTheme(current === "dark" ? "light" : "dark");
}

function hideLegacyThemeButtons() {
  const candidates = document.querySelectorAll("button, [role='button'], .theme-toggle, .theme-btn");
  candidates.forEach((el) => {
    if (el.id === "unified-theme-btn") return;
    const text = (el.textContent || "").trim();
    const onclickAttr = (el.getAttribute("onclick") || "").toLowerCase();
    const idAttr = (el.id || "").toLowerCase();
    const clsAttr = (typeof el.className === "string" ? el.className : "").toLowerCase();

    const isThemeText =
      text === "Тёмная тема" ||
      text === "Светлая тема" ||
      text === "Тема" ||
      text === "🌓" ||
      text === "🌙" ||
      text === "☀️" ||
      text.includes("Тёмная тема") ||
      text.includes("Светлая тема");

    const isThemeAttr =
      onclickAttr.includes("toggletheme") ||
      onclickAttr.includes("switchtheme") ||
      onclickAttr.includes("settheme") ||
      idAttr.includes("theme-toggle") ||
      idAttr.includes("themetoggle") ||
      idAttr === "theme-btn" ||
      clsAttr.includes("theme-toggle") ||
      clsAttr.includes("theme-btn");

    if (isThemeText || isThemeAttr) {
      el.style.setProperty("display", "none", "important");
    }
  });
}

function injectUnifiedThemeStylesAndButton() {
  if (!document.getElementById("unified-theme-styles")) {
    const style = document.createElement("style");
    style.id = "unified-theme-styles";
    style.textContent = `
      /* Единая компактная кнопка День/Ночь */
      #unified-theme-btn {
        display: inline-flex !important;
        align-items: center;
        gap: 6px;
        padding: 7px 14px;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        border: 1px solid rgba(15, 81, 50, 0.22);
        background: #ffffff;
        color: #1e293b;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
        transition: all 0.2s ease;
        font-family: inherit;
        line-height: 1.2;
        white-space: nowrap;
        z-index: 9999;
      }
      #unified-theme-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
      }
      html[data-theme="dark"] #unified-theme-btn {
        background: #172a22 !important;
        color: #f8fafc !important;
        border-color: rgba(255, 255, 255, 0.16) !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35) !important;
      }

      /* Универсальная ночная палитра для всех страниц (включая Сиру и 40 хадисов) */
      html[data-theme="dark"],
      html[data-theme="dark"] body {
        background-color: #0b1410 !important;
        background-image: none !important;
        color: #e2e8f0 !important;
      }
      html[data-theme="dark"] .container,
      html[data-theme="dark"] .wrapper,
      html[data-theme="dark"] main {
        background-color: transparent !important;
      }
      html[data-theme="dark"] .card,
      html[data-theme="dark"] .course-card,
      html[data-theme="dark"] .module-card,
      html[data-theme="dark"] .chapter-card,
      html[data-theme="dark"] .quiz-card,
      html[data-theme="dark"] .question-card,
      html[data-theme="dark"] .hadith-card,
      html[data-theme="dark"] .stat-box,
      html[data-theme="dark"] .id-bar,
      html[data-theme="dark"] .modal-content,
      html[data-theme="dark"] .cheatsheet-content,
      html[data-theme="dark"] .top-bar {
        background-color: #13221b !important;
        color: #f1f5f9 !important;
        border-color: #233d31 !important;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35) !important;
      }
      html[data-theme="dark"] h1,
      html[data-theme="dark"] h2,
      html[data-theme="dark"] h3,
      html[data-theme="dark"] h4,
      html[data-theme="dark"] .course-title,
      html[data-theme="dark"] .chapter-title,
      html[data-theme="dark"] .question-text {
        color: #f8fafc !important;
      }
      html[data-theme="dark"] p,
      html[data-theme="dark"] .course-desc,
      html[data-theme="dark"] .subtitle,
      html[data-theme="dark"] .muted,
      html[data-theme="dark"] small {
        color: #94a3b8 !important;
      }
      html[data-theme="dark"] .option-btn,
      html[data-theme="dark"] .answer-btn,
      html[data-theme="dark"] .choice-btn,
      html[data-theme="dark"] .filter-btn,
      html[data-theme="dark"] .secondary-btn,
      html[data-theme="dark"] .back-btn {
        background-color: #182b22 !important;
        color: #e2e8f0 !important;
        border-color: #2a4739 !important;
      }
      html[data-theme="dark"] .option-btn:hover,
      html[data-theme="dark"] .answer-btn:hover,
      html[data-theme="dark"] .choice-btn:hover {
        background-color: #20382d !important;
        border-color: #3b6350 !important;
      }
      html[data-theme="dark"] .option-btn.correct,
      html[data-theme="dark"] .answer-btn.correct {
        background-color: #14532d !important;
        border-color: #22c55e !important;
        color: #ffffff !important;
      }
      html[data-theme="dark"] .option-btn.wrong,
      html[data-theme="dark"] .answer-btn.wrong {
        background-color: #7f1d1d !important;
        border-color: #ef4444 !important;
        color: #ffffff !important;
      }
      html[data-theme="dark"] .explanation,
      html[data-theme="dark"] .feedback-box,
      html[data-theme="dark"] .info-box {
        background-color: #162920 !important;
        color: #cbd5e1 !important;
        border-color: #284638 !important;
      }
      html[data-theme="dark"] input,
      html[data-theme="dark"] select,
      html[data-theme="dark"] textarea {
        background-color: #182b22 !important;
        color: #f8fafc !important;
        border-color: #2e4d3e !important;
      }
      html[data-theme="dark"] #auth-trial-bar {
        background: #2c2410 !important;
        color: #fde68a !important;
        border-bottom-color: #52421c !important;
      }
    `;
    document.head.appendChild(style);
  }

  hideLegacyThemeButtons();

  // Если на странице уже есть контейнер под кнопку темы (например в index.html), вставляем туда
  const slot = document.getElementById("unified-theme-slot");
  let btn = document.getElementById("unified-theme-btn");
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "unified-theme-btn";
    btn.type = "button";
    btn.onclick = toggleUnifiedTheme;
  }

  if (slot) {
    if (!slot.contains(btn)) slot.appendChild(btn);
  } else {
    // Ищем верхнюю панель навигации внутри курса (где кнопка "← Все курсы" или "← К списку всех курсов")
    const backBtn = Array.from(document.querySelectorAll("a, button")).find((el) => {
      const t = (el.textContent || "").trim();
      return t.includes("Все курсы") || t.includes("К списку всех курсов");
    });

    if (backBtn && backBtn.parentElement) {
      const parent = backBtn.parentElement;
      parent.style.display = "flex";
      parent.style.alignItems = "center";
      parent.style.justifyContent = "space-between";
      parent.style.flexWrap = "wrap";
      parent.style.gap = "8px";
      if (!parent.contains(btn)) {
        parent.appendChild(btn);
      }
    } else if (!document.body.contains(btn)) {
      const topWrap = document.createElement("div");
      topWrap.style.cssText = "max-width:860px;margin:10px auto 0;padding:0 16px;display:flex;justify-content:flex-end;";
      topWrap.appendChild(btn);
      document.body.insertBefore(topWrap, document.body.firstChild);
    }
  }

  applyUnifiedTheme(getSavedTheme());
}

// 6. Живая плашка триал-таймера (без дублирования на главной)
let trialBarInterval = null;

function renderTrialBarIfNeeded() {
  const perms = getUserPermissions();
  const existingBar = document.getElementById("auth-trial-bar");

  // Если постоянный доступ или на главной уже есть встроенная строка под баннером — не дублируем
  const hasInlineCatalogTrial = Boolean(document.getElementById("trial-status-banner"));
  if (!perms.isTrial || hasInlineCatalogTrial) {
    if (existingBar) existingBar.remove();
    return;
  }

  let bar = existingBar;
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "auth-trial-bar";
    bar.style.cssText =
      "width:100%;background:#fef3c7;color:#92400e;border-bottom:1px solid #fde68a;" +
      "padding:8px 14px;text-align:center;font-size:13px;font-weight:600;" +
      "position:sticky;top:0;z-index:9998;box-sizing:border-box;";
    document.body.insertBefore(bar, document.body.firstChild);
  }

  const updateTick = () => {
    const freshPerms = getUserPermissions();
    if (!freshPerms.isTrial || !freshPerms.allowed) {
      if (trialBarInterval) clearInterval(trialBarInterval);
      window.location.reload();
      return;
    }
    bar.innerHTML = `⏳ Пробный доступ (24 ч) • Осталось: <strong>${formatRemainingTime(freshPerms.remainingMs)}</strong>`;
  };

  updateTick();
  if (!trialBarInterval) {
    trialBarInterval = setInterval(updateTick, 1000);
  }
}

// 7. Защита внутренних страниц курсов
function protectCoursePage(courseCode, courseTitle) {
  syncServerTime().then(() => {
    renderTrialBarIfNeeded();
  });

  const uid = getCurrentUserId();
  if (hasCourseAccess(courseCode, uid)) {
    return true;
  }

  const renderLockScreen = () => {
    const trial = getTrialStatus(uid);
    const canTry = trial.state === "available";
    document.body.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;font-family:system-ui,-apple-system,sans-serif;">
        <div style="max-width:440px;width:100%;background:var(--card-bg,#ffffff);border:1px solid rgba(15,81,50,0.2);border-radius:20px;padding:28px 22px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,0.08);">
          <div style="font-size:44px;margin-bottom:10px;">🔒</div>
          <h2 style="margin:0 0 8px;font-size:20px;">Доступ к курсу закрыт</h2>
          <p style="margin:0 0 18px;font-size:14px;opacity:0.8;line-height:1.5;">
            Курс <strong>«${courseTitle || courseCode}»</strong> доступен только зарегистрированным ученикам.
          </p>
          <div style="background:rgba(15,81,50,0.08);padding:10px 14px;border-radius:12px;font-size:13px;margin-bottom:18px;">
            Ваш ID: <strong>${uid || "не определён"}</strong>
          </div>
          ${
            canTry
              ? `<button id="lock-activate-trial" style="width:100%;padding:13px;border:none;border-radius:12px;background:#0f5132;color:#fff;font-size:15px;font-weight:600;cursor:pointer;margin-bottom:10px;">
                  🎁 Попробовать все курсы 24 ч бесплатно
                </button>`
              : `<p style="font-size:12px;color:#b45309;margin:0 0 14px;">Ознакомительный 24-часовой доступ уже был использован.</p>`
          }
          <a href="../index.html${uid ? "?uid=" + encodeURIComponent(uid) : ""}" style="display:block;padding:12px;border-radius:12px;background:rgba(0,0,0,0.06);color:inherit;text-decoration:none;font-size:14px;font-weight:600;">
            ← Вернуться в каталог курсов
          </a>
        </div>
      </div>
    `;
    const tryBtn = document.getElementById("lock-activate-trial");
    if (tryBtn) {
      tryBtn.onclick = () => {
        if (activateTrialAccess(uid)) {
          window.location.reload();
        }
      };
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderLockScreen);
  } else {
    renderLockScreen();
  }
  return false;
}

// Автозапуск оформления и таймера при загрузке любой страницы
function initAuthAndTheme() {
  injectUnifiedThemeStylesAndButton();
  renderTrialBarIfNeeded();
  syncServerTime().then(() => {
    renderTrialBarIfNeeded();
  });

  // Наблюдаем за динамической отрисовкой, чтобы скрыть старые кнопки темы, если курс рисует их позже
  const observer = new MutationObserver(() => {
    hideLegacyThemeButtons();
  });
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 4000);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAuthAndTheme);
} else {
  initAuthAndTheme();
}
