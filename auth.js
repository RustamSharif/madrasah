// Единый модуль доступа, защиты таймера, перемешивания ответов и оформления "Болотно-зелёное сукно"
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

  // 2. Внедрение единой палитры "Болотно-зелёное сукно" (эталон оформления как в "Акыде")
  const style = document.createElement("style");
  style.id = "madrasah-baize-theme";
  const patternSvg = encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">' +
    '<defs>' +
    '<pattern id="baizeWeave" width="4" height="4" patternUnits="userSpaceOnUse">' +
    '<path d="M0 0h2v2H0zm2 2h2v2H2z" fill="#1E2D23" fill-opacity="0.16"/>' +
    '</pattern>' +
    '</defs>' +
    '<rect width="80" height="80" fill="url(#baizeWeave)"/>' +
    '<g fill="none" stroke="#9AB8A1" stroke-width="0.75" stroke-opacity="0.15">' +
    '<polygon points="40,4 50,16 66,14 64,30 76,40 64,50 66,66 50,64 40,76 30,64 14,66 16,50 4,40 16,30 14,14 30,16"/>' +
    '<circle cx="40" cy="40" r="14"/>' +
    '</g></svg>'
  );

  style.textContent = `
    :root {
      --bg-baize: #364B3D;
      --bg-baize-deep: #293B2F;
      --card-sage: #E5ECE6;
      --card-sage-hover: #EDF2EE;
      --border-moss: #8FA695;
      --text-forest: #1A281F;
      --text-muted-moss: #435749;
      --accent-emerald: #1B5E43;
      --accent-emerald-dark: #144732;
    }

    html, body {
      background-color: var(--bg-baize) !important;
      background-image: url("data:image/svg+xml,${patternSvg}") !important;
      background-repeat: repeat !important;
      color: var(--text-forest) !important;
    }

    /* Прозрачные внешние обёртки, чтобы сукно просвечивало вокруг карточек */
    .container, .wrapper, .main-container, .content, #app, main {
      background: transparent !important;
      box-shadow: none !important;
      border: none !important;
    }

    /* Изумрудно-хвойная шапка курсов как в "Акыде" */
    header, .header, .course-header, .hero, .banner, .top-banner {
      background: linear-gradient(145deg, #1E5641 0%, #164231 100%) !important;
      color: #F4F7F4 !important;
      border: 1px solid #4A7A63 !important;
      border-radius: 16px !important;
    }
    header *, .header *, .course-header *, .hero *, .banner *, .top-banner * {
      color: #F4F7F4 !important;
    }

    /* Полупрозрачные капсулы статистики внутри шапки (исправление белых плашек) */
    .header .badge, .header .stat, .header .pill, .header .tag,
    .course-header .badge, .course-header .stat, .course-header .pill,
    .hero .badge, .hero .stat, .stats-row > div, .stats-row > span,
    .header-stats > div, .header-stats > span {
      background: rgba(255, 255, 255, 0.14) !important;
      border: 1px solid rgba(255, 255, 255, 0.22) !important;
      color: #F4F7F4 !important;
    }

    /* Матовые светло-шалфейные карточки как в "Акыде" */
    .card, .chapter-card, .quiz-card, .question-box, .question-card,
    .modal-content, .cheatsheet-box, .progress-box, .progress-card,
    .stats-bar, .topic-card, .lesson-card {
      background-color: var(--card-sage) !important;
      border: 1px solid var(--border-moss) !important;
      color: var(--text-forest) !important;
      box-shadow: 0 3px 10px rgba(14, 22, 17, 0.16) !important;
    }

    /* Кнопки запуска теста и открытия разделов в едином стиле */
    .btn-primary, .test-btn, .start-btn, button[class*="test"], a[class*="test"] {
      background-color: var(--accent-emerald) !important;
      border-color: var(--accent-emerald-dark) !important;
      color: #F5F9F6 !important;
    }

    .btn-secondary, .cheat-btn, .cheatsheet-btn, button[class*="cheat"] {
      background-color: #D5E5DC !important;
      border: 1px solid #8EB39F !important;
      color: #163D2C !important;
    }

    /* Мягкие кнопки вариантов ответов */
    .option-btn, .answer-btn, button.option, [data-option-idx]:not(.correct):not(.wrong):not(.selected) {
      background-color: #DCE5DD !important;
      border-color: #9BB0A0 !important;
      color: var(--text-forest) !important;
    }
    .option-btn:hover, .answer-btn:hover, button.option:hover {
      background-color: #D0DDD2 !important;
    }

    .explanation, .exp-box, [class*="explanation"] {
      background-color: #D6E1D8 !important;
      border-color: #8FA695 !important;
      color: var(--text-forest) !important;
    }

    /* Спокойная подсветка правильного и ошибочного ответа */
    .correct, .is-correct, [data-state="correct"] {
      background-color: #C7DFC9 !important;
      border-color: #4D7C55 !important;
      color: #16301B !important;
    }
    .wrong, .is-wrong, [data-state="wrong"] {
      background-color: #E8CECA !important;
      border-color: #A85B52 !important;
      color: #421814 !important;
    }

    /* Скрытие старых кнопок переключения темы (включая кружок в Акыде) и лишних кнопок в хадисах */
    #themeToggle, .theme-toggle, .theme-btn, .dark-toggle,
    [onclick*="toggleTheme"], [onclick*="switchTheme"],
    [onclick*="exportData"], [onclick*="importData"], [onclick*="exportPDF"],
    [onclick*="generatePDF"], button[title*="тема" i], button[title*="PDF" i] {
      display: none !important;
    }
  `;
  document.head.appendChild(style);

  // Очистка упоминаний медресе из заголовка вкладки
  function cleanDocumentTitle() {
    if (document.title && /галия|медресе/i.test(document.title)) {
      document.title = document.title
        .replace(/медресе\s*[«"']?галия[»"']?\s*[—–-]?\s*/gi, "")
        .trim() || "Интерактивная библиотека знаний";
    }
  }
  cleanDocumentTitle();
  document.addEventListener("DOMContentLoaded", cleanDocumentTitle);

  // Настройка цвета шапки Telegram WebApp под болотно-зелёное сукно
  try {
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.ready();
      if (window.Telegram.WebApp.setHeaderColor) {
        window.Telegram.WebApp.setHeaderColor("#1E5641");
      }
      if (window.Telegram.WebApp.setBackgroundColor) {
        window.Telegram.WebApp.setBackgroundColor("#364B3D");
      }
    }
  } catch (e) {}
})();

