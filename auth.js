// Единый файл управления доступом, защищённым триал-таймером и входом вне Telegram
// Коды курсов: "sira" (Сира), "nawawi" (40 хадисов), "fiqh" (Фикх), "tajweed" (Таджвид), "adab" (Адаб), "all" (полный доступ)

const ADMIN_CONTACT = "@Rustam_abu_Aisha";

const USER_ACCESS = {
  "859435297": ["all"],
  "806762570": ["all"],
  // Пример ручного временного доступа до конкретной даты:
  // "123456789": { courses: ["all"], expires: "2026-12-01T23:59:59" },
};

const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000; // Ровно 24 часа
const STORAGE_KEYS = {
  MANUAL_ID: "madrasah_manual_id_v1",
  TRIAL_PREFIX: "madrasah_trial_start_v2_",
  MAX_TIME: "madrasah_max_seen_time_v1",
  WELCOMED: "madrasah_trial_welcomed_v1"
};

let serverTimeOffset = 0;
let serverTimeSynced = false;

// --- 1. ЗАЩИТА ОТ ПЕРЕВОДА СИСТЕМНЫХ ЧАСОВ ---
function getTrustedNow() {
  const localNow = Date.now() + serverTimeOffset;
  let maxSeen = 0;
  try {
    maxSeen = Number(localStorage.getItem(STORAGE_KEYS.MAX_TIME) || "0");
  } catch (e) {}

  // Если системные часы отмотали назад больше чем на 1 минуту от уже зафиксированного времени
  if (maxSeen > 0 && localNow < maxSeen - 60000) {
    return maxSeen + 60000;
  }

  const trusted = Math.max(localNow, maxSeen);
  try {
    localStorage.setItem(STORAGE_KEYS.MAX_TIME, String(trusted));
  } catch (e) {}
  return trusted;
}

// Синхронизация с мировым временем серверов GitHub (невозможно подделать на телефоне)
function syncServerTime() {
  if (serverTimeSynced) return Promise.resolve(getTrustedNow());
  return new Promise((resolve) => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      resolve(getTrustedNow());
    }, 1500);

    fetch(window.location.pathname + "?ping=" + Date.now(), {
      method: "HEAD",
      cache: "no-store",
      signal: controller.signal
    })
      .then((res) => {
        clearTimeout(timer);
        const dateHeader = res.headers.get("Date");
        if (dateHeader) {
          const srvMs = Date.parse(dateHeader);
          if (!isNaN(srvMs)) {
            serverTimeOffset = srvMs - Date.now();
            serverTimeSynced = true;
            try {
              const prevMax = Number(localStorage.getItem(STORAGE_KEYS.MAX_TIME) || "0");
              if (srvMs > prevMax) {
                localStorage.setItem(STORAGE_KEYS.MAX_TIME, String(srvMs));
              }
            } catch (e) {}
          }
        }
        resolve(getTrustedNow());
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(getTrustedNow());
      });
  });
}

// --- 2. ОПРЕДЕЛЕНИЕ ID (TELEGRAM ИЛИ ОБЫЧНЫЙ БРАУЗЕР) ---
function isInsideTelegram() {
  try {
    return Boolean(
      window.Telegram &&
      window.Telegram.WebApp &&
      window.Telegram.WebApp.initDataUnsafe &&
      window.Telegram.WebApp.initDataUnsafe.user &&
      window.Telegram.WebApp.initDataUnsafe.user.id
    );
  } catch (e) {
    return false;
  }
}

function getCurrentTelegramId() {
  try {
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.ready();
      const user = window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user;
      if (user && user.id) {
        return String(user.id);
      }
    }
  } catch (e) {}

  // Проверяем параметр ?id=... в ссылке
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("id")) {
      const urlId = String(params.get("id")).trim();
      if (urlId) {
        localStorage.setItem(STORAGE_KEYS.MANUAL_ID, urlId);
        return urlId;
      }
    }
  } catch (e) {}

  // Резерв для обычного браузера (Chrome / Яндекс Браузер без Telegram и VPN)
  try {
    const savedId = localStorage.getItem(STORAGE_KEYS.MANUAL_ID);
    if (savedId && savedId.trim()) {
      return savedId.trim();
    }
  } catch (e) {}

  return null;
}

