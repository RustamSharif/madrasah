(function() {
  const ADMIN_IDS = ["859435297"];
  const WHITELIST_IDS = ["859435297"];
  const TRIAL_KEY = "madrasah_trial_start_v1";
  const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000;

  function getTelegramUserId() {
    try {
      if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
        return String(window.Telegram.WebApp.initDataUnsafe.user.id);
      }
    } catch (e) {}
    const params = new URLSearchParams(window.location.search);
    const uid = params.get("uid") || params.get("id");
    if (uid) {
      try { sessionStorage.setItem("madrasah_uid", uid); } catch (e) {}
      return String(uid);
    }
    try {
      return sessionStorage.getItem("madrasah_uid") || "";
    } catch (e) {
      return "";
    }
  }

  function isInsideTelegram() {
    try {
      return Boolean(window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData && window.Telegram.WebApp.initData.length > 0);
    } catch (e) {
      return false;
    }
  }

  function checkUserAccess() {
    const uid = getTelegramUserId();
    if (uid && (ADMIN_IDS.includes(uid) || WHITELIST_IDS.includes(uid))) {
      return { allowed: true, mode: "full", uid: uid };
    }
    if (isInsideTelegram()) {
      let start = 0;
      try {
        start = Number(localStorage.getItem(TRIAL_KEY) || "0");
        if (!start) {
          start = Date.now();
          localStorage.setItem(TRIAL_KEY, String(start));
        }
      } catch (e) {
        start = Date.now();
      }
      const elapsed = Date.now() - start;
      if (elapsed < TRIAL_DURATION_MS) {
        const hoursLeft = Math.max(1, Math.ceil((TRIAL_DURATION_MS - elapsed) / (60 * 60 * 1000)));
        return { allowed: true, mode: "trial", hoursLeft: hoursLeft, uid: uid };
      }
      return { allowed: false, mode: "expired", uid: uid };
    }
    return { allowed: false, mode: "external", uid: uid };
  }

  window.getMadrasahAccess = checkUserAccess;

  window.protectCoursePage = function(courseKey, onResult) {
    const status = checkUserAccess();
    if (typeof onResult === "function") {
      try { onResult(status.allowed, status); } catch (e) {}
    }
    if (!status.allowed) {
      const container = document.querySelector(".container, .wrap") || document.body;
      const isRoot = !window.location.pathname.match(/\/(sira|nawawi|fiqh|fiqh_extra|tajweed|tajwid|adab|aqeedah|arabic|quran)\//);
      const homeUrl = isRoot ? "index.html" : "../index.html";
      container.innerHTML = `
        <div style="background:#E5ECE6;border:1px solid #8FA695;border-radius:18px;padding:26px 20px;text-align:center;margin-top:30px;color:#1A281F;box-shadow:0 6px 18px rgba(14,22,17,0.18);">
          <div style="font-size:38px;margin-bottom:10px;">🔒</div>
          <h2 style="margin:0 0 10px;font-size:20px;color:#1F523F;">Доступ к разделу ограничен</h2>
          <p style="margin:0 0 16px;font-size:14.5px;color:#435749;line-height:1.5;">
            Пробный 24-часовой доступ завершён или страница открыта вне Telegram. Для получения полного доступа обратитесь к администратору и укажите ваш ID: <strong>${status.uid || "не определён"}</strong>.
          </p>
          <a href="${homeUrl}" style="display:inline-block;padding:11px 22px;background:#1F523F;color:#FFFFFF;border-radius:12px;text-decoration:none;font-weight:600;font-size:14.5px;">На главную страницу</a>
        </div>
      `;
    }
    return status.allowed;
  };

  function injectExpandButton() {
    if (document.getElementById("madrasahExpandBtn")) return;
    const topBar = document.querySelector(".top-nav, .top-bar, .topbar, .access-bar");
    if (!topBar) return;

    const btn = document.createElement("button");
    btn.id = "madrasahExpandBtn";
    btn.type = "button";
    btn.title = "Развернуть / свернуть окно";
    btn.style.cssText = "width:34px;height:34px;border-radius:50%;border:1px solid #8FA695;background:#E5ECE6;color:#1F523F;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0;flex-shrink:0;box-shadow:0 2px 6px rgba(0,0,0,0.12);";

    const iconExpand = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="2.5 2"><rect x="2.5" y="2.5" width="11" height="11" rx="1.5"/></svg>';
    const iconCollapse = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M6 2v4H2M10 14v-4h4M14 6h-4V2M2 10h4v4"/></svg>';

    let expanded = false;
    btn.innerHTML = iconExpand;

    btn.addEventListener("click", function() {
      expanded = !expanded;
      btn.innerHTML = expanded ? iconCollapse : iconExpand;
      try {
        if (window.Telegram && window.Telegram.WebApp) {
          if (expanded && typeof window.Telegram.WebApp.requestFullscreen === "function") {
            window.Telegram.WebApp.requestFullscreen();
          } else if (!expanded && typeof window.Telegram.WebApp.exitFullscreen === "function") {
            window.Telegram.WebApp.exitFullscreen();
          }
          if (typeof window.Telegram.WebApp.expand === "function") {
            window.Telegram.WebApp.expand();
          }
        }
      } catch (e) {}

      if (expanded && !isInsideTelegram()) {
        try {
          if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
            document.documentElement.requestFullscreen();
          }
        } catch (e) {}
      } else if (!expanded && document.fullscreenElement) {
        try { document.exitFullscreen(); } catch (e) {}
      }
    });

    topBar.appendChild(btn);
  }

  function injectLegalModalAndFooter() {
    if (!document.getElementById("madrasahLegalModal")) {
      const modal = document.createElement("div");
      modal.id = "madrasahLegalModal";
      modal.style.cssText = "display:none;position:fixed;inset:0;background:rgba(14,22,17,0.74);z-index:99999;padding:16px;align-items:center;justify-content:center;";
      modal.innerHTML = `
        <div style="background:#E5ECE6;color:#1A281F;border:1px solid #8FA695;border-radius:18px;max-width:640px;width:100%;max-height:86vh;overflow-y:auto;padding:20px 18px;box-shadow:0 12px 32px rgba(0,0,0,0.3);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.55;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding-bottom:12px;margin-bottom:14px;border-bottom:1px solid #8FA695;">
            <strong style="font-size:16.5px;color:#1F523F;">ℹ️ Правовая справка и конфиденциальность</strong>
            <button type="button" id="closeLegalModalBtn" style="padding:6px 13px;border-radius:10px;border:1px solid #8FA695;background:#DCE5DD;color:#1A281F;font-weight:600;font-size:13.5px;cursor:pointer;">Закрыть</button>
          </div>
          <div style="font-size:14px;color:#1A281F;">
            <p style="margin:0 0 10px;"><strong>1. Образовательный характер материалов</strong><br>
            Все тесты, конспекты и справочные тексты данной электронной библиотеки носят исключительно учебный, просветительский и культурно-исторический характер. Материалы основаны на классических исламских источниках (включая труды ханафитской правовой школы) и <strong>не являются призывом к противоправным или экстремистским действиям на территории Российской Федерации</strong>, не направлены на разжигание розни или оскорбление чувств верующих.</p>

            <p style="margin:0 0 10px;"><strong>2. Справочный статус и отсутствие фетв</strong><br>
            Разборы ответов в тестах предназначены для самопроверки базовых знаний и не являются индивидуальными религиозно-правовыми заключениями (фетвами). По частным жизненным ситуациям рекомендуется обращаться к квалифицированным имамам и учёным.</p>

            <p style="margin:0 0 10px;"><strong>3. Защита персональных данных (152-ФЗ)</strong><br>
            Приложение работает как статический образовательный ресурс: оно не запрашивает, не собирает и не хранит на сторонних серверах фамилии, номера телефонов, адреса или иные персональные данные пользователей. Прогресс прохождения тестов сохраняется локально в памяти вашего устройства, а технический идентификатор Telegram (ID) используется исключительно для проверки доступа.</p>

            <p style="margin:0;"><strong>4. Аудиоматериалы и открытые архивы</strong><br>
            Озвучивание аятов Священного Корана воспроизводится в учебных целях из открытого некоммерческого образовательного архива EveryAyah.</p>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.addEventListener("click", function(e) {
        if (e.target === modal) modal.style.display = "none";
      });
      document.getElementById("closeLegalModalBtn").addEventListener("click", function() {
        modal.style.display = "none";
      });
    }

    window.openMadrasahLegal = function() {
      const m = document.getElementById("madrasahLegalModal");
      if (m) m.style.display = "flex";
    };

    if (!document.getElementById("madrasahLegalFooter")) {
      const target = document.querySelector(".container, .wrap") || document.body;
      const footer = document.createElement("div");
      footer.id = "madrasahLegalFooter";
      footer.style.cssText = "margin-top:22px;padding:12px 10px 6px;text-align:center;border-top:1px solid rgba(154,184,161,0.25);";
      footer.innerHTML = `
        <div style="font-size:11.5px;color:#D7E5DC;opacity:0.88;margin-bottom:8px;line-height:1.4;">
          Материалы носят исключительно учебный характер и не являются призывом к противоправным действиям на территории РФ.
        </div>
        <button type="button" onclick="openMadrasahLegal()" style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:16px;border:1px solid #8FA695;background:#E5ECE6;color:#1A281F;font-size:12px;font-weight:600;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.12);">
          ℹ️ Правовая справка и конфиденциальность
        </button>
      `;
      target.appendChild(footer);
    }
  }

  document.addEventListener("DOMContentLoaded", function() {
    try {
      if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
      }
    } catch (e) {}
    injectExpandButton();
    injectLegalModalAndFooter();
  });
})();
