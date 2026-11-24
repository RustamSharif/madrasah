// ==================== ЕДИНАЯ СИСТЕМА ДОСТУПА, ТРИАЛА И ТЕМЫ (auth.js) ====================
(function () {
  // Список постоянных пользователей:
  // Формат: "TELEGRAM_ID": ["all"] или ["sira", "nawawi", "fiqh", "tajweed", "adab", "aqeedah"]
  const ALLOWED_USERS = {
    // Раскомментируйте строку ниже после проверки триал-доступа, чтобы вернуть себе постоянный доступ:
    // "859435297": ["all"],
  };

  const ALL_COURSES = ["sira", "nawawi", "fiqh", "tajweed", "adab", "aqeedah"];
  const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000; // 24 часа

  // Определение ID пользователя (Telegram WebApp -> URL параметр -> сохранённый в браузере)
  function resolveUserId() {
    try {
      if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        const user = tg.initDataUnsafe && tg.initDataUnsafe.user;
        if (user && user.id) {
          const idStr = String(user.id);
          localStorage.setItem("madrasah_user_id", idStr);
          return idStr;
        }
      }
    } catch (e) {}

    const urlParams = new URLSearchParams(window.location.search);
    const paramId = urlParams.get("uid") || urlParams.get("id");
    if (paramId && paramId.trim()) {
      const cleanId = paramId.trim();
      localStorage.setItem("madrasah_user_id", cleanId);
      return cleanId;
    }

    const saved = localStorage.getItem("madrasah_user_id");
    if (saved) return saved;

    // Гостевой ID для обычного браузера без Telegram
    let guestId = localStorage.getItem("madrasah_guest_id");
    if (!guestId) {
      guestId = "web_" + Math.random().toString(36).substring(2, 10);
      localStorage.setItem("madrasah_guest_id", guestId);
    }
    return guestId;
  }

  const CURRENT_USER_ID = resolveUserId();

  // ==================== ЗАЩИТА ВРЕМЕНИ ОТ ОТМОТКИ ЧАСОВ ====================
  let serverOffsetMs = 0;

  function getTrustedNow() {
    const deviceNow = Date.now() + serverOffsetMs;
    const maxKey = "madrasah_max_seen_time";
    const prevMax = parseInt(localStorage.getItem(maxKey) || "0", 10);
    if (deviceNow > prevMax) {
      localStorage.setItem(maxKey, String(deviceNow));
      return deviceNow;
    }
    return prevMax;
  }

  // Фоновая сверка времени с сервером GitHub (защита от перевода часов назад)
  fetch(window.location.href.split("?")[0] + "?t=" + Date.now(), {
    method: "HEAD",
    cache: "no-store"
  })
    .then((res) => {
      const dateHeader = res.headers.get("Date");
      if (dateHeader) {
        const serverMs = Date.parse(dateHeader);
        if (!isNaN(serverMs)) {
          serverOffsetMs = serverMs - Date.now();
          getTrustedNow();
          updateTrialUI();
        }
      }
    })
    .catch(() => {});

  // ==================== ЛОГИКА 24-ЧАСОВОГО ПРОБНОГО ДОСТУПА ====================
  function getTrialKey(uid) {
    return "madrasah_trial_start_" + (uid || CURRENT_USER_ID);
  }

  function getTrialState(uid) {
    const id = uid || CURRENT_USER_ID;
    const raw = localStorage.getItem(getTrialKey(id));
    if (!raw) {
      return { status: "available", remainingMs: TRIAL_DURATION_MS };
    }
    const startMs = parseInt(raw, 10);
    if (isNaN(startMs)) {
      return { status: "available", remainingMs: TRIAL_DURATION_MS };
    }
    const now = getTrustedNow();
    const elapsed = now - startMs;
    if (elapsed < TRIAL_DURATION_MS) {
      return { status: "active", remainingMs: TRIAL_DURATION_MS - elapsed };
    }
    return { status: "expired", remainingMs: 0 };
  }

  function hasPermanentAccess(uid) {
    const id = uid || CURRENT_USER_ID;
    const entry = ALLOWED_USERS[id];
    if (!entry) return false;
    if (Array.isArray(entry)) return entry.length > 0;
    if (typeof entry === "object" && entry.courses) {
      if (entry.expires) {
        return getTrustedNow() < Date.parse(entry.expires);
      }
      return entry.courses.length > 0;
    }
    return false;
  }

  function getAllowedCourses(uid) {
    const id = uid || CURRENT_USER_ID;
    const entry = ALLOWED_USERS[id];
    if (entry) {
      if (Array.isArray(entry)) {
        return entry.includes("all") ? ALL_COURSES : entry;
      }
      if (typeof entry === "object" && entry.courses) {
        if (!entry.expires || getTrustedNow() < Date.parse(entry.expires)) {
          return entry.courses.includes("all") ? ALL_COURSES : entry.courses;
        }
      }
    }
    const trial = getTrialState(id);
    if (trial.status === "active") {
      return ALL_COURSES;
    }
    return [];
  }

  function formatRemaining(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (n) => (n < 10 ? "0" + n : String(n));
    return `${h} ч ${pad(m)} мин ${pad(s)} сек`;
  }

  function activateTrial() {
    const state = getTrialState(CURRENT_USER_ID);
    if (state.status === "expired") {
      alert("Пробный 24-часовой период для этого аккаунта уже был использован. Отправьте ваш ID администратору для получения полного доступа.");
      return false;
    }
    if (state.status === "available") {
      const now = getTrustedNow();
      localStorage.setItem(getTrialKey(CURRENT_USER_ID), String(now));
    }
    updateTrialUI();
    if (typeof window.renderCourses === "function") {
      window.renderCourses();
    } else {
      window.location.reload();
    }
    return true;
  }

  // Экспортируем все возможные имена функции активации триала
  window.activateTrial = activateTrial;
  window.startTrial = activateTrial;
  window.activate24hTrial = activateTrial;
  window.enableTrial = activateTrial;

  function updateTrialUI() {
    const banner = document.getElementById("trialBanner");
    const timerBar = document.getElementById("globalTrialTimerBar");

    if (hasPermanentAccess(CURRENT_USER_ID)) {
      if (banner) banner.style.display = "none";
      if (timerBar) timerBar.remove();
      return;
    }

    const trial = getTrialState(CURRENT_USER_ID);

    // Обновляем плашку под зелёным баннером на главной странице (если она есть)
    if (banner) {
      banner.style.display = "flex";
      const textEl = document.getElementById("trialBannerText");
      const btnEl = document.getElementById("trialBannerBtn");

      if (trial.status === "available") {
        banner.className = "trial-banner trial-available";
        if (textEl) {
          textEl.innerHTML = "🎁 <strong>Ознакомительный доступ на 24 часа:</strong> откройте все 6 курсов бесплатно для оценки";
        }
        if (btnEl) {
          btnEl.style.display = "inline-flex";
          btnEl.textContent = "Включить 24 ч →";
        }
      } else if (trial.status === "active") {
        banner.className = "trial-banner trial-active";
        if (textEl) {
          textEl.innerHTML = `⏳ <strong>Пробный доступ активен (все 6 курсов)</strong> • Осталось: <span class="trial-countdown">${formatRemaining(trial.remainingMs)}</span>`;
        }
        if (btnEl) {
          btnEl.style.display = "none";
        }
      } else {
        banner.className = "trial-banner trial-expired";
        if (textEl) {
          textEl.innerHTML = "⌛ <strong>Ознакомительный доступ на 24 часа завершён.</strong> Скопируйте ваш ID выше и отправьте администратору для открытия курсов.";
        }
        if (btnEl) {
          btnEl.style.display = "none";
        }
      }
    }

    // Если мы внутри одного из курсов и активен триал — показываем компактную полоску таймера сверху
    const isSubPage = window.location.pathname.split("/").filter(Boolean).length > 1 ||
                      /\/(sira|nawawi|fiqh|tajweed|adab|aqeedah)\//i.test(window.location.href);
    if (isSubPage && trial.status === "active") {
      let bar = document.getElementById("globalTrialTimerBar");
      if (!bar) {
        bar = document.createElement("div");
        bar.id = "globalTrialTimerBar";
        bar.style.cssText =
          "background:#fef3c7;color:#92400e;border-bottom:1px solid #fcd34d;padding:6px 12px;font-size:12px;text-align:center;font-weight:600;position:sticky;top:0;z-index:9998;";
        document.body.insertBefore(bar, document.body.firstChild);
      }
      bar.textContent = `⏳ Пробный доступ (24 ч) • Осталось: ${formatRemaining(trial.remainingMs)}`;
    } else if (isSubPage && trial.status === "expired") {
      // Если время вышло прямо во время занятия — перезагружаем для блокировки
      if (document.body.dataset.courseProtected === "1") {
        window.location.reload();
      }
    }
  }

  setInterval(updateTrialUI, 1000);

  // ==================== ЗАЩИТА СТРАНИЦЫ ОТДЕЛЬНОГО КУРСА ====================
  function protectCoursePage(courseCode, onAllowed) {
    const allowed = getAllowedCourses(CURRENT_USER_ID);
    const isOk = allowed.includes(courseCode);

    if (isOk) {
      document.addEventListener("DOMContentLoaded", () => {
        document.body.dataset.courseProtected = "1";
        updateTrialUI();
      });
      if (typeof onAllowed === "function") onAllowed();
      return true;
    }

    document.addEventListener("DOMContentLoaded", () => {
      const trial = getTrialState(CURRENT_USER_ID);
      const canTry = trial.status === "available";
      document.body.innerHTML = `
        <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background:var(--bg,#f3f4f6);color:var(--text,#111827);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <div style="max-width:420px;width:100%;background:var(--card,#ffffff);border-radius:16px;padding:24px;box-shadow:0 10px 25px rgba(0,0,0,0.08);text-align:center;border:1px solid var(--border,#e5e7eb);">
            <div style="font-size:42px;margin-bottom:10px;">🔒</div>
            <h2 style="margin:0 0 8px;font-size:20px;">Доступ к курсу закрыт</h2>
            <p style="margin:0 0 16px;font-size:14px;opacity:0.8;line-height:1.5;">
              Ваш ID: <strong>${CURRENT_USER_ID}</strong>.<br>
              ${canTry ? "Вы можете бесплатно открыть все 6 курсов на 24 часа для ознакомления." : "Для открытия постоянного доступа отправьте ваш ID администратору."}
            </p>
            ${
              canTry
                ? `<button onclick="window.activateTrial()" style="width:100%;padding:12px 16px;border:none;border-radius:12px;background:#0d6e4e;color:#fff;font-size:15px;font-weight:600;cursor:pointer;margin-bottom:10px;">🎁 Включить пробный доступ на 24 часа</button>`
                : ""
            }
            <a href="../index.html?uid=${encodeURIComponent(CURRENT_USER_ID)}" style="display:block;width:100%;box-sizing:border-box;padding:11px 16px;border-radius:12px;background:rgba(128,128,128,0.12);color:inherit;text-decoration:none;font-size:14px;font-weight:600;">← Вернуться в каталог курсов</a>
          </div>
        </div>
      `;
    });
    return false;
  }

  window.protectCoursePage = protectCoursePage;
  window.MADRASAH_AUTH = {
    getUserId: () => CURRENT_USER_ID,
    getAllowedCourses,
    hasPermanentAccess,
    getTrialState,
    activateTrial,
    protectCoursePage
  };

  // ==================== ЕДИНЫЙ ПЕРЕКЛЮЧАТЕЛЬ ДЕНЬ / НОЧЬ ДЛЯ ВСЕЙ БИБЛИОТЕКИ ====================
  const THEME_KEY = "madrasah_unified_theme";

  function applyUnifiedTheme(theme) {
    const isDark = theme === "dark";
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    if (document.body) {
      document.body.classList.toggle("dark-theme", isDark);
      document.body.classList.toggle("dark", isDark);
    }
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");

    const btn = document.getElementById("unifiedThemeToggleBtn");
    if (btn) {
      btn.innerHTML = isDark ? "☀️ День" : "🌙 Ночь";
      btn.setAttribute("aria-label", isDark ? "Включить дневную тему" : "Включить ночную тему");
    }

    try {
      if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.setHeaderColor(isDark ? "#111827" : "#0d6e4e");
        tg.setBackgroundColor(isDark ? "#0f172a" : "#f3f4f6");
      }
    } catch (e) {}
  }

  function toggleUnifiedTheme() {
    const current = localStorage.getItem(THEME_KEY) || "light";
    applyUnifiedTheme(current === "dark" ? "light" : "dark");
  }

  window.toggleUnifiedTheme = toggleUnifiedTheme;
  window.applyUnifiedTheme = applyUnifiedTheme;

  function injectUnifiedThemeStylesAndButton() {
    if (!document.getElementById("madrasahUnifiedThemeCSS")) {
      const style = document.createElement("style");
      style.id = "madrasahUnifiedThemeCSS";
      style.textContent = `
        /* Скрываем старые разрозненные кнопки смены темы в курсах, оставляя единую */
        .theme-toggle, #themeToggle, #themeBtn, .dark-mode-toggle, [data-old-theme-btn] {
          display: none !important;
        }

        #unifiedThemeToggleBtn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: 999px;
          border: 1px solid rgba(15, 23, 42, 0.14);
          background: #ffffff;
          color: #1e293b;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
          transition: all 0.2s ease;
          font-family: inherit;
        }

        html[data-theme="dark"] #unifiedThemeToggleBtn {
          background: #1e293b;
          color: #f8fafc;
          border-color: #334155;
        }

        /* Универсальная ночная палитра для всех страниц, включая первые курсы */
        html[data-theme="dark"] {
          --bg: #0f172a !important;
          --bg-color: #0f172a !important;
          --card: #1e293b !important;
          --card-bg: #1e293b !important;
          --text: #f1f5f9 !important;
          --text-color: #f1f5f9 !important;
          --muted: #94a3b8 !important;
          --border: #334155 !important;
        }

        html[data-theme="dark"] body {
          background-color: #0f172a !important;
          color: #f1f5f9 !important;
        }

        html[data-theme="dark"] .container,
        html[data-theme="dark"] .app-container {
          background-color: transparent !important;
          color: #f1f5f9 !important;
        }

        html[data-theme="dark"] .card,
        html[data-theme="dark"] .chapter-card,
        html[data-theme="dark"] .course-card,
        html[data-theme="dark"] .quiz-card,
        html[data-theme="dark"] .modal-content,
        html[data-theme="dark"] .id-badge,
        html[data-theme="dark"] .browser-login-box {
          background-color: #1e293b !important;
          color: #f1f5f9 !important;
          border-color: #334155 !important;
        }

        html[data-theme="dark"] .option-btn,
        html[data-theme="dark"] .answer-btn,
        html[data-theme="dark"] button.option {
          background-color: #0f172a !important;
          color: #f1f5f9 !important;
          border-color: #334155 !important;
        }

        html[data-theme="dark"] .option-btn:hover:not(:disabled),
        html[data-theme="dark"] .answer-btn:hover:not(:disabled) {
          background-color: #273549 !important;
          border-color: #10b981 !important;
        }

        html[data-theme="dark"] .option-btn.correct,
        html[data-theme="dark"] .answer-btn.correct {
          background-color: rgba(16, 185, 129, 0.22) !important;
          border-color: #10b981 !important;
          color: #a7f3d0 !important;
        }

        html[data-theme="dark"] .option-btn.wrong,
        html[data-theme="dark"] .answer-btn.wrong {
          background-color: rgba(239, 68, 68, 0.22) !important;
          border-color: #ef4444 !important;
          color: #fecaca !important;
        }

        html[data-theme="dark"] .explanation,
        html[data-theme="dark"] .exp-box {
          background-color: #0f172a !important;
          color: #e2e8f0 !important;
          border-color: #334155 !important;
        }

        html[data-theme="dark"] .back-link,
        html[data-theme="dark"] .btn-secondary,
        html[data-theme="dark"] .cheat-btn {
          background-color: #334155 !important;
          color: #f8fafc !important;
          border-color: #475569 !important;
        }

        html[data-theme="dark"] .trial-banner.trial-available {
          background-color: #292111 !important;
          border-color: #78350f !important;
          color: #fde68a !important;
        }

        html[data-theme="dark"] .trial-banner.trial-active {
          background-color: #062c22 !important;
          border-color: #065f46 !important;
          color: #a7f3d0 !important;
        }

        html[data-theme="dark"] .trial-banner.trial-expired {
          background-color: #1e293b !important;
          border-color: #334155 !important;
          color: #cbd5e1 !important;
        }
      `;
      document.head.appendChild(style);
    }

    const savedTheme = localStorage.getItem(THEME_KEY) || "light";
    applyUnifiedTheme(savedTheme);

    // Если на странице есть специальный слот #unifiedThemeSlot (как в новом index.html) — вставляем туда
    const slot = document.getElementById("unifiedThemeSlot");
    if (slot) {
      if (!document.getElementById("unifiedThemeToggleBtn")) {
        const btn = document.createElement("button");
        btn.id = "unifiedThemeToggleBtn";
        btn.type = "button";
        btn.onclick = toggleUnifiedTheme;
        btn.innerHTML = savedTheme === "dark" ? "☀️ День" : "🌙 Ночь";
        slot.appendChild(btn);
      }
      return;
    }

    // Иначе (внутри любого из 6 курсов) аккуратно добавляем кнопку в верхнюю панель рядом с кнопкой «← Все курсы»
    if (!document.getElementById("unifiedThemeToggleBtn")) {
      const btn = document.createElement("button");
      btn.id = "unifiedThemeToggleBtn";
      btn.type = "button";
      btn.onclick = toggleUnifiedTheme;
      btn.innerHTML = savedTheme === "dark" ? "☀️ День" : "🌙 Ночь";

      const topNav = document.querySelector(".top-nav, .nav-bar, .header-actions");
      if (topNav) {
        topNav.appendChild(btn);
      } else {
        const wrapper = document.createElement("div");
        wrapper.style.cssText =
          "max-width:760px;margin:10px auto 0;padding:0 16px;display:flex;justify-content:flex-end;";
        wrapper.appendChild(btn);
        document.body.insertBefore(wrapper, document.body.firstChild);
      }
    }
  }

  // Применяем тему максимально рано, чтобы не было белой вспышки при загрузке
  const initialTheme = localStorage.getItem(THEME_KEY) || "light";
  document.documentElement.setAttribute("data-theme", initialTheme);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      injectUnifiedThemeStylesAndButton();
      updateTrialUI();
    });
  } else {
    injectUnifiedThemeStylesAndButton();
    updateTrialUI();
  }
})();
