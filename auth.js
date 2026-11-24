// ============================================================================
// ЕДИНЫЙ МОДУЛЬ ДОСТУПА, ТРИАЛ-ТАЙМЕРА И ОФОРМЛЕНИЯ БИБЛИОТЕКИ
// ============================================================================

window.ALLOWED_USERS = {
  // Постоянный полный доступ ко всем курсам:
  "859435297": ["all"],

  // Примеры добавления учеников:
  // "123456789": ["all"],
  // "987654321": ["sira", "nawawi", "fiqh", "tajweed", "adab", "aqeedah"],
  // "555444333": { courses: ["all"], expires: "2026-12-31T23:59:59" }
};

(function () {
  const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000;
  const STORAGE_UID_KEY = "madrasah_uid_v2";
  const STORAGE_THEME_KEY = "madrasah_theme_v1";
  const STORAGE_MAX_TIME_KEY = "madrasah_max_seen_ts";

  let serverTimeOffset = 0;
  let serverTimeSynced = false;

  // Синхронизация времени с сервером GitHub (защита от перевода часов)
  async function syncServerTime() {
    try {
      const resp = await fetch(window.location.href.split("#")[0], {
        method: "HEAD",
        cache: "no-store"
      });
      const dateHeader = resp.headers.get("Date");
      if (dateHeader) {
        const serverMs = new Date(dateHeader).getTime();
        if (!isNaN(serverMs)) {
          serverTimeOffset = serverMs - Date.now();
          serverTimeSynced = true;
          updateMaxSeenTime(getTrustedNow());
          renderTrialUI();
        }
      }
    } catch (e) {
      // Офлайн-режим: используем защиту по максимальному зафиксированному времени
    }
  }

  function updateMaxSeenTime(ts) {
    try {
      const prev = parseInt(localStorage.getItem(STORAGE_MAX_TIME_KEY) || "0", 10);
      if (ts > prev) {
        localStorage.setItem(STORAGE_MAX_TIME_KEY, String(ts));
      }
    } catch (e) {}
  }

  function getTrustedNow() {
    const rawNow = Date.now() + (serverTimeSynced ? serverTimeOffset : 0);
    let maxSeen = 0;
    try {
      maxSeen = parseInt(localStorage.getItem(STORAGE_MAX_TIME_KEY) || "0", 10);
    } catch (e) {}
    const trusted = Math.max(rawNow, maxSeen);
    updateMaxSeenTime(trusted);
    return trusted;
  }

  // Определение ID пользователя (Telegram -> URL -> localStorage)
  window.getUserId = function () {
    try {
      const tg = window.Telegram && window.Telegram.WebApp;
      if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id) {
        const tgId = String(tg.initDataUnsafe.user.id);
        localStorage.setItem(STORAGE_UID_KEY, tgId);
        return tgId;
      }
    } catch (e) {}

    try {
      const params = new URLSearchParams(window.location.search);
      const urlUid = params.get("uid") || params.get("id");
      if (urlUid && urlUid.trim()) {
        const clean = urlUid.trim();
        localStorage.setItem(STORAGE_UID_KEY, clean);
        return clean;
      }
    } catch (e) {}

    try {
      const saved = localStorage.getItem(STORAGE_UID_KEY);
      if (saved && saved.trim()) return saved.trim();
    } catch (e) {}

    return "guest";
  };

  window.setManualUserId = function (newId) {
    if (!newId || !String(newId).trim()) return;
    try {
      localStorage.setItem(STORAGE_UID_KEY, String(newId).trim());
    } catch (e) {}
    window.location.reload();
  };

  function getTrialKey(uid) {
    return "madrasah_trial_end_" + uid;
  }

  window.getTrialState = function () {
    const uid = window.getUserId();
    const now = getTrustedNow();
    let endTs = 0;
    try {
      endTs = parseInt(localStorage.getItem(getTrialKey(uid)) || "0", 10);
    } catch (e) {}

    if (!endTs) {
      return { status: "unused", remainingMs: 0, endTs: 0 };
    }
    if (now < endTs) {
      return { status: "active", remainingMs: endTs - now, endTs: endTs };
    }
    return { status: "expired", remainingMs: 0, endTs: endTs };
  };

  // Несбрасываемый запуск 24-часового триала
  window.startTrial24h = function () {
    const uid = window.getUserId();
    const current = window.getTrialState();
    if (current.status === "active") {
      renderTrialUI();
      return true;
    }
    if (current.status === "expired") {
      alert("Ознакомительный доступ на 24 часа для вашего ID уже был использован. Отправьте ваш ID администратору для подключения.");
      return false;
    }
    const endTs = getTrustedNow() + TRIAL_DURATION_MS;
    try {
      localStorage.setItem(getTrialKey(uid), String(endTs));
    } catch (e) {}
    renderTrialUI();
    if (typeof window.renderCatalog === "function") {
      window.renderCatalog();
    }
    return true;
  };

  window.hasPermanentOrTimedManualAccess = function (courseCode) {
    const uid = window.getUserId();
    const entry = window.ALLOWED_USERS[uid];
    if (!entry) return false;

    const now = getTrustedNow();
    let courses = [];
    if (Array.isArray(entry)) {
      courses = entry;
    } else if (typeof entry === "object") {
      if (entry.expires) {
        const expMs = new Date(entry.expires).getTime();
        if (!isNaN(expMs) && now > expMs) return false;
      }
      courses = entry.courses || [];
    }

    if (courses.includes("all")) return true;
    if (!courseCode) return courses.length > 0;
    return courses.includes(courseCode);
  };

  window.hasCourseAccess = function (courseCode) {
    if (window.hasPermanentOrTimedManualAccess(courseCode)) return true;
    const trial = window.getTrialState();
    return trial.status === "active";
  };

  window.checkAccess = window.hasCourseAccess;
  window.canAccessCourse = window.hasCourseAccess;

  window.protectCoursePage = function (courseCode) {
    if (window.hasCourseAccess(courseCode)) return true;

    const renderLock = function () {
      const uid = window.getUserId();
      const trial = window.getTrialState();
      const canTry = trial.status === "unused";

      document.body.innerHTML = `
        <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background:#f4f6f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <div style="max-width:420px;width:100%;background:#ffffff;border-radius:18px;padding:28px 22px;text-align:center;box-shadow:0 8px 28px rgba(0,0,0,0.08);border:1px solid #e2e8e4;">
            <div style="font-size:42px;margin-bottom:10px;">🔒</div>
            <h2 style="margin:0 0 10px;color:#14532d;font-size:20px;">Доступ к курсу закрыт</h2>
            <p style="margin:0 0 16px;color:#4b5563;font-size:14px;line-height:1.5;">
              Чтобы открыть этот тренажёр, отправьте ваш ID администратору${canTry ? " или включите бесплатный пробный доступ на 24 часа" : ""}.
            </p>
            <div style="background:#f0fdf4;border:1px dashed #16a34a;border-radius:12px;padding:10px;margin-bottom:16px;font-size:15px;color:#14532d;">
              Ваш ID: <strong>${uid}</strong>
            </div>
            ${canTry ? `<button onclick="if(window.startTrial24h()) window.location.reload();" style="width:100%;padding:13px;border:none;border-radius:12px;background:#d97706;color:#fff;font-weight:700;font-size:15px;cursor:pointer;margin-bottom:10px;">🎁 Включить пробный доступ на 24 ч</button>` : ""}
            <a href="../index.html?uid=${encodeURIComponent(uid)}" style="display:block;width:100%;box-sizing:border-box;padding:12px;border-radius:12px;background:#14532d;color:#fff;text-decoration:none;font-weight:600;font-size:14px;">← Вернуться в главное меню</a>
          </div>
        </div>
      `;
    };

    if (document.body) {
      renderLock();
    } else {
      document.addEventListener("DOMContentLoaded", renderLock);
    }
    return false;
  };

  window.requireCourseAccess = window.protectCoursePage;

  function formatRemaining(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (n) => (n < 10 ? "0" + n : String(n));
    return `${h} ч ${pad(m)} мин ${pad(s)} сек`;
  }

  function isCatalogPage() {
    const p = window.location.pathname.toLowerCase();
    return (
      !p.includes("/sira") &&
      !p.includes("/nawawi") &&
      !p.includes("/fiqh") &&
      !p.includes("/tajweed") &&
      !p.includes("/adab") &&
      !p.includes("/aqeedah")
    );
  }

  function renderTrialUI() {
    const uid = window.getUserId();
    const hasPerm = window.hasPermanentOrTimedManualAccess(null);
    const trial = window.getTrialState();

    // Обновление компактной строки на главной странице (если она есть)
    const catalogSlot = document.getElementById("trial-status-slot");
    if (catalogSlot) {
      if (hasPerm) {
        catalogSlot.style.display = "none";
      } else if (trial.status === "unused") {
        catalogSlot.style.display = "flex";
        catalogSlot.style.background = "#fef3c7";
        catalogSlot.style.borderColor = "#f59e0b";
        catalogSlot.style.color = "#92400e";
        catalogSlot.innerHTML = `
          <span>🎁 Пробный доступ на 24 часа ко всем 6 курсам</span>
          <button type="button" onclick="window.startTrial24h()" style="background:#d97706;color:#fff;border:none;border-radius:8px;padding:5px 10px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;">Включить 24 ч →</button>
        `;
      } else if (trial.status === "active") {
        catalogSlot.style.display = "flex";
        catalogSlot.style.background = "#dcfce7";
        catalogSlot.style.borderColor = "#22c55e";
        catalogSlot.style.color = "#14532d";
        catalogSlot.innerHTML = `
          <span>⏳ <strong>Пробный доступ активен (все 6 курсов)</strong> • Осталось: <strong>${formatRemaining(trial.remainingMs)}</strong></span>
        `;
      } else {
        catalogSlot.style.display = "flex";
        catalogSlot.style.background = "#fee2e2";
        catalogSlot.style.borderColor = "#ef4444";
        catalogSlot.style.color = "#991b1b";
        catalogSlot.innerHTML = `
          <span>⌛ Пробный доступ (24 ч) завершён. Отправьте ID <strong>${uid}</strong> администратору.</span>
        `;
      }
    }

    // Верхняя закреплённая плашка таймера только внутри курсов
    if (!isCatalogPage() && !hasPerm && trial.status === "active" && document.body) {
      let bar = document.getElementById("madrasah-inner-trial-bar");
      if (!bar) {
        bar = document.createElement("div");
        bar.id = "madrasah-inner-trial-bar";
        bar.style.cssText =
          "background:#fef3c7;color:#92400e;border-bottom:1px solid #f59e0b;padding:7px 12px;text-align:center;font-size:13px;font-weight:600;position:sticky;top:0;z-index:9998;";
        document.body.insertBefore(bar, document.body.firstChild);
      }
      bar.textContent = `⏳ Пробный доступ (24 ч) • Осталось: ${formatRemaining(trial.remainingMs)}`;
    }
  }

  // ==========================================================================
  // ЕДИНЫЙ ПЕРЕКЛЮЧАТЕЛЬ ДЕНЬ / НОЧЬ И ОЧИСТКА ЛИШНИХ КНОПОК
  // ==========================================================================

  function applyTheme(theme) {
    const isDark = theme === "dark";
    try {
      localStorage.setItem(STORAGE_THEME_KEY, isDark ? "dark" : "light");
    } catch (e) {}

    if (document.documentElement) {
      document.documentElement.classList.toggle("dark-theme", isDark);
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    }
    if (document.body) {
      document.body.classList.toggle("dark-theme", isDark);
      document.body.classList.toggle("dark", isDark);
      document.body.setAttribute("data-theme", isDark ? "dark" : "light");
    }

    const btn = document.getElementById("madrasah-unified-theme-btn");
    if (btn) {
      btn.innerHTML = isDark ? "☀️ День" : "🌙 Ночь";
    }

    try {
      const tg = window.Telegram && window.Telegram.WebApp;
      if (tg && tg.setHeaderColor) {
        tg.setHeaderColor(isDark ? "#0f172a" : "#14532d");
      }
    } catch (e) {}
  }

  window.toggleUnifiedTheme = function () {
    const current = localStorage.getItem(STORAGE_THEME_KEY) === "dark" ? "light" : "dark";
    applyTheme(current);
  };

  function injectGlobalStyles() {
    if (document.getElementById("madrasah-unified-styles")) return;
    const style = document.createElement("style");
    style.id = "madrasah-unified-styles";
    style.textContent = `
      html.dark-theme, body.dark-theme {
        background-color: #0f172a !important;
        color: #f1f5f9 !important;
      }
      body.dark-theme .card,
      body.dark-theme .chapter-card,
      body.dark-theme .module-card,
      body.dark-theme .course-card,
      body.dark-theme .quiz-card,
      body.dark-theme .modal-content,
      body.dark-theme .stat-box,
      body.dark-theme .hadith-card {
        background-color: #1e293b !important;
        color: #f1f5f9 !important;
        border-color: #334155 !important;
      }
      body.dark-theme .option-btn,
      body.dark-theme .answer-btn,
      body.dark-theme button.option {
        background-color: #1e293b !important;
        color: #f1f5f9 !important;
        border-color: #475569 !important;
      }
      body.dark-theme .explanation,
      body.dark-theme .cheatsheet-box {
        background-color: #0f172a !important;
        color: #e2e8f0 !important;
        border-color: #334155 !important;
      }
      #madrasah-unified-theme-btn {
        position: fixed;
        top: 10px;
        right: 12px;
        z-index: 9999;
        background: #ffffff;
        color: #1e293b;
        border: 1px solid #cbd5e1;
        border-radius: 999px;
        padding: 6px 13px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
      }
      body.dark-theme #madrasah-unified-theme-btn {
        background: #1e293b;
        color: #f8fafc;
        border-color: #475569;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function cleanupButtons() {
    const isNawawi = window.location.pathname.toLowerCase().includes("/nawawi");
    const buttons = document.querySelectorAll("button, a.btn");

    buttons.forEach((el) => {
      if (el.id === "madrasah-unified-theme-btn") return;
      const txt = (el.textContent || "").trim();

      // Скрываем дублирующие кнопки темы во всех курсах
      if (
        txt === "Тёмная тема" ||
        txt === "Светлая тема" ||
        txt === "Тема" ||
        txt === "🌙" ||
        txt === "☀️" ||
        txt === "🌓" ||
        (el.getAttribute("onclick") && el.getAttribute("onclick").includes("toggleTheme"))
      ) {
        el.style.display = "none";
      }

      // В курсе "40 хадисов" убираем кнопки "Глава (PDF)", "Экспорт", "Импорт"
      if (isNawawi) {
        if (
          txt.includes("Глава (PDF)") ||
          txt === "Глава" ||
          txt === "Экспорт" ||
          txt === "Импорт"
        ) {
          el.style.display = "none";
        }
      }
    });
  }

  function initUnifiedUI() {
    injectGlobalStyles();

    if (!document.getElementById("madrasah-unified-theme-btn") && document.body) {
      const btn = document.createElement("button");
      btn.id = "madrasah-unified-theme-btn";
      btn.type = "button";
      btn.onclick = window.toggleUnifiedTheme;
      document.body.appendChild(btn);
    }

    const savedTheme = localStorage.getItem(STORAGE_THEME_KEY) || "light";
    applyTheme(savedTheme);
    cleanupButtons();
    renderTrialUI();

    // Наблюдатель за динамически появляющимися кнопками (например, при открытии главы в хадисах)
    if (document.body && !window._madrasahObserverStarted) {
      window._madrasahObserverStarted = true;
      const observer = new MutationObserver(function () {
        cleanupButtons();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initUnifiedUI);
  } else {
    initUnifiedUI();
  }

  syncServerTime();
  setInterval(function () {
    renderTrialUI();
    const trial = window.getTrialState();
    if (!window.hasPermanentOrTimedManualAccess(null) && trial.status === "expired" && !isCatalogPage()) {
      window.location.reload();
    }
  }, 1000);
})();
