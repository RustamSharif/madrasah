// ============================================================================
// ЕДИНАЯ СИСТЕМА ДОСТУПА, ТРИАЛ-ТАЙМЕРА И ТЕМЫ ДЛЯ БИБЛИОТЕКИ ТРЕНАЖЁРОВ
// ============================================================================

(function () {
  // 1. СПИСОК ПОСТОЯННЫХ ПОЛЬЗОВАТЕЛЕЙ
  // Примеры:
  // "859435297": ["all"],
  // "123456789": ["sira", "nawawi", "fiqh", "tajweed", "adab", "aqeedah"],
  const ALLOWED_USERS = {
    // Раскомментируйте строку ниже, чтобы вернуть себе постоянный полный доступ:
    // "859435297": ["all"],
  };

  const ALL_COURSES = ["sira", "nawawi", "fiqh", "tajweed", "adab", "aqeedah"];
  const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000; // 24 часа

  // Состояние времени (защита от перевода часов назад)
  let serverTimeOffset = 0; // serverTime - Date.now()
  let clockTampered = false;

  function getNow() {
    return Date.now() + serverTimeOffset;
  }

  function checkClockIntegrity() {
    try {
      const now = getNow();
      const maxSeen = parseInt(localStorage.getItem("madrasah_max_seen_time") || "0", 10);
      if (maxSeen && now < maxSeen - 60000) {
        // Системные часы переведены назад более чем на 1 минуту
        clockTampered = true;
      } else {
        clockTampered = false;
        if (now > maxSeen) {
          localStorage.setItem("madrasah_max_seen_time", String(now));
        }
      }
    } catch (e) {}
  }

  function syncServerTime(onSynced) {
    try {
      fetch(window.location.pathname + "?t=" + Date.now(), {
        method: "HEAD",
        cache: "no-store"
      })
        .then(function (res) {
          const dateHeader = res.headers.get("Date");
          if (dateHeader) {
            const srvMs = Date.parse(dateHeader);
            if (!isNaN(srvMs)) {
              serverTimeOffset = srvMs - Date.now();
              clockTampered = false;
              localStorage.setItem("madrasah_max_seen_time", String(srvMs));
              if (typeof onSynced === "function") onSynced();
            }
          }
        })
        .catch(function () {});
    } catch (e) {}
  }

  checkClockIntegrity();

  // 2. ОПРЕДЕЛЕНИЕ ID ПОЛЬЗОВАТЕЛЯ (Telegram -> URL -> localStorage -> guest)
  function getUserId() {
    let uid = "";
    try {
      if (
        window.Telegram &&
        window.Telegram.WebApp &&
        window.Telegram.WebApp.initDataUnsafe &&
        window.Telegram.WebApp.initDataUnsafe.user &&
        window.Telegram.WebApp.initDataUnsafe.user.id
      ) {
        uid = String(window.Telegram.WebApp.initDataUnsafe.user.id);
      }
    } catch (e) {}

    if (!uid) {
      try {
        const params = new URLSearchParams(window.location.search);
        const qUid = params.get("uid");
        if (qUid && /^[a-zA-Z0-9_-]{3,40}$/.test(qUid)) {
          uid = qUid;
        }
      } catch (e) {}
    }

    if (!uid) {
      try {
        uid = localStorage.getItem("madrasah_saved_uid") || "";
      } catch (e) {}
    }

    if (uid && uid !== "guest") {
      try {
        localStorage.setItem("madrasah_saved_uid", uid);
        // Переносим гостевой триал на реальный ID, если у реального ID ещё нет записи
        const guestKey = "madrasah_trial_record_guest";
        const userKey = "madrasah_trial_record_" + uid;
        const guestRec = localStorage.getItem(guestKey);
        if (guestRec && !localStorage.getItem(userKey)) {
          localStorage.setItem(userKey, guestRec);
        }
      } catch (e) {}
      return uid;
    }

    return "guest";
  }

  function setManualUserId(newUid) {
    const clean = String(newUid || "").trim();
    if (!clean) return false;
    try {
      localStorage.setItem("madrasah_saved_uid", clean);
    } catch (e) {}
    return true;
  }

  // 3. ЛОГИКА ПРОБНОГО ДОСТУПА НА 24 ЧАСА (НИКОГДА НЕ СБРАСЫВАЕТСЯ ПОВТОРНО)
  function getTrialKey(uid) {
    return "madrasah_trial_record_" + (uid || getUserId());
  }

  function getTrialRecord(uid) {
    const id = uid || getUserId();
    try {
      const raw = localStorage.getItem(getTrialKey(id));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.start === "number" && typeof parsed.end === "number") {
        return parsed;
      }
    } catch (e) {}
    return null;
  }

  function startTrial24h() {
    const uid = getUserId();
    const existing = getTrialRecord(uid);
    // Если триал уже был активирован ранее — НЕ перезаписываем и не сбрасываем его!
    if (existing) {
      return existing;
    }
    const now = getNow();
    const record = {
      start: now,
      end: now + TRIAL_DURATION_MS
    };
    try {
      localStorage.setItem(getTrialKey(uid), JSON.stringify(record));
      localStorage.setItem("madrasah_max_seen_time", String(now));
    } catch (e) {}
    return record;
  }

  function getTrialState(uid) {
    checkClockIntegrity();
    const id = uid || getUserId();
    const rec = getTrialRecord(id);
    if (!rec) {
      return { status: "available", remainingMs: TRIAL_DURATION_MS };
    }
    if (clockTampered) {
      return { status: "tampered", remainingMs: 0 };
    }
    const remaining = rec.end - getNow();
    if (remaining > 0) {
      return { status: "active", remainingMs: remaining, end: rec.end };
    }
    return { status: "expired", remainingMs: 0, end: rec.end };
  }

  function formatDuration(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = function (n) { return n < 10 ? "0" + n : String(n); };
    return h + " ч " + pad(m) + " мин " + pad(s) + " сек";
  }

  // 4. ПРОВЕРКА ПРАВ НА КУРС
  function isPermanentUser(uid) {
    const id = uid || getUserId();
    const entry = ALLOWED_USERS[id];
    if (!entry) return false;
    if (Array.isArray(entry)) return entry.length > 0;
    if (entry && Array.isArray(entry.courses)) {
      if (entry.expires) {
        return getNow() < Date.parse(entry.expires);
      }
      return entry.courses.length > 0;
    }
    return false;
  }

  function hasCourseAccess(courseCode, uid) {
    const id = uid || getUserId();
    const entry = ALLOWED_USERS[id];

    if (entry) {
      if (Array.isArray(entry)) {
        if (entry.includes("all") || entry.includes(courseCode)) return true;
      } else if (entry && Array.isArray(entry.courses)) {
        const notExpired = !entry.expires || getNow() < Date.parse(entry.expires);
        if (notExpired && (entry.courses.includes("all") || entry.courses.includes(courseCode))) {
          return true;
        }
      }
    }

    const trial = getTrialState(id);
    if (trial.status === "active" && ALL_COURSES.includes(courseCode)) {
      return true;
    }

    return false;
  }

  // 5. ЗАЩИТА ВНУТРЕННИХ СТРАНИЦ КУРСОВ
  function protectCoursePage(courseCode, onAllowed) {
    const runCheck = function () {
      const uid = getUserId();
      if (hasCourseAccess(courseCode, uid)) {
        if (document.body) {
          document.body.style.visibility = "visible";
          document.body.style.opacity = "1";
        }
        if (typeof onAllowed === "function") {
          try { onAllowed(uid); } catch (e) { console.error(e); }
        }
      } else {
        renderLockedScreen(courseCode, uid);
      }
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", runCheck);
    } else {
      runCheck();
    }
  }

  function renderLockedScreen(courseCode, uid) {
    const trial = getTrialState(uid);
    const backUrl = "../index.html" + (uid && uid !== "guest" ? "?uid=" + encodeURIComponent(uid) : "");

    let actionHtml = "";
    if (trial.status === "available") {
      actionHtml =
        '<button id="madrasah-unlock-trial-btn" style="background:#0f6b43;color:#fff;border:none;padding:12px 20px;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;width:100%;margin-bottom:10px;">🎁 Включить бесплатный доступ на 24 часа</button>';
    } else if (trial.status === "tampered") {
      actionHtml =
        '<div style="background:#fef2f2;color:#991b1b;padding:12px;border-radius:10px;font-size:14px;margin-bottom:12px;">⚠️ Обнаружено изменение системного времени. Верните точное время на устройстве и обновите страницу.</div>';
    } else {
      actionHtml =
        '<div style="background:#fffbeb;color:#92400e;padding:12px;border-radius:10px;font-size:14px;margin-bottom:12px;">⌛ Пробный 24-часовой доступ завершён. Для получения полного доступа отправьте ваш ID администратору.</div>';
    }

    document.body.innerHTML =
      '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background:#f4f7f5;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">' +
      '<div style="max-width:420px;width:100%;background:#fff;border-radius:16px;padding:24px;box-shadow:0 8px 24px rgba(0,0,0,0.08);text-align:center;">' +
      '<div style="font-size:40px;margin-bottom:10px;">🔒</div>' +
      '<h2 style="margin:0 0 8px;color:#111827;font-size:20px;">Доступ к курсу закрыт</h2>' +
      '<p style="margin:0 0 16px;color:#4b5563;font-size:14px;">Ваш ID: <strong>' + uid + '</strong></p>' +
      actionHtml +
      '<button onclick="navigator.clipboard && navigator.clipboard.writeText(\'' + uid + '\');this.textContent=\'✅ ID скопирован\';" style="background:#eef2f0;color:#1f2937;border:none;padding:10px 16px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;width:100%;margin-bottom:10px;">📋 Скопировать мой ID</button>' +
      '<a href="' + backUrl + '" style="display:block;text-decoration:none;color:#0f6b43;font-size:14px;font-weight:600;padding:8px;">← Вернуться к списку курсов</a>' +
      '</div></div>';

    const btn = document.getElementById("madrasah-unlock-trial-btn");
    if (btn) {
      btn.addEventListener("click", function () {
        startTrial24h();
        window.location.reload();
      });
    }
  }

  // 6. УНИФИЦИРОВАННАЯ ТЕМА ДЕНЬ / НОЧЬ ДЛЯ ВСЕХ СТРАНИЦ
  function applyUnifiedTheme(theme) {
    const isDark = theme === "dark";
    try {
      localStorage.setItem("madrasah_theme", isDark ? "dark" : "light");
    } catch (e) {}

    if (document.documentElement) {
      document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    }
    if (document.body) {
      if (isDark) {
        document.body.classList.add("dark", "dark-mode", "night-mode");
      } else {
        document.body.classList.remove("dark", "dark-mode", "night-mode");
      }
    }

    try {
      if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.setHeaderColor(isDark ? "#0d1b15" : "#0f6b43");
        window.Telegram.WebApp.setBackgroundColor(isDark ? "#0b1310" : "#f3f6f4");
      }
    } catch (e) {}

    const btn = document.getElementById("madrasah-unified-theme-btn");
    if (btn) {
      btn.innerHTML = isDark ? "☀️ День" : "🌙 Ночь";
    }
  }

  function injectUnifiedStylesAndControls() {
    if (!document.getElementById("madrasah-unified-css")) {
      const style = document.createElement("style");
      style.id = "madrasah-unified-css";
      style.textContent = `
        html[data-theme="dark"] body {
          background-color: #0b1310 !important;
          color: #e5ece8 !important;
        }
        html[data-theme="dark"] .card,
        html[data-theme="dark"] .module-card,
        html[data-theme="dark"] .chapter-card,
        html[data-theme="dark"] .course-card,
        html[data-theme="dark"] .quiz-box,
        html[data-theme="dark"] .question-card,
        html[data-theme="dark"] .modal-content,
        html[data-theme="dark"] .stats-bar,
        html[data-theme="dark"] .top-bar {
          background-color: #14221c !important;
          color: #e5ece8 !important;
          border-color: #233b31 !important;
        }
        html[data-theme="dark"] .option-btn,
        html[data-theme="dark"] .answer-btn {
          background-color: #192b23 !important;
          color: #e5ece8 !important;
          border-color: #2b473b !important;
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
        html[data-theme="dark"] h1,
        html[data-theme="dark"] h2,
        html[data-theme="dark"] h3,
        html[data-theme="dark"] p,
        html[data-theme="dark"] span,
        html[data-theme="dark"] li {
          color: inherit;
        }
        #madrasah-unified-theme-btn {
          background: #ffffff;
          color: #1f2937;
          border: 1px solid #d1d5db;
          border-radius: 999px;
          padding: 6px 14px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.06);
          transition: all 0.2s ease;
        }
        html[data-theme="dark"] #madrasah-unified-theme-btn {
          background: #1b2e26;
          color: #f3f4f6;
          border-color: #2f4f41;
        }
      `;
      document.head.appendChild(style);
    }

    // Скрываем старые разрозненные кнопки темы внутри курсов, чтобы не было винегрета
    const allButtons = document.querySelectorAll("button");
    allButtons.forEach(function (b) {
      if (b.id === "madrasah-unified-theme-btn") return;
      const txt = (b.textContent || "").trim();
      const onclickAttr = b.getAttribute("onclick") || "";
      if (
        txt === "Тёмная тема" ||
        txt === "Светлая тема" ||
        txt === "Тема" ||
        txt === "🌓" ||
        txt === "🌙" ||
        txt === "☀️" ||
        onclickAttr.includes("toggleTheme") ||
        onclickAttr.includes("toggleDark")
      ) {
        b.style.display = "none";
      }
    });

    // На внутренних страницах курсов добавляем верхнюю полоску с таймером (если триал) и единой кнопкой Ночь/День
    const isCatalogPage = !!document.getElementById("courses-container");
    if (!isCatalogPage && !document.getElementById("madrasah-course-topbar")) {
      const bar = document.createElement("div");
      bar.id = "madrasah-course-topbar";
      bar.style.cssText =
        "max-width:860px;margin:0 auto 10px;padding:8px 12px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;";

      const timerSlot = document.createElement("div");
      timerSlot.id = "madrasah-course-trial-badge";
      timerSlot.style.cssText = "font-size:12px;font-weight:600;color:#92400e;";

      const themeBtn = document.createElement("button");
      themeBtn.id = "madrasah-unified-theme-btn";
      themeBtn.type = "button";
      themeBtn.onclick = function () {
        const cur = localStorage.getItem("madrasah_theme") || "light";
        applyUnifiedTheme(cur === "dark" ? "light" : "dark");
      };

      bar.appendChild(timerSlot);
      bar.appendChild(themeBtn);
      if (document.body.firstChild) {
        document.body.insertBefore(bar, document.body.firstChild);
      } else {
        document.body.appendChild(bar);
      }
    }

    const savedTheme = localStorage.getItem("madrasah_theme") || "light";
    applyUnifiedTheme(savedTheme);
  }

  function startCourseTimerLoop() {
    const updateBadge = function () {
      const badge = document.getElementById("madrasah-course-trial-badge");
      if (!badge) return;
      const uid = getUserId();
      if (isPermanentUser(uid)) {
        badge.style.display = "none";
        return;
      }
      const st = getTrialState(uid);
      if (st.status === "active") {
        badge.style.display = "inline-block";
        badge.style.background = "#fef3c7";
        badge.style.padding = "4px 10px";
        badge.style.borderRadius = "8px";
        badge.textContent = "⏳ Пробный доступ (24 ч) • Осталось: " + formatDuration(st.remainingMs);
      } else {
        badge.style.display = "none";
      }
    };
    updateBadge();
    setInterval(updateBadge, 1000);
  }

  document.addEventListener("DOMContentLoaded", function () {
    try {
      if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
      }
    } catch (e) {}
    injectUnifiedStylesAndControls();
    startCourseTimerLoop();
    syncServerTime();
  });

  // Экспортируем функции в глобальную область под всеми используемыми именами
  window.MadrasahAuth = {
    getUserId: getUserId,
    setManualUserId: setManualUserId,
    hasCourseAccess: hasCourseAccess,
    isPermanentUser: isPermanentUser,
    startTrial24h: startTrial24h,
    getTrialState: getTrialState,
    formatDuration: formatDuration,
    protectCoursePage: protectCoursePage,
    applyUnifiedTheme: applyUnifiedTheme,
    toggleTheme: function () {
      const cur = localStorage.getItem("madrasah_theme") || "light";
      applyUnifiedTheme(cur === "dark" ? "light" : "dark");
    }
  };

  window.protectCoursePage = protectCoursePage;
  window.checkAccess = function (courseCode) {
    return hasCourseAccess(courseCode, getUserId());
  };
})();
