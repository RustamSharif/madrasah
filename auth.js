// Единый файл управления доступом ко всем тренажёрам
// Коды курсов: "sira" (Сира), "nawawi" (40 хадисов), "fiqh" (Фикх), "tajweed" (Таджвид), "adab" (Адаб и ахляк), "all" (полный доступ)

const ADMIN_CONTACT = "@Rustam_abu_Aisha";

const USER_ACCESS = {
  // Раскомментируйте строчку ниже (уберите //), чтобы вернуть себе постоянный доступ:
  "859435297": ["all"],
  "806762570": ["all"],
};

const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000; // 24 часа

// --- СЕРВЕРНОЕ ВРЕМЯ И ЗАЩИТА ОТ ПЕРЕВОДА ЧАСОВ ---
let serverTimeOffsetMs = 0;
let serverTimeSynced = false;

function getTrustedNow() {
  const rawNow = Date.now() + serverTimeOffsetMs;
  try {
    const maxSeen = Number(localStorage.getItem("madrasah_max_seen_time") || "0");
    if (rawNow > maxSeen) {
      localStorage.setItem("madrasah_max_seen_time", String(rawNow));
      return rawNow;
    }
    return maxSeen;
  } catch (e) {
    return rawNow;
  }
}

async function syncTrustedTime() {
  try {
    const resp = await fetch(window.location.href.split("?")[0] + "?t=" + Date.now(), {
      method: "HEAD",
      cache: "no-store"
    });
    const dateHeader = resp.headers.get("Date");
    if (dateHeader) {
      const serverMs = new Date(dateHeader).getTime();
      if (!isNaN(serverMs) && serverMs > 1700000000000) {
        serverTimeOffsetMs = serverMs - Date.now();
        serverTimeSynced = true;
        getTrustedNow();
      }
    }
  } catch (e) {
    // Если нет сети, работает защита через maxSeenTime
  }
}

// Запускаем сверку времени сразу при загрузке
syncTrustedTime();

// --- ОПРЕДЕЛЕНИЕ ID ПОЛЬЗОВАТЕЛЯ ---
function getCurrentTelegramId() {
  try {
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.ready();
      const user = window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user;
      if (user && user.id) {
        const tgId = String(user.id).trim();
        try { localStorage.setItem("madrasah_saved_id", tgId); } catch (e) {}
        return tgId;
      }
    }
  } catch (e) {}

  const params = new URLSearchParams(window.location.search);
  if (params.get("id")) {
    const urlId = String(params.get("id")).trim();
    try { localStorage.setItem("madrasah_saved_id", urlId); } catch (e) {}
    return urlId;
  }

  try {
    const saved = localStorage.getItem("madrasah_saved_id");
    if (saved) return String(saved).trim();
  } catch (e) {}

  return null;
}

function setManualUserId(id) {
  const clean = String(id || "").trim();
  if (!clean) return null;
  try { localStorage.setItem("madrasah_saved_id", clean); } catch (e) {}
  return clean;
}

// --- УПРАВЛЕНИЕ ТРИАЛОМ (24 ЧАСА) ---
function getTrialKey(userId) {
  return "madrasah_trial_start_" + (userId || "guest");
}

function getTrialState(userId) {
  const key = getTrialKey(userId);
  let startStr = null;
  try {
    startStr = localStorage.getItem(key);
  } catch (e) {}

  if (!startStr) {
    return { status: "available", remainingMs: TRIAL_DURATION_MS };
  }

  const startMs = Number(startStr);
  if (isNaN(startMs) || startMs <= 0) {
    return { status: "available", remainingMs: TRIAL_DURATION_MS };
  }

  const now = getTrustedNow();
  const elapsed = now - startMs;
  const remaining = TRIAL_DURATION_MS - elapsed;

  if (remaining > 0) {
    return { status: "active", remainingMs: remaining, expiresAt: startMs + TRIAL_DURATION_MS };
  }
  return { status: "expired", remainingMs: 0 };
}

function activateTrial(userId) {
  const state = getTrialState(userId);
  if (state.status !== "available") return false;
  const key = getTrialKey(userId);
  const now = getTrustedNow();
  try {
    localStorage.setItem(key, String(now));
    return true;
  } catch (e) {
    return false;
  }
}