function setManualAuthId(rawId) {
  const clean = String(rawId || "").trim();
  if (!clean) return false;
  try {
    localStorage.setItem(STORAGE_KEYS.MANUAL_ID, clean);
  } catch (e) {}
  return true;
}

function clearManualAuthId() {
  try {
    localStorage.removeItem(STORAGE_KEYS.MANUAL_ID);
  } catch (e) {}
}

// --- 3. ЛОГИКА ПРОБНОГО 24-ЧАСОВОГО ДОСТУПА ---
function getTrialKey(userId) {
  return STORAGE_KEYS.TRIAL_PREFIX + (userId ? String(userId).trim() : "browser_guest");
}

function getTrialStartTime(userId) {
  try {
    const val = localStorage.getItem(getTrialKey(userId));
    return val ? Number(val) : null;
  } catch (e) {
    return null;
  }
}

function isTrialUsed(userId) {
  return getTrialStartTime(userId) !== null;
}

function getTrialRemainingMs(userId) {
  const start = getTrialStartTime(userId);
  if (!start) return 0;
  const elapsed = getTrustedNow() - start;
  const remaining = TRIAL_DURATION_MS - elapsed;
  return remaining > 0 ? remaining : 0;
}

function isTrialActive(userId) {
  return getTrialRemainingMs(userId) > 0;
}

function activateTrial(userId) {
  const uid = userId || getCurrentTelegramId() || "browser_guest";
  if (isTrialUsed(uid)) return false;
  try {
    const now = getTrustedNow();
    localStorage.setItem(getTrialKey(uid), String(now));
    localStorage.setItem(STORAGE_KEYS.WELCOMED, "1");
    return true;
  } catch (e) {
    return false;
  }
}

// --- 4. ПРОВЕРКА ПРАВ НА КУРС ---
function hasPermanentOrTimedAccess(userId, courseCode) {
  if (!userId) return false;
  const entry = USER_ACCESS[String(userId).trim()];
  if (!entry) return false;

  if (Array.isArray(entry)) {
    return entry.includes("all") || entry.includes(courseCode);
  }

  if (typeof entry === "object" && Array.isArray(entry.courses)) {
    if (entry.expires) {
      const expMs = Date.parse(entry.expires);
      if (!isNaN(expMs) && getTrustedNow() > expMs) {
        return false;
      }
    }
    return entry.courses.includes("all") || entry.courses.includes(courseCode);
  }
  return false;
}

function hasAccess(userId, courseCode) {
  const uid = userId || getCurrentTelegramId();
  if (hasPermanentOrTimedAccess(uid, courseCode)) return true;
  if (isTrialActive(uid)) return true;
  return false;
}

function checkCourseAccess(courseCode) {
  return hasAccess(getCurrentTelegramId(), courseCode);
}

