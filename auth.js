(function() {
  const ALLOWED_USERS = [
    "859435297"
  ];

  const TRIAL_HOURS = 24;
  const TRIAL_KEY = "madrasah_trial_start_v1";
  const WIDE_KEY = "madrasah_wide_mode_v1";

  function getTelegramWebApp() {
    return (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;
  }

  function resolveUserId() {
    const params = new URLSearchParams(window.location.search);
    const urlUid = params.get("uid");
    if (urlUid) {
      try { localStorage.setItem("madrasah_uid", urlUid); } catch (e) {}
      return String(urlUid).trim();
    }
    const tg = getTelegramWebApp();
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id) {
      const tgId = String(tg.initDataUnsafe.user.id);
      try { localStorage.setItem("madrasah_uid", tgId); } catch (e) {}
      return tgId;
    }
    try {
      const saved = localStorage.getItem("madrasah_uid");
      if (saved) return String(saved).trim();
    } catch (e) {}
    return "";
  }

  function hasAccess(uid) {
    if (uid && ALLOWED_USERS.includes(uid)) {
      return { ok: true, mode: "full" };
    }
    const tg = getTelegramWebApp();
    const isInsideTelegram = Boolean(tg && (tg.initData || (tg.initDataUnsafe && tg.initDataUnsafe.user)));
    if (!isInsideTelegram && !uid) {
      return { ok: false, mode: "blocked" };
    }
    try {
      let start = localStorage.getItem(TRIAL_KEY);
      if (!start) {
        start = String(Date.now());
        localStorage.setItem(TRIAL_KEY, start);
      }
      const elapsedHours = (Date.now() - Number(start)) / (1000 * 60 * 60);
      if (elapsedHours <= TRIAL_HOURS) {
        return { ok: true, mode: "trial" };
      }
    } catch (e) {}
    return { ok: false, mode: "expired" };
  }

  function applyWideState(isWide) {
    const containers = document.querySelectorAll(".container, .wrap");
    containers.forEach(function(el) {
      el.style.maxWidth = isWide ? "100%" : "720px";
      el.style.transition = "max-width 0.2s ease";
    });
    const iconEl = document.getElementById("wideToggleIcon");
    if (iconEl) {
      iconEl.innerHTML = isWide
        ? '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="3" width="10" height="10" rx="1.5" stroke="#1F523F" stroke-width="1.6"/><path d="M6 6H10V10H6V6Z" stroke="#1F523F" stroke-width="1.3"/></svg>'
        : '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2.5" y="2.5" width="11" height="11" rx="1.5" stroke="#1F523F" stroke-width="1.6" stroke-dasharray="2.2 1.8"/></svg>';
    }
  }

  function toggleWideWindow() {
    const tg = getTelegramWebApp();
    let isWide = false;
    try {
      isWide = localStorage.getItem(WIDE_KEY) === "1";
    } catch (e) {}
    isWide = !isWide;
    try {
      localStorage.setItem(WIDE_KEY, isWide ? "1" : "0");
    } catch (e) {}

    if (tg && typeof tg.expand === "function") {
      try { tg.expand(); } catch (e) {}
    }
    applyWideState(isWide);
  }

  function renderStatusBar(uid) {
    const target = document.getElementById("userStatusHeader");
    if (!target) return;

    const bar = document.createElement("div");
    bar.style.cssText = [
      "display:flex",
      "align-items:center",
      "justify-content:space-between",
      "gap:10px",
      "background:#E5ECE6",
      "border:1px solid #8FA695",
      "border-radius:14px",
      "padding:8px 12px 8px 16px",
      "margin-bottom:14px",
      "box-sizing:border-box",
      "width:100%",
      "box-shadow:0 2px 8px rgba(14,22,17,0.12)"
    ].join(";");

    const idSpan = document.createElement("span");
    idSpan.style.cssText = "font-size:14px;font-weight:700;color:#1A281F;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
    idSpan.textContent = uid ? ("ID: " + uid) : "Учебный режим";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.title = "Развернуть / свернуть ширину";
    btn.style.cssText = [
      "flex-shrink:0",
      "width:34px",
      "height:34px",
      "min-width:34px",
      "padding:0",
      "margin:0",
      "border-radius:50%",
      "border:1px solid #8FA695",
      "background:#DCE5DD",
      "display:inline-flex",
      "align-items:center",
      "justify-content:center",
      "cursor:pointer",
      "box-sizing:border-box"
    ].join(";");

    const iconSpan = document.createElement("span");
    iconSpan.id = "wideToggleIcon";
    iconSpan.style.cssText = "display:inline-flex;align-items:center;justify-content:center;line-height:0;";
    btn.appendChild(iconSpan);
    btn.addEventListener("click", toggleWideWindow);

    bar.appendChild(idSpan);
    bar.appendChild(btn);
    target.innerHTML = "";
    target.appendChild(bar);

    let savedWide = false;
    try { savedWide = localStorage.getItem(WIDE_KEY) === "1"; } catch (e) {}
    applyWideState(savedWide);
  }

  function injectLegalFooter() {
    if (document.getElementById("madrasahLegalFooter")) return;
    const container = document.querySelector(".container, .wrap") || document.body;

    const footer = document.createElement("div");
    footer.id = "madrasahLegalFooter";
    footer.style.cssText = "margin-top:22px;text-align:center;";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "ℹ️ Правовая справка и конфиденциальность";
    btn.style.cssText = [
      "background:rgba(229,236,230,0.88)",
      "color:#1A281F",
      "border:1px solid #8FA695",
      "border-radius:12px",
      "padding:8px 14px",
      "font-size:12.5px",
      "font-weight:600",
      "cursor:pointer"
    ].join(";");

    const modal = document.createElement("div");
    modal.id = "legalModalOverlay";
    modal.style.cssText = [
      "display:none",
      "position:fixed",
      "inset:0",
      "background:rgba(14,22,17,0.72)",
      "z-index:10000",
      "padding:16px",
      "align-items:center",
      "justify-content:center"
    ].join(";");

    modal.innerHTML = `
      <div style="background:#E5ECE6;color:#1A281F;border:1px solid #8FA695;border-radius:16px;padding:18px;max-width:600px;width:100%;max-height:85vh;overflow-y:auto;text-align:left;font-size:13.5px;line-height:1.55;">
        <h3 style="margin:0 0 10px;font-size:16px;color:#1F523F;">Правовая справка и конфиденциальность</h3>
        <p style="margin:0 0 8px;"><strong>1. Образовательный характер:</strong> Все материалы, конспекты и тесты носят исключительно учебный, просветительский и культурно-исторический характер, основаны на классических исламских источниках (включая труды ханафитской правовой школы) и <strong>не являются призывом к противоправным или экстремистским действиям на территории Российской Федерации</strong>.</p>
        <p style="margin:0 0 8px;"><strong>2. Справочный статус:</strong> Разборы вопросов предназначены для самопроверки базовых знаний и не заменяют индивидуальных религиозно-правовых заключений (фетв). По частным жизненным ситуациям следует обращаться к квалифицированным имамам.</p>
        <p style="margin:0 0 12px;"><strong>3. Защита данных (152-ФЗ):</strong> Приложение не собирает и не передаёт на сторонние серверы фамилии, телефоны или адреса пользователей. Прогресс обучения хранится только локально в памяти вашего устройства, а числовой ID Telegram используется исключительно для проверки доступа.</p>
        <button type="button" id="closeLegalModalBtn" style="width:100%;padding:10px;border-radius:11px;border:none;background:#1F523F;color:#FFFFFF;font-weight:600;font-size:14px;cursor:pointer;">Закрыть</button>
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

    footer.appendChild(btn);
    container.appendChild(footer);
    document.body.appendChild(modal);
  }

  window.protectCoursePage = function() {
    const uid = resolveUserId();
    const access = hasAccess(uid);
    if (!access.ok) {
      document.body.innerHTML = '<div style="max-width:460px;margin:40px auto;padding:22px;background:#E5ECE6;border:1px solid #8FA695;border-radius:16px;text-align:center;font-family:sans-serif;color:#1A281F;"><h3>Доступ ограничен</h3><p>Откройте библиотеку через официального бота в Telegram.</p></div>';
    }
  };

  document.addEventListener("DOMContentLoaded", function() {
    const tg = getTelegramWebApp();
    if (tg) {
      try {
        tg.ready();
        tg.expand();
      } catch (e) {}
    }
    const uid = resolveUserId();
    const access = hasAccess(uid);
    if (!access.ok) {
      window.protectCoursePage();
      return;
    }
    renderStatusBar(uid);
    injectLegalFooter();
  });
})();
