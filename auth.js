// Единый модуль доступа, перемешивания ответов и эталонного оформления (стиль «Акыда» на болотно-зелёном сукне)
const ALLOWED_USERS = {
  "859435297": ["all"]
  // Добавляйте сюда ID братьев в формате:
  // "123456789": ["all"],
  // "987654321": ["sira", "fiqh", "quran"],
};

const ALL_COURSE_CODES = ["sira", "nawawi", "fiqh", "tajwid", "adab", "aqeedah", "arabic", "quran"];
const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000;

(function () {
  // 1. Очистка старых настроек ночной темы
  try {
    localStorage.removeItem("theme");
    localStorage.removeItem("darkMode");
    localStorage.removeItem("madrasah_theme");
    document.documentElement.classList.remove("dark", "dark-mode", "night");
  } catch (e) {}

  // 2. Единая эталонная палитра (болотно-зелёное сукно + изумрудно-хвойные шапки + матовые карточки)
  const style = document.createElement("style");
  style.id = "madrasah-unified-aqeedah-theme";
  const patternSvg = encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">' +
    '<defs>' +
    '<pattern id="baizeWeave" width="4" height="4" patternUnits="userSpaceOnUse">' +
    '<path d="M0 0h2v2H0zm2 2h2v2H2z" fill="#18261D" fill-opacity="0.16"/>' +
    '</pattern>' +
    '</defs>' +
    '<rect width="80" height="80" fill="url(#baizeWeave)"/>' +
    '<g fill="none" stroke="#A3C2AB" stroke-width="0.75" stroke-opacity="0.15">' +
    '<polygon points="40,4 50,16 66,14 64,30 76,40 64,50 66,66 50,64 40,76 30,64 14,66 16,50 4,40 16,30 14,14 30,16"/>' +
    '<circle cx="40" cy="40" r="14"/>' +
    '</g></svg>'
  );

  style.textContent = `
    :root {
      --bg-baize: #33483B;
      --card-surface: #EAF0EB;
      --card-border: #B5C7BC;
      --text-primary: #16261E;
      --text-secondary: #465C50;
      --emerald-main: #1E5641;
      --emerald-dark: #153D2E;
      --mint-soft: #D3E8DF;
      --mint-border: #9CC2B2;
    }

    html, body {
      background-color: var(--bg-baize) !important;
      background-image: url("data:image/svg+xml,${patternSvg}") !important;
      background-repeat: repeat !important;
      color: var(--text-primary) !important;
    }

    /* Прозрачность внешних обёрток, чтобы сукно просвечивало вокруг карточек */
    .container, .wrapper, .main-container, #app, main {
      background: transparent !important;
      box-shadow: none !important;
    }

    /* Эталонная шапка курса (как в Акыде) */
    header, .header, .course-header, .hero, .hero-banner, .banner {
      background: linear-gradient(135deg, #1F523F 0%, #14392B 100%) !important;
      color: #F5FAF7 !important;
      border-radius: 16px !important;
      border: 1px solid rgba(255, 255, 255, 0.14) !important;
      box-shadow: 0 6px 18px rgba(13, 24, 18, 0.25) !important;
    }

    header h1, .header h1, .course-header h1, .hero h1, .hero-banner h1,
    header p, .header p, .course-header p, .hero p, .hero-banner p,
    header .subtitle, .header .subtitle {
      color: #F5FAF7 !important;
    }

    /* Исправление белых плашек статистики внутри шапки (как в Таджвиде) */
    header .stats, .header .stats, .course-header .stats, .stats-row, .hero-stats {
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
    }

    header .stat, .header .stat, .course-header .stat,
    header .badge, .header .badge, .header .pill, .hero .pill,
    .stats-row > div, .stats-row > span, .header-stats > div, .header-stats > span {
      background: rgba(255, 255, 255, 0.14) !important;
      color: #F4F9F6 !important;
      border: 1px solid rgba(255, 255, 255, 0.2) !important;
      border-radius: 20px !important;
    }

    /* Кнопка "← Все курсы" как в эталоне */
    a[href="../index.html"], a[href*="../index.html"], .back-btn, .btn-back {
      background: #EAF0EB !important;
      color: #16261E !important;
      border: 1px solid #B5C7BC !important;
      border-radius: 10px !important;
      font-weight: 600 !important;
      box-shadow: 0 2px 6px rgba(13, 24, 18, 0.15) !important;
      text-decoration: none !important;
    }

    /* Карточки глав, прогресса, вопросов и модальных окон */
    .card, .chapter-card, .lesson-card, .part-card, .quiz-card,
    .question-box, .question-card, .progress-card, .progress-box,
    .modal-content, .cheatsheet-box, .result-card, .exam-card {
      background-color: var(--card-surface) !important;
      border: 1px solid var(--card-border) !important;
      border-radius: 16px !important;
      color: var(--text-primary) !important;
      box-shadow: 0 4px 12px rgba(13, 24, 18, 0.16) !important;
    }

    .card h2, .card h3, .chapter-card h2, .chapter-card h3,
    .lesson-card h3, .part-card h3, .question-text, .q-text {
      color: var(--text-primary) !important;
    }

    /* Бейджи номеров глав ("Глава 1", "Часть 1", "15 вопр.") */
    .chapter-badge, .part-badge, .lesson-badge, .q-count, .tag-badge {
      background-color: var(--mint-soft) !important;
      color: #154231 !important;
      border: 1px solid var(--mint-border) !important;
      border-radius: 8px !important;
      font-weight: 700 !important;
    }

    /* Унификация кнопок "Шпаргалка" и "Пройти тест / Открыть" */
    .btn-cheat, .cheatsheet-btn, button[onclick*="Cheat"], button[onclick*="cheat"], button[onclick*="Note"] {
      background-color: var(--mint-soft) !important;
      color: #154231 !important;
      border: 1px solid var(--mint-border) !important;
      border-radius: 10px !important;
      font-weight: 600 !important;
    }

    .btn-test, .test-btn, .start-btn, .primary-btn,
    button[onclick*="start"], button[onclick*="Start"], button[onclick*="openChapter"] {
      background-color: var(--emerald-main) !important;
      color: #FFFFFF !important;
      border: 1px solid var(--emerald-dark) !important;
      border-radius: 10px !important;
      font-weight: 600 !important;
    }

    /* Варианты ответов и разборы */
    .option-btn, .answer-btn, button.option, [class*="option"]:not(.correct):not(.wrong):not(.selected) {
      background-color: #DCE5DE !important;
      border: 1px solid #A4B8AC !important;
      border-radius: 12px !important;
      color: var(--text-primary) !important;
    }
    .option-btn:hover, .answer-btn:hover, button.option:hover {
      background-color: #D0DDD3 !important;
    }

    .explanation, .exp-box, [class*="explanation"] {
      background-color: #D7E3DB !important;
      border: 1px solid #9EB5A7 !important;
      border-radius: 12px !important;
      color: var(--text-primary) !important;
    }

    .correct, .is-correct, [data-state="correct"] {
      background-color: #C5E2CE !important;
      border-color: #3E7B54 !important;
      color: #11301D !important;
    }
    .wrong, .is-wrong, [data-state="wrong"] {
      background-color: #ECD0CC !important;
      border-color: #A8564D !important;
      color: #421612 !important;
    }

    /* Полное скрытие любых остаточных кнопок переключения темы и PDF/экспорта */
    #themeToggle, #theme-toggle, .theme-toggle, .theme-btn, .theme-switch,
    [onclick*="toggleTheme"], [onclick*="switchTheme"],
    [onclick*="exportData"], [onclick*="importData"], [onclick*="exportPDF"],
    [onclick*="generatePDF"], button[title*="тема" i], button[aria-label*="тема" i] {
      display: none !important;
      visibility: hidden !important;
    }
  `;
  document.head.appendChild(style);

  // Удаление круглых кнопок переключения темы без ID/классов (как кружок в правом верхнем углу Акыды)
  function hideStrayThemeButtons() {
    document.querySelectorAll("button, div[role='button']").forEach((btn) => {
      const txt = (btn.textContent || "").trim();
      if (txt === "🌓" || txt === "🌙" || txt === "☀️" || txt === "◑" || txt === "◐") {
        btn.style.display = "none";
      }
    });
  }

  function cleanDocumentTitle() {
    if (document.title && /галия|медресе/i.test(document.title)) {
      document.title = document.title
        .replace(/медресе\s*[«"']?галия[»"']?\s*[—–-]?\s*/gi, "")
        .trim() || "Интерактивная библиотека знаний";
    }
    hideStrayThemeButtons();
  }

  cleanDocumentTitle();
  document.addEventListener("DOMContentLoaded", cleanDocumentTitle);
  window.addEventListener("load", cleanDocumentTitle);

  // Настройка цвета шапки Telegram WebApp
  try {
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.ready();
      if (window.Telegram.WebApp.setHeaderColor) {
        window.Telegram.WebApp.setHeaderColor("#1A3F31");
      }
      if (window.Telegram.WebApp.setBackgroundColor) {
        window.Telegram.WebApp.setBackgroundColor("#33483B");
      }
    }
  } catch (e) {}
})();

