// Единый модуль доступа, защищённого 24-часового триала и оформления для всей библиотеки
(function () {
  // ==================== 1. СПИСОК ПОЛЬЗОВАТЕЛЕЙ ====================
  const ALLOWED_USERS = {
    "859435297": ["all"], // Администратор
  };

  const ALL_COURSES = ["sira", "nawawi", "fiqh", "tajweed", "adab", "aqeedah"];
  const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000;
  const STORAGE_KEYS = {
    trialStart: "madrasah_trial_start_v3",
    trialUsed: "madrasah_trial_used_v3",
    maxSeenTime: "madrasah_max_seen_time_v3",
    manualUid: "madrasah_manual_uid_v1"
  };

  // ==================== 2. ЕДИНЫЙ СВЕТЛЫЙ ФОН С АРАБСКИМ УЗОРОМ ====================
  (function injectGlobalThemeAndCleanup() {
    try {
      localStorage.removeItem("theme");
      localStorage.removeItem("darkMode");
      localStorage.removeItem("madrasah_theme");
      document.documentElement.classList.remove("dark", "dark-mode", "night");
      if (document.body) {
        document.body.classList.remove("dark", "dark-mode", "night");
      }
    } catch (e) {}

    const style = document.createElement("style");
    style.id = "madrasah-global-pattern-style";
    style.textContent = `
      html, body {
        background-color: #f4f1ea !important;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='none' stroke='%23dfd7c5' stroke-width='1.1'%3E%3Cpath d='M40 0 L52 12 L68 12 L68 28 L80 40 L68 52 L68 68 L52 68 L40 80 L28 68 L12 68 L12 52 L0 40 L12 28 L12 12 L28 12 Z'/%3E%3Ccircle cx='40' cy='40' r='14'/%3E%3Cpath d='M40 16 L46 34 L64 40 L46 46 L40 64 L34 46 L16 40 L34 34 Z'/%3E%3Cpath d='M0 0 L12 12 M80 0 L68 12 M0 80 L12 68 M80 80 L68 68'/%3E%3C/g%3E%3C/svg%3E") !important;
        background-repeat: repeat !important;
        background-size: 80px 80px !important;
        color: #1e293b !important;
      }
      /* Скрываем старые кнопки переключения темы во всех курсах */
      #themeToggle, #darkModeToggle, .theme-toggle, .dark-toggle,
      button[onclick*="toggleTheme"], button[onclick*="toggleDark"],
      [data-theme-toggle] {
        display: none !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);

    function cleanExtraButtons() {
      if (document.body) {
        document.body.classList.remove("dark", "dark-mode", "night");
      }
      const buttons = document.querySelectorAll("button, a");
      buttons.forEach((btn) => {
        const txt = (btn.textContent || "").trim();
        const onclickAttr = btn.getAttribute("onclick") || "";
        // Скрываем кнопки день/ночь в любых вариантах
        if (
          txt === "🌙" || txt === "☀️" || txt === "🌓" ||
          txt.includes("Тёмная тема") || txt.includes("Светлая тема") ||
          txt === "Ночь" || txt === "День" ||
          onclickAttr.includes("toggleTheme") || onclickAttr.includes("toggleDark")
        ) {
          btn.style.setProperty("display", "none", "important");
        }
        // В курсе 40 хадисов скрываем лишние кнопки Экспорт, Импорт, Глава (PDF)
        if (
          window.location.pathname.includes("nawawi") &&
          (txt.includes("Экспорт") || txt.includes("Импорт") || txt.includes("Глава (PDF)"))
        ) {
          btn.style.setProperty("display", "none", "important");
        }
      });
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", cleanExtraButtons);
    } else {
      cleanExtraButtons();
    }
    setTimeout(cleanExtraButtons, 250);
    setTimeout(cleanExtraButtons, 800);
  })();

  // ==================== 3. ОПРЕДЕЛЕНИЕ ID ПОЛЬЗОВАТЕЛЯ ====================
  function getUserId() {
    try {
      const tg = window.Telegram && window.Telegram.WebApp;
      if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id) {
        const tgId = String(tg.initDataUnsafe.user.id);
        localStorage.setItem(STORAGE_KEYS.manualUid, tgId);
        return tgId;
      }
    } catch (e) {}

    try {
      const params = new URLSearchParams(window.location.search);
      const urlUid = params.get("uid");
      if (urlUid && /^\d+$/.test(urlUid.trim())) {
        localStorage.setItem(STORAGE_KEYS.manualUid, urlUid.trim());
        return urlUid.trim();
      }
    } catch (e) {}

    try {
      const saved = localStorage.getItem(STORAGE_KEYS.manualUid);
      if (saved && /^\d+$/.test(saved.trim())) {
        return saved.trim();
      }
    } catch (e) {}

    return "";
  }

  function setManualUserId(uid) {
    const clean = String(uid || "").replace(/\D/g, "");
    if (!clean) return false;
    try {
      localStorage.setItem(STORAGE_KEYS.manualUid, clean);
    } catch (e) {}
    return true;
  }

  // ==================== 4. ЗАЩИТА ВРЕМЕНИ ОТ ПЕРЕВОДА ЧАСОВ ====================
  let serverOffsetMs = 0;
  let timeTampered = false;

  function getTrustedNow() {
    const now = Date.now() + serverOffsetMs;
    try {
      const prevMax = Number(localStorage.getItem(STORAGE_KEYS.maxSeenTime) || 0);
      if (prevMax > 0 && now + 60000 < prevMax) {
        timeTampered = true;
        return prevMax;
      }
      if (now > prevMax) {
        localStorage.setItem(STORAGE_KEYS.maxSeenTime, String(now));
      }
    } catch (e) {}
    return now;
  }

  function syncServerTime(callback) {
    try {
      fetch(window.location.origin + "/?t=" + Date.now(), { method: "HEAD", cache: "no-store" })
        .then((res) => {
          const dateHeader = res.headers.get("Date");
          if (dateHeader) {
            const serverMs = new Date(dateHeader).getTime();
            if (!isNaN(serverMs)) {
              serverOffsetMs = serverMs - Date.now();
              const realNow = Date.now() + serverOffsetMs;
              const prevMax = Number(localStorage.getItem(STORAGE_KEYS.maxSeenTime) || 0);
              if (realNow > prevMax) {
                localStorage.setItem(STORAGE_KEYS.maxSeenTime, String(realNow));
              }
              timeTampered = false;
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

  // ==================== 5. ЛОГИКА ПРАВ И 24-ЧАСОВОГО ТРИАЛА ====================
  function getTrialState() {
    const now = getTrustedNow();
    let start = 0;
    let used = false;
    try {
      start = Number(localStorage.getItem(STORAGE_KEYS.trialStart) || 0);
      used = localStorage.getItem(STORAGE_KEYS.trialUsed) === "1";
    } catch (e) {}

    if (timeTampered && used) {
      return { status: "expired", remainingMs: 0 };
    }

    if (start > 0) {
      const end = start + TRIAL_DURATION_MS;
      const remaining = end - now;
      if (remaining > 0) {
        return { status: "active", remainingMs: remaining, endMs: end };
      } else {
        try {
          localStorage.setItem(STORAGE_KEYS.trialUsed, "1");
        } catch (e) {}
        return { status: "expired", remainingMs: 0 };
      }
    }

    if (used) {
      return { status: "expired", remainingMs: 0 };
    }

    return { status: "available", remainingMs: TRIAL_DURATION_MS };
  }

  function startTrial24h() {
    const state = getTrialState();
    if (state.status === "active") return true;
    if (state.status === "expired") return false;

    const now = getTrustedNow();
    try {
      localStorage.setItem(STORAGE_KEYS.trialStart, String(now));
      localStorage.setItem(STORAGE_KEYS.trialUsed, "1");
      localStorage.setItem(STORAGE_KEYS.maxSeenTime, String(now));
    } catch (e) {}
    return true;
  }

  function hasPermanentAccess(courseCode) {
    const uid = getUserId();
    if (!uid) return false;
    const entry = ALLOWED_USERS[uid];
    if (!entry) return false;

    if (Array.isArray(entry)) {
      return entry.includes("all") || entry.includes(courseCode);
    }

    if (typeof entry === "object" && entry !== null) {
      const courses = Array.isArray(entry.courses) ? entry.courses : [];
      const allowed = courses.includes("all") || courses.includes(courseCode);
      if (!allowed) return false;
      if (entry.expires) {
        const expMs = new Date(entry.expires).getTime();
        if (!isNaN(expMs) && getTrustedNow() > expMs) {
          return false;
        }
      }
      return true;
    }

    return false;
  }

  function hasCourseAccess(courseCode) {
    if (hasPermanentAccess(courseCode)) return true;
    const trial = getTrialState();
    return trial.status === "active";
  }

  function formatDuration(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(h)} ч ${pad(m)} мин ${pad(s)} сек`;
  }

  // ==================== 6. ПЛАШКА ТАЙМЕРА И ЗАЩИТА СТРАНИЦ КУРСОВ ====================
  function renderCourseTrialBar(courseCode) {
    if (hasPermanentAccess(courseCode)) return;
    const trial = getTrialState();
    if (trial.status !== "active") return;

    function updateBar() {
      const st = getTrialState();
      if (st.status !== "active") {
        window.location.reload();
        return;
      }
      let bar = document.getElementById("madrasah-course-trial-bar");
      if (!bar && document.body) {
        bar = document.createElement("div");
        bar.id = "madrasah-course-trial-bar";
        bar.style.cssText =
          "background:#fef3c7;color:#92400e;border-bottom:1px solid #fcd34d;" +
          "padding:8px 14px;font-size:13px;font-weight:600;text-align:center;" +
          "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;";
        document.body.insertBefore(bar, document.body.firstChild);
      }
      if (bar) {
        bar.textContent = `⏳ Пробный доступ (24 ч) • Осталось: ${formatDuration(st.remainingMs)}`;
      }
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", updateBar);
    } else {
      updateBar();
    }
    setInterval(updateBar, 1000);
  }

  function protectCoursePage(courseCode) {
    syncServerTime();
    if (hasCourseAccess(courseCode)) {
      renderCourseTrialBar(courseCode);
      return true;
    }

    function showLockScreen() {
      const uid = getUserId();
      const trial = getTrialState();
      document.body.innerHTML = `
        <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <div style="max-width:420px;width:100%;background:#ffffff;border-radius:20px;padding:28px 22px;box-shadow:0 10px 30px rgba(0,0,0,0.08);text-align:center;border:1px solid #e2e8f0;">
            <div style="font-size:44px;margin-bottom:12px;">🔒</div>
            <h2 style="margin:0 0 10px;font-size:20px;color:#0f172a;">Доступ к курсу закрыт</h2>
            <p style="margin:0 0 18px;font-size:14px;color:#475569;line-height:1.5;">
              ${trial.status === "expired"
                ? "Ваш ознакомительный доступ на 24 часа завершился. Для получения полного доступа отправьте свой ID администратору."
                : "Для открытия этого курса активируйте бесплатный пробный доступ на 24 часа или отправьте свой ID администратору."}
            </p>
            ${uid ? `<div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:12px;padding:10px;margin-bottom:16px;font-size:14px;color:#1e293b;">Ваш ID: <strong>${uid}</strong></div>` : ""}
            ${trial.status === "available" ? `
              <button id="btnActivateTrialInside" style="width:100%;padding:13px;border:none;border-radius:12px;background:#0f5132;color:#ffffff;font-size:15px;font-weight:600;cursor:pointer;margin-bottom:10px;">
                🎁 Включить бесплатный доступ на 24 часа
              </button>
            ` : ""}
            <a href="../index.html${uid ? "?uid=" + uid : ""}" style="display:block;width:100%;box-sizing:border-box;padding:12px;border-radius:12px;background:#f1f5f9;color:#0f172a;text-decoration:none;font-size:14px;font-weight:600;">
              ← Вернуться в каталог курсов
            </a>
          </div>
        </div>
      `;
      const btn = document.getElementById("btnActivateTrialInside");
      if (btn) {
        btn.addEventListener("click", () => {
          if (startTrial24h()) {
            window.location.reload();
          }
        });
      }
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", showLockScreen);
    } else {
      showLockScreen();
    }
    return false;
  }

  window.MADRASAH_AUTH = {
    ALLOWED_USERS,
    ALL_COURSES,
    getUserId,
    setManualUserId,
    syncServerTime,
    getTrialState,
    startTrial24h,
    hasPermanentAccess,
    hasCourseAccess,
    protectCoursePage,
    formatDuration
  };

  window.protectCoursePage = protectCoursePage;
  window.checkAccess = protectCoursePage;
})();
