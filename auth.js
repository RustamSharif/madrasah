// Единый файл управления доступом ко всем тренажёрам
// Коды курсов: "sira" (Сира), "nawawi" (40 хадисов), "all" (полный доступ ко всему)

const ADMIN_CONTACT = "@ваш_ник_в_телеграм"; // Замените на ваш ник в Telegram

const USER_ACCESS = {
  "859435297": ["all"],
  "806762570": ["all"],
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

  // Резерв: если передан параметр ?id=123456789 в ссылке
  const params = new URLSearchParams(window.location.search);
  if (params.get("id")) {
    return String(params.get("id")).trim();
  }
  return null;
}

// Проверка доступа по переданному ID и коду курса (для главного меню)
function hasAccess(userId, courseCode) {
  if (!userId) return false;
  const allowed = USER_ACCESS[String(userId).trim()];
  if (!allowed) return false;
  return allowed.includes("all") || allowed.includes(courseCode);
}

// Проверка доступа к конкретному тренажёру (для внутренних страниц)
function checkCourseAccess(courseCode) {
  const userId = getCurrentTelegramId();
  return hasAccess(userId, courseCode);
}

// Автоматическая блокировка страницы тренажёра, если доступ не открыт
function protectCoursePage(courseCode, courseTitle) {
  const userId = getCurrentTelegramId();
  if (checkCourseAccess(courseCode)) {
    return true; // Доступ разрешён
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.body.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f4efe6;font-family:sans-serif;padding:20px;">
        <div style="max-width:420px;width:100%;background:#ffffff;border:1px solid #bfd6c7;border-radius:16px;padding:24px;text-align:center;box-shadow:0 6px 20px rgba(0,0,0,0.08);">
          <div style="font-size:42px;margin-bottom:10px;">🔒</div>
          <h2 style="color:#15603e;margin:0 0 10px 0;font-size:1.25rem;">Доступ к тренажёру закрыт</h2>
          <p style="color:#4b6658;font-size:0.95rem;line-height:1.5;margin:0 0 16px 0;">
            Доступ к курсу <strong>«${courseTitle}»</strong> пока не активирован для вашего аккаунта.
          </p>
          <div style="background:#eef5f0;border:1px dashed #15603e;border-radius:10px;padding:12px;margin-bottom:16px;">
            <div style="font-size:0.8rem;color:#4b6658;margin-bottom:4px;">Ваш персональный ID:</div>
            <div id="userIdBox" style="font-size:1.2rem;font-weight:700;color:#1b2e24;letter-spacing:1px;">
              ${userId || "Откройте через Telegram-бот"}
            </div>
          </div>
          ${userId ? `<button onclick="navigator.clipboard.writeText('${userId}');this.textContent='Скопировано ✓'" style="background:#15603e;color:#fff;border:none;padding:10px 18px;border-radius:8px;font-size:0.95rem;cursor:pointer;margin-bottom:12px;">📋 Скопировать мой ID</button>` : ""}
          <p style="color:#4b6658;font-size:0.85rem;margin:8px 0 0 0;">
            Отправьте этот ID администратору (<strong>${ADMIN_CONTACT}</strong>) для открытия доступа.
          </p>
        </div>
      </div>
    `;
  });
  return false;
}
