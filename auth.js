(function() {
  const ALLOWED_IDS = [
    "859435297"
  ];

  const TRIAL_KEY = "madrasah_trial_start_v1";
  const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000;

  function getUserId() {
    try {
      if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
        return String(window.Telegram.WebApp.initDataUnsafe.user.id);
      }
    } catch (e) {}
    const params = new URLSearchParams(window.location.search);
    return params.get("uid") || "";
  }

  function hasAccess() {
    const uid = getUserId();
    if (uid && ALLOWED_IDS.includes(uid)) {
      return { allowed: true, mode: "full", uid: uid };
    }
    const isTelegram = Boolean(window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData);
    if (!isTelegram && !uid) {
      return { allowed: false, mode: "blocked", uid: "" };
    }
    let start = Number(localStorage.getItem(TRIAL_KEY) || "0");
    const now = Date.now();
    if (!start) {
      start = now;
      localStorage.setItem(TRIAL_KEY, String(start));
    }
    if (now - start <= TRIAL_DURATION_MS) {
      return { allowed: true, mode: "trial", uid: uid };
    }
    return { allowed: false, mode: "expired", uid: uid };
  }

  window.protectCoursePage = function(courseKey, cb) {
    const status = hasAccess();
    if (typeof cb === "function") cb(status.allowed);
    return status.allowed;
  };

  function toggleExpandWindow(btn) {
    const tg = window.Telegram && window.Telegram.WebApp;
    const isExpanded = btn.getAttribute("data-expanded") === "1";

    if (!isExpanded) {
      btn.setAttribute("data-expanded", "1");
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 1v4H1M11 1v4h4M5 15v-4H1M11 15v-4h4"/></svg>';
      if (tg) {
        try { tg.expand(); } catch (e) {}
        if (typeof tg.requestFullscreen === "function") {
          try { tg.requestFullscreen(); } catch (e) {}
        }
      }
      if (window.innerWidth < 540) {
        window.open(window.location.href, "_blank");
      }
    } else {
      btn.setAttribute("data-expanded", "0");
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2.5" y="2.5" width="11" height="11" rx="2" stroke-dasharray="2.5 2"/></svg>';
      if (tg && typeof tg.exitFullscreen === "function") {
        try { tg.exitFullscreen(); } catch (e) {}
      }
    }
  }

  function injectLegalFooter() {
    const container = document.querySelector(".container, .wrap") || document.body;
    if (!container || document.getElementById("legalFooterWrap")) return;

    const wrap = document.createElement("div");
    wrap.id = "legalFooterWrap";
    wrap.style.cssText = "margin-top: 22px; text-align: center;";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "ℹ️ Правовая справка и конфиденциальность";
    btn.style.cssText = "background: rgba(229, 236, 230, 0.85); color: #1A281F; border: 1px solid #8FA695; border-radius: 12px; padding: 8px 14px; font-size: 12.5px; font-weight: 600; cursor: pointer;";

    const modal = document.createElement("div");
    modal.id = "legalModalOverlay";
    modal.style.cssText = "display: none; position: fixed; inset: 0; background: rgba(14, 22, 17, 0.72); z-index: 99999; padding: 16px; align-items: center; justify-content: center;";
    modal.innerHTML = `
      <div style="background: #E5ECE6; color: #1A281F; border: 1px solid #8FA695; border-radius: 16px; padding: 18px; max-width: 600px; width: 100%; max-height: 82vh; overflow-y: auto; text-align: left; font-size: 13.5px; line-height: 1.55;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #8FA695; padding-bottom: 8px;">
          <strong style="font-size: 15px; color: #1F523F;">Правовая справка и конфиденциальность</strong>
          <button type="button" id="closeLegalModalBtn" style="background: #DCE5DD; border: 1px solid #8FA695; border-radius: 8px; padding: 4px 10px; font-weight: 700; cursor: pointer;">✕</button>
        </div>
        <p style="margin: 0 0 8px;"><strong>1. Учебный характер материалов.</strong> Все конспекты, аудиоразборы и тесты носят исключительно образовательный, просветительский и культурно-исторический характер, основаны на классических исламских источниках (включая труды ханафитской правовой школы) и <strong>не являются призывом к противоправным или экстремистским действиям на территории Российской Федерации</strong>.</p>
        <p style="margin: 0 0 8px;"><strong>2. Справочный статус.</strong> Материалы предназначены для самопроверки базовых знаний и не являются индивидуальными религиозно-правовыми заключениями (фетвами). По частным жизненным вопросам обращайтесь к квалифицированным имамам.</p>
        <p style="margin: 0;"><strong>3. Защита персональных данных (152-ФЗ).</strong> Приложение не собирает и не хранит на сторонних серверах фамилии, номера телефонов или адреса пользователей. Прогресс обучения сохраняется только локально в памяти вашего устройства, а числовой идентификатор Telegram используется исключительно для проверки доступа.</p>
      </div>
    `;

    btn.addEventListener("click", function() {
      modal.style.display = "flex";
    });

    modal.addEventListener("click", function(e) {
      if (e.target === modal || e.target.id === "closeLegalModalBtn") {
        modal.style.display = "none";
      }
    });

    wrap.appendChild(btn);
    container.appendChild(wrap);
    document.body.appendChild(modal);
  }

  document.addEventListener("DOMContentLoaded", function() {
    if (window.Telegram && window.Telegram.WebApp) {
      try {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
      } catch (e) {}
    }

    const status = hasAccess();
    const accessBar = document.getElementById("accessBar");

    if (accessBar) {
      const labelText = status.mode === "full"
        ? "ID: " + status.uid
        : (status.mode === "trial" ? "Пробный доступ (24 ч)" : "Доступ ограничен");

      accessBar.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; background: #E5ECE6; border: 1px solid #8FA695; border-radius: 14px; padding: 8px 12px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(14, 22, 17, 0.12);">
          <span style="font-size: 13.5px; font-weight: 700; color: #1A281F; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${labelText}</span>
          <button type="button" id="expandToggleBtn" data-expanded="0" title="Развернуть / свернуть" style="width: 32px; height: 32px; flex-shrink: 0; border-radius: 50%; background: #DCE5DD; border: 1px solid #8FA695; color: #1A281F; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; padding: 0;">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2.5" y="2.5" width="11" height="11" rx="2" stroke-dasharray="2.5 2"/></svg>
          </button>
        </div>
      `;

      const expBtn = document.getElementById("expandToggleBtn");
      if (expBtn) {
        expBtn.addEventListener("click", function() {
          toggleExpandWindow(expBtn);
        });
      }
    } else {
      const topNav = document.querySelector(".top-nav, .top-bar, .topbar");
      if (topNav && !document.getElementById("expandToggleBtn")) {
        const expBtn = document.createElement("button");
        expBtn.type = "button";
        expBtn.id = "expandToggleBtn";
        expBtn.setAttribute("data-expanded", "0");
        expBtn.title = "Развернуть / свернуть";
        expBtn.style.cssText = "width: 34px; height: 34px; flex-shrink: 0; border-radius: 50%; background: #E5ECE6; border: 1px solid #8FA695; color: #1A281F; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);";
        expBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2.5" y="2.5" width="11" height="11" rx="2" stroke-dasharray="2.5 2"/></svg>';
        expBtn.addEventListener("click", function() {
          toggleExpandWindow(expBtn);
        });
        topNav.appendChild(expBtn);
      }
    }

    injectLegalFooter();
  });
})();
