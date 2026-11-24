// ============================================================================
// ЕДИНАЯ СИСТЕМА ДОСТУПА, ТРИАЛА И ТЕМИЗАЦИИ (ДЕНЬ / НОЧЬ) ДЛЯ ВСЕЙ БИБЛИОТЕКИ
// ============================================================================

const ACCESS_MAP = {
  // Постоянный полный доступ ко всем курсам ("all")
  "859435297": ["all"],

  // Примеры выдачи доступа отдельным ученикам:
  // "123456789": ["all"],
  // "987654321": ["sira", "nawawi", "fiqh", "tajweed", "adab", "aqeedah"],
  // Временный доступ до конкретной даты:
  // "555666777": { courses: ["all"], expires: "2026-12-31T23:59:59" },
};

const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000; // 24 часа

// ============================================================================
// 1. УНИФИЦИРОВАННАЯ СИСТЕМА ТЕМЫ (ДЕНЬ / НОЧЬ) ДЛЯ МЕНЮ И ВСЕХ 6 КУРСОВ
// ============================================================================
(function initUnifiedTheme() {
  const THEME_KEY = "madrasah_unified_theme";

  // Inject unified CSS so courses 1-2 (Sira, Nawawi) and 3-6 share one clean Day/Night style
  const style = document.createElement("style");
  style.id = "madrasah-unified-theme-css";
  style.textContent = `
    .m-theme-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 7px 13px;
      border-radius: 999px;
      border: 1px solid rgba(16, 185, 129, 0.35);
      background: rgba(255, 255, 255, 0.92);
      color: #065f46;
      font-family: inherit;
      font-size: 13px;
      font-weight: 600;
      line-height: 1;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
      transition: all 0.2s ease;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    }
    .m-theme-btn:active {
      transform: scale(0.96);
    }
    html.madrasah-dark .m-theme-btn {
      background: #1e293b;
      color: #f8fafc;
      border-color: #334155;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
    }

    /* Единая плавающая/верхняя панель кнопки темы для курсов 1-6 */
    .m-course-theme-bar {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      max-width: 820px;
      margin: 0 auto 10px auto;
      padding: 4px 12px 0 12px;
      position: relative;
      z-index: 999;
    }

    /* Универсальная тёмная тема (поддерживает и курсы 1-2 без встроенной темы, и курсы 3-6) */
    html.madrasah-dark,
    html.madrasah-dark body {
      background-color: #0f172a !important;
      color: #e2e8f0 !important;
    }
    html.madrasah-dark .container,
    html.madrasah-dark .app-container,
    html.madrasah-dark main {
      color: #e2e8f0 !important;
    }
    html.madrasah-dark .card,
    html.madrasah-dark .chapter-card,
    html.madrasah-dark .topic-card,
    html.madrasah-dark .quiz-card,
    html.madrasah-dark .question-card,
    html.madrasah-dark .modal-content,
    html.madrasah-dark .cheatsheet-box,
    html.madrasah-dark .result-card,
    html.madrasah-dark .stats-box,
    html.madrasah-dark .course-card {
      background-color: #1e293b !important;
      color: #f1f5f9 !important;
      border-color: #334155 !important;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3) !important;
    }
    html.madrasah-dark h1,
    html.madrasah-dark h2,
    html.madrasah-dark h3,
    html.madrasah-dark h4,
    html.madrasah-dark .title,
    html.madrasah-dark .chapter-title,
    html.madrasah-dark .question-text {
      color: #f8fafc !important;
    }
    html.madrasah-dark p,
    html.madrasah-dark li,
    html.madrasah-dark .subtitle,
    html.madrasah-dark .desc,
    html.madrasah-dark .meta,
    html.madrasah-dark .chapter-meta {
      color: #cbd5e1 !important;
    }
    html.madrasah-dark .option-btn,
    html.madrasah-dark .answer-btn,
    html.madrasah-dark .choice-btn,
    html.madrasah-dark button.option {
      background-color: #0f172a !important;
      color: #f1f5f9 !important;
      border-color: #334155 !important;
    }
    html.madrasah-dark .option-btn:hover:not(:disabled),
    html.madrasah-dark .answer-btn:hover:not(:disabled) {
      background-color: #273549 !important;
      border-color: #10b981 !important;
    }
    html.madrasah-dark .option-btn.correct,
    html.madrasah-dark .answer-btn.correct {
      background-color: rgba(16, 185, 129, 0.22) !important;
      border-color: #10b981 !important;
      color: #6ee7b7 !important;
    }
    html.madrasah-dark .option-btn.wrong,
    html.madrasah-dark .answer-btn.wrong {
      background-color: rgba(239, 68, 68, 0.22) !important;
      border-color: #ef4444 !important;
      color: #fca5a5 !important;
    }
    html.madrasah-dark .explanation,
    html.madrasah-dark .exp-box,
    html.madrasah-dark .feedback {
      background-color: #172033 !important;
      color: #e2e8f0 !important;
      border-color: #334155 !important;
    }
    html.madrasah-dark input,
    html.madrasah-dark select {
      background-color: #0f172a !important;
      color: #f8fafc !important;
      border-color: #475569 !important;
    }
    html.madrasah-dark .back-btn,
    html.madrasah-dark .btn-secondary {
      background-color: #1e293b !important;
      color: #e2e8f0 !important;
      border-color: #334155 !important;
    }
  `;
  (document.head || document.documentElement).appendChild(style);

  function getSavedTheme() {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "dark" || saved === "light") return saved;
      // Подхват старого выбора, если пользователь уже переключал тему ранее
      const legacy =
        localStorage.getItem("theme") ||
        localStorage.getItem("madrasah_theme") ||
        (localStorage.getItem("darkMode") === "true" ? "dark" : null);
      if (legacy === "dark") return "dark";
    } catch (e) {}
    return "light";
  }

  function applyTheme(theme) {
    const isDark = theme === "dark";
    const root = document.documentElement;
    root.classList.toggle("madrasah-dark", isDark);
    root.classList.toggle("dark-theme", isDark);
    root.classList.toggle("dark", isDark);
    root.setAttribute("data-theme", theme);

    if (document.body) {
      document.body.classList.toggle("madrasah-dark", isDark);
      document.body.classList.toggle("dark-theme", isDark);
      document.body.classList.toggle("dark", isDark);
    }

    try {
      localStorage.setItem(THEME_KEY, theme);
      localStorage.setItem("theme", theme);
      localStorage.setItem("madrasah_theme", theme);
      localStorage.setItem("darkMode", isDark ? "true" : "false");
    } catch (e) {}

    // Синхронизация шапки Telegram WebApp
    try {
      const tg = window.Telegram && window.Telegram.WebApp;
      if (tg) {
        if (tg.setHeaderColor) tg.setHeaderColor(isDark ? "#0f172a" : "#065f46");
        if (tg.setBackgroundColor) tg.setBackgroundColor(isDark ? "#0f172a" : "#f0fdf4");
      }
    } catch (e) {}

    // Обновляем все унифицированные кнопки на странице
    document.querySelectorAll("[data-unified-theme-btn]").forEach((btn) => {
      btn.innerHTML = isDark ? "☀️ День" : "🌙 Ночь";
      btn.setAttribute("title", isDark ? "Переключить на дневную тему" : "Переключить на ночную тему");
    });
  }

  function toggleTheme() {
    const next = getSavedTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
  }

  window.MadrasahTheme = {
    get: getSavedTheme,
    set: applyTheme,
    toggle: toggleTheme,
  };

  // Применяем тему мгновенно до отрисовки страницы
  applyTheme(getSavedTheme());

  function mountUnifiedButton() {
    applyTheme(getSavedTheme());

    // 1. Если это главная страница каталога и там уже есть кнопка #themeToggleBtn — унифицируем её
    const mainBtn = document.getElementById("themeToggleBtn");
    if (mainBtn) {
      mainBtn.className = "m-theme-btn";
      mainBtn.setAttribute("data-unified-theme-btn", "1");
      mainBtn.onclick = function (e) {
        e.preventDefault();
        toggleTheme();
      };
      applyTheme(getSavedTheme());
      return;
    }

    // 2. Скрываем разрозненные старые кнопки темы внутри курсов 3-6, чтобы не было дублей и разных значков
    document.querySelectorAll("button, .theme-toggle, #themeBtn, #theme-toggle").forEach((el) => {
      if (el.hasAttribute("data-unified-theme-btn")) return;
      const onclickAttr = el.getAttribute("onclick") || "";
      const idAttr = (el.id || "").toLowerCase();
      const clsAttr = (typeof el.className === "string" ? el.className : "").toLowerCase();
      const txt = (el.textContent || "").trim();
      const isOldThemeBtn =
        onclickAttr.includes("toggleTheme") ||
        idAttr.includes("theme") ||
        clsAttr.includes("theme-toggle") ||
        clsAttr.includes("theme-btn") ||
        txt === "🌙" ||
        txt === "☀️" ||
        txt === "🌓" ||
        txt === "Тёмная тема" ||
        txt === "Светлая тема";
      if (isOldThemeBtn) {
        el.style.display = "none";
      }
    });

    // 3. Добавляем единую кнопку «🌙 Ночь / ☀️ День» на страницу каждого курса (включая Сиру и 40 хадисов)
    if (!document.querySelector("[data-unified-theme-btn]")) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "m-theme-btn";
      btn.setAttribute("data-unified-theme-btn", "1");
      btn.onclick = toggleTheme;

      // Если есть верхняя панель с кнопкой «← Все курсы», ставим кнопку справа в ту же строку
      const backLink = document.querySelector('a[href="../index.html"], a[href*="index.html"].back-btn, .top-nav, .nav-bar');
      if (backLink && backLink.parentElement) {
        const parent = backLink.parentElement;
        if (parent.classList.contains("top-nav") || parent.classList.contains("nav-bar") || parent.children.length <= 3) {
          parent.style.display = "flex";
          parent.style.justifyContent = "space-between";
          parent.style.alignItems = "center";
          parent.style.gap = "8px";
          parent.appendChild(btn);
          applyTheme(getSavedTheme());
          return;
        }
      }

      const bar = document.createElement("div");
      bar.className = "m-course-theme-bar";
      bar.appendChild(btn);
      document.body.insertBefore(bar, document.body.firstChild);
      applyTheme(getSavedTheme());
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountUnifiedButton);
  } else {
    mountUnifiedButton();
  }
})();

