// Единый модуль доступа, защиты таймера, оформления "Болотно-зелёное сукно" и перемешивания ответов
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

  // 2. Единая тема "Болотно-зелёное сукно" для титульной страницы и всех внутренних курсов
  const style = document.createElement("style");
  style.id = "madrasah-baize-theme";
  const patternSvg = encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">' +
    '<defs>' +
    '<pattern id="baizeWeave" width="4" height="4" patternUnits="userSpaceOnUse">' +
    '<path d="M0 0h2v2H0zm2 2h2v2H2z" fill="#1B2A20" fill-opacity="0.18"/>' +
    '</pattern>' +
    '</defs>' +
    '<rect width="80" height="80" fill="url(#baizeWeave)"/>' +
    '<g fill="none" stroke="#9AB8A1" stroke-width="0.75" stroke-opacity="0.16">' +
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
      --text-forest: #18261D;
      --text-muted-moss: #435749;
      --accent-moss: #2F523B;
    }

    html, body {
      background-color: var(--bg-baize) !important;
      background-image: url("data:image/svg+xml,${patternSvg}") !important;
      background-repeat: repeat !important;
      color: var(--text-forest) !important;
    }

    /* Прозрачные внешние обёртки внутри курсов, чтобы фон болотного сукна был виден как на титульной */
    body > .container, body > main, body > .app, body > #app, .main-container, .page-wrap {
      background: transparent !important;
      background-color: transparent !important;
      box-shadow: none !important;
    }

    /* Заголовки секций поверх болотного сукна делаем светлыми и читаемыми */
    body > .container > h1, body > .container > h2, body > main > h1, body > main > h2,
    .section-title, .part-title, .group-title {
      color: #EBF2EC !important;
      text-shadow: 0 1px 2px rgba(14, 22, 17, 0.4) !important;
    }

    /* Шапка внутри курсов — в едином стиле с баннером титульной страницы */
    header, .header, .course-header, .top-header {
      background: linear-gradient(145deg, #24362B 0%, #1C2B22 100%) !important;
      color: #F4F7F4 !important;
      border: 1px solid #55705D !important;
      border-radius: 16px !important;
      box-shadow: 0 6px 18px rgba(14, 22, 17, 0.25) !important;
    }
    header h1, header h2, header p, header span,
    .header h1, .header h2, .header p, .header span,
    .course-header h1, .course-header p {
      color: #F4F7F4 !important;
    }

    /* Карточки глав, вопросов и модальные окна — светло-шалфейные с чётким тёмным текстом */
    .card, .chapter-card, .lesson-card, .quiz-card, .question-box, .question-card,
    .modal-content, .cheatsheet-box, .cheatsheet-modal, .stats-bar, .summary-box,
    .hadith-card, .verse-card, .result-card {
      background-color: var(--card-sage) !important;
      border: 1px solid var(--border-moss) !important;
      color: var(--text-forest) !important;
      box-shadow: 0 3px 10px rgba(14, 22, 17, 0.18) !important;
    }

    .card h2, .card h3, .chapter-card h2, .chapter-card h3, .lesson-card h3,
    .question-box h2, .question-box h3, .question-text, .q-text,
    .modal-content h2, .modal-content h3, .cheatsheet-box h3 {
      color: #18261D !important;
      text-shadow: none !important;
    }

    .card p, .chapter-card p, .lesson-card p, .modal-content p, .modal-content li {
      color: #364A3D !important;
    }

    /* Кнопки вариантов ответов */
    .option-btn, .answer-btn, button.option, .options button, .answers button {
      background-color: var(--card-sage-alt) !important;
      border: 1px solid #96AC9B !important;
      color: #18261D !important;
    }
    .option-btn:hover, .answer-btn:hover, button.option:hover, .options button:hover {
      background-color: #CFDCD1 !important;
    }

    /* Блок пояснения к ответу */
    .explanation, .exp-box, .feedback, [class*="explanation"] {
      background-color: #D5E0D7 !important;
      border: 1px solid #8FA695 !important;
      color: #18261D !important;
    }

    /* Мягкая подсветка правильного и ошибочного ответа */
    .correct, .is-correct, [data-state="correct"], button.correct {
      background-color: #C4DFC7 !important;
      border-color: #467A4F !important;
      color: #132B17 !important;
    }
    .wrong, .is-wrong, [data-state="wrong"], button.wrong {
      background-color: #E8CBC7 !important;
      border-color: #A6564E !important;
      color: #3F1511 !important;
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

  // Настройка цвета шапки Telegram WebApp
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
        <div style="max-width:440px;margin:48px auto;padding:24px;background:#E5ECE6;border:1px solid #8FA695;border-radius:16px;text-align:center;font-family:system-ui,-apple-system,sans-serif;color:#18261D;box-shadow:0 6px 20px rgba(18,28,22,0.22);">
          <div style="font-size:40px;margin-bottom:12px;">🔒</div>
          <h2 style="margin:0 0 10px;font-size:20px;color:#24382B;">Доступ к курсу закрыт</h2>
          <p style="margin:0 0 18px;font-size:14px;line-height:1.5;color:#435749;">
            Ваш ID: <b>${getCurrentUserId()}</b>.<br>
            Вернитесь в главное меню, чтобы активировать ознакомительный доступ (в Telegram) или обратитесь к администратору.
          </p>
          <a href="../index.html?uid=${encodeURIComponent(getCurrentUserId())}" style="display:inline-block;padding:12px 22px;background:#2F523B;color:#F5F8F5;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">
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

// 5. Надёжное перемешивание кнопок вариантов ответа прямо при отрисовке вопроса (работает во всех 7 курсах!)
function cryptoRandInt(max) {
  if (window.crypto && window.crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    return arr[0] % max;
  }
  return Math.floor(Math.random() * max);
}

// Сбалансированная очередь позиций [0, 1, 2, 3], чтобы правильный ответ равномерно попадал во все 4 строки
let balancedSlotBag = [];
function nextBalancedSlot(count) {
  if (count !== 4) return cryptoRandInt(count);
  if (balancedSlotBag.length === 0) {
    balancedSlotBag = [0, 1, 2, 3];
    for (let i = balancedSlotBag.length - 1; i > 0; i--) {
      const j = cryptoRandInt(i + 1);
      [balancedSlotBag[i], balancedSlotBag[j]] = [balancedSlotBag[j], balancedSlotBag[i]];
    }
  }
  return balancedSlotBag.pop();
}

function shuffleRenderedOptionButtons() {
  const candidateContainers = document.querySelectorAll(
    "#options, #optionsContainer, #answers, .options, .options-list, .answers, .quiz-options"
  );

  candidateContainers.forEach((container) => {
    const buttons = Array.from(container.children).filter(
      (el) => el.tagName === "BUTTON" || el.classList.contains("option") || el.classList.contains("option-btn")
    );
    if (buttons.length < 3 || buttons.length > 5) return;

    // Не перемешиваем повторно уже отвеченный вопрос или уже перемешанный набор
    const hasAnswered = buttons.some(
      (b) => b.disabled || b.classList.contains("correct") || b.classList.contains("wrong")
    );
    if (hasAnswered) return;

    const sig = buttons.map((b) => b.textContent.trim()).sort().join("||");
    if (container.dataset.shuffledSig === sig) return;

    // Сохраняем буквенные/цифровые префиксы (если есть A) / B) / 1. / 2.)
    const prefixRegex = /^([A-DА-Г1-4][\)\.\:]\s*)/i;
    const originalPrefixes = buttons.map((b) => {
      const m = b.textContent.trim().match(prefixRegex);
      return m ? m[1] : "";
    });

    // Снимаем префиксы перед перемешиванием
    buttons.forEach((b, idx) => {
      if (originalPrefixes[idx]) {
        b.textContent = b.textContent.trim().replace(prefixRegex, "");
      }
    });

    // Перемешиваем массив кнопок с привязкой к равномерной позиции для 1-го (исходно правильного) варианта
    const targetPosForFirst = nextBalancedSlot(buttons.length);
    const others = buttons.slice(1);
    for (let i = others.length - 1; i > 0; i--) {
      const j = cryptoRandInt(i + 1);
      [others[i], others[j]] = [others[j], others[i]];
    }

    const reordered = [];
    let otherIdx = 0;
    for (let pos = 0; pos < buttons.length; pos++) {
      if (pos === targetPosForFirst) {
        reordered.push(buttons[0]);
      } else {
        reordered.push(others[otherIdx++]);
      }
    }

    // Применяем новый порядок в DOM (сохраняя все onclick и обработчики!)
    reordered.forEach((btn, newPos) => {
      if (originalPrefixes[newPos]) {
        btn.textContent = originalPrefixes[newPos] + btn.textContent.trim();
      }
      container.appendChild(btn);
    });

    container.dataset.shuffledSig = sig;
  });
}

function initOptionObserver() {
  shuffleRenderedOptionButtons();
  const observer = new MutationObserver(() => {
    shuffleRenderedOptionButtons();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initOptionObserver);
} else {
  initOptionObserver();
}
syncServerTime();