// --- 5. ЖИВОЙ ТАЙМЕР ТРИАЛА В ВЕРХНЕЙ ЧАСТИ ЭКРАНА ---
function formatDuration(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(h)} ч ${pad(m)} мин ${pad(s)} сек`;
}

function mountTrialBanner() {
  const uid = getCurrentTelegramId();
  if (hasPermanentOrTimedAccess(uid, "all")) return;
  if (!isTrialActive(uid)) return;

  const render = () => {
    if (!document.body) return;
    let bar = document.getElementById("madrasah-trial-bar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "madrasah-trial-bar";
      bar.style.cssText = [
        "position:sticky",
        "top:0",
        "z-index:9999",
        "background:linear-gradient(90deg,#15603e,#1e7e52)",
        "color:#ffffff",
        "text-align:center",
        "padding:9px 12px",
        "font-family:sans-serif",
        "font-size:0.88rem",
        "font-weight:600",
        "box-shadow:0 2px 10px rgba(0,0,0,0.18)",
        "letter-spacing:0.2px"
      ].join(";");
      document.body.insertBefore(bar, document.body.firstChild);
    }

    const rem = getTrialRemainingMs(uid);
    if (rem <= 0) {
      bar.style.background = "#8b2635";
      bar.textContent = "⏳ Пробный 24-часовой доступ завершён. Обновление...";
      setTimeout(() => window.location.reload(), 1200);
      return;
    }
    bar.innerHTML = `⏳ Пробный доступ (24 ч) &bull; Осталось: <span style="font-variant-numeric:tabular-nums;background:rgba(0,0,0,0.22);padding:2px 7px;border-radius:6px;">${formatDuration(rem)}</span>`;
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
  setInterval(render, 1000);
}

// --- 6. ПРИВЕТСТВЕННОЕ ОКНО ТРИАЛА ПРИ ПЕРВОМ ВХОДЕ ---
function showWelcomeTrialModalIfNeeded() {
  const uid = getCurrentTelegramId();
  if (hasPermanentOrTimedAccess(uid, "all")) return;
  if (isTrialUsed(uid)) return;

  try {
    if (sessionStorage.getItem(STORAGE_KEYS.WELCOMED) === "1") return;
  } catch (e) {}

  const createModal = () => {
    if (!document.body || document.getElementById("madrasah-welcome-modal")) return;
    const overlay = document.createElement("div");
    overlay.id = "madrasah-welcome-modal";
    overlay.style.cssText = "position:fixed;inset:0;z-index:10000;background:rgba(15,28,21,0.72);display:flex;align-items:center;justify-content:center;padding:18px;font-family:sans-serif;";
    overlay.innerHTML = `
      <div style="max-width:410px;width:100%;background:#ffffff;border:2px solid #c5a059;border-radius:18px;padding:24px;text-align:center;box-shadow:0 12px 32px rgba(0,0,0,0.28);">
        <div style="font-size:40px;margin-bottom:8px;">🎁</div>
        <h3 style="margin:0 0 8px 0;color:#15603e;font-size:1.25rem;">Ассаляму алейкум!</h3>
        <p style="margin:0 0 16px 0;color:#3d5247;font-size:0.95rem;line-height:1.5;">
          Откройте <strong>бесплатный доступ на 24 часа</strong> ко всем 5 тренажёрам (Сира, 40 хадисов, Фикх, Таджвид, Адаб), чтобы спокойно изучить их возможности.
        </p>
        <button id="btnStartTrialWelcome" style="width:100%;background:#15603e;color:#fff;border:none;padding:13px 16px;border-radius:10px;font-size:1rem;font-weight:700;cursor:pointer;margin-bottom:10px;">
          🚀 Активировать 24 часа бесплатно
        </button>
        <button id="btnCloseTrialWelcome" style="width:100%;background:transparent;color:#5a7064;border:none;padding:8px;font-size:0.88rem;cursor:pointer;">
          Посмотреть список курсов позже
        </button>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById("btnStartTrialWelcome").onclick = () => {
      activateTrial(uid);
      window.location.reload();
    };
    document.getElementById("btnCloseTrialWelcome").onclick = () => {
      try { sessionStorage.setItem(STORAGE_KEYS.WELCOMED, "1"); } catch (e) {}
      overlay.remove();
    };
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createModal);
  } else {
    createModal();
  }
}