// 3. Определение ID пользователя и среды запуска
function getTelegramUserId() {
  try {
    if (
      window.Telegram &&
      window.Telegram.WebApp &&
      window.Telegram.WebApp.initDataUnsafe &&
      window.Telegram.WebApp.initDataUnsafe.user &&
      window.Telegram.WebApp.initDataUnsafe.user.id
    ) {
      return String(window.Telegram.WebApp.initDataUnsafe.user.id);
    }
  } catch (e) {}
  return null;
}

function isInsideTelegram() {
  return Boolean(getTelegramUserId());
}

function getCurrentUserId() {
  const tgId = getTelegramUserId();
  if (tgId) {
    try { localStorage.setItem("madrasah_uid", tgId); } catch (e) {}
    return tgId;
  }
  try {
    const params = new URLSearchParams(window.location.search);
    const urlUid = params.get("uid");
    if (urlUid && /^\d+$/.test(urlUid.trim())) {
      localStorage.setItem("madrasah_uid", urlUid.trim());
      return urlUid.trim();
    }
    const saved = localStorage.getItem("madrasah_uid");
    if (saved && /^\d+$/.test(saved.trim())) {
      return saved.trim();
    }
  } catch (e) {}
  return "guest";
}

// 4. Защищённый 24-часовой триал (только внутри официального Telegram + защита от перевода часов)
let serverTimeOffsetMs = 0;

