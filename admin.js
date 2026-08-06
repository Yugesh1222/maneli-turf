/**
 * admin.js — set this to the SAME Apps Script deployment URL used in
 * register.js. This dashboard is unauthenticated by default: if you put
 * it online, gate access (e.g. behind your college SSO or a shared link)
 * before sharing it, since it can display participant contact details.
 */
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz2vE5-7lpj_Jf4fuIXwmrLka0plsTKBTabgyVXLfSb7YKoDbt3wX6FBDlcBu0Tol7M/exec";

/**
 * Change this before you deploy. This is a client-side deterrent only —
 * anyone who views the page source can read it — not real authentication.
 * For real protection, put this page behind your hosting provider's
 * password protection or your college's SSO.
 *
 * This same string is also sent to Code.gs as the "admin key" whenever
 * you open/close registration for an event, so it MUST match ADMIN_KEY
 * in Code.gs exactly, or the close/open button will fail with
 * "Not authorized."
 */
const ADMIN_PASSWORD = "CONNEXION26ADMIN";

(function () {
  "use strict";

  const authGate = document.getElementById("authGate");
  const authForm = document.getElementById("authForm");
  const dashboard = document.getElementById("dashboardContent");
  if (!authGate || !authForm || !dashboard) return;

  authForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const authPassword = document.getElementById("authPassword");
    const authError = document.getElementById("authError");
    const entered = authPassword?.value || "";
    if (entered === ADMIN_PASSWORD) {
      authGate.remove();
      dashboard.classList.remove("hidden");
      loadData();
      loadEventSettings();
    } else {
      if (authError) authError.textContent = "Incorrect password.";
      authPassword?.classList.add("invalid");
    }
  });

  let allRows = [];
  const HEADERS = [
    "Timestamp", "Registration ID", "Event Name", "Event ID", "Band", "Full Name", "Roll Number",
    "Class", "Section", "Mobile Number", "Email Address", "ID Card Photo",
    "Team Event?", "Team Size",
    "Teammate 2 Name", "Teammate 2 Roll No", "Teammate 2 Mobile",
    "Teammate 3 Name", "Teammate 3 Roll No", "Teammate 3 Mobile",
    "Teammate 4 Name", "Teammate 4 Roll No", "Teammate 4 Mobile",
    "Teammate 5 Name", "Teammate 5 Roll No", "Teammate 5 Mobile",
    "Teammate 6 Name", "Teammate 6 Roll No", "Teammate 6 Mobile",
    "Attendance Status", "Present At", "Marked By",
  ];

  async function loadData() {
    const configNotice = document.getElementById("configNotice");
    if (APPS_SCRIPT_URL.includes("YOUR_DEPLOYMENT_ID")) {
      if (configNotice) configNotice.classList.remove("hidden");
      renderEmpty();
      return;
    }
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?action=all`);
      const data = await res.json();
      allRows = data.rows || [];
      render();
    } catch (err) {
      console.error(err);
      renderEmpty();
    }
  }

  function renderEmpty() {
    const kpiTotal = document.getElementById("kpiTotal");
    const kpiEvents = document.getElementById("kpiEvents");
    const kpiTop = document.getElementById("kpiTop");
    const kpiAvg = document.getElementById("kpiAvg");
    const emptyState = document.getElementById("emptyState");
    if (kpiTotal) kpiTotal.textContent = "0";
    if (kpiEvents) kpiEvents.textContent = "0";
    if (kpiTop) kpiTop.textContent = "—";
    if (kpiAvg) kpiAvg.textContent = "—";
    emptyState?.classList.remove("hidden");
  }

  function render() {
    if (!allRows.length) { renderEmpty(); return; }
    const emptyState = document.getElementById("emptyState");
    emptyState?.classList.add("hidden");

    const byEvent = {};
    let totalParticipants = 0;
    allRows.forEach((r) => {
      const ev = r["Event Name"] || "Unknown";
      byEvent[ev] = (byEvent[ev] || 0) + 1;
      totalParticipants += Number(r["Team Size"]) || 1;
    });
    const topEvent = Object.entries(byEvent).sort((a, b) => b[1] - a[1])[0];
    const kpiTotal = document.getElementById("kpiTotal");
    const kpiEvents = document.getElementById("kpiEvents");
    const kpiTop = document.getElementById("kpiTop");
    const kpiAvg = document.getElementById("kpiAvg");
    if (kpiTotal) kpiTotal.textContent = allRows.length;
    if (kpiEvents) kpiEvents.textContent = Object.keys(byEvent).length;
    if (kpiTop) kpiTop.textContent = topEvent ? `${topEvent[0]} (${topEvent[1]})` : "—";
    if (kpiAvg) kpiAvg.textContent = (totalParticipants / allRows.length).toFixed(1);

    renderChart(byEvent);
    renderTable(allRows);
  }

  let chartInstance;
  function renderChart(byEvent) {
    const ctx = document.getElementById("eventChart");
    if (!ctx || typeof Chart === "undefined") return;
    const labels = Object.keys(byEvent);
    const values = Object.values(byEvent);
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Registrations",
          data: values,
          backgroundColor: "#7C3AED",
          borderRadius: 6,
          maxBarThickness: 34,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: "#9797A8", font: { family: "JetBrains Mono", size: 10 } } },
          y: { beginAtZero: true, ticks: { color: "#9797A8", precision: 0 }, grid: { color: "rgba(255,255,255,0.06)" } },
        },
      },
    });
  }

  function renderTable(rows) {
    const head = document.getElementById("tableHead");
    const body = document.getElementById("tableBody");
    if (!head || !body) return;
    head.innerHTML = HEADERS.map((h) => `<th>${h}</th>`).join("");
    body.innerHTML = rows
      .map((r) => `<tr>${HEADERS.map((h) => `<td>${escapeHtml(r[h] ?? "")}</td>`).join("")}</tr>`)
      .join("");
  }

  function escapeHtml(v) {
    return String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  document.getElementById("searchInput")?.addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    const filtered = !q ? allRows : allRows.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(q)));
    renderTable(filtered);
  });

  document.getElementById("refreshBtn")?.addEventListener("click", loadData);

  document.getElementById("csvBtn")?.addEventListener("click", () => {
    const csv = [HEADERS.join(",")]
      .concat(allRows.map((r) => HEADERS.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(",")))
      .join("\n");
    downloadBlob(csv, "connexion26-registrations.csv", "text/csv");
  });

  document.getElementById("xlsxBtn")?.addEventListener("click", () => {
    if (typeof XLSX === "undefined") return;
    const ws = XLSX.utils.json_to_sheet(allRows, { header: HEADERS });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Registrations");
    XLSX.writeFile(wb, "connexion26-registrations.xlsx");
  });

  function downloadBlob(content, filename, type) {
    const blob = new Blob([content], { type });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }
  /* ------------------------------------------------ Event controls */
  let eventSettings = {}; // eventId -> { closed, coordinatorName, coordinatorConfigured }

  async function loadEventSettings() {
    if (APPS_SCRIPT_URL.includes("YOUR_DEPLOYMENT_ID")) return;
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?action=eventSettings`);
      const data = await res.json();
      eventSettings = {};
      (data.settings || []).forEach((s) => { eventSettings[s.eventId] = s; });
    } catch (err) {
      console.error(err);
      eventSettings = {};
    }
    renderEventStatusList();
    populateEventSelect();
  }

  function renderEventStatusList() {
    const list = document.getElementById("eventStatusList");
    if (!list || typeof EVENTS === "undefined") return;
    list.innerHTML = EVENTS.map((ev) => {
      const s = eventSettings[ev.id] || {};
      const closed = !!s.closed;
      return `
        <div class="rounded-2xl p-4 flex items-center justify-between gap-3 cursor-pointer event-status-card" data-event-id="${ev.id}" style="background:var(--bg-elev); border:1px solid var(--line)">
          <div class="min-w-0">
            <div class="font-medium text-sm truncate">${ev.name}</div>
            <div class="text-xs mt-0.5 flex items-center gap-2">
              <span class="${closed ? "text-red-400" : "text-emerald-400"}">${closed ? "Closed" : "Open"}</span>
              <span class="text-[var(--text-faint)]">·</span>
              <span class="text-[var(--text-dim)]">${s.coordinatorConfigured ? `Coordinator: ${s.coordinatorName || "set"}` : "No coordinator yet"}</span>
            </div>
          </div>
          <button type="button" class="btn ${closed ? "btn-primary" : "btn-ghost"} !py-2 !px-3 !text-xs shrink-0 event-status-toggle" data-event-id="${ev.id}" data-event-name="${ev.name}" data-closed="${closed}">
            ${closed ? "Reopen" : "Close"}
          </button>
        </div>`;
    }).join("");
  }

  document.getElementById("eventStatusList")?.addEventListener("click", async (e) => {
    const toggleBtn = e.target.closest?.(".event-status-toggle");
    if (toggleBtn) {
      e.stopPropagation();
      const eventId = toggleBtn.dataset.eventId;
      const eventName = toggleBtn.dataset.eventName;
      const nextClosed = toggleBtn.dataset.closed !== "true";
      toggleBtn.disabled = true;
      const originalText = toggleBtn.textContent;
      toggleBtn.textContent = "…";
      try {
        const res = await fetch(APPS_SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "setEventStatus", adminKey: ADMIN_PASSWORD, eventId, eventName, closed: nextClosed }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Update failed.");
        eventSettings[eventId] = { ...(eventSettings[eventId] || {}), eventId, eventName, closed: nextClosed };
        renderEventStatusList();
        if (document.getElementById("eventSelect")?.value === eventId) syncFormToSelection(eventId);
      } catch (err) {
        console.error(err);
        alert(err.message || "Could not update registration status.");
        toggleBtn.disabled = false;
        toggleBtn.textContent = originalText;
      }
      return;
    }
    const card = e.target.closest?.(".event-status-card");
    if (card) {
      const select = document.getElementById("eventSelect");
      if (select) { select.value = card.dataset.eventId; syncFormToSelection(card.dataset.eventId); }
    }
  });

  function populateEventSelect() {
    const select = document.getElementById("eventSelect");
    if (!select || typeof EVENTS === "undefined") return;
    if (!select.dataset.populated) {
      select.innerHTML = EVENTS.map((ev) => `<option value="${ev.id}">${ev.name}</option>`).join("");
      select.dataset.populated = "true";
      select.addEventListener("change", () => syncFormToSelection(select.value));
    }
    if (select.value) syncFormToSelection(select.value);
    else if (EVENTS.length) syncFormToSelection(EVENTS[0].id);
  }

  function syncFormToSelection(eventId) {
    const s = eventSettings[eventId] || {};
    const openToggle = document.getElementById("eventOpenToggle");
    const nameInput = document.getElementById("coordinatorNameInput");
    const passInput = document.getElementById("coordinatorPasswordInput");
    const note = document.getElementById("coordinatorConfiguredNote");
    if (openToggle) openToggle.checked = !s.closed;
    if (nameInput) nameInput.value = s.coordinatorName || "";
    if (passInput) passInput.value = "";
    if (note) note.textContent = s.coordinatorConfigured
      ? "A password is already set — leave this blank to keep it, or type a new one to replace it."
      : "No coordinator set up yet for this event.";
  }

  document.getElementById("saveControlBtn")?.addEventListener("click", async () => {
    const select = document.getElementById("eventSelect");
    const eventId = select?.value;
    const ev = typeof EVENTS !== "undefined" ? EVENTS.find((x) => x.id === eventId) : null;
    if (!eventId || !ev) return;

    const btn = document.getElementById("saveControlBtn");
    const msg = document.getElementById("controlSaveMsg");
    const openToggle = document.getElementById("eventOpenToggle");
    const nameInput = document.getElementById("coordinatorNameInput");
    const passInput = document.getElementById("coordinatorPasswordInput");

    btn.disabled = true;
    if (msg) { msg.textContent = "Saving…"; msg.className = "text-xs mt-3 text-center text-[var(--text-dim)]"; }

    try {
      const statusRes = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "setEventStatus", adminKey: ADMIN_PASSWORD, eventId, eventName: ev.name, closed: !openToggle.checked }),
      });
      const statusData = await statusRes.json();
      if (!statusData.success) throw new Error(statusData.error || "Could not save open/closed status.");

      if (passInput.value.trim()) {
        const coordRes = await fetch(APPS_SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "setCoordinator",
            adminKey: ADMIN_PASSWORD,
            eventId,
            eventName: ev.name,
            coordinatorName: nameInput.value.trim() || "Coordinator",
            coordinatorPassword: passInput.value.trim(),
          }),
        });
        const coordData = await coordRes.json();
        if (!coordData.success) throw new Error(coordData.error || "Could not save coordinator login.");
      }

      if (msg) { msg.textContent = "Saved."; msg.className = "text-xs mt-3 text-center text-emerald-400"; }
      await loadEventSettings();
      document.getElementById("eventSelect").value = eventId;
      syncFormToSelection(eventId);
    } catch (err) {
      console.error(err);
      if (msg) { msg.textContent = err.message || "Something went wrong."; msg.className = "text-xs mt-3 text-center text-red-400"; }
    } finally {
      btn.disabled = false;
    }
  });

  document.getElementById("refreshBtn")?.addEventListener("click", loadEventSettings);

})();