// --- 7. ЗАЩИТА СТРАНИЦЫ КУРСА (С ПОДДЕРЖКОЙ ТРИАЛА И ВХОДА В БРАУЗЕРЕ) ---
function protectCoursePage(courseCode, courseTitle) {
  syncServerTime().then(() => {
    const userId = getCurrentTelegramId();
    if (checkCourseAccess(courseCode)) {
      mountTrialBanner();
      return;
    }

    const renderBlockScreen = () => {
      const inTg = isInsideTelegram();
      const canTryTrial = !isTrialUsed(userId);
      document.body.innerHTML = `
        <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f4efe6;font-family:sans-serif;padding:20px;">
          <div style="max-width:430px;width:100%;background:#ffffff;border:1px solid #bfd6c7;border-radius:16px;padding:24px;text-align:center;box-shadow:0 6px 20px rgba(0,0,0,0.08);">
            <div style="font-size:42px;margin-bottom:10px;">🔒</div>
            <h2 style="color:#15603e;margin:0 0 10px 0;font-size:1.25rem;">Доступ к тренажёру закрыт</h2>
            <p style="color:#4b6658;font-size:0.95rem;line-height:1.5;margin:0 0 16px 0;">
              Доступ к курсу <strong>«${courseTitle}»</strong> пока не активирован.
            </p>

            ${canTryTrial ? `
              <button onclick="activateTrial('${userId || ""}');window.location.reload();" style="width:100%;background:#c5a059;color:#1b2e24;border:none;padding:12px 16px;border-radius:10px;font-size:0.96rem;font-weight:700;cursor:pointer;margin-bottom:14px;">
                🎁 Попробовать бесплатно 24 часа
              </button>
            ` : `
              <div style="background:#fdf3f2;color:#8b2635;font-size:0.84rem;padding:8px 12px;border-radius:8px;margin-bottom:14px;">
                Пробный 24-часовой доступ уже был использован.
              </div>
            `}

            <div style="background:#eef5f0;border:1px dashed #15603e;border-radius:10px;padding:12px;margin-bottom:14px;">
              <div style="font-size:0.8rem;color:#4b6658;margin-bottom:4px;">Ваш персональный ID:</div>
              <div style="font-size:1.15rem;font-weight:700;color:#1b2e24;letter-spacing:1px;">
                ${userId || "Не определён (вход через браузер)"}
              </div>
              ${userId ? `<button onclick="navigator.clipboard.writeText('${userId}');this.textContent='Скопировано ✓'" style="margin-top:8px;background:#15603e;color:#fff;border:none;padding:8px 14px;border-radius:8px;font-size:0.88rem;cursor:pointer;">📋 Скопировать мой ID</button>` : ""}
            </div>

            ${!inTg ? `
              <div style="background:#f8faf9;border:1px solid #d5e2db;border-radius:10px;padding:12px;margin-bottom:14px;text-align:left;">
                <div style="font-size:0.82rem;color:#3d5247;margin-bottom:6px;font-weight:600;">Вход без Telegram (по вашему ID):</div>
                <div style="display:flex;gap:6px;">
                  <input id="manualIdInput" type="text" placeholder="Введите ваш ID..." value="${userId || ""}" style="flex:1;padding:9px 10px;border:1px solid #bfd6c7;border-radius:8px;font-size:0.92rem;">
                  <button onclick="if(setManualAuthId(document.getElementById('manualIdInput').value)) window.location.reload();" style="background:#15603e;color:#fff;border:none;padding:9px 14px;border-radius:8px;font-weight:600;cursor:pointer;">Войти</button>
                </div>
              </div>
            ` : ""}

            <p style="color:#4b6658;font-size:0.85rem;margin:0 0 12px 0;">
              Для открытия постоянного доступа отправьте ваш ID администратору: <strong>${ADMIN_CONTACT}</strong>
            </p>
            <a href="../index.html" style="display:inline-block;color:#15603e;font-size:0.9rem;text-decoration:none;font-weight:600;">← Вернуться в каталог курсов</a>
          </div>
        </div>
      `;
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", renderBlockScreen);
    } else {
      renderBlockScreen();
    }
  });

  return checkCourseAccess(courseCode);
}

// Автозапуск синхронизации времени и баннера на любой странице
syncServerTime().then(() => {
  mountTrialBanner();
});
