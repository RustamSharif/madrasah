// Единый лёгкий модуль доступа, перемешивания ответов и оформления "Болотно-зелёное сукно"
const ALLOWED_USERS = {
  "859435297": ["all"]
  // Добавляйте сюда ID братьев в формате:
  // "123456789": ["all"],
  // "987654321": ["sira", "fiqh", "quran"],
};

const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000;

(function () {
  // 1. Сброс старых настроек ночной темы
  try {
    localStorage.removeItem("theme");
    localStorage.removeItem("darkMode");
    localStorage.removeItem("madrasah_theme");
    document.documentElement.classList.remove("dark", "dark-mode", "night");
  } catch (e) {}

  // 2. Единая палитра "Болотно-зелёное сукно" (эталон "Акыды")
  const style = document.createElement("style");
  style.id = "madrasah-baize-theme";
  const patternSvg = encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">' +
    '<defs><pattern id="w" width="4" height="4" patternUnits="userSpaceOnUse">' +
    '<path d="M0 0h2v2H0zm2 2h2v2H2z" fill="#18261D" fill-opacity="0.16"/></pattern></defs>' +
    '<rect width="80" height="80" fill="url(#w)"/>' +
    '<g fill="none" stroke="#9AB8A1" stroke-width="0.75" stroke-opacity="0.15">' +
    '<polygon points="40,4 50,16 66,14 64,30 76,40 64,50 66,66 50,64 40,76 30,64 14,66 16,50 4,40 16,30 14,14 30,16"/>' +
    '<circle cx="40" cy="40" r="14"/></g></svg>'
  );

  style.textContent = `
    html, body {
      background-color: #364B3D !important;
      background-image: url("data:image/svg+xml,${patternSvg}") !important;
      background-repeat: repeat !important;
      color: #1A281F !important;
    }

    /* Прозрачные внешние обёртки, чтобы сукно было видно вокруг карточек */
    .container, .main-container, .wrapper, .app-container, main {
      background: transparent !important;
      box-shadow: none !important;
    }

    /* Изумрудно-болотная шапка курсов без лишних светлых полос */
    header, .header, .course-header, .hero-header {
      background: linear-gradient(145deg, #1F523F 0%, #183E30 100%) !important;
      color: #F4F7F4 !important;
      border: 1px solid #48735E !important;
      border-radius: 16px !important;
    }
    header *, .header *, .course-header *, .hero-header * {
      color: #F4F7F4 !important;
    }
    header > div, .header > div, .course-header > div, .stats-row, .header-stats, .badges-row {
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
    }
    .stat-badge, .badge-pill, .meta-pill, header span[class*="badge"], .header span[class*="stat"] {
      background: rgba(255, 255, 255, 0.14) !important;
      border: 1px solid rgba(255, 255, 255, 0.22) !important;
      color: #F4F7F4 !important;
    }

    /* Матовые светло-шалфейные карточки глав, вопросов и хадисов */
    .card, .chapter-card, .module-card, .quiz-card, .question-box, .question-card,
    .modal-content, .cheatsheet-box, .progress-card, .hadith-card, #hadithCard,
    .audio-controls, .player-box {
      background-color: #E5ECE6 !important;
      border: 1px solid #8FA695 !important;
      color: #1A281F !important;
    }

    /* Контрастный светлый аудиоплеер в "40 хадисах" */
    audio, .audio-player {
      color-scheme: light !important;
      background-color: #F2F6F3 !important;
      border-radius: 10px !important;
    }

    /* Варианты ответов */
    .option-btn, .answer-btn, button.option {
      background-color: #DCE5DD !important;
      border: 1px solid #9BB0A0 !important;
      color: #1A281F !important;
    }
    .option-btn:hover, .answer-btn:hover, button.option:hover {
      background-color: #D0DDD2 !important;
    }

    .explanation, .exp-box {
      background-color: #D6E1D8 !important;
      border: 1px solid #8FA695 !important;
      color: #1A281F !important;
    }

    /* Спокойная подсветка ответов */
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

    /* Скрытие старых переключателей темы и лишних кнопок в "40 хадисах" */
    #themeToggle, .theme-toggle, .theme-btn, [onclick*="toggleTheme"],
    [onclick*="exportData"], [onclick*="importData"], [onclick*="exportPDF"],
    [onclick*="generatePDF"], button[title*="тема" i], button[title*="PDF" i] {
      display: none !important;
    }
  `;
  document.head.appendChild(style);

  // Очистка упоминаний медресе из заголовка вкладки
  function cleanTitle() {
    if (document.title && /галия|медресе/i.test(document.title)) {
      document.title = document.title
        .replace(/медресе\s*[«"']?галия[»"']?\s*[—–-]?\s*/gi, "")
        .trim() || "Интерактивная библиотека знаний";
    }
  }
  cleanTitle();
  document.addEventListener("DOMContentLoaded", cleanTitle);

  try {
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.ready();
      if (window.Telegram.WebApp.setHeaderColor) window.Telegram.WebApp.setHeaderColor("#1F523F");
      if (window.Telegram.WebApp.setBackgroundColor) window.Telegram.WebApp.setBackgroundColor("#364B3D");
    }
  } catch (e) {}
})();

