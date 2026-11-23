// Единый файл управления доступом ко всем тренажёрам + Пробный доступ (24 часа)
// Коды курсов: "sira" (Сира), "nawawi" (40 хадисов), "fiqh" (Фикх), "tajweed" (Таджвид), "adab" (Адаб), "all" (полный доступ)

const ADMIN_CONTACT = "@Rustam_abu_Aisha";
const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000; // 24 часа

const USER_ACCESS = {
  "859435297": ["all"],
  "806762570": ["all"],
  // Пример ручного временного доступа:
  // "123456789": { courses: ["all"], expires: "2026-11-25T21:00:00" },
};

// Определяем ID пользователя из Telegram WebApp (или из ?id=... для проверки в браузере)
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

  const params = new URLSearchParams(window.location.search);
  if (params.get("id")) {
    return String(params.get("id")).trim();
  }
  return null;
}

function getTrialStorageKey(userId) {
  return "madrasah_trial_exp_" + (userId ? String(userId).trim() : "local");
}

function getTrialUsedKey(userId) {
  return "madrasah_trial_used_" + (userId ? String(userId).trim() : "local");
}

// Получить оставшееся время триала в миллисекундах (0, если триал не активен или истёк)
function getTrialRemainingMs(userId) {
  const uid = userId || getCurrentTelegramId();
  const entry = uid ? USER_ACCESS[String(uid).trim()] : null;

  // 1. Проверка ручного временного доступа в USER_ACCESS
  if (entry && !Array.isArray(entry) && entry.expires) {
    const expTime = new Date(entry.expires).getTime();
    if (!isNaN(expTime)) {
      return Math.max(0, expTime - Date.now());
    }
  }

  // 2. Проверка самостоятельного 24-часового триала в localStorage
  try {
    const savedExp = localStorage.getItem(getTrialStorageKey(uid));
    if (savedExp) {
      const diff = Number(savedExp) - Date.now();
      return diff > 0 ? diff : 0;
    }
  } catch (e) {}

  return 0;
}

function isTrialActive(userId) {
  return getTrialRemainingMs(userId) > 0;
}

function isTrialUsed(userId) {
  const uid = userId || getCurrentTelegramId();
  try {
    return localStorage.getItem(getTrialUsedKey(uid)) === "1";
  } catch (e) {
    return false;
  }
}

function hasPermanentAccess(userId) {
  const uid = userId || getCurrentTelegramId();
  if (!uid) return false;
  const entry = USER_ACCESS[String(uid).trim()];
  if (!entry) return false;
  if (Array.isArray(entry)) return entry.length > 0;
  if (entry.courses && !entry.expires) return entry.courses.length > 0;
  return false;
}

// Активация бесплатного доступа на 24 часа
function activateTrial(userId) {
  const uid = userId || getCurrentTelegramId();
  if (isTrialUsed(uid) && !isTrialActive(uid)) {
    alert("Пробный период на 24 часа уже был использован для этого аккаунта.");
    return false;
  }
  const expiresAt = Date.now() + TRIAL_DURATION_MS;
  try {
    localStorage.setItem(getTrialStorageKey(uid), String(expiresAt));
    localStorage.setItem(getTrialUsedKey(uid), "1");
  } catch (e) {}
  window.location.reload();
  return true;
}

