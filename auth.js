// ==================== ЕДИНАЯ СИСТЕМА ДОСТУПА, ТРИАЛА И ТЕМЫ (auth.js) ====================
(function () {
  // Список пользователей с постоянным или временным доступом по дате
  // Формат:
  // "TELEGRAM_ID": ["all"] — полный доступ ко всем курсам
  // "TELEGRAM_ID": ["sira", "nawawi", "fiqh", "tajweed", "adab", "aqeedah"] — доступ к выбранным курсам
  // "TELEGRAM_ID": { courses: ["all"], expires: "2026-12-31T23:59:59" } — доступ до конкретной даты
  window.ALLOWED_USERS = {
    "859435297": ["all"]
  };

  const ALL_COURSES = ["sira", "nawawi", "fiqh", "tajweed", "adab", "aqeedah"];
  const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000; // 24 часа

  // 1. МГНОВЕННОЕ ПРИМЕНЕНИЕ ТЕМЫ И СКРЫТИЕ СТАРЫХ КНОПОК ДО ОТРИСОВКИ СТРАНИЦЫ
  const THEME_KEY = "madrasah_theme";
  function getSavedTheme() {
    try {
      return localStorage.getItem(THEME_KEY) || "light";
    } catch (e) {
      return "light";
    }
  }

  function applyThemeClasses(theme) {
    const isDark = theme === "dark";
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark", "dark-mode", "night-mode");
      root.setAttribute("data-theme", "dark");
    } else {
      root.classList.remove("dark", "dark-mode", "night-mode");
      root.setAttribute("data-theme", "light");
    }
    if (document.body) {
      if (isDark) {
        document.body.classList.add("dark", "dark-mode", "night-mode");
        document.body.setAttribute("data-theme", "dark");
      } else {
        document.body.classList.remove("dark", "dark-mode", "night-mode");
        document.body.setAttribute("data-theme", "light");
      }
    }
    try {
      if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.setHeaderColor(isDark ? "#0f172a" : "#115e3b");
        window.Telegram.WebApp.setBackgroundColor(isDark ? "#0b1120" : "#f4f6f5");
      }
    } catch (e) {}
  }

  applyThemeClasses(getSavedTheme());

  // Инжект стилей в <head> сразу при загрузке скрипта (без мерцания старых кнопок)
  const headStyle = document.createElement("style");
  headStyle.id = "madrasah-unified-style";
  headStyle.textContent = `
    /* Скрываем старые разрозненные кнопки темы во всех курсах */
    #themeToggle, #theme-toggle, .theme-toggle, .theme-btn, .dark-toggle,
    button[onclick*="toggleTheme"], button[onclick*="switchTheme"], button[onclick*="setTheme"] {
      display: none !important;
    }

    /* Компактная круглая кнопка солнце/луна */
    .madrasah-theme-fab {
      position: fixed;
      top: 10px;
      right: 12px;
      z-index: 9999;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      border: 1px solid rgba(17, 94, 59, 0.22);
      background: rgba(255, 255, 255, 0.92);
      color: #115e3b;
      font-size: 16px;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.10);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      transition: transform 0.18s ease, background 0.2s ease, border-color 0.2s ease;
      padding: 0;
    }
    .madrasah-theme-fab:active {
      transform: scale(0.92);
    }
    html.dark .madrasah-theme-fab,
    body.dark-mode .madrasah-theme-fab {
      background: rgba(30, 41, 59, 0.92);
      border-color: rgba(148, 163, 184, 0.28);
      color: #fbbf24;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
    }

    /* Плашка обратного отсчёта триала внутри курсов */
    .madrasah-trial-bar {
      background: linear-gradient(90deg, #fef3c7, #fde68a);
      color: #78350f;
      font-size: 12px;
      font-weight: 600;
      text-align: center;
      padding: 6px 46px 6px 12px;
      border-bottom: 1px solid #f59e0b;
      position: sticky;
      top: 0;
      z-index: 9990;
    }
    html.dark .madrasah-trial-bar,
    body.dark-mode .madrasah-trial-bar {
      background: linear-gradient(90deg, #451a03, #78350f);
      color: #fde68a;
      border-bottom-color: #92400e;
    }

    /* Универсальная ночная палитра для всех курсов (включая Сиру и 40 хадисов) */
    html.dark, html.dark body, body.dark-mode {
      background-color: #0b1120 !important;
      color: #e2e8f0 !important;
    }
    html.dark .container, html.dark .card, html.dark .chapter-card,
    html.dark .hadith-card, html.dark .question-card, html.dark .modal-content,
    html.dark .cheatsheet-box, html.dark .quiz-box, html.dark .stats-bar,
    html.dark .header-box, html.dark .controls, html.dark .top-bar,
    body.dark-mode .card, body.dark-mode .chapter-card, body.dark-mode .hadith-card,
    body.dark-mode .question-card, body.dark-mode .modal-content {
      background-color: #1e293b !important;
      color: #e2e8f0 !important;
      border-color: #334155 !important;
    }
    html.dark h1, html.dark h2, html.dark h3, html.dark h4,
    body.dark-mode h1, body.dark-mode h2, body.dark-mode h3 {
      color: #f8fafc !important;
    }
    html.dark p, html.dark li, html.dark span, html.dark label,
    body.dark-mode p, body.dark-mode li {
      color: #cbd5e1;
    }
    html.dark .option-btn, html.dark .option, html.dark .choice-btn,
    body.dark-mode .option-btn, body.dark-mode .option {
      background-color: #0f172a !important;
      color: #e2e8f0 !important;
      border-color: #334155 !important;
    }
    html.dark .option-btn:hover, html.dark .option:hover {
      background-color: #1e293b !important;
      border-color: #10b981 !important;
    }
    html.dark .explanation, html.dark .exp-box, html.dark .arabic-text, html.dark .arabic {
      background-color: #0f172a !important;
      color: #f1f5f9 !important;
      border-color: #334155 !important;
    }
    html.dark .btn-secondary, html.dark .back-btn, html.dark .font-btn, html.dark .chapter-btn {
      background-color: #1e293b !important;
      color: #e2e8f0 !important;
      border-color: #475569 !important;
    }
    html.dark .chapter-btn.active {
      background-color: #065f46 !important;
      color: #ffffff !important;
      border-color: #10b981 !important;
    }
  `;
  (document.head || document.documentElement).appendChild(headStyle);

  // 2. ОПРЕДЕЛЕНИЕ ID ПОЛЬЗОВАТЕЛЯ (Telegram WebApp / URL ?uid= / localStorage)
  function getUserId() {
    try {
      if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
        const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
        if (tgUser && tgUser.id) {
          const idStr = String(tgUser.id);
          localStorage.setItem("madrasah_uid", idStr);
          return idStr;
        }
      }
    } catch (e) {}

    try {
      const params = new URLSearchParams(window.location.search);
      const urlUid = params.get("uid");
      if (urlUid && urlUid.trim()) {
        const clean = urlUid.trim();
        localStorage.setItem("madrasah_uid", clean);
        return clean;
      }
    } catch (e) {}

    try {
      const saved = localStorage.getItem("madrasah_uid");
      if (saved && saved.trim()) return saved.trim();
    } catch (e) {}

    return "";
  }

  function setManualUserId(id) {
    const clean = String(id || "").trim();
    if (!clean) return "";
    try {
      localStorage.setItem("madrasah_uid", clean);
    } catch (e) {}
    return clean;
  }

  // 3. ЗАЩИЩЁННОЕ ОТ ПЕРЕВОДА ЧАСОВ ВРЕМЯ (СВЕРКА С СЕРВЕРОМ + MAX SEEN TIME)
  let serverTimeOffset = 0;
  function getTrustedNow() {
    const deviceNow = Date.now() + serverTimeOffset;
    try {
      const maxSeen = parseInt(localStorage.getItem("madrasah_max_seen_time") || "0", 10);
      if (deviceNow > maxSeen) {
        localStorage.setItem("madrasah_max_seen_time", String(deviceNow));
        return deviceNow;
      }
      return maxSeen;
    } catch (e) {
      return deviceNow;
    }
  }

  async function syncServerTime() {
    try {
      const resp = await fetch(window.location.href.split("?")[0] + "?t=" + Date.now(), {
        method: "HEAD",
        cache: "no-store"
      });
      const dateHeader = resp.headers.get("Date");
      if (dateHeader) {
        const srvMs = new Date(dateHeader).getTime();
        if (!isNaN(srvMs) && srvMs > 1700000000000) {
          serverTimeOffset = srvMs - Date.now();
          getTrustedNow();
        }
      }
    } catch (e) {}
  }
  syncServerTime();

  // 4. ЛОГИКА 24-ЧАСОВОГО ПРОБНОГО ДОСТУПА (ТРИАЛА)
  function getTrialKey(uid) {
    return "madrasah_trial_start_" + (uid || "guest");
  }

  function getTrialStatus(uid) {
    const id = uid || getUserId() || "guest";
    let startStr = null;
    try {
      startStr = localStorage.getItem(getTrialKey(id));
    } catch (e) {}

    if (!startStr) {
      return { state: "available", remainingMs: TRIAL_DURATION_MS };
    }
    const startMs = parseInt(startStr, 10);
    if (isNaN(startMs) || startMs <= 0) {
      return { state: "available", remainingMs: TRIAL_DURATION_MS };
    }
    const now = getTrustedNow();
    const elapsed = now - startMs;
    if (elapsed < TRIAL_DURATION_MS) {
      return { state: "active", remainingMs: TRIAL_DURATION_MS - elapsed, startMs: startMs };
    }
    return { state: "expired", remainingMs: 0, startMs: startMs };
  }

  function startTrial24h(uid) {
    const id = uid || getUserId() || "guest";
    const status = getTrialStatus(id);
    if (status.state === "active") {
      return true;
    }
    if (status.state === "expired") {
      return false;
    }
    const now = getTrustedNow();
    try {
      localStorage.setItem(getTrialKey(id), String(now));
    } catch (e) {}
    return true;
  }

  function formatDuration(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (n) => (n < 10 ? "0" + n : String(n));
    return `${h} ч ${pad(m)} мин ${pad(s)} сек`;
  }

  // 5. ПРОВЕРКА ДОСТУПА К КУРСАМ
  function getPermanentAccess(uid) {
    const id = uid || getUserId();
    if (!id || !window.ALLOWED_USERS) return null;
    const record = window.ALLOWED_USERS[id];
    if (!record) return null;

    if (Array.isArray(record)) {
      return record.includes("all") ? ALL_COURSES : record;
    }
    if (typeof record === "object" && record.courses) {
      if (record.expires) {
        const expMs = new Date(record.expires).getTime();
        if (!isNaN(expMs) && getTrustedNow() > expMs) {
          return null;
        }
      }
      return record.courses.includes("all") ? ALL_COURSES : record.courses;
    }
    return null;
  }

  function hasPermanentAll(uid) {
    const list = getPermanentAccess(uid);
    return Array.isArray(list) && list.length === ALL_COURSES.length;
  }

  function hasCourseAccess(courseCode, uid) {
    const id = uid || getUserId();
    const perm = getPermanentAccess(id);
    if (perm && (perm.includes("all") || perm.includes(courseCode))) {
      return true;
    }
    const trial = getTrialStatus(id);
    if (trial.state === "active") {
      return true;
    }
    return false;
  }

  // Защита внутренних страниц курсов
  function protectCoursePage(courseCode) {
    const id = getUserId();
    if (hasCourseAccess(courseCode, id)) {
      return true;
    }
    document.addEventListener("DOMContentLoaded", function () {
      const isRoot = !window.location.pathname.match(/\/(sira|nawawi|fiqh|tajweed|adab|aqeedah)\//);
      const backHref = isRoot ? "index.html" : "../index.html" + (id ? "?uid=" + encodeURIComponent(id) : "");
      document.body.innerHTML = `
        <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;text-align:center;">
          <div style="max-width:420px;width:100%;background:var(--card-bg,#fff);border:1px solid #e2e8f0;border-radius:16px;padding:28px 20px;box-shadow:0 8px 24px rgba(0,0,0,0.08);">
            <div style="font-size:42px;margin-bottom:12px;">🔒</div>
            <h2 style="margin:0 0 10px;font-size:20px;color:#1e293b;">Доступ к курсу закрыт</h2>
            <p style="margin:0 0 18px;font-size:14px;line-height:1.5;color:#64748b;">
              Для открытия этого тренажёра активируйте бесплатный ознакомительный доступ на 24 часа в главном меню или отправьте ваш ID администратору.
            </p>
            ${id ? `<div style="background:#f1f5f9;padding:8px 12px;border-radius:8px;font-family:monospace;font-size:14px;margin-bottom:16px;color:#0f172a;">Ваш ID: <strong>${id}</strong></div>` : ""}
            <a href="${backHref}" style="display:inline-block;background:#115e3b;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;font-size:15px;">
              ← Вернуться в каталог курсов
            </a>
          </div>
        </div>
      `;
    });
    return false;
  }

  // 6. ПЕРЕКЛЮЧЕНИЕ ТЕМЫ (СОЛНЦЕ / ЛУНА) И ОЧИСТКА ЛИШНИХ КНОПОК
  function toggleMadrasahTheme() {
    const next = getSavedTheme() === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (e) {}
    applyThemeClasses(next);
    updateThemeButtonsUI();
  }

  function updateThemeButtonsUI() {
    const isDark = getSavedTheme() === "dark";
    const icon = isDark ? "☀️" : "🌙";
    const title = isDark ? "Включить дневную тему" : "Включить ночную тему";
    document.querySelectorAll(".madrasah-theme-fab, #indexThemeBtn").forEach((btn) => {
      btn.textContent = icon;
      btn.title = title;
      btn.setAttribute("aria-label", title);
    });
  }

  function cleanupCourseUI() {
    const isCoursePage = /\/(sira|nawawi|fiqh|tajweed|adab|aqeedah)\//.test(window.location.pathname);

    // Скрываем лишние кнопки в «40 хадисах» (Глава PDF, Экспорт, Импорт)
    if (window.location.pathname.includes("/nawawi/")) {
      document.querySelectorAll("button, a").forEach((el) => {
        const txt = (el.textContent || "").trim();
        if (
          txt.includes("Глава (PDF)") ||
          txt === "Экспорт" ||
          txt === "Импорт" ||
          txt.includes("💾 Экспорт") ||
          txt.includes("📂 Импорт")
        ) {
          el.style.display = "none";
        }
      });
    }

    // Удаляем старые кнопки смены темы на страницах курсов
    if (isCoursePage) {
      document.querySelectorAll("button").forEach((btn) => {
        if (btn.classList.contains("madrasah-theme-fab")) return;
        const txt = (btn.textContent || "").trim();
        if (
          txt === "🌙" ||
          txt === "☀️" ||
          txt === "🌓" ||
          txt.includes("Тёмная тема") ||
          txt.includes("Светлая тема") ||
          txt === "Ночь" ||
          txt === "День" ||
          txt === "🌙 Ночь" ||
          txt === "☀️ День"
        ) {
          btn.style.display = "none";
        }
      });

      // Добавляем компактную круглую кнопку солнце/луна, если её ещё нет
      if (!document.querySelector(".madrasah-theme-fab")) {
        const fab = document.createElement("button");
        fab.type = "button";
        fab.className = "madrasah-theme-fab";
        fab.addEventListener("click", toggleMadrasahTheme);
        document.body.appendChild(fab);
      }

      // Если пользователь на триале, показываем компактную полоску таймера сверху
      const id = getUserId();
      if (!hasPermanentAll(id)) {
        const trial = getTrialStatus(id);
        if (trial.state === "active" && !document.querySelector(".madrasah-trial-bar")) {
          const bar = document.createElement("div");
          bar.className = "madrasah-trial-bar";
          document.body.insertBefore(bar, document.body.firstChild);
          const tick = () => {
            const st = getTrialStatus(id);
            if (st.state !== "active") {
              window.location.reload();
              return;
            }
            bar.textContent = "⏳ Пробный доступ • Осталось: " + formatDuration(st.remainingMs);
          };
          tick();
          setInterval(tick, 1000);
        }
      }
    }

    updateThemeButtonsUI();
  }

  document.addEventListener("DOMContentLoaded", function () {
    applyThemeClasses(getSavedTheme());
    cleanupCourseUI();
    setTimeout(cleanupCourseUI, 350);
  });

  // Экспортируем единый API
  window.MadrasahAuth = {
    ALL_COURSES,
    getUserId,
    setManualUserId,
    getTrialStatus,
    startTrial24h,
    formatDuration,
    getPermanentAccess,
    hasPermanentAll,
    hasCourseAccess,
    protectCoursePage,
    toggleTheme: toggleMadrasahTheme,
    getSavedTheme,
    applyThemeClasses
  };

  window.hasCourseAccess = hasCourseAccess;
  window.protectCoursePage = protectCoursePage;
  window.checkAccess = protectCoursePage;
})();