// 3. Определение ID пользователя и среды запуска
function getTelegramUserId() {
  try {
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe &&
        window.Telegram.WebApp.initDataUnsafe.user && window.Telegram.WebApp.initDataUnsafe.user.id) {
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
    if (saved && /^\d+$/.test(saved.trim())) return saved.trim();
  } catch (e) {}
  return "guest";
}

// 4. Защищённый 24-часовой триал (только внутри официального Telegram)
let serverTimeOffsetMs = 0;

function syncServerTime() {
  try {
    fetch(window.location.pathname + "?ping=" + Date.now(), { method: "HEAD", cache: "no-store" })
      .then((res) => {
        const d = res.headers.get("Date");
        if (d) {
          const ms = new Date(d).getTime();
          if (!isNaN(ms)) {
            serverTimeOffsetMs = ms - Date.now();
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
    if (nowMs > prevMax) localStorage.setItem("madrasah_max_seen", String(nowMs));
  } catch (e) {}
}

function isClockTampered() {
  try {
    const prevMax = Number(localStorage.getItem("madrasah_max_seen") || "0");
    const now = getTrustedNow();
    if (prevMax > 0 && now + 60000 < prevMax) return true;
    updateMaxSeenTime(now);
  } catch (e) {}
  return false;
}

function getTrialState() {
  const uid = getCurrentUserId();
  if (!isInsideTelegram() || uid === "guest") return { status: "unavailable", remainingMs: 0 };
  if (isClockTampered()) return { status: "expired", remainingMs: 0 };
  try {
    const rawStart = localStorage.getItem("madrasah_trial_start_" + uid);
    if (!rawStart) return { status: "available", remainingMs: TRIAL_DURATION_MS };
    const elapsed = getTrustedNow() - Number(rawStart);
    if (elapsed >= TRIAL_DURATION_MS || elapsed < -60000) return { status: "expired", remainingMs: 0 };
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
  if (Array.isArray(perms) && (perms.includes("all") || perms.includes(courseCode))) return true;
  return getTrialState().status === "active";
}

function protectCoursePage(courseCode) {
  syncServerTime();
  const check = () => {
    if (!hasCourseAccess(courseCode)) {
      document.body.innerHTML = `
        <div style="max-width:440px;margin:48px auto;padding:24px;background:#E5ECE6;border:1px solid #8FA695;border-radius:16px;text-align:center;font-family:system-ui,-apple-system,sans-serif;color:#1A281F;">
          <div style="font-size:40px;margin-bottom:12px;">🔒</div>
          <h2 style="margin:0 0 10px;font-size:20px;color:#1F523F;">Доступ к курсу закрыт</h2>
          <p style="margin:0 0 18px;font-size:14px;line-height:1.5;color:#435749;">
            Ваш ID: <b>${getCurrentUserId()}</b>.<br>
            Вернитесь в главное меню, чтобы активировать ознакомительный доступ (в Telegram) или обратитесь к администратору.
          </p>
          <a href="../index.html?uid=${encodeURIComponent(getCurrentUserId())}" style="display:inline-block;padding:12px 22px;background:#1F523F;color:#F5F8F5;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">
            Назад
          </a>
        </div>
      `;
    }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", check);
  else check();
}
window.checkAccess = protectCoursePage;

// 5. Однократная унификация кнопок ("Назад" и "📝 Открыть" без стрелок) без циклов
function polishCourseButtonsOnce() {
  const uid = getCurrentUserId();
  document.querySelectorAll("a, button").forEach((el) => {
    if (el.dataset.madrasahPolished) return;
    const txt = (el.textContent || "").trim();

    if (/все курсы|к списку/i.test(txt)) {
      el.textContent = "Назад";
      el.style.cssText =
        "display:inline-flex;align-items:center;justify-content:center;padding:8px 16px;" +
        "background:#E5ECE6;color:#1A281F;border:1px solid #8FA695;border-radius:20px;" +
        "font-weight:600;font-size:13px;text-decoration:none;cursor:pointer;";
      if (el.tagName === "A") {
        el.href = "../index.html?uid=" + encodeURIComponent(uid);
      }
      el.dataset.madrasahPolished = "1";
    } else if (/^открыть\s*→?$/i.test(txt)) {
      el.textContent = "📝 Открыть";
      el.style.cssText =
        "display:inline-flex;align-items:center;gap:6px;padding:9px 15px;" +
        "background:#1F523F;color:#F5F8F5;border:none;border-radius:10px;" +
        "font-weight:600;font-size:13px;text-decoration:none;cursor:pointer;";
      el.dataset.madrasahPolished = "1";
    } else if (/^тест\s*→?$/i.test(txt)) {
      el.textContent = "📝 Тест";
      el.dataset.madrasahPolished = "1";
    }
  });
}

// 6. Сбалансированное перемешивание вариантов ответов (1–4 строка) один раз на вопрос
let shuffleSlotCounter = 0;

function shuffleQuestionItem(q) {
  if (!q || q._shuffled) return;
  const opts = Array.isArray(q.options) ? q.options : Array.isArray(q.a) ? q.a : null;
  if (!opts || opts.length < 2) return;

  let origIdx =
    typeof q.correct === "number" ? q.correct :
    typeof q.c === "number" ? q.c :
    typeof q.answer === "number" ? q.answer : 0;
  if (origIdx < 0 || origIdx >= opts.length) origIdx = 0;

  const correctValue = opts[origIdx];
  const others = opts.filter((_, i) => i !== origIdx);

  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }

  const targetSlot = (shuffleSlotCounter + Math.floor(Math.random() * opts.length)) % opts.length;
  shuffleSlotCounter++;

  const newOpts = [];
  let otherPtr = 0;
  for (let i = 0; i < opts.length; i++) {
    if (i === targetSlot) {
      newOpts.push(correctValue);
    } else {
      newOpts.push(others[otherPtr++]);
    }
  }

  if (Array.isArray(q.options)) q.options = newOpts;
  if (Array.isArray(q.a)) q.a = newOpts;
  if (typeof q.correct === "number") q.correct = targetSlot;
  if (typeof q.c === "number") q.c = targetSlot;
  if (typeof q.answer === "number") q.answer = targetSlot;
  q._shuffled = true;
}

function shuffleAllLoadedBanks() {
  const names = [
    "SIRO_DATA", "SIRA_DATA", "HADITH_DATA", "NAWAWI_DATA",
    "FIQH_DATA", "TAJWID_DATA", "ADAB_DATA", "AQEEDAH_DATA", "ARABIC_DATA"
  ];
  names.forEach((name) => {
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

document.addEventListener("DOMContentLoaded", () => {
  shuffleAllLoadedBanks();
  polishCourseButtonsOnce();
  setTimeout(() => {
    shuffleAllLoadedBanks();
    polishCourseButtonsOnce();
  }, 350);
});
syncServerTime();
