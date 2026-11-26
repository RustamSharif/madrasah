// Единый модуль доступа, перемешивания ответов и компактного переключателя экрана
const ALLOWED_USERS = {
  "859435297": ["all"]
  // Добавляйте сюда ID братьев в формате:
  // "123456789": ["all"],
  // "987654321": ["sira", "fiqh", "quran"],
};

const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000;

// 1. Определение ID пользователя и среды запуска
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
    const urlUid = params.get("uid") || params.get("id");
    if (urlUid && /^\d+$/.test(urlUid.trim())) {
      localStorage.setItem("madrasah_uid", urlUid.trim());
      return urlUid.trim();
    }
    const saved = localStorage.getItem("madrasah_uid");
    if (saved && /^\d+$/.test(saved.trim())) return saved.trim();
  } catch (e) {}
  return "guest";
}

// 2. Защищённый 24-часовой триал (только внутри официального Telegram)
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

// 3. Честное сбалансированное перемешивание вариантов ответа (1–4)
let _shuffleCounter = 0;
function shuffleAnswerOptions(optionsArray, correctIndex) {
  if (!Array.isArray(optionsArray) || optionsArray.length < 2) {
    return { options: optionsArray || [], correct: 0 };
  }
  const safeCorrect = (typeof correctIndex === "number" && correctIndex >= 0 && correctIndex < optionsArray.length)
    ? correctIndex : 0;

  const items = optionsArray.map((text, idx) => ({
    text: text,
    isCorrect: idx === safeCorrect
  }));

  const wrongItems = items.filter((it) => !it.isCorrect);
  const correctItem = items.find((it) => it.isCorrect);

  for (let i = wrongItems.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [wrongItems[i], wrongItems[j]] = [wrongItems[j], wrongItems[i]];
  }

  const targetSlot = (_shuffleCounter + Math.floor(Math.random() * items.length)) % items.length;
  _shuffleCounter++;

  const resultOptions = [];
  let wPtr = 0;
  for (let i = 0; i < items.length; i++) {
    if (i === targetSlot) {
      resultOptions.push(correctItem.text);
    } else {
      resultOptions.push(wrongItems[wPtr++].text);
    }
  }

  return {
    options: resultOptions,
    correct: targetSlot
  };
}

// 4. Компактный кругляшок с пунктирным квадратиком внутри (разворачивание / сворачивание окна)
const ICON_EXPAND_SVG = `
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1A281F" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
    <path d="M8 3H5a2 2 0 0 0-2 2v3"/>
    <path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
    <path d="M3 16v3a2 2 0 0 0 2 2h3"/>
    <path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
    <rect x="7" y="7" width="10" height="10" rx="1.5" stroke-dasharray="2.5 2.5" stroke-width="1.6"/>
  </svg>
`;

const ICON_COLLAPSE_SVG = `
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1A281F" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 14h6v6"/>
    <path d="M20 10h-6V4"/>
    <path d="M14 10l7-7"/>
    <path d="M3 21l7-7"/>
  </svg>
`;

function isWindowExpanded() {
  try {
    if (window.Telegram && window.Telegram.WebApp && typeof window.Telegram.WebApp.isFullscreen === "boolean") {
      if (window.Telegram.WebApp.isFullscreen) return true;
    }
  } catch (e) {}
  return Boolean(document.fullscreenElement || document.webkitFullscreenElement);
}

function updateToggleCircleIcon() {
  const btn = document.getElementById("madrasahScreenToggleBtn");
  if (!btn) return;
  const expanded = isWindowExpanded();
  btn.innerHTML = expanded ? ICON_COLLAPSE_SVG : ICON_EXPAND_SVG;
  btn.title = expanded ? "Свернуть окно" : "Развернуть на весь экран";
  btn.setAttribute("aria-label", btn.title);
}

function toggleWindowScreen() {
  const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  const expanded = isWindowExpanded();

  if (expanded) {
    // Сворачиваем обратно
    try {
      if (tg && typeof tg.exitFullscreen === "function") {
        tg.exitFullscreen();
      }
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitFullscreenElement && document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    } catch (e) {}
    setTimeout(updateToggleCircleIcon, 150);
    return;
  }

  // Разворачиваем на весь экран
  if (tg) {
    try {
      if (typeof tg.expand === "function") tg.expand();
      if (typeof tg.requestFullscreen === "function") {
        tg.requestFullscreen();
      }
    } catch (e) {}

    setTimeout(() => {
      updateToggleCircleIcon();
      // Если клиент Telegram на ПК не поддерживает полноэкранный режим, открываем во весь экран в браузере
      if (!isWindowExpanded() && window.innerWidth < 520) {
        const uid = getCurrentUserId();
        const url = new URL(window.location.href);
        if (uid && uid !== "guest") url.searchParams.set("uid", uid);
        if (typeof tg.openLink === "function") {
          tg.openLink(url.toString());
        } else {
          window.open(url.toString(), "_blank");
        }
      }
    }, 350);
  } else {
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      }
    } catch (e) {}
    setTimeout(updateToggleCircleIcon, 150);
  }
}

function injectScreenToggleCircle() {
  if (document.getElementById("madrasahScreenToggleBtn")) return;

  const targetBar = document.querySelector(".top-bar, .top-nav, .topbar");
  if (!targetBar) return;

  const btn = document.createElement("button");
  btn.id = "madrasahScreenToggleBtn";
  btn.type = "button";
  btn.style.cssText = [
    "width:34px",
    "height:34px",
    "min-width:34px",
    "min-height:34px",
    "padding:0",
    "border-radius:50%",
    "background:#DCE5DD",
    "border:1px solid #8FA695",
    "display:inline-flex",
    "align-items:center",
    "justify-content:center",
    "cursor:pointer",
    "flex-shrink:0",
    "box-shadow:0 1px 4px rgba(14,22,17,0.12)",
    "transition:transform 0.12s ease, background-color 0.15s ease"
  ].join(";");

  btn.addEventListener("click", toggleWindowScreen);
  targetBar.appendChild(btn);
  updateToggleCircleIcon();
}

// 5. Инициализация при загрузке
(function initPlatform() {
  syncServerTime();
  try {
    if (window.Telegram && window.Telegram.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      if (typeof tg.expand === "function") tg.expand();
      if (typeof tg.setHeaderColor === "function") tg.setHeaderColor("#1F523F");
      if (typeof tg.setBackgroundColor === "function") tg.setBackgroundColor("#364B3D");
      if (typeof tg.onEvent === "function") {
        tg.onEvent("fullscreenChanged", updateToggleCircleIcon);
      }
    }
  } catch (e) {}

  document.addEventListener("fullscreenchange", updateToggleCircleIcon);
  document.addEventListener("webkitfullscreenchange", updateToggleCircleIcon);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectScreenToggleCircle);
  } else {
    injectScreenToggleCircle();
  }
})();