// 3. Определение ID пользователя и среды запуска (Telegram vs обычный браузер)
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

// 4. Защищённый 24-часовой триал (только внутри официального Telegram + защита от отмотки часов)
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
        <div style="max-width:440px;margin:48px auto;padding:24px;background:#E5ECE6;border:1px solid #8FA695;border-radius:16px;text-align:center;font-family:system-ui,-apple-system,sans-serif;color:#1A281F;box-shadow:0 6px 20px rgba(18,28,22,0.22);">
          <div style="font-size:40px;margin-bottom:12px;">🔒</div>
          <h2 style="margin:0 0 10px;font-size:20px;color:#1E5641;">Доступ к курсу закрыт</h2>
          <p style="margin:0 0 18px;font-size:14px;line-height:1.5;color:#435749;">
            Ваш ID: <b>${getCurrentUserId()}</b>.<br>
            Вернитесь в главное меню, чтобы активировать ознакомительный доступ (в Telegram) или обратитесь к администратору.
          </p>
          <a href="../index.html?uid=${encodeURIComponent(getCurrentUserId())}" style="display:inline-block;padding:12px 22px;background:#1B5E43;color:#F5F8F5;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">
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

// 5. Унификация кнопок (убираем стрелочки → и ставим значок 📝 как в "Акыде") + скрытие кружка темы
function normalizeLibraryButtons() {
  // Скрываем одиночные круглые кнопки темы без текста (например, 🌓 / 🌙 в правом верхнем углу Акыды)
  document.querySelectorAll("button, a").forEach((el) => {
    const raw = (el.textContent || "").trim();
    if (/^[🌙☀️🌓🌗🌞🌛]+$/.test(raw)) {
      el.style.setProperty("display", "none", "important");
      return;
    }

    // Не трогаем кнопку возврата "← Все курсы"
    if (raw.includes("←") || /все курсы|назад/i.test(raw)) {
      return;
    }

    // Если в кнопке есть стрелка вправо (→, ➔, ➜, ➡, ⟶, ») — убираем её
    if (/[→➔➜➝➞➡⟶»]/.test(raw)) {
      let cleaned = raw.replace(/\s*[→➔➜➝➞➡⟶»]+\s*/g, " ").trim();
      if (/^(открыть|тест|пройти тест|начать|итоговый)/i.test(cleaned) && !cleaned.startsWith("📝") && !cleaned.startsWith("🔒") && !cleaned.startsWith("🎓")) {
        cleaned = "📝 " + cleaned;
      }
      el.textContent = cleaned;
    } else if (/^(открыть|тест|пройти тест|тест\s*\(\d+\))$/i.test(raw) && !raw.startsWith("📝") && !raw.startsWith("🔒")) {
      el.textContent = "📝 " + raw;
    }
  });
}

