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

  // 2. Внедрение единой палитры "Болотно-зелёное сукно" в стиле эталона "Акыда"
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
      --header-emerald: #1F523F;
      --header-emerald-dark: #184232;
      --card-sage: #E5ECE6;
      --border-moss: #8FA695;
      --text-forest: #1A281F;
      --text-muted-moss: #435749;
      --btn-emerald: #1E5641;
      --btn-emerald-hover: #174433;
    }

    html, body {
      background-color: var(--bg-baize) !important;
      background-image: url("data:image/svg+xml,${patternSvg}") !important;
      background-repeat: repeat !important;
      color: var(--text-forest) !important;
    }

    /* Прозрачные внешние обёртки списков, чтобы сукно было видно вокруг отдельных карточек */
    .container, .main-container, .wrapper, .app-container,
    .section, .part-section, .modules-section, .chapters-list, .modules-list {
      background: transparent !important;
      background-color: transparent !important;
      box-shadow: none !important;
      border-color: transparent !important;
    }

    /* Заголовки секций поверх сукна (например в Сире) делаем светлыми и читаемыми */
    .section > h2, .section > h3, .part-section > h2, .part-section > h3,
    .section-title, .part-title, .group-header {
      color: #E5ECE6 !important;
      text-shadow: 0 1px 2px rgba(14, 22, 17, 0.45) !important;
    }

    /* Изумрудно-хвойная шапка курсов как в эталоне "Акыда" */
    header, .header, .hero, .course-header, .banner, .top-banner {
      background: linear-gradient(145deg, var(--header-emerald) 0%, var(--header-emerald-dark) 100%) !important;
      color: #F6F9F6 !important;
      border: 1px solid #3C735D !important;
      border-radius: 16px !important;
    }

    header h1, .header h1, .hero h1, .course-header h1,
    header p, .header p, .hero p, .course-header p {
      color: #F6F9F6 !important;
    }

    /* Убираем полосу-подложку вокруг ряда плашек в шапке, оставляя только сами капсулы */
    header div, .header div, .hero div, .course-header div {
      background: transparent !important;
      background-color: transparent !important;
      border-color: transparent !important;
      box-shadow: none !important;
    }

    header .stat, header .badge, header .pill, header .tag, header .meta-pill,
    .header .stat, .header .badge, .header .pill, .header .tag, .header .meta-pill,
    .hero .stat, .hero .badge, .hero .pill,
    .course-header .stat, .course-header .badge, .course-header .pill,
    header .stats > span, .header .stats > span, .hero .stats > span {
      background-color: rgba(255, 255, 255, 0.14) !important;
      border: 1px solid rgba(255, 255, 255, 0.22) !important;
      border-radius: 20px !important;
      color: #F6F9F6 !important;
    }

    /* Матовые светло-шалфейные карточки */
    .card, .chapter-card, .module-card, .lesson-card, .quiz-card, .question-box,
    .modal-content, .cheatsheet-box, .progress-card,
    #hadithView, .hadith-view, .hadith-card, .hadith-detail, .detail-card, main {
      background-color: var(--card-sage) !important;
      border: 1px solid var(--border-moss) !important;
      border-radius: 16px !important;
      color: var(--text-forest) !important;
      box-shadow: 0 3px 10px rgba(14, 22, 17, 0.16) !important;
    }

    /* Если внутри main лежат отдельные карточки глав (как в Сире/Фикхе/Акыде), сам main остаётся прозрачным */
    main:has(.card), main:has(.chapter-card), main:has(.module-card), main:has(.lesson-card) {
      background: transparent !important;
      background-color: transparent !important;
      border: none !important;
      box-shadow: none !important;
    }

    /* Единый стиль кнопки "Назад" во всех курсах */
    a[href*="index.html"].back-btn,
    a[href="../index.html"],
    .back-link, .btn-back, .nav-back,
    a[href*="../index.html"] {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      background-color: #E5ECE6 !important;
      color: #1A281F !important;
      border: 1px solid #8FA695 !important;
      border-radius: 20px !important;
      padding: 7px 16px !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      text-decoration: none !important;
      box-shadow: 0 2px 6px rgba(14, 22, 17, 0.16) !important;
    }

    /* Мягкие кнопки вариантов ответов */
    .option-btn, .answer-btn, button.option, [class*="option"]:not(.correct):not(.wrong):not(.selected) {
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

    /* Скрытие старых кнопок смены темы и лишних кнопок в хадисах */
    #themeToggle, .theme-toggle, .theme-btn, [onclick*="toggleTheme"],
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

  // Настройка цвета шапки Telegram WebApp
  try {
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.ready();
      if (window.Telegram.WebApp.setHeaderColor) {
        window.Telegram.WebApp.setHeaderColor("#1F523F");
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
          <h2 style="margin:0 0 10px;font-size:20px;color:#1F523F;">Доступ к курсу закрыт</h2>
          <p style="margin:0 0 18px;font-size:14px;line-height:1.5;color:#435749;">
            Ваш ID: <b>${getCurrentUserId()}</b>.<br>
            Вернитесь в главное меню, чтобы активировать ознакомительный доступ (в Telegram) или обратитесь к администратору.
          </p>
          <a href="../index.html?uid=${encodeURIComponent(getCurrentUserId())}" style="display:inline-block;padding:12px 22px;background:#1E5641;color:#F5F8F5;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">
            Назад
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

// 5. Сбалансированное случайное перемешивание вариантов ответа (1-4 строка)
function getRandomInt(max) {
  try {
    if (window.crypto && window.crypto.getRandomValues) {
      const arr = new Uint32Array(1);
      window.crypto.getRandomValues(arr);
      return arr[0] % max;
    }
  } catch (e) {}
  return Math.floor(Math.random() * max);
}

let slotBag = [];
function nextBalancedSlot(len) {
  if (len !== 4) return getRandomInt(len);
  if (slotBag.length === 0) {
    slotBag = [0, 1, 2, 3];
    for (let i = slotBag.length - 1; i > 0; i--) {
      const j = getRandomInt(i + 1);
      [slotBag[i], slotBag[j]] = [slotBag[j], slotBag[i]];
    }
  }
  return slotBag.pop();
}

function shuffleQuestionItem(q) {
  if (!q || typeof q !== "object" || q._shuffled) return;
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
  const wrongValues = opts.filter((_, idx) => idx !== origIdx);

  for (let i = wrongValues.length - 1; i > 0; i--) {
    const j = getRandomInt(i + 1);
    [wrongValues[i], wrongValues[j]] = [wrongValues[j], wrongValues[i]];
  }

  const targetSlot = nextBalancedSlot(opts.length);
  const shuffledOpts = [];
  let wPtr = 0;
  for (let i = 0; i < opts.length; i++) {
    if (i === targetSlot) {
      shuffledOpts.push(correctValue);
    } else {
      shuffledOpts.push(wrongValues[wPtr++]);
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

// 6. Визуальная унификация кнопок и исправление нюансов по курсам
function unifyCourseUI() {
  shuffleAllLoadedBanks();

  // А) Унификация кнопок возврата ("← Все курсы", "← К списку всех курсов" -> "Назад")
  // и скрытие кнопок "Экспорт", "Импорт", "Глава (PDF)"
  document.querySelectorAll("a, button, span, div").forEach((el) => {
    if (el.children.length > 0 && el.tagName !== "A" && el.tagName !== "BUTTON") return;

    const rawText = (el.textContent || "").trim();
    const href = el.getAttribute("href") || "";

    // Скрываем кнопки Экспорт / Импорт / Глава в 40 хадисах
    if ((el.tagName === "BUTTON" || el.tagName === "A") && /^(💾\s*)?экспорт$|^(📂\s*)?импорт$|^(📄\s*)?глава(\s*\(pdf\))?$/i.test(rawText)) {
      el.style.setProperty("display", "none", "important");
      return;
    }

    // Кнопка "Назад"
    if (
      href.includes("../index.html") ||
      /все курсы|списку всех курсов/i.test(rawText)
    ) {
      if (rawText !== "Назад") {
        el.textContent = "Назад";
      }
      if (href.includes("index.html") && !href.includes("uid=")) {
        const sep = href.includes("?") ? "&" : "?";
        el.setAttribute("href", href + sep + "uid=" + encodeURIComponent(getCurrentUserId()));
      }
      return;
    }

    // В Сире: превращаем "Открыть →" / "Открыть" в аккуратную зелёную кнопку "📝 Открыть" без стрелок
    if (/^открыть(\s*→)?$/i.test(rawText) || /^📝\s*открыть(\s*→)?$/i.test(rawText)) {
      el.textContent = "📝 Открыть";
      el.style.setProperty("display", "inline-flex", "important");
      el.style.setProperty("align-items", "center", "important");
      el.style.setProperty("justify-content", "center", "important");
      el.style.setProperty("background-color", "#1E5641", "important");
      el.style.setProperty("color", "#F6F9F6", "important");
      el.style.setProperty("padding", "8px 14px", "important");
      el.style.setProperty("border-radius", "10px", "important");
      el.style.setProperty("font-size", "13px", "important");
      el.style.setProperty("font-weight", "600", "important");
      el.style.setProperty("text-decoration", "none", "important");
      el.style.setProperty("box-shadow", "0 2px 5px rgba(20, 48, 35, 0.2)", "important");
      return;
    }

    // Замена стрелок "Тест →" на "📝 Тест"
    if (/^тест\s*→$/i.test(rawText) || /^пройти тест\s*→$/i.test(rawText)) {
      el.textContent = "📝 Тест";
      return;
    }

    // Скрытие одиночных кружков смены темы
    if ((rawText === "🌓" || rawText === "🌙" || rawText === "☀️") && el.children.length === 0) {
      el.style.setProperty("display", "none", "important");
    }
  });

  // Б) В шапках курсов: делаем сами плашки статистики капсулами, а их контейнер — прозрачным
  document.querySelectorAll("header span, .header span, .hero span, .course-header span").forEach((sp) => {
    const t = (sp.textContent || "").trim();
    if (/^\d+\s*(глав|модул|вопрос|шпаргал|урок)/i.test(t)) {
      sp.style.setProperty("background-color", "rgba(255, 255, 255, 0.14)", "important");
      sp.style.setProperty("border", "1px solid rgba(255, 255, 255, 0.22)", "important");
      sp.style.setProperty("border-radius", "20px", "important");
      sp.style.setProperty("padding", "5px 12px", "important");
      sp.style.setProperty("color", "#F6F9F6", "important");
      sp.style.setProperty("display", "inline-flex", "important");
      sp.style.setProperty("align-items", "center", "important");
    }
  });

  // В) В "40 хадисах": гарантируем светло-шалфейную карточку под текстом хадиса и аудиоплеером
  const audioEl = document.querySelector("audio");
  if (audioEl) {
    let cardHost = audioEl.parentElement;
    while (cardHost && cardHost !== document.body) {
      if (cardHost.querySelector("h1, h2, h3")) {
        cardHost.style.setProperty("background-color", "#E5ECE6", "important");
        cardHost.style.setProperty("border", "1px solid #8FA695", "important");
        cardHost.style.setProperty("border-radius", "16px", "important");
        cardHost.style.setProperty("padding", "16px", "important");
        cardHost.style.setProperty("color", "#1A281F", "important");
        break;
      }
      cardHost = cardHost.parentElement;
    }
  }

  // Г) Убираем внешнюю обводку-коробку вокруг списка карточек в Сире и Фикхе, оставляя сами карточки
  document.querySelectorAll("div").forEach((box) => {
    if (box.closest("header, .header, .hero, .course-header")) return;
    const directCards = Array.from(box.children).filter((ch) =>
      ch.matches(".card, .chapter-card, .module-card, .lesson-card")
    );
    if (directCards.length >= 2) {
      box.style.setProperty("background", "transparent", "important");
      box.style.setProperty("background-color", "transparent", "important");
      box.style.setProperty("border", "none", "important");
      box.style.setProperty("box-shadow", "none", "important");
      box.style.setProperty("padding-left", "0", "important");
      box.style.setProperty("padding-right", "0", "important");
    }
  });

  // Д) Резервное перемешивание кнопок вариантов ответа прямо в DOM при отрисовке вопроса
  const optionContainers = new Set();
  document.querySelectorAll(".option-btn, .answer-btn, button.option").forEach((btn) => {
    if (btn.parentElement) optionContainers.add(btn.parentElement);
  });

  optionContainers.forEach((parent) => {
    const btns = Array.from(parent.children).filter((ch) =>
      ch.matches(".option-btn, .answer-btn, button.option")
    );
    if (btns.length === 4 && !parent.dataset.domShuffled) {
      const order = [0, 1, 2, 3];
      for (let i = order.length - 1; i > 0; i--) {
        const j = getRandomInt(i + 1);
        [order[i], order[j]] = [order[j], order[i]];
      }
      order.forEach((idx) => parent.appendChild(btns[idx]));
      parent.dataset.domShuffled = "1";
    }
  });
}

const uiObserver = new MutationObserver(() => {
  unifyCourseUI();
});

document.addEventListener("DOMContentLoaded", () => {
  unifyCourseUI();
  if (document.body) {
    uiObserver.observe(document.body, { childList: true, subtree: true });
  }
});
window.addEventListener("load", unifyCourseUI);
setTimeout(unifyCourseUI, 150);
setTimeout(unifyCourseUI, 500);
syncServerTime();