function syncServerTime() {
  try {
    fetch(window.location.origin + "/madrasah/auth.js?ping=" + Date.now(), {
      method: "HEAD",
      cache: "no-store"
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
    const prevMax = Number(localStorage.getItem("madrasah_max_seen") || "0");
    if (nowMs > prevMax) {
      localStorage.setItem("madrasah_max_seen", String(nowMs));
    }
  } catch (e) {}
}

function isClockTampered() {
  try {
    const prevMax = Number(localStorage.getItem("madrasah_max_seen") || "0");
    const now = getTrustedNow();
    if (prevMax > 0 && now + 60000 < prevMax) {
      return true;
    }
    updateMaxSeenTime(now);
  } catch (e) {}
  return false;
}

function getTrialState() {
  const uid = getCurrentUserId();
  if (!isInsideTelegram() || uid === "guest") {
    return { status: "unavailable", remainingMs: 0 };
  }
  if (isClockTampered()) {
    return { status: "expired", remainingMs: 0 };
  }
  try {
    const key = "madrasah_trial_start_" + uid;
    const rawStart = localStorage.getItem(key);
    if (!rawStart) {
      return { status: "available", remainingMs: TRIAL_DURATION_MS };
    }
    const startMs = Number(rawStart);
    const elapsed = getTrustedNow() - startMs;
    if (elapsed >= TRIAL_DURATION_MS || elapsed < -60000) {
      return { status: "expired", remainingMs: 0 };
    }
    return { status: "active", remainingMs: TRIAL_DURATION_MS - elapsed };
  } catch (e) {
    return { status: "available", remainingMs: TRIAL_DURATION_MS };
  }
}

function startTrial24h() {
  const uid = getCurrentUserId();
  if (!isInsideTelegram() || uid === "guest") return false;
  const state = getTrialState();
  if (state.status === "expired") return false;
  if (state.status === "active") return true;
  try {
    const now = getTrustedNow();
    localStorage.setItem("madrasah_trial_start_" + uid, String(now));
    updateMaxSeenTime(now);
    return true;
  } catch (e) {
    return false;
  }
}

function hasCourseAccess(courseCode) {
  const uid = getCurrentUserId();
  const perms = ALLOWED_USERS[uid];
  if (Array.isArray(perms)) {
    if (perms.includes("all") || perms.includes(courseCode)) {
      return true;
    }
  }
  const trial = getTrialState();
  if (trial.status === "active") {
    return true;
  }
  return false;
}

function protectCoursePage(courseCode) {
  syncServerTime();
  const check = () => {
    if (!hasCourseAccess(courseCode)) {
      document.body.innerHTML = `
        <div style="max-width:440px;margin:48px auto;padding:24px;background:#EAF0EB;border:1px solid #B5C7BC;border-radius:16px;text-align:center;font-family:system-ui,-apple-system,sans-serif;color:#16261E;box-shadow:0 6px 20px rgba(13,24,18,0.22);">
          <div style="font-size:40px;margin-bottom:12px;">🔒</div>
          <h2 style="margin:0 0 10px;font-size:20px;color:#153D2E;">Доступ к курсу закрыт</h2>
          <p style="margin:0 0 18px;font-size:14px;line-height:1.5;color:#465C50;">
            Ваш ID: <b>${getCurrentUserId()}</b>.<br>
            Вернитесь в главное меню, чтобы активировать ознакомительный доступ (в Telegram) или обратитесь к администратору.
          </p>
          <a href="../index.html?uid=${encodeURIComponent(getCurrentUserId())}" style="display:inline-block;padding:12px 22px;background:#1E5641;color:#FFFFFF;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">
            ← Вернуться в каталог
          </a>
        </div>
      `;
    }
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", check);
  } else {
    check();
  }
}
window.checkAccess = protectCoursePage;

// 5. Надёжное перемешивание вариантов ответов (1–4 строка) на уровне DOM и данных
function getCryptoRandomInt(max) {
  if (window.crypto && window.crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    return arr[0] % max;
  }
  return Math.floor(Math.random() * max);
}

// Перемешивание самих кнопок ответов при появлении вопроса на экране (работает во всех 7 курсах без поломки логики проверки)
function setupDomOptionShuffler() {
  const shuffleButtonsInContainer = (container) => {
    if (!container || container.dataset.optionsShuffled === "1") return;
    const btns = Array.from(container.children).filter(
      (el) => el.tagName === "BUTTON" || el.classList.contains("option") || el.classList.contains("option-btn") || el.classList.contains("answer-btn")
    );
    if (btns.length < 3 || btns.length > 6) return;

    // Не перемешиваем, если это кнопки навигации ("Далее", "Назад", "Шпаргалка")
    const isNav = btns.some((b) => /далее|назад|шпаргалка|завершить|проверить|меню/i.test(b.textContent || ""));
    if (isNav) return;

    container.dataset.optionsShuffled = "1";
    const indices = btns.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = getCryptoRandomInt(i + 1);
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    indices.forEach((idx) => container.appendChild(btns[idx]));
  };

  const scanAndShuffle = () => {
    const selectors = [
      "#options", ".options", "#optionsContainer", ".options-container",
      "#answers", ".answers", ".quiz-options", ".choices"
    ];
    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (el.children.length >= 3) {
          // Сбрасываем метку при смене текста вопроса
          const signature = Array.from(el.children).map((c) => c.textContent.trim()).sort().join("|");
          if (el.dataset.lastSig !== signature) {
            el.dataset.lastSig = signature;
            el.dataset.optionsShuffled = "0";
            shuffleButtonsInContainer(el);
          }
        }
      });
    });
  };

  const observer = new MutationObserver(() => {
    scanAndShuffle();
  });

  const startObserver = () => {
    scanAndShuffle();
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startObserver);
  } else {
    startObserver();
  }
}

setupDomOptionShuffler();
syncServerTime();