// ============================================================================
// 2. ОПРЕДЕЛЕНИЕ ПОЛЬЗОВАТЕЛЯ (TELEGRAM ИЛИ РЕЗЕРВНЫЙ ВХОД В БРАУЗЕРЕ)
// ============================================================================
function getUserId() {
  try {
    const tg = window.Telegram && window.Telegram.WebApp;
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id) {
      const tgId = String(tg.initDataUnsafe.user.id);
      localStorage.setItem("madrasah_user_id", tgId);
      return tgId;
    }
  } catch (e) {}

  try {
    const params = new URLSearchParams(window.location.search);
    const urlId = params.get("uid") || params.get("id");
    if (urlId && /^\d+$/.test(urlId.trim())) {
      localStorage.setItem("madrasah_user_id", urlId.trim());
      return urlId.trim();
    }
  } catch (e) {}

  try {
    const savedId = localStorage.getItem("madrasah_user_id");
    if (savedId) return savedId;
  } catch (e) {}

  return "guest";
}

function setManualUserId(id) {
  const clean = String(id || "").trim();
  if (!clean) return false;
  try {
    localStorage.setItem("madrasah_user_id", clean);
  } catch (e) {}
  return true;
}

// ============================================================================
// 3. ЗАЩИЩЁННЫЙ 24-ЧАСОВОЙ ТРИАЛ-ТАЙМЕР (СВЕРКА С СЕРВЕРОМ + ЗАЩИТА ОТ ОТМОТКИ)
// ============================================================================
let serverTimeOffsetMs = 0;