function formatRemainingTime(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(hrs)} ч ${pad(mins)} мин ${pad(secs)} сек`;
}

// --- ПРОВЕРКА ДОСТУПА ---
function hasPermanentAccess(userId, courseCode) {
  if (!userId) return false;
  const record = USER_ACCESS[String(userId).trim()];
  if (!record) return false;

  if (Array.isArray(record)) {
    return record.includes("all") || record.includes(courseCode);
  }
  if (typeof record === "object" && Array.isArray(record.courses)) {
    if (record.expires) {
      const expMs = new Date(record.expires).getTime();
      if (!isNaN(expMs) && getTrustedNow() > expMs) return false;
    }
    return record.courses.includes("all") || record.courses.includes(courseCode);
  }
  return false;
}

function hasAccess(userId, courseCode) {
  if (hasPermanentAccess(userId, courseCode)) return true;
  const trial = getTrialState(userId);
  return trial.status === "active";
}

function checkCourseAccess(courseCode) {
  const userId = getCurrentTelegramId();
  return hasAccess(userId, courseCode);
}

// --- ВЕРХНЯЯ ПЛАШКА ТАЙМЕРА НА ВНУТРЕННИХ СТРАНИЦАХ ---
function mountFloatingTrialBar(userId) {
  if (hasPermanentAccess(userId, "all")) return;
  const state = getTrialState(userId);
  if (state.status !== "active") return;

  const inject = () => {
    if (document.getElementById("madrasah-floating-trial")) return;
    const bar = document.createElement("div");
    bar.id = "madrasah-floating-trial";
    bar.style.cssText = "background:#fef9e7;border-bottom:1px solid #e6c875;color:#7a5901;font-family:sans-serif;font-size:13px;padding:7px 12px;text-align:center;position:sticky;top:0;z-index:9999;";
    document.body.insertBefore(bar, document.body.firstChild);

    const tick = () => {
      const st = getTrialState(userId);
      if (st.status !== "active") {
        window.location.reload();
        return;
      }
      bar.innerHTML = `⏳ <strong>Пробный доступ (24 ч)</strong> • Осталось: <strong>${formatRemainingTime(st.remainingMs)}</strong>`;
    };
    tick();
    setInterval(tick, 1000);
  };

  if (document.body) inject();
  else document.addEventListener("DOMContentLoaded", inject);
}

// --- ЗАЩИТА СТРАНИЦЫ ТРЕНАЖЁРА ---
function protectCoursePage(courseCode, courseTitle) {
  const userId = getCurrentTelegramId();

  if (checkCourseAccess(courseCode)) {
    mountFloatingTrialBar(userId);
    return true;
  }

  const trial = getTrialState(userId);

  document.addEventListener("DOMContentLoaded", () => {
    const trialBlock = trial.status === "available"
      ? `<div style="background:#fef9e7;border:1px solid #e6c875;border-radius:10px;padding:12px;margin-bottom:14px;">
           <div style="font-size:0.9rem;color:#7a5901;margin-bottom:8px;">🎁 Вы можете бесплатно протестировать все тренажёры в течение 24 часов:</div>
           <button onclick="if(activateTrial('${userId || "guest"}')){window.location.reload();}" style="background:#d99b26;color:#fff;border:none;padding:9px 16px;border-radius:8px;font-size:0.92rem;font-weight:600;cursor:pointer;">Включить 24 часа бесплатно →</button>
         </div>`
      : (trial.status === "expired"
          ? `<div style="background:#fdf2f2;border:1px solid #e5b7b7;border-radius:10px;padding:10px;margin-bottom:14px;font-size:0.85rem;color:#8a2c2c;">⌛ Ознакомительный доступ на 24 часа завершён.</div>`
          : "");

    document.body.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f4efe6;font-family:sans-serif;padding:20px;">
        <div style="max-width:420px;width:100%;background:#ffffff;border:1px solid #bfd6c7;border-radius:16px;padding:24px;text-align:center;box-shadow:0 6px 20px rgba(0,0,0,0.08);">
          <div style="font-size:42px;margin-bottom:10px;">🔒</div>
          <h2 style="color:#15603e;margin:0 0 10px 0;font-size:1.25rem;">Доступ к тренажёру закрыт</h2>
          <p style="color:#4b6658;font-size:0.95rem;line-height:1.5;margin:0 0 14px 0;">
            Доступ к курсу <strong>«${courseTitle}»</strong> пока не активирован для вашего аккаунта.
          </p>
          ${trialBlock}
          <div style="background:#eef5f0;border:1px dashed #15603e;border-radius:10px;padding:12px;margin-bottom:14px;">
            <div style="font-size:0.8rem;color:#4b6658;margin-bottom:4px;">Ваш персональный ID:</div>
            <div id="userIdBox" style="font-size:1.2rem;font-weight:700;color:#1b2e24;letter-spacing:1px;">
              ${userId || "Не определён"}
            </div>
          </div>
          ${userId ? `<button onclick="navigator.clipboard.writeText('${userId}');this.textContent='Скопировано ✓'" style="background:#15603e;color:#fff;border:none;padding:10px 18px;border-radius:8px;font-size:0.95rem;cursor:pointer;margin-bottom:10px;">📋 Скопировать мой ID</button>` : ""}
          <p style="color:#4b6658;font-size:0.85rem;margin:8px 0 0 0;">
            Отправьте этот ID администратору (<strong>${ADMIN_CONTACT}</strong>) для открытия доступа.
          </p>
          <div style="margin-top:14px;">
            <a href="../index.html${userId ? "?id=" + encodeURIComponent(userId) : ""}" style="color:#15603e;font-size:0.9rem;text-decoration:none;font-weight:600;">← Вернуться в каталог курсов</a>
          </div>
        </div>
      </div>
    `;
  });
  return false;
}