// Форматирование оставшегося времени (ЧЧ:ММ:СС)
function formatTrialTime(ms) {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(h)} ч ${pad(m)} мин ${pad(s)} сек`;
}

// Проверка доступа по переданному ID и коду курса
function hasAccess(userId, courseCode) {
  const uid = userId ? String(userId).trim() : null;
  if (uid) {
    const entry = USER_ACCESS[uid];
    if (entry) {
      if (Array.isArray(entry)) {
        if (entry.includes("all") || entry.includes(courseCode)) return true;
      } else if (entry.courses) {
        const expOk = !entry.expires || new Date(entry.expires).getTime() > Date.now();
        if (expOk && (entry.courses.includes("all") || entry.courses.includes(courseCode))) {
          return true;
        }
      }
    }
  }

  // Если активен 24-часовой пробный период — открываем все курсы
  if (isTrialActive(uid)) {
    return true;
  }

  return false;
}

// Проверка доступа к конкретному тренажёру
function checkCourseAccess(courseCode) {
  const userId = getCurrentTelegramId();
  return hasAccess(userId, courseCode);
}

// Живой счётчик обратного отсчёта на всех страницах (и в каталоге, и внутри тренажёров)
function initLiveTrialBanner() {
  const uid = getCurrentTelegramId();
  if (hasPermanentAccess(uid)) return; // Для постоянных пользователей счётчик не нужен

  const remaining = getTrialRemainingMs(uid);
  if (remaining <= 0) return;

  const renderTick = () => {
    const msLeft = getTrialRemainingMs(uid);
    if (msLeft <= 0) {
      window.location.reload();
      return;
    }
    const formatted = formatTrialTime(msLeft);

    // Обновляем счётчик в каталоге, если он там есть
    const catalogTimer = document.getElementById("trial-timer") || document.getElementById("trial-countdown");
    if (catalogTimer) {
      catalogTimer.textContent = formatted;
    }

    // Обновляем верхнюю плашку счётчика
    const barTimer = document.getElementById("global-trial-clock");
    if (barTimer) {
      barTimer.textContent = formatted;
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    // Если на странице нет встроенного таймера каталога, показываем аккуратную плашку сверху
    const existingCatalogTimer = document.getElementById("trial-timer") || document.getElementById("trial-countdown");
    if (!existingCatalogTimer && !document.getElementById("global-trial-bar")) {
      const bar = document.createElement("div");
      bar.id = "global-trial-bar";
      bar.style.cssText = [
        "background: linear-gradient(90deg, #fff8e6, #fef0c7)",
        "border-bottom: 1px solid #f0c36d",
        "color: #6b4400",
        "padding: 8px 14px",
        "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        "font-size: 13px",
        "text-align: center",
        "font-weight: 600",
        "position: sticky",
        "top: 0",
        "z-index: 9999",
        "box-shadow: 0 2px 6px rgba(0,0,0,0.06)"
      ].join(";");
      bar.innerHTML = `⏳ Пробный доступ (24 ч) • Осталось: <span id="global-trial-clock" style="font-variant-numeric: tabular-nums; color: #b45309;">${formatTrialTime(getTrialRemainingMs(uid))}</span>`;
      document.body.insertBefore(bar, document.body.firstChild);
    }

    renderTick();
    setInterval(renderTick, 1000);
  });
}

initLiveTrialBanner();

// Автоматическая блокировка страницы тренажёра, если доступ не открыт
function protectCoursePage(courseCode, courseTitle) {
  const userId = getCurrentTelegramId();
  if (checkCourseAccess(courseCode)) {
    return true;
  }

  const canTryFree = !isTrialUsed(userId);

  document.addEventListener("DOMContentLoaded", () => {
    document.body.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f4efe6;font-family:sans-serif;padding:20px;">
        <div style="max-width:420px;width:100%;background:#ffffff;border:1px solid #bfd6c7;border-radius:16px;padding:24px;text-align:center;box-shadow:0 6px 20px rgba(0,0,0,0.08);">
          <div style="font-size:42px;margin-bottom:10px;">🔒</div>
          <h2 style="color:#15603e;margin:0 0 10px 0;font-size:1.25rem;">Доступ к тренажёру закрыт</h2>
          <p style="color:#4b6658;font-size:0.95rem;line-height:1.5;margin:0 0 16px 0;">
            Доступ к курсу <strong>«${courseTitle}»</strong> пока не активирован для вашего аккаунта.
          </p>
          ${canTryFree ? `
            <div style="background:#fffbeb;border:1px solid #f59e0b;border-radius:12px;padding:14px;margin-bottom:16px;">
              <div style="font-size:0.9rem;color:#92400e;font-weight:600;margin-bottom:8px;">🎁 Хотите сначала протестировать?</div>
              <button onclick="activateTrial('${userId || ""}')" style="background:#d97706;color:#fff;border:none;padding:10px 18px;border-radius:8px;font-size:0.95rem;font-weight:600;cursor:pointer;width:100%;">
                Открыть бесплатный доступ на 24 часа
              </button>
            </div>
          ` : `
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:10px;margin-bottom:16px;font-size:0.85rem;color:#991b1b;">
              ⏳ Пробный 24-часовой доступ уже был использован.
            </div>
          `}
          <div style="background:#eef5f0;border:1px dashed #15603e;border-radius:10px;padding:12px;margin-bottom:16px;">
            <div style="font-size:0.8rem;color:#4b6658;margin-bottom:4px;">Ваш персональный ID:</div>
            <div id="userIdBox" style="font-size:1.2rem;font-weight:700;color:#1b2e24;letter-spacing:1px;">
              ${userId || "Откройте через Telegram-бот"}
            </div>
          </div>
          ${userId ? `<button onclick="navigator.clipboard.writeText('${userId}');this.textContent='Скопировано ✓'" style="background:#15603e;color:#fff;border:none;padding:10px 18px;border-radius:8px;font-size:0.95rem;cursor:pointer;margin-bottom:12px;">📋 Скопировать мой ID</button>` : ""}
          <p style="color:#4b6658;font-size:0.85rem;margin:8px 0 0 0;">
            Отправьте этот ID администратору (<strong>${ADMIN_CONTACT}</strong>) для открытия постоянного доступа.
          </p>
        </div>
      </div>
    `;
  });
  return false;
}
