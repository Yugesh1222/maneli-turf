/**
 * script.js — homepage behaviour for Connexion 26
 * No external state is persisted (no localStorage/sessionStorage) — theme
 * defaults to the visitor's OS preference each visit.
 */
(function () {
  "use strict";

  const FEST_DATE = new Date("2026-09-17T09:00:00");
  const siteRoot = new URL(".", window.location.href);
  const toSitePath = (path) => new URL(path, siteRoot).href;

  /* ------------------------------------------- Event registration status */
  // Same Apps Script deployment URL used in register.js / admin.js.
  const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwxqvMIZ44wnMMkGyoAw8yXHbijd9PAu944jdgAAPWSsg9meEh3lPtiBFyTxPz-jcy6/exec";
  let eventStatuses = {};
  async function loadEventStatuses() {
    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes("YOUR_DEPLOYMENT_ID")) return;
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?action=eventStatus`);
      const data = await res.json();
      eventStatuses = data.statuses || {};
      renderEvents();
    } catch (err) {
      console.error("Could not load event status:", err);
    }
  }

  /* ------------------------------------------------------------ Loader */
  window.addEventListener("load", () => {
    const loader = document.getElementById("loader");
    setTimeout(() => loader && loader.classList.add("hidden"), 350);
  });

  /* ------------------------------------------------------- AOS + GSAP */
  if (window.AOS) AOS.init({ duration: 700, once: true, offset: 60, easing: "ease-out-cubic" });
  if (window.gsap) {
    gsap.from(".navbar", { y: -40, opacity: 0, duration: 0.8, ease: "power3.out" });
  }

  /* ----------------------------------------------------------- Navbar */
  const navbar = document.getElementById("navbar");
  if (navbar) {
    window.addEventListener("scroll", () => {
      navbar.classList.toggle("scrolled", window.scrollY > 30);
    });
  }
  const menuBtn = document.getElementById("menuBtn");
  const mobileMenu = document.getElementById("mobileMenu");
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener("click", () => mobileMenu.classList.toggle("hidden"));
    mobileMenu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => mobileMenu.classList.add("hidden")));
  }

  /* ------------------------------------------------------------ Theme */
  const root = document.documentElement;
  const themeIcon = document.getElementById("themeIcon");
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  if (prefersLight) setTheme("light");

  function setTheme(mode) {
    root.setAttribute("data-theme", mode);
    if (themeIcon) themeIcon.className = mode === "light" ? "fa-solid fa-sun" : "fa-solid fa-moon";
  }
  document.getElementById("themeToggle")?.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    setTheme(next);
  });

  /* --------------------------------------------------------- Countdown */
  function tickCountdown() {
    const now = new Date();
    let diff = Math.max(0, FEST_DATE - now);
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = String(v).padStart(2, "0"); };
    set("cd-days", d); set("cd-hours", h); set("cd-mins", m); set("cd-secs", s);
  }
  tickCountdown();
  setInterval(tickCountdown, 1000);

  const RULES = {
    "ipl-auction": [
      "Teams must have exactly 3 members.",
      "Each team gets a fixed budget during the auction.",
      "Auction selections are final once the bid is accepted."
    ],
    "business-quiz": [
      "Teams must consist of 2 members only.",
      "No electronic devices or outside help are allowed during the quiz.",
      "The quizmaster's ruling is final for all answers."
    ],
    "adaptune": [
      "This is a solo event.",
      "Participants will receive a surprise music prompt on stage.",
      "No prerecorded vocals or backing tracks are allowed."
    ],
    "reels-making": [
      "This is a solo reel creation event.",
      "Your reel must be 60 seconds maximum and created on-site.",
      "Only original footage and music are allowed."
    ],
    "shipwreck": [
      "This is a solo storytelling event.",
      "You have 5 minutes to present your shipwreck story.",
      "No special props are allowed beyond simple costume accessories."
    ],
    "photography": [
      "This is a solo photography event.",
      "Submit one photo only in the required format.",
      "Minimal editing is allowed; no heavy composites or filters."
    ],
    "channel-surfing": [
      "Teams must have exactly 2 members.",
      "Create a channel-themed pitch and presentation together.",
      "The final video must be original and prepared during the event window."
    ],
    "ad-making": [
      "This is a solo presentation event.",
      "Use the provided brief and present within the time limit.",
      "No external props are allowed except approved materials."
    ],
    "2mins-short-film": [
      "Teams may have up to 5 members.",
      "The short film must be 2 minutes maximum.",
      "Submit the film in the required digital format before the deadline."
    ],
    "ai-prompt-challenge": [
      "This is a solo prompt-writing event.",
      "Generate the output from the given prompt during the event.",
      "Only one submission per participant is allowed."
    ]
  };

  /* ------------------------------------------------------- Categories */
  const categoryStrip = document.getElementById("categoryStrip");
  if (categoryStrip) {
    const icons = { stage: "fa-masks-theater", visual: "fa-camera-retro", mind: "fa-brain", arena: "fa-gamepad", social: "fa-people-group" };
    Object.entries(BANDS).forEach(([key, band], i) => {
      const count = EVENTS.filter((e) => e.band === key).length;
      const card = document.createElement("div");
      card.className = "glass rounded-2xl p-5 text-center hover:-translate-y-1 transition cursor-pointer";
      card.style.setProperty("--c", band.hue);
      card.setAttribute("data-aos", "fade-up");
      card.setAttribute("data-aos-delay", i * 60);
      card.innerHTML = `
        <div class="w-11 h-11 mx-auto rounded-full flex items-center justify-center mb-3" style="background:color-mix(in srgb, var(--c) 18%, transparent); color:var(--c)">
          <i class="fa-solid ${icons[key]}"></i>
        </div>
        <div class="font-display font-semibold text-sm">${band.label}</div>
        <div class="text-xs text-[var(--text-dim)] mt-1">${count} events</div>`;
      card.addEventListener("click", () => { document.getElementById("events").scrollIntoView({ behavior: "smooth" }); setFilter(key); });
      categoryStrip.appendChild(card);
    });
  }

  /* ------------------------------------------------------------ Filters */
  const filterBar = document.getElementById("filterBar");
  let activeFilter = "all";
  function buildFilters() {
    if (!filterBar) return;
    const all = [["all", "All"], ...Object.entries(BANDS).map(([k, b]) => [k, b.label])];
    filterBar.innerHTML = "";
    all.forEach(([key, label]) => {
      const btn = document.createElement("button");
      btn.className = "filter-chip px-4 py-2 rounded-full text-xs font-mono uppercase tracking-wide border transition";
      btn.dataset.key = key;
      btn.textContent = label;
      styleChip(btn, key === activeFilter);
      btn.addEventListener("click", () => setFilter(key));
      filterBar.appendChild(btn);
    });
  }
  function styleChip(btn, active) {
    btn.style.borderColor = active ? "transparent" : "var(--line)";
    btn.style.background = active ? "var(--beam)" : "transparent";
    btn.style.color = active ? "#fff" : "var(--text-dim)";
  }
  function setFilter(key) {
    activeFilter = key;
    filterBar?.querySelectorAll("button").forEach((b) => styleChip(b, b.dataset.key === key));
    renderEvents();
  }

  /* ------------------------------------------------------------- Cards */
  const grid = document.getElementById("eventsGrid");
  function renderEvents() {
    if (!grid) return;
    const list = activeFilter === "all" ? EVENTS : EVENTS.filter((e) => e.band === activeFilter);
    grid.innerHTML = "";
    if (!list.length) {
      grid.innerHTML = `<div class="col-span-full text-center py-16 text-[var(--text-dim)]">No events in this band yet — check back soon.</div>`;
      return;
    }
    list.forEach((ev, i) => {
      const band = BANDS[ev.band];
      const closed = !!eventStatuses[ev.id];
      const card = document.createElement("article");
      card.className = "event-card";
      card.style.setProperty("--c", band.hue);
      card.setAttribute("data-aos", "fade-up");
      card.setAttribute("data-aos-delay", (i % 3) * 80);
      card.innerHTML = `
        <div class="event-card__media">
          <img data-src="${ev.image}" alt="${ev.name} event banner" class="lazy">
        </div>
        <div class="p-6 flex flex-col flex-1">
          <div class="flex items-center gap-2 mb-3">
            <span class="badge-band w-fit" style="--c:${band.hue}">${band.label}</span>
            ${closed ? `<span class="badge-band w-fit" style="--c:#EF4444"><i class="fa-solid fa-lock mr-1"></i>Closed</span>` : ""}
          </div>
          <h3 class="font-display text-xl font-bold mb-3">${ev.name}</h3>
          <p class="text-sm text-[var(--text-dim)] mb-3">${ev.tagline}</p>
          <p class="text-[0.95rem] leading-6 text-[var(--text-dim)] mb-4">${ev.description}</p>
          <div class="grid gap-2 text-sm text-[var(--text-dim)] mb-5">
            <div><strong>Date:</strong> ${formatDate(ev.date)}</div>
            <div><strong>Time:</strong> ${ev.time}</div>
            <div><strong>Venue:</strong> ${ev.venue}</div>
          </div>
          <div class="mt-auto grid gap-3">
            <button type="button" class="btn btn-ghost rules-btn w-full !py-3" data-event="${ev.id}">View Rules</button>
            ${closed
              ? `<button type="button" disabled class="btn btn-ghost w-full !py-3 opacity-60 cursor-not-allowed"><i class="fa-solid fa-lock mr-1"></i> Registration Closed</button>`
              : `<a href="${toSitePath(`register.html?event=${encodeURIComponent(ev.id)}`)}" class="btn btn-primary w-full !py-3">Register Now <i class="fa-solid fa-arrow-right text-xs"></i></a>`}
          </div>
        </div>`;
      grid.appendChild(card);
    });
    lazyLoad();
  }

  /* --------------------------------------------------------- Lazy load */
  function lazyLoad() {
    const imgs = document.querySelectorAll("img.lazy:not(.loaded)");
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.addEventListener("load", () => img.classList.add("loaded"));
          obs.unobserve(img);
        }
      });
    }, { rootMargin: "150px" });
    imgs.forEach((img) => io.observe(img));
  }

  buildFilters();
  renderEvents();
  lazyLoad();
  loadEventStatuses();

  // If someone closes an event in the admin panel in another tab, this
  // page won't know until it refetches — do that automatically whenever
  // the visitor comes back to this tab, so "Closed" shows up without
  // needing a manual reload.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") loadEventStatuses();
  });

  const rulesModal = document.getElementById("rulesModal");
  const rulesTitle = document.getElementById("rulesTitle");
  const rulesList = document.getElementById("rulesList");

  function openRules(eventId) {
    const eventData = EVENTS.find((e) => e.id === eventId);
    if (!eventData || !rulesModal || !rulesTitle || !rulesList) return;
    const rules = RULES[eventId] || ["Rules are not available for this event yet."];
    rulesTitle.textContent = `${eventData.name} Rules`;
    rulesList.innerHTML = rules.map((rule) => `<li>${rule}</li>`).join("");
    rulesModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeRules() {
    if (!rulesModal) return;
    rulesModal.classList.add("hidden");
    document.body.style.overflow = "";
  }

  document.addEventListener("click", (e) => {
    const rulesBtn = e.target.closest?.(".rules-btn");
    if (rulesBtn) {
      openRules(rulesBtn.dataset.event);
      return;
    }
    if (e.target.id === "rulesModal" || e.target.closest?.(".rules-close")) {
      closeRules();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeRules();
  });

  /* ---------------------------------------------------------------FAQ */
  const FAQS = [
    { q: "Who can register for Connexion 26?", a: "Any student with a valid college ID can register for any event, whether or not you study at Riverbend College. Some events allow mixed-college teams." },
    { q: "How do I pay the registration fee?", a: "Payment details are shared by the organizing committee after you submit the registration form — you'll receive a confirmation email with the next step." },
    { q: "Can I register for more than one event?", a: "Yes. Fill out a separate registration for each event, since seat counts and rounds run independently." },
    { q: "What if my team size doesn't match the event minimum?", a: "Reach out to us at fest@riverbendcollege.edu before the deadline and we'll help you find teammates or adjust the entry." },
    { q: "Will I get a confirmation after registering?", a: "Yes — you'll land on a success page with a registration ID and QR code immediately, plus a confirmation email." },
  ];
  const faqList = document.getElementById("faqList");
  if (faqList) {
    FAQS.forEach((f, i) => {
      const item = document.createElement("div");
      item.className = "faq-item";
      item.setAttribute("data-aos", "fade-up");
      item.setAttribute("data-aos-delay", i * 40);
      item.innerHTML = `
        <button class="faq-q" aria-expanded="false">
          <span>${f.q}</span>
          <i class="fa-solid fa-plus faq-icon"></i>
        </button>
        <div class="faq-a">${f.a}</div>`;
      item.querySelector(".faq-q").addEventListener("click", () => {
        const isOpen = item.classList.contains("open");
        faqList.querySelectorAll(".faq-item").forEach((el) => el.classList.remove("open"));
        if (!isOpen) item.classList.add("open");
      });
      faqList.appendChild(item);
    });
  }

  /* --------------------------------------------------- Secret admin access */
  // The admin redirect easter egg is disabled so the homepage stays on the
  // public festival flow and only the explicit admin link opens the dashboard.
  (function () {
    const target = "admin";
    let buffer = "";
    document.addEventListener("keydown", (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key.length !== 1) return;
      buffer = (buffer + e.key.toLowerCase()).slice(-target.length);
      if (buffer === target) {
        e.preventDefault();
      }
    });
  })();

  /* ----------------------------------------------------------- Toast */
  window.showToast = function (message, type = "success") {
    const toast = document.getElementById("toast");
    if (!toast) return;
    const colors = { success: "var(--green)", error: "var(--red)" };
    toast.innerHTML = `<div class="glass rounded-2xl px-5 py-4 flex items-center gap-3 shadow-lg" style="border-color:${colors[type]}">
      <i class="fa-solid ${type === "success" ? "fa-circle-check" : "fa-circle-exclamation"}" style="color:${colors[type]}"></i>
      <span class="text-sm">${message}</span></div>`;
    requestAnimationFrame(() => { toast.style.transform = "translateY(0)"; toast.style.opacity = "1"; });
    setTimeout(() => { toast.style.transform = "translateY(6rem)"; toast.style.opacity = "0"; }, 3200);
  };

  /* -------------------------------------------------------- Contact */
  document.getElementById("contactForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    showToast("Message sent — we'll get back to you soon.");
    e.target.reset();
  });
})();
