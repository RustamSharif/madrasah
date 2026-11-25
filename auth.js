// Единый модуль доступа, защиты таймера, равномерного перемешивания ответов (1-4) и единого стиля "Болотно-зелёное сукно"
const ALLOWED_USERS = {
  "859435297": ["all"]
  // Добавляйте сюда ID братьев в формате:
  // "123456789": ["all"],
  // "987654321": ["sira", "fiqh", "quran"],
};

const ALL_COURSE_CODES = ["sira", "nawawi", "fiqh", "tajwid", "adab", "aqeedah", "arabic", "quran"];
const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000;

(function () {
  // 1. Сброс старых настроек тем
  try {
    localStorage.removeItem("theme");
    localStorage.removeItem("darkMode");
    localStorage.removeItem("madrasah_theme");
    document.documentElement.classList.remove("dark", "dark-mode", "night");
  } catch (e) {}

  // 2. Единое оформление "Болотно-зелёное сукно" для титульной страницы и всех внутренних курсов
  const style = document.createElement("style");
  style.id = "madrasah-unified-baize-theme";
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
      --bg-baize-deep: #24362B;
      --card-sage: #E5ECE6;
      --card-sage-alt: #DCE5DD;
      --border-moss: #8FA695;
      --text-forest: #1A281F;
      --text-muted-moss: #435749;
      --accent-moss: #3B5945;
      --accent-moss-dark: #2A4232;
    }

    html, body {
      background-color: var(--bg-baize) !important;
      background-image: url("data:image/svg+xml,${patternSvg}") !important;
      background-repeat: repeat !important;
      color: var(--text-forest) !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
    }

    /* Единая тёмно-болотная шапка во всех внутренних тестах, как на титульной странице */
    header, .header, .top-header, .course-header, .hero, .hero-banner, .banner {
      background: linear-gradient(145deg, #24362B 0%, #1C2B22 100%) !important;
      color: #F4F7F4 !important;
      border: 1px solid #55705D !important;
      border-radius: 16px !important;
      box-shadow: 0 6px 18px rgba(14, 22, 17, 0.28) !important;
    }

    header h1, header h2, .header h1, .header h2, .course-header h1, .hero h1, .hero-banner h1 {
      color: #F6F8F3 !important;
    }

    header p, .header p, .course-header p, .hero p, .hero-banner p, .subtitle, .course-subtitle {
      color: #C7D4C9 !important;
    }

    /* Верхняя панель навигации / статистики внутри курсов */
    .top-bar, .nav-bar, .toolbar, .controls-bar, .stats-bar, .progress-bar-wrap {
      background-color: #E5ECE6 !important;
      border: 1px solid #8FA695 !important;
      border-radius: 12px !important;
      color: #1A281F !important;
      box-shadow: 0 2px 8px rgba(14, 22, 17, 0.16) !important;
    }

    /* Единые матовые шалфейные карточки внутри всех разделов */
    .card, .chapter-card, .quiz-card, .question-box, .question-card,
    .modal-content, .cheatsheet-box, .cheatsheet-content, .result-box, .summary-box,
    .hadith-card, .flashcard, .lesson-card, .exam-card, .final-card {
      background-color: #E5ECE6 !important;
      border: 1px solid #8FA695 !important;
      border-radius: 14px !important;
      color: #1A281F !important;
      box-shadow: 0 3px 10px rgba(14, 22, 17, 0.18) !important;
    }

    .card h2, .card h3, .chapter-card h3, .question-box h2, .question-box h3,
    .cheatsheet-box h2, .cheatsheet-box h3, .modal-content h2, .modal-content h3 {
      color: #18261D !important;
    }

    /* Прозрачный внешний контейнер, чтобы было видно сукно вокруг карточек */
    .container, .main-container, .app-container, #app, main {
      background: transparent !important;
      box-shadow: none !important;
    }

    /* Единые кнопки навигации, шпаргалок и действий */
    .back-btn, .btn-back, a[href*="index.html"] {
      background-color: #2E4636 !important;
      color: #F4F7F4 !important;
      border: 1px solid #6D8A75 !important;
      border-radius: 10px !important;
      text-decoration: none !important;
    }

    .btn-primary, .next-btn, .start-btn, .submit-btn, .quiz-btn, .exam-btn {
      background-color: #3B5945 !important;
      color: #F6F9F6 !important;
      border: 1px solid #2A4232 !important;
      border-radius: 10px !important;
    }

    .btn-secondary, .cheat-btn, .cheatsheet-btn, .outline-btn {
      background-color: #D3DFD5 !important;
      color: #1A281F !important;
      border: 1px solid #8FA695 !important;
      border-radius: 10px !important;
    }

    /* Варианты ответов в тестах */
    .option-btn, .answer-btn, button.option, .options button, .answers button {
      background-color: #DCE5DD !important;
      border: 1px solid #96AC9B !important;
      border-radius: 11px !important;
      color: #1A281F !important;
      transition: background-color 0.15s ease, transform 0.1s ease !important;
    }

    .option-btn:hover:not(:disabled), .answer-btn:hover:not(:disabled),
    button.option:hover:not(:disabled), .options button:hover:not(:disabled) {
      background-color: #CFDCD1 !important;
    }

    /* Спокойная подсветка правильного и ошибочного ответов */
    .correct, .is-correct, [data-state="correct"],
    .option-btn.correct, .answer-btn.correct, .options button.correct {
      background-color: #C4DEC7 !important;
      border-color: #46784F !important;
      color: #142E19 !important;
      font-weight: 600 !important;
    }

    .wrong, .is-wrong, [data-state="wrong"],
    .option-btn.wrong, .answer-btn.wrong, .options button.wrong {
      background-color: #E7CCC8 !important;
      border-color: #A6584F !important;
      color: #401612 !important;
    }

    /* Блок пояснения после ответа */
    .explanation, .exp-box, .feedback-box, [class*="explanation"] {
      background-color: #D5E0D7 !important;
      border: 1px solid #8FA695 !important;
      border-left: 4px solid #3B5945 !important;
      border-radius: 10px !important;
      color: #1A281F !important;
    }

    /* Прогресс-бар */
    .progress-fill, .progress-bar-fill, progress::-webkit-progress-value {
      background-color: #3B5945 !important;
    }

    /* Скрытие старых кнопок переключения темы и лишних кнопок в хадисах */
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

  // Настройка цвета шапки Telegram WebApp под болотно-зелёное сукно
  try {
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.ready();
      if (window.Telegram.WebApp.setHeaderColor) {
        window.Telegram.WebApp.setHeaderColor("#24362B");
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
          <h2 style="margin:0 0 10px;font-size:20px;color:#24362B;">Доступ к курсу закрыт</h2>
          <p style="margin:0 0 18px;font-size:14px;line-height:1.5;color:#435749;">
            Ваш ID: <b>${getCurrentUserId()}</b>.<br>
            Вернитесь в главное меню, чтобы активировать ознакомительный доступ (в Telegram) или обратитесь к администратору.
          </p>
          <a href="../index.html?uid=${encodeURIComponent(getCurrentUserId())}" style="display:inline-block;padding:12px 22px;background:#3B5945;color:#F5F8F5;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">
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

// 5. Криптостойкое равномерное перемешивание ответов по всем 4 строкам (1, 2, 3, 4)
function secureRandomInt(max) {
  if (window.crypto && window.crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    return arr[0] % max;
  }
  return Math.floor(Math.random() * max);
}

function shuffleArraySecure(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Генератор сбалансированных позиций (на каждые 4 вопроса правильный ответ гарантированно бывает на 1, 2, 3 и 4 строке в случайном порядке)
let slotBag = [];
function nextBalancedSlot(len) {
  if (len !== 4) return secureRandomInt(len);
  if (slotBag.length === 0) {
    slotBag = shuffleArraySecure([0, 1, 2, 3]);
  }
  return slotBag.pop();
}

function shuffleQuestionItem(q) {
  if (!q || typeof q !== "object" || q._balancedShuffled) return;
  const rawOpts = Array.isArray(q.options) ? q.options : Array.isArray(q.a) ? q.a : null;
  if (!rawOpts || rawOpts.length < 2) return;

  let origIdx =
    typeof q.correct === "number"
      ? q.correct
      : typeof q.c === "number"
      ? q.c
      : typeof q.answer === "number"
      ? q.answer
      : 0;

  if (origIdx < 0 || origIdx >= rawOpts.length) origIdx = 0;
  const correctValue = rawOpts[origIdx];

  // Отделяем правильный ответ и перемешиваем остальные
  const distractors = [];
  rawOpts.forEach((opt, idx) => {
    if (idx !== origIdx) distractors.push(opt);
  });
  const shuffledDistractors = shuffleArraySecure(distractors);

  // Ставим правильный ответ в равномерно распределённую случайную позицию (0, 1, 2 или 3)
  const targetPos = nextBalancedSlot(rawOpts.length);
  const finalOpts = [];
  let dPtr = 0;
  for (let i = 0; i < rawOpts.length; i++) {
    if (i === targetPos) {
      finalOpts.push(correctValue);
    } else {
      finalOpts.push(shuffledDistractors[dPtr++]);
    }
  }

  if (Array.isArray(q.options)) q.options = finalOpts;
  if (Array.isArray(q.a)) q.a = finalOpts;
  if (typeof q.correct === "number") q.correct = targetPos;
  if (typeof q.c === "number") q.c = targetPos;
  if (typeof q.answer === "number") q.answer = targetPos;
  q._balancedShuffled = true;
}

function shuffleQuestionList(list) {
  if (!Array.isArray(list)) return;
  slotBag = []; // Сбрасываем корзину для каждой главы, чтобы внутри каждой главы был ровный разброс 1–4
  list.forEach(shuffleQuestionItem);
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
      shuffleQuestionList(bank);
    } else {
      if (Array.isArray(bank.questions)) shuffleQuestionList(bank.questions);
      if (Array.isArray(bank.chapters)) {
        bank.chapters.forEach((ch) => {
          if (ch && Array.isArray(ch.questions)) shuffleQuestionList(ch.questions);
        });
      }
      if (bank.chapters && typeof bank.chapters === "object" && !Array.isArray(bank.chapters)) {
        Object.values(bank.chapters).forEach((ch) => {
          if (ch && Array.isArray(ch.questions)) shuffleQuestionList(ch.questions);
        });
      }
    }
  });

  if (Array.isArray(window.questions)) {
    shuffleQuestionList(window.questions);
  }
}

// Перехват функций регистрации глав (registerAdabChapter, registerAqeedahChapter, registerArabicChapter и др.)
function wrapChapterRegistrars() {
  const regNames = [
    "registerSiraChapter",
    "registerFiqhChapter",
    "registerTajwidChapter",
    "registerAdabChapter",
    "registerAqeedahChapter",
    "registerArabicChapter"
  ];
  regNames.forEach((fnName) => {
    const orig = window[fnName];
    if (typeof orig === "function" && !orig._wrappedForShuffle) {
      const wrapped = function (...args) {
        args.forEach((arg) => {
          if (Array.isArray(arg)) shuffleQuestionList(arg);
          else if (arg && typeof arg === "object" && Array.isArray(arg.questions)) {
            shuffleQuestionList(arg.questions);
          }
        });
        return orig.apply(this, args);
      };
      wrapped._wrappedForShuffle = true;
      window[fnName] = wrapped;
    }
  });
}

wrapChapterRegistrars();
shuffleAllLoadedBanks();
document.addEventListener("DOMContentLoaded", () => {
  wrapChapterRegistrars();
  shuffleAllLoadedBanks();
});
window.addEventListener("load", () => {
  wrapChapterRegistrars();
  shuffleAllLoadedBanks();
});
setTimeout(() => {
  wrapChapterRegistrars();
  shuffleAllLoadedBanks();
}, 120);
setTimeout(() => {
  wrapChapterRegistrars();
  shuffleAllLoadedBanks();
}, 500);
syncServerTime();