// 6. Сбалансированное перемешивание вариантов ответов (1-4 строка)
let balancedSlotPool = [];
function getNextBalancedSlot(count) {
  if (count !== 4) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] % count;
  }
  if (balancedSlotPool.length === 0) {
    balancedSlotPool = [0, 1, 2, 3];
    for (let i = balancedSlotPool.length - 1; i > 0; i--) {
      const arr = new Uint32Array(1);
      crypto.getRandomValues(arr);
      const j = arr[0] % (i + 1);
      [balancedSlotPool[i], balancedSlotPool[j]] = [balancedSlotPool[j], balancedSlotPool[i]];
    }
  }
  return balancedSlotPool.pop();
}

function shuffleQuestionItem(q) {
  if (!q || q._shuffled) return;
  const opts = Array.isArray(q.options) ? q.options : Array.isArray(q.a) ? q.a : null;
  if (!opts || opts.length < 2) return;

  let origIdx =
    typeof q.correct === "number"
      ? q.correct
      : typeof q.c === "number"
      ? q.c
      : typeof q.answer === "number"
      ? q.answer
      : 0;

  if (origIdx < 0 || origIdx >= opts.length) origIdx = 0;
  const correctValue = opts[origIdx];
  const otherValues = opts.filter((_, i) => i !== origIdx);

  for (let i = otherValues.length - 1; i > 0; i--) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    const j = arr[0] % (i + 1);
    [otherValues[i], otherValues[j]] = [otherValues[j], otherValues[i]];
  }

  const targetSlot = getNextBalancedSlot(opts.length);
  const shuffledOpts = [];
  let otherPtr = 0;
  for (let i = 0; i < opts.length; i++) {
    if (i === targetSlot) {
      shuffledOpts.push(correctValue);
    } else {
      shuffledOpts.push(otherValues[otherPtr++]);
    }
  }

  if (Array.isArray(q.options)) q.options = shuffledOpts;
  if (Array.isArray(q.a)) q.a = shuffledOpts;
  if (typeof q.correct === "number") q.correct = targetSlot;
  if (typeof q.c === "number") q.c = targetSlot;
  if (typeof q.answer === "number") q.answer = targetSlot;
  q._shuffled = true;
}

function shuffleAllLoadedBanks() {
  const globalNames = [
    "SIRO_DATA", "SIRA_DATA", "HADITH_DATA", "NAWAWI_DATA",
    "FIQH_DATA", "TAJWID_DATA", "ADAB_DATA", "AQEEDAH_DATA", "ARABIC_DATA"
  ];

  globalNames.forEach((name) => {
    const bank = window[name];
    if (!bank) return;
    if (Array.isArray(bank)) {
      bank.forEach(shuffleQuestionItem);
    } else {
      if (Array.isArray(bank.questions)) bank.questions.forEach(shuffleQuestionItem);
      if (Array.isArray(bank.chapters)) {
        bank.chapters.forEach((ch) => {
          if (ch && Array.isArray(ch.questions)) ch.questions.forEach(shuffleQuestionItem);
        });
      }
      if (bank.chapters && typeof bank.chapters === "object" && !Array.isArray(bank.chapters)) {
        Object.values(bank.chapters).forEach((ch) => {
          if (ch && Array.isArray(ch.questions)) ch.questions.forEach(shuffleQuestionItem);
        });
      }
    }
  });

  if (Array.isArray(window.questions)) {
    window.questions.forEach(shuffleQuestionItem);
  }
}

// 7. DOM-перемешивание кнопок вариантов ответа на экране
function shuffleRenderedOptionButtons() {
  const containers = document.querySelectorAll(
    "#options, .options, .options-list, .answers, .answers-list, .choices, #optionsContainer"
  );
  containers.forEach((box) => {
    if (!box || box.dataset.domShuffled === "1") return;
    const btns = Array.from(box.children).filter(
      (el) => el.tagName === "BUTTON" || el.classList.contains("option") || el.classList.contains("option-btn")
    );
    if (btns.length < 3 || btns.length > 5) return;

    const order = btns.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const arr = new Uint32Array(1);
      crypto.getRandomValues(arr);
      const j = arr[0] % (i + 1);
      [order[i], order[j]] = [order[j], order[i]];
    }

    order.forEach((idx) => box.appendChild(btns[idx]));
    box.dataset.domShuffled = "1";
  });
}

function runAllEnhancements() {
  shuffleAllLoadedBanks();
  shuffleRenderedOptionButtons();
  normalizeLibraryButtons();
}

document.addEventListener("DOMContentLoaded", () => {
  runAllEnhancements();
  const observer = new MutationObserver(() => {
    runAllEnhancements();
  });
  observer.observe(document.body, { childList: true, subtree: true });
});

window.addEventListener("load", runAllEnhancements);
setTimeout(runAllEnhancements, 120);
setTimeout(runAllEnhancements, 500);
syncServerTime();
