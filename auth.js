// Единая система доступа, оформления и защиты библиотеки знаний
(function () {
  // Список пользователей с постоянным доступом
  // Добавляйте новые ID в формате: "123456789": ["all"], или ["sira", "nawawi", "fiqh", "tajweed", "adab", "aqeedah", "arabic"]
  const ALLOWED_USERS = {
    "859435297": ["all"]
  };

  const STORAGE_KEY_UID = "islamic_lib_saved_uid_v1";
  const STORAGE_KEY_TRIAL_START = "islamic_lib_trial_start_v2";
  const STORAGE_KEY_MAX_TIME = "islamic_lib_max_seen_time_v2";
  const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000;

  // Сброс устаревших настроек тёмной темы
  try {
    localStorage.removeItem("theme");
    localStorage.removeItem("darkMode");
    localStorage.removeItem("islamic_lib_theme");
  } catch (e) {}

  // Убираем любое упоминание сторонних учебных заведений из заголовка вкладки
  function sanitizeTitle() {
    if (document.title && /галия/i.test(document.title)) {
      document.title = document.title.replace(/Медресе\s*[«"']?Галия[»"']?\s*[—–-]?\s*/gi, "").trim();
      if (!document.title) {
        document.title = "Интерактивная библиотека знаний";
      }
    }
  }
  sanitizeTitle();

  // Внедряем единый светлый стиль с арабским геометрическим орнаментом и скрываем лишние кнопки
  const style = document.createElement("style");
  style.id = "unified-lib-style";
  style.textContent = `
    html, body {
      background-color: #f6f4ee !important;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='none' stroke='%230d6e4e' stroke-opacity='0.065' stroke-width='1'%3E%3Cpath d='M40 0 L51.7 11.7 L68.3 11.7 L68.3 28.3 L80 40 L68.3 51.7 L68.3 68.3 L51.7 68.3 L40 80 L28.3 68.3 L11.7 68.3 L11.7 51.7 L0 40 L11.7 28.3 L11.7 11.7 L28.3 11.7 Z'/%3E%3Ccircle cx='40' cy='40' r='14'/%3E%3Cpath d='M40 20 L45.8 34.2 L60 40 L45.8 45.8 L40 60 L34.2 45.8 L20 40 L34.2 34.2 Z'/%3E%3C/g%3E%3C/svg%3E") !important;
      color: #1e293b !important;
    }
    body.dark, body.dark-mode, body.night, [data-theme="dark"] {
      background-color: #f6f4ee !important;
      color: #1e293b !important;
    }
    /* Скрываем разрозненные кнопки смены темы во всех курсах */
    #themeToggle, .theme-toggle, [data-action="toggle-theme"],
    button[onclick*="toggleTheme"], button[onclick*="setTheme"] {
      display: none !important;
    }
    #lib-trial-top-bar {
      position: sticky;
      top: 0;
      z-index: 9999;
      background: #ecfdf5;
      border-bottom: 1px solid #a7f3d0;
      color: #065f46;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      font-weight: 600;
      padding: 8px 14px;
      text-align: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.04);
    }
  `;
  (document.head || document.documentElement).appendChild(style);

  // Чистим лишние кнопки в "40 хадисах" и кнопки темы в остальных курсах после загрузки DOM
  function cleanupButtons() {
    sanitizeTitle();
    if (document.body) {
      document.body.classList.remove("dark", "dark-mode", "night");
      document.body.removeAttribute("data-theme");
    }
    const buttons = document.querySelectorAll("button, a.btn");
    buttons.forEach((btn) => {
      const txt = (btn.textContent || "").trim();
      if (
        txt === "🌙" ||
        txt === "☀️" ||
        txt === "🌓" ||
        /Тёмная тема|Светлая тема|Ночь|День/i.test(txt) ||
        /Глава\s*\(PDF\)|Экспорт|Импорт/i.test(txt)
      ) {
        if (!btn.closest("#lib-auth-controls")) {
          btn.style.display = "none";
        }
      }
    });
  }

  let serverTimeOffset = 0;
  let timeTampered = false;

  function getNow() {
    const localNow = Date.now();
    const estimatedNow = localNow + serverTimeOffset;
    try {
      const maxSeen = parseInt(localStorage.getItem(STORAGE_KEY_MAX_TIME) || "0", 10);
      if (maxSeen && estimatedNow + 60000 < maxSeen) {
        timeTampered = true;
        return maxSeen;
      }
      if (estimatedNow > maxSeen) {
        localStorage.setItem(STORAGE_KEY_MAX_TIME, String(estimatedNow));
      }
    } catch (e) {}
    return estimatedNow;
  }

  // Сверка времени с сервером GitHub (защита от перевода часов на устройстве)
  function syncServerTime(callback) {
    try {
      fetch(window.location.pathname + "?t=" + Date.now(), {
        method: "HEAD",
        cache: "no-store"
      })
        .then((res) => {
          const dateHeader = res.headers.get("Date");
          if (dateHeader) {
            const serverMs = Date.parse(dateHeader);
            if (!isNaN(serverMs)) {
              serverTimeOffset = serverMs - Date.now();
              const maxSeen = parseInt(localStorage.getItem(STORAGE_KEY_MAX_TIME) || "0", 10);
              if (serverMs >= maxSeen) {
                timeTampered = false;
                localStorage.setItem(STORAGE_KEY_MAX_TIME, String(serverMs));
              }
            }
          }
          if (typeof callback === "function") callback();
        })
        .catch(() => {
          if (typeof callback === "function") callback();
        });
    } catch (e) {
      if (typeof callback === "function") callback();
    }
  }

  // Определение ID пользователя: Telegram WebApp -> URL (?uid=) -> localStorage
  function isTelegramEnvironment() {
    return Boolean(
      window.Telegram &&
        window.Telegram.WebApp &&
        window.Telegram.WebApp.initDataUnsafe &&
        window.Telegram.WebApp.initDataUnsafe.user &&
        window.Telegram.WebApp.initDataUnsafe.user.id
    );
  }

  function getUserId() {
    if (isTelegramEnvironment()) {
      const tgId = String(window.Telegram.WebApp.initDataUnsafe.user.id);
      try {
        localStorage.setItem(STORAGE_KEY_UID, tgId);
      } catch (e) {}
      return tgId;
    }
    try {
      const params = new URLSearchParams(window.location.search);
      const urlUid = (params.get("uid") || "").trim();
      if (urlUid && /^\d+$/.test(urlUid)) {
        localStorage.setItem(STORAGE_KEY_UID, urlUid);
        return urlUid;
      }
      const savedUid = (localStorage.getItem(STORAGE_KEY_UID) || "").trim();
      if (savedUid && /^\d+$/.test(savedUid)) {
        return savedUid;
      }
    } catch (e) {}
    return "guest";
  }

  function setManualUserId(rawId) {
    const cleaned = String(rawId || "").replace(/\D/g, "").trim();
    if (!cleaned) return false;
    try {
      localStorage.setItem(STORAGE_KEY_UID, cleaned);
    } catch (e) {}
    return true;
  }

  function clearManualUserId() {
    try {
      localStorage.removeItem(STORAGE_KEY_UID);
    } catch (e) {}
  }

  // Пробный доступ на 24 часа разрешён ТОЛЬКО внутри официального Telegram Mini App (для реального TG ID),
  // чтобы через обычный браузер нельзя было обходить ограничение очисткой истории.
  function canUseTrial() {
    const uid = getUserId();
    if (uid === "guest" || !/^\d+$/.test(uid)) return false;
    return isTelegramEnvironment();
  }

  function getTrialState() {
    const uid = getUserId();
    if (ALLOWED_USERS[uid]) {
      return { status: "permanent", remainingMs: 0 };
    }
    if (!canUseTrial()) {
      return { status: "browser_restricted", remainingMs: 0 };
    }
    let startMs = 0;
    try {
      startMs = parseInt(localStorage.getItem(STORAGE_KEY_TRIAL_START + "_" + uid) || "0", 10);
    } catch (e) {}

    if (!startMs) {
      return { status: "available", remainingMs: TRIAL_DURATION_MS };
    }
    const now = getNow();
    if (timeTampered) {
      return { status: "expired", remainingMs: 0 };
    }
    const elapsed = now - startMs;
    if (elapsed < TRIAL_DURATION_MS) {
      return { status: "active", remainingMs: TRIAL_DURATION_MS - elapsed };
    }
    return { status: "expired", remainingMs: 0 };
  }

  function startTrial24h() {
    if (!canUseTrial()) return false;
    const uid = getUserId();
    const key = STORAGE_KEY_TRIAL_START + "_" + uid;
    try {
      const existing = parseInt(localStorage.getItem(key) || "0", 10);
      if (!existing) {
        localStorage.setItem(key, String(getNow()));
      }
    } catch (e) {}
    return true;
  }

  function hasCourseAccess(courseCode) {
    const uid = getUserId();
    const rights = ALLOWED_USERS[uid];
    if (Array.isArray(rights)) {
      if (rights.includes("all")) return true;
      if (courseCode && rights.includes(courseCode)) return true;
    }
    const trial = getTrialState();
    if (trial.status === "active") return true;
    return false;
  }

  function formatRemaining(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (n) => (n < 10 ? "0" + n : String(n));
    return `${h} ч ${pad(m)} мин ${pad(s)} сек`;
  }

  // Защита внутренних страниц курсов
  function protectCoursePage(courseCode) {
    const path = window.location.pathname;
    const isRoot =
      path.endsWith("/madrasah/") ||
      path.endsWith("/madrasah/index.html") ||
      path === "/" ||
      path === "/index.html";

    if (isRoot) return true;

    if (!hasCourseAccess(courseCode)) {
      document.addEventListener("DOMContentLoaded", () => {
        document.body.innerHTML = `
          <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            <div style="max-width:420px;width:100%;background:#ffffff;border-radius:18px;padding:28px 24px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,0.08);border:1px solid #e2e8f0;">
              <div style="font-size:42px;margin-bottom:12px;">🔒</div>
              <h2 style="margin:0 0 10px;font-size:20px;color:#0f172a;">Доступ к разделу ограничен</h2>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.5;color:#475569;">
                Для открытия этого курса необходим персональный доступ по вашему ID (<b>${getUserId()}</b>). Обратитесь к администратору для подключения.
              </p>
              <a href="../index.html" style="display:inline-block;background:#0d6e4e;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:12px;">
                ← Вернуться в каталог курсов
              </a>
            </div>
          </div>
        `;
      });
      return false;
    }

    // Показываем верхнюю полоску с таймером внутри курса, если активен триал
    const trial = getTrialState();
    if (trial.status === "active") {
      document.addEventListener("DOMContentLoaded", () => {
        if (!document.getElementById("lib-trial-top-bar")) {
          const bar = document.createElement("div");
          bar.id = "lib-trial-top-bar";
          document.body.insertBefore(bar, document.body.firstChild);
          const updateBar = () => {
            const st = getTrialState();
            if (st.status !== "active") {
              window.location.reload();
              return;
            }
            bar.textContent = "⏳ Пробный доступ (24 ч) • Осталось: " + formatRemaining(st.remainingMs);
          };
          updateBar();
          setInterval(updateBar, 1000);
        }
      });
    }
    return true;
  }

  window.LibAuth = {
    getUserId,
    setManualUserId,
    clearManualUserId,
    isTelegramEnvironment,
    canUseTrial,
    getTrialState,
    startTrial24h,
    hasCourseAccess,
    formatRemaining,
    protectCoursePage,
    syncServerTime,
    ALLOWED_USERS
  };

  // Совместимость со старыми вызовами в курсах
  window.protectCoursePage = protectCoursePage;
  window.checkAccess = hasCourseAccess;

  document.addEventListener("DOMContentLoaded", () => {
    cleanupButtons();
    setTimeout(cleanupButtons, 300);
    setTimeout(cleanupButtons, 1000);
  });

  syncServerTime();
})();
