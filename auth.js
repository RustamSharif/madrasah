// Единый файл управления доступом ко всем тренажёрам (включая пробный доступ на 24 часа)
// Коды курсов: "sira" (Сира), "nawawi" (40 хадисов), "fiqh" (Фикх), "all" (полный доступ ко всему)

const ADMIN_CONTACT = "@Rustam_abu_Aisha";
const TRIAL_DURATION_HOURS = 24; // Длительность пробного доступа в часах

const USER_ACCESS = {
  //"859435297": ["all"],
  "806762570": ["all"],
  // Пример ручного временного доступа:
  // "123456789": { courses: ["all"], expires: "2026-12-01T23:59:00" },
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

// Проверка постоянного или ручного временного доступа из USER_ACCESS
function hasPermanentOrManualAccess(userId, courseCode) {
  if (!userId) return false;
  const entry = USER_ACCESS[String(userId).trim()];
  if (!entry) return false;

  if (Array.isArray(entry)) {
    return entry.includes("all") || entry.includes(courseCode);
  }

  if (typeof entry === "object" && Array.isArray(entry.courses)) {
    if (entry.expires) {
      const expTime = new Date(entry.expires).getTime();
      if (!isNaN(expTime) && Date.now() > expTime) {
        return false; // Срок ручного доступа истёк
      }
    }
    return entry.courses.includes("all") || entry.courses.includes(courseCode);
  }
  return false;
}

// Статус самостоятельного пробного доступа на 24 часа: 'available' | 'active' | 'expired'
function getTrialStatus(userId) {
  const key = "madrasah_trial_start_" + (userId ? String(userId).trim() : "guest");
  const startedAt = Number(localStorage.getItem(key) || 0);
  const durationMs = TRIAL_DURATION_HOURS * 60 * 60 * 1000;

  if (!startedAt) {
    return { state: "available", remainingMs: durationMs };
  }

  const elapsed = Date.now() - startedAt;
  if (elapsed < durationMs) {
    return { state: "active", remainingMs: durationMs - elapsed };
  }

  return { state: "expired", remainingMs: 0 };
}

// Активация пробного доступа на 24 часа
function activateTrial(userId) {
  const key = "madrasah_trial_start_" + (userId ? String(userId).trim() : "guest");
  if (!localStorage.getItem(key)) {
    localStorage.setItem(key, String(Date.now()));
  }
  window.location.reload();
}

// Форматирование оставшегося времени триала
function formatRemainingTime(ms) {
  const totalMinutes = Math.max(1, Math.floor(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} ч ${minutes} мин`;
}

// Общая проверка доступа (постоянный доступ ИЛИ активный 24-часовой триал)
function hasAccess(userId, courseCode) {
  if (hasPermanentOrManualAccess(userId, courseCode)) {
    return true;
  }
  const trial = getTrialStatus(userId);
  return trial.state === "active";
}

// Проверка доступа к конкретному тренажёру (для внутренних страниц)
function checkCourseAccess(courseCode) {
  const userId = getCurrentTelegramId();
  return hasAccess(userId, courseCode);
}

// Автоматическая блокировка страницы тренажёра, если доступ закрыт
function protectCoursePage(courseCode, courseTitle) {
  const userId = getCurrentTelegramId();
  if (checkCourseAccess(courseCode)) {
    return true;
  }

  const trial = getTrialStatus(userId);

  document.addEventListener("DOMContentLoaded", () => {
    const trialBlock = trial.state === "available"
      ? `<div style="background:#fff8e1;border:1px solid #e0c36d;border-radius:12px;padding:14px;margin-bottom:16px;">
           <div style="font-weight:700;color:#6d4c00;margin-bottom:6px;">🎁 Доступен бесплатный тест-драйв</div>
           <div style="font-size:0.88rem;color:#5c4b18;margin-bottom:10px;">Вы можете открыть все тренажёры на 24 часа, чтобы оценить удобство обучения.</div>
           <button onclick="activateTrial('${userId || ""}')" style="background:#b89535;color:#fff;border:none;padding:10px 16px;border-radius:8px;font-size:0.95rem;font-weight:700;cursor:pointer;width:100%;">Активировать доступ на 24 часа</button>
         </div>`
      : `<div style="background:#fdf2f2;border:1px solid #e5b5b5;border-radius:10px;padding:10px;margin-bottom:14px;font-size:0.88rem;color:#8c2323;">
           ⏳ Пробный доступ на 24 часа уже был использован.
         </div>`;

    document.body.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f4efe6;font-family:sans-serif;padding:20px;">
        <div style="max-width:420px;width:100%;background:#ffffff;border:1px solid #bfd6c7;border-radius:16px;padding:24px;text-align:center;box-shadow:0 6px 20px rgba(0,0,0,0.08);">
          <div style="font-size:42px;margin-bottom:10px;">🔒</div>
          <h2 style="color:#15603e;margin:0 0 10px 0;font-size:1.25rem;">Доступ к тренажёру закрыт</h2>
          <p style="color:#4b6658;font-size:0.95rem;line-height:1.5;margin:0 0 16px 0;">
            Курс <strong>«${courseTitle}»</strong> доступен по бессрочному доступу.
          </p>
          ${trialBlock}
          <div style="background:#eef5f0;border:1px dashed #15603e;border-radius:10px;padding:12px;margin-bottom:16px;">
            <div style="font-size:0.8rem;color:#4b6658;margin-bottom:4px;">Ваш персональный ID:</div>
            <div id="userIdBox" style="font-size:1.2rem;font-weight:700;color:#1b2e24;letter-spacing:1px;">
              ${userId || "Откройте через Telegram-бот"}
            </div>
          </div>
          ${userId ? `<button onclick="navigator.clipboard.writeText('${userId}');this.textContent='Скопировано ✓'" style="background:#15603e;color:#fff;border:none;padding:10px 18px;border-radius:8px;font-size:0.95rem;cursor:pointer;margin-bottom:12px;">📋 Скопировать мой ID</button>` : ""}
          <p style="color:#4b6658;font-size:0.85rem;margin:8px 0 0 0;">
            Для получения постоянного доступа отправьте этот ID администратору (<strong>${ADMIN_CONTACT}</strong>).
          </p>
          <div style="margin-top:14px;">
            <a href="../index.html${userId ? "?id=" + encodeURIComponent(userId) : ""}" style="color:#15603e;font-size:0.9rem;font-weight:600;text-decoration:none;">← Вернуться в каталог курсов</a>
          </div>
        </div>
      </div>
    `;
  });
  return false;
}