function syncServerClock() {
  try {
    fetch(window.location.href.split("?")[0] + "?ping=" + Date.now(), {
      method: "HEAD",
      cache: "no-store",
    })
      .then((res) => {
        const dateHeader = res.headers.get("Date");
        if (dateHeader) {
          const serverMs = new Date(dateHeader).getTime();
          if (!isNaN(serverMs)) {
            serverTimeOffsetMs = serverMs - Date.now();
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
    const prev = Number(localStorage.getItem("madrasah_max_seen_time") || 0);
    if (nowMs > prev) {
      localStorage.setItem("madrasah_max_seen_time", String(nowMs));
    }
  } catch (e) {}
}

function isClockRolledBack() {
  try {
    const maxSeen = Number(localStorage.getItem("madrasah_max_seen_time") || 0);
    const now = getTrustedNow();
    if (maxSeen > 0 && now + 60000 < maxSeen) {
      return true;
    }
    updateMaxSeenTime(now);
  } catch (e) {}
  return false;
}

syncServerClock();

function getTrialKey(uid) {
  return "madrasah_trial_start_" + (uid || "guest");
}

function getTrialState(uid) {
  const userId = uid || getUserId();
  const key = getTrialKey(userId);
  let start = 0;
  try {
    start = Number(localStorage.getItem(key) || 0);
  } catch (e) {}

  if (!start) {
    return { status: "available", remainingMs: TRIAL_DURATION_MS };
  }

  if (isClockRolledBack()) {
    return { status: "tampered", remainingMs: 0 };
  }

  const elapsed = getTrustedNow() - start;
  if (elapsed < 0) {
    return { status: "tampered", remainingMs: 0 };
  }

  const remaining = TRIAL_DURATION_MS - elapsed;
  if (remaining > 0) {
    return { status: "active", remainingMs: remaining };
  }

  return { status: "expired", remainingMs: 0 };
}

function activateTrial(uid) {
  const userId = uid || getUserId();
  const state = getTrialState(userId);
  if (state.status !== "available") return false;
  try {
    const now = getTrustedNow();
    localStorage.setItem(getTrialKey(userId), String(now));
    updateMaxSeenTime(now);
    return true;
  } catch (e) {
    return false;
  }
}

function formatRemainingTime(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(h)} ч ${pad(m)} мин ${pad(s)} сек`;
}

// ============================================================================
// 4. ПРОВЕРКА ПРАВ ДОСТУПА И ЖИВОЙ СЧЁТЧИК ВРЕМЕНИ
// ============================================================================
function hasPermanentOrTimedAccess(uid, courseCode) {
  const userId = uid || getUserId();
  const entry = ACCESS_MAP[userId];
  if (!entry) return false;

  if (Array.isArray(entry)) {
    return entry.includes("all") || (courseCode && entry.includes(courseCode));
  }

  if (typeof entry === "object" && entry.courses) {
    if (entry.expires) {
      const expMs = new Date(entry.expires).getTime();
      if (!isNaN(expMs) && getTrustedNow() > expMs) {
        return false;
      }
    }
    return entry.courses.includes("all") || (courseCode && entry.courses.includes(courseCode));
  }

  return false;
}

function checkCourseAccess(courseCode) {
  const uid = getUserId();
  if (hasPermanentOrTimedAccess(uid, courseCode)) {
    return { allowed: true, mode: "permanent", uid };
  }
  const trial = getTrialState(uid);
  if (trial.status === "active") {
    return { allowed: true, mode: "trial", uid, remainingMs: trial.remainingMs };
  }
  return { allowed: false, mode: trial.status, uid };
}

function mountTrialCountdownBar() {
  const uid = getUserId();
  if (hasPermanentOrTimedAccess(uid)) return;

  const trial = getTrialState(uid);
  if (trial.status !== "active") return;

  function renderBar() {
    if (document.getElementById("madrasah-trial-bar")) return;
    if (!document.body) return;

    const bar = document.createElement("div");
    bar.id = "madrasah-trial-bar";
    bar.style.cssText =
      "background: linear-gradient(90deg, #fef3c7, #fde68a); color: #78350f; " +
      "text-align: center; padding: 7px 12px; font-size: 13px; font-weight: 600; " +
      "border-bottom: 1px solid #f59e0b; position: sticky; top: 0; z-index: 1000;";
    document.body.insertBefore(bar, document.body.firstChild);

    const tick = () => {
      const st = getTrialState(uid);
      if (st.status === "active") {
        bar.textContent = "⏳ Пробный доступ (24 ч) • Осталось: " + formatRemainingTime(st.remainingMs);
      } else {
        bar.textContent = "⌛ Пробный 24-часовой доступ завершён.";
        setTimeout(() => window.location.reload(), 1500);
      }
    };
    tick();
    setInterval(tick, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderBar);
  } else {
    renderBar();
  }
}

mountTrialCountdownBar();

function protectCoursePage(courseCode, onAllowed) {
  const res = checkCourseAccess(courseCode);
  if (res.allowed) {
    if (typeof onAllowed === "function") onAllowed(res);
    return true;
  }

  const renderBlocked = () => {
    const isAvailable = res.mode === "available";
    document.body.innerHTML = `
      <div style="max-width:460px;margin:40px auto;padding:24px;border-radius:16px;background:#fff;box-shadow:0 6px 24px rgba(0,0,0,0.08);text-align:center;font-family:system-ui,-apple-system,sans-serif;">
        <div style="font-size:40px;margin-bottom:10px;">🔒</div>
        <h2 style="margin:0 0 10px 0;font-size:20px;color:#111827;">Доступ к курсу закрыт</h2>
        <p style="margin:0 0 18px 0;font-size:14px;color:#4b5563;line-height:1.5;">
          ${
            isAvailable
              ? "Вы можете активировать бесплатный ознакомительный доступ ко всем 6 курсам на 24 часа или отправить свой ID преподавателю."
              : "Срок ознакомительного доступа истёк. Отправьте ваш ID преподавателю для открытия постоянного доступа."
          }
        </p>
        <div style="background:#f3f4f6;padding:10px;border-radius:10px;font-family:monospace;font-size:15px;margin-bottom:16px;color:#111827;">
          Ваш ID: <strong>${res.uid}</strong>
        </div>
        ${
          isAvailable
            ? `<button id="btnActivateCourseTrial" style="width:100%;padding:12px;border:none;border-radius:10px;background:#059669;color:#fff;font-size:15px;font-weight:600;cursor:pointer;margin-bottom:10px;">🎁 Включить пробный доступ на 24 часа</button>`
            : ""
        }
        <a href="../index.html?uid=${encodeURIComponent(res.uid)}" style="display:block;padding:11px;border-radius:10px;background:#e5e7eb;color:#1f2937;text-decoration:none;font-size:14px;font-weight:600;">← Вернуться в главное меню</a>
      </div>
    `;
    const btn = document.getElementById("btnActivateCourseTrial");
    if (btn) {
      btn.onclick = () => {
        if (activateTrial(res.uid)) {
          window.location.reload();
        }
      };
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderBlocked);
  } else {
    renderBlocked();
  }
  return false;
}
