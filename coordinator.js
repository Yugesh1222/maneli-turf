/**
 * coordinator.js — set this to the SAME Apps Script deployment URL used
 * in register.js / admin.js / script.js. An admin must first set up a
 * coordinator name + password for an event from the admin dashboard's
 * "Event controls" panel before that event's coordinator can log in here.
 */
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz8-Rc0JxZ45oF6nyM4HLiVDDuDlmNgf7Jlai2Y2FhM_CNhNIv3k8qi_r0hHAxzCz2f/exec";

(function () {
  "use strict";

  window.addEventListener("load", () => document.getElementById("loader")?.classList.add("hidden"));

  const loginGate = document.getElementById("loginGate");
  const loginForm = document.getElementById("loginForm");
  const dashboard = document.getElementById("dashboard");
  if (!loginGate || !loginForm || !dashboard) return;

  const loginEventSelect = document.getElementById("loginEventSelect");
  if (loginEventSelect) {
    if (typeof EVENTS !== "undefined" && Array.isArray(EVENTS) && EVENTS.length) {
      loginEventSelect.innerHTML = EVENTS.map((ev) => `<option value="${ev.id}">${ev.name}</option>`).join("");
    } else {
      loginEventSelect.innerHTML = `<option value="">⚠ events.js didn't load</option>`;
      const err = document.getElementById("loginError");
      if (err) err.textContent = "Couldn't find any events — make sure events.js is uploaded in the same folder as coordinator.html, before coordinator.js.";
    }
  }

  let session = null; // { eventId, eventName, coordinatorName }
  let allRows = [];
  let scanCooldown = new Map(); // regId -> timestamp, to ignore rapid duplicate scans
  let html5QrCode = null;
  let scanning = false;

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const eventId = loginEventSelect?.value;
    const password = (document.getElementById("loginPassword")?.value || "").trim();
    const loginError = document.getElementById("loginError");
    if (loginError) loginError.textContent = "";

    const submitBtn = loginForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Checking…";

    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?action=verifyCoordinator&eventId=${encodeURIComponent(eventId)}&password=${encodeURIComponent(password)}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Login failed.");

      session = { eventId: data.eventId, eventName: data.eventName, coordinatorName: data.coordinatorName };
      loginGate.remove();
      dashboard.classList.remove("hidden");
      document.getElementById("logoutBtn")?.classList.remove("hidden");
      document.getElementById("eventTitle").textContent = session.eventName;
      document.getElementById("coordinatorGreeting").textContent = `Signed in as ${session.coordinatorName}`;
      loadRegistrations();
    } catch (err) {
      if (loginError) loginError.textContent = err.message || "Login failed.";
      submitBtn.disabled = false;
      submitBtn.textContent = "Log in";
    }
  });

  document.getElementById("logoutBtn")?.addEventListener("click", () => window.location.reload());

  /* ------------------------------------------------------ Data load */
  async function loadRegistrations() {
    if (!session) return;
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?action=eventRegistrations&eventId=${encodeURIComponent(session.eventId)}`);
      const data = await res.json();
      allRows = data.rows || [];
      renderTable(allRows);
      renderStats();
    } catch (err) {
      console.error(err);
    }
  }

  function renderStats() {
    const present = allRows.filter((r) => r["Attendance Status"] === "Present").length;
    document.getElementById("statPresent").textContent = present;
    document.getElementById("statTotal").textContent = allRows.length;
  }

  function renderTable(rows) {
    const body = document.getElementById("tableBody");
    const emptyState = document.getElementById("emptyState");
    if (!body) return;
    if (!rows.length) {
      body.innerHTML = "";
      emptyState?.classList.remove("hidden");
      return;
    }
    emptyState?.classList.add("hidden");
    body.innerHTML = rows.map((r) => {
      const present = r["Attendance Status"] === "Present";
      return `<tr>
        <td class="font-mono text-xs">${escapeHtml(r["Registration ID"] || "")}</td>
        <td>${escapeHtml(r["Full Name"] || "")}</td>
        <td>${escapeHtml(r["Roll Number"] || "")}</td>
        <td>${escapeHtml(r["Class"] || "")} ${escapeHtml(r["Section"] || "")}</td>
        <td>${escapeHtml(r["Mobile Number"] || "")}</td>
        <td><span class="status-pill ${present ? "present" : "pending"}">${present ? "Present" : "Not marked"}</span></td>
      </tr>`;
    }).join("");
  }

  function escapeHtml(v) {
    return String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  document.getElementById("searchInput")?.addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    const filtered = !q ? allRows : allRows.filter((r) =>
      String(r["Full Name"] || "").toLowerCase().includes(q) ||
      String(r["Roll Number"] || "").toLowerCase().includes(q) ||
      String(r["Registration ID"] || "").toLowerCase().includes(q)
    );
    renderTable(filtered);
  });

  document.getElementById("refreshBtn")?.addEventListener("click", loadRegistrations);

  /* -------------------------------------------------------- Marking */
  async function markPresent(regId) {
    if (!session || !regId) return;
    const resultBox = document.getElementById("scanResult");
    resultBox?.classList.remove("hidden");
    if (resultBox) {
      resultBox.style.background = "var(--bg-elev)";
      resultBox.style.border = "1px solid var(--line)";
      resultBox.innerHTML = `<span class="text-[var(--text-dim)]">Checking ${escapeHtml(regId)}…</span>`;
    }
    try {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "markPresent",
          eventId: session.eventId,
          registrationId: regId,
          coordinatorName: session.coordinatorName,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Could not mark attendance.");

      if (resultBox) {
        if (data.alreadyMarked) {
          resultBox.style.background = "rgba(245,158,11,0.12)";
          resultBox.style.border = "1px solid rgba(245,158,11,0.4)";
          resultBox.innerHTML = `<i class="fa-solid fa-clock-rotate-left mr-2"></i>${escapeHtml(data.message)}`;
        } else {
          resultBox.style.background = "rgba(16,185,129,0.12)";
          resultBox.style.border = "1px solid rgba(16,185,129,0.4)";
          resultBox.innerHTML = `<i class="fa-solid fa-circle-check mr-2"></i>${escapeHtml(data.message)}`;
        }
      }
      loadRegistrations();
    } catch (err) {
      console.error(err);
      if (resultBox) {
        resultBox.style.background = "rgba(239,68,68,0.12)";
        resultBox.style.border = "1px solid rgba(239,68,68,0.4)";
        resultBox.innerHTML = `<i class="fa-solid fa-triangle-exclamation mr-2"></i>${escapeHtml(err.message || "Could not mark attendance.")}`;
      }
    }
  }

  document.getElementById("manualForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("manualRegId");
    const val = input?.value.trim();
    if (val) markPresent(val);
    if (input) input.value = "";
  });

  /* --------------------------------------------------------- Scanner */
  const scanToggleBtn = document.getElementById("scanToggleBtn");
  const qrReaderEl = document.getElementById("qrReader");

  scanToggleBtn?.addEventListener("click", () => {
    if (scanning) stopScanner(); else startScanner();
  });

  function startScanner() {
    if (typeof Html5Qrcode === "undefined") {
      alert("QR scanner library didn't load — check your internet connection, or use manual entry below.");
      return;
    }
    qrReaderEl.classList.remove("hidden");
    scanToggleBtn.textContent = "Stop camera";
    html5QrCode = new Html5Qrcode("qrReader");
    html5QrCode
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => onScanSuccess(decodedText.trim())
      )
      .then(() => { scanning = true; })
      .catch((err) => {
        console.error(err);
        alert("Couldn't access the camera. Check camera permissions, or use manual entry below.");
        qrReaderEl.classList.add("hidden");
        scanToggleBtn.textContent = "Start camera";
      });
  }

  function stopScanner() {
    if (html5QrCode) {
      html5QrCode.stop().then(() => html5QrCode.clear()).catch(() => {});
    }
    scanning = false;
    qrReaderEl.classList.add("hidden");
    scanToggleBtn.textContent = "Start camera";
  }

  function onScanSuccess(text) {
    const now = Date.now();
    const last = scanCooldown.get(text) || 0;
    if (now - last < 4000) return; // ignore repeat scans of the same code within 4s
    scanCooldown.set(text, now);
    markPresent(text);
  }

  window.addEventListener("beforeunload", () => { if (scanning) stopScanner(); });
})();
