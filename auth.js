// Чистый модуль доступа, защиты курсов и перемешивания ответов (без вмешательства в вёрстку)
const ALLOWED_USERS = {
  "859435297": ["all"]
  // Добавляйте сюда ID учеников в формате:
  // "123456789": ["all"],
  // "987654321": ["sira", "fiqh", "quran"],
};

const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000;

(function initTelegramWebApp() {
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

function getTelegramUserId() {
  try {
    const user = window.Telegram &&
      window.Telegram.WebApp &&
      window.Telegram.WebApp.initDataUnsafe &&
      window.Telegram.WebApp.initDataUnsafe.user;
    if (user && user.id) {
      return String(user.id);
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

// Синхронизация времени с сервером для защиты 24-часового триала
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
    const prev = Number(localStorage.getItem("madrasah_max_seen") || "0");
    if (nowMs > prev) {
      localStorage.setItem("madrasah_max_seen", String(nowMs));
    }
  } catch (e) {}
}

function isClockTampered() {
  try {
    const prev = Number(localStorage.getItem("madrasah_max_seen") || "0");
    const now = getTrustedNow();
    if (prev > 0 && now + 60000 < prev) {
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
    const rawStart = localStorage.getItem("madrasah_trial_start_" + uid);
    if (!rawStart) {
      return { status: "available", remainingMs: TRIAL_DURATION_MS };
    }
    const elapsed = getTrustedNow() - Number(rawStart);
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
  if (Array.isArray(perms) && (perms.includes("all") || perms.includes(courseCode))) {
    return true;
  }
  return getTrialState().status === "active";
}

function protectCoursePage(courseCode) {
  syncServerTime();
  const check = () => {
    if (!hasCourseAccess(courseCode)) {
      const uid = getCurrentUserId();
      document.body.innerHTML = `
        <div class="app-wrap">
          <div class="surface-card" style="text-align:center;margin-top:36px;padding:24px 18px;">
            <div style="font-size:40px;margin-bottom:10px;">🔒</div>
            <h2 style="margin:0 0 8px;font-size:20px;color:#1F523F;">Доступ к курсу закрыт</h2>
            <p style="margin:0 0 18px;font-size:14px;color:#435749;">
              Ваш ID: <b>${uid}</b>.<br>
              Вернитесь в главное меню, чтобы включить ознакомительный доступ (в Telegram), или передайте ваш ID администратору.
            </p>
            <a href="../index.html?uid=${encodeURIComponent(uid)}" class="btn-back">Назад</a>
          </div>
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

// Честное перемешивание вариантов ответов (Фишер — Йетс) для использования в шаблонах тестов
function shuffleAnswerOptions(options, correctIndex) {
  if (!Array.isArray(options) || options.length === 0) {
    return { options: [], correct: 0 };
  }
  const safeIdx = (typeof correctIndex === "number" && correctIndex >= 0 && correctIndex < options.length)
    ? correctIndex
    : 0;
  const items = options.map((text, idx) => ({
    text: text,
    isCorrect: idx === safeIdx
  }));

  for (let i = items.length - 1; i > 0; i--) {
    let rand = Math.random();
    try {
      if (window.crypto && window.crypto.getRandomValues) {
        const buf = new Uint32Array(1);
        window.crypto.getRandomValues(buf);
        rand = buf[0] / 4294967296;
      }
    } catch (e) {}
    const j = Math.floor(rand * (i + 1));
    const tmp = items[i];
    items[i] = items[j];
    items[j] = tmp;
  }

  return {
    options: items.map((item) => item.text),
    correct: items.findIndex((item) => item.isCorrect)
  };
}

syncServerTime();
