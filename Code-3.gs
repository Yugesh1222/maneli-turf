/**
 * Code.gs — Connexion 26 registration + attendance backend
 * -----------------------------------------------------------------------
 * Paste this into the Apps Script editor of the Google Sheet you want to
 * use as your database (Extensions → Apps Script), replacing anything
 * that's there. This is the single source of truth for the whole
 * project's backend — register.js, script.js, admin.js and
 * coordinator.js all talk to this one file.
 *
 * Sheets it manages (all auto-created on first use):
 *  - "All Registrations"   — every registration, one row each
 *  - "<Event Name>"        — a mirror tab per event, for easy browsing
 *  - "Event Settings"      — open/closed flag + coordinator login per event
 *
 * doGet(e) actions:
 *  - ?action=all            → every registration row (admin dashboard)
 *  - ?action=stats          → registration totals per event
 *  - ?action=eventStatus    → { eventId: true/false closed } for every event
 *  - ?action=eventSettings  → per-event open/closed + coordinator name
 *                              (never returns the coordinator password)
 *  - ?action=eventRegistrations&eventId=xxx
 *                            → rows for one event, with attendance status
 *                              (coordinator dashboard)
 *  - ?action=verifyCoordinator&eventId=xxx&password=yyy
 *                            → coordinator login check
 *
 * doPost(e) actions (JSON body):
 *  - default / no action    → new registration (from register.js)
 *  - action:"setEventStatus"  {adminKey, eventId, eventName, closed}
 *  - action:"setCoordinator"  {adminKey, eventId, eventName, coordinatorName, coordinatorPassword}
 *  - action:"markPresent"     {eventId, registrationId, coordinatorName}
 *
 * Setup:
 *  1. Deploy → New deployment → Web app → Execute as "Me" → Who has
 *     access "Anyone" → Deploy. Copy the /exec URL.
 *  2. Paste that URL into APPS_SCRIPT_URL in register.js, script.js,
 *     admin.js and coordinator.js.
 *  3. After editing this file again, use Deploy → Manage deployments →
 *     Edit (pencil) → New version, or the live URL won't update.
 * -----------------------------------------------------------------------
 */

const DRIVE_FOLDER_ID = ""; // leave blank to auto-create "Connexion 26 - ID Photos"

// Must match ADMIN_PASSWORD in admin.js exactly. Anyone who doesn't send
// this key gets rejected from admin-only actions (open/close an event,
// set a coordinator's password).
const ADMIN_KEY = "CONNEXION26ADMIN";

const ALL_REGISTRATIONS_SHEET = "All Registrations";
const EVENT_SETTINGS_SHEET = "Event Settings";
const EVENT_SETTINGS_HEADERS = ["Event ID", "Event Name", "Closed", "Coordinator Name", "Coordinator Password", "Updated At"];
const GREEN = "#d9ead3";

const BASE_HEADERS = [
  "Timestamp", "Registration ID", "Event Name", "Event ID", "Band",
  "Full Name", "Roll Number", "Class", "Section", "Mobile Number", "Email Address",
  "ID Card Photo", "Team Event?", "Team Size",
];
const TEAMMATE_COLUMNS = [];
for (let i = 2; i <= 6; i++) TEAMMATE_COLUMNS.push(`Teammate ${i} Name`, `Teammate ${i} Roll No`, `Teammate ${i} Mobile`);
const ATTENDANCE_COLUMNS = ["Attendance Status", "Present At", "Marked By"];
const HEADERS = BASE_HEADERS.concat(TEAMMATE_COLUMNS).concat(ATTENDANCE_COLUMNS);

/* ------------------------------------------------------------------ */
/* doGet                                                               */
/* ------------------------------------------------------------------ */
function doGet(e) {
  const p = (e && e.parameter) || {};
  const action = p.action || "";

  try {
    if (action === "eventStatus") {
      return jsonResponse({ success: true, statuses: getClosedMap() });
    }
    if (action === "eventSettings") {
      return jsonResponse({ success: true, settings: getEventSettingsList() });
    }
    if (action === "eventRegistrations") {
      return jsonResponse({ success: true, rows: getRowsByEventId(p.eventId || "") });
    }
    if (action === "verifyCoordinator") {
      return jsonResponse(verifyCoordinator(p.eventId || "", p.password || ""));
    }
    if (action === "stats") {
      const rows = sheetToObjects(getOrCreateSheet(ALL_REGISTRATIONS_SHEET));
      const byEvent = {};
      rows.forEach((r) => { const ev = r["Event Name"] || "Unknown"; byEvent[ev] = (byEvent[ev] || 0) + 1; });
      return jsonResponse({ success: true, total: rows.length, byEvent });
    }
    // default: action=all
    return jsonResponse({ success: true, rows: sheetToObjects(getOrCreateSheet(ALL_REGISTRATIONS_SHEET)) });
  } catch (err) {
    return jsonResponse({ success: false, error: String(err) });
  }
}

/* ------------------------------------------------------------------ */
/* doPost                                                              */
/* ------------------------------------------------------------------ */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.action === "setEventStatus") {
      if (!ADMIN_KEY || data.adminKey !== ADMIN_KEY) return jsonResponse({ success: false, error: "Not authorized." });
      upsertEventSettings(data.eventId, { eventName: data.eventName, closed: !!data.closed });
      return jsonResponse({ success: true });
    }

    if (data.action === "setCoordinator") {
      if (!ADMIN_KEY || data.adminKey !== ADMIN_KEY) return jsonResponse({ success: false, error: "Not authorized." });
      if (!data.coordinatorPassword) return jsonResponse({ success: false, error: "Coordinator password can't be empty." });
      upsertEventSettings(data.eventId, {
        eventName: data.eventName,
        coordinatorName: data.coordinatorName || "Coordinator",
        coordinatorPassword: data.coordinatorPassword,
      });
      return jsonResponse({ success: true });
    }

    if (data.action === "markPresent") {
      return jsonResponse(markPresent(data.eventId, data.registrationId, data.coordinatorName));
    }

    // default: new registration
    return jsonResponse(handleRegistration(data));
  } catch (err) {
    return jsonResponse({ success: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/* ------------------------------------------------------------------ */
/* Registration                                                        */
/* ------------------------------------------------------------------ */
function handleRegistration(data) {
  if (!data.fullName || !data.rollNumber || !data.mobile || !data.email) {
    return { success: false, error: "Missing required fields." };
  }
  if (isEventClosed(data.eventId)) {
    return { success: false, error: "Registration is closed for this event." };
  }

  const registrationId = buildRegistrationId(data.eventId);
  const timestamp = new Date();
  const photoLink = saveIdPhoto(data.idPhoto, registrationId);

  const teammates = Array.isArray(data.teammates) ? data.teammates : [];
  const teammateCells = [];
  for (let i = 0; i < 5; i++) {
    const t = teammates[i] || {};
    teammateCells.push(t.name || "", t.rollNumber || "", t.mobile || "");
  }

  const row = [
    timestamp, registrationId, data.eventName || "", data.eventId || "", data.band || "",
    data.fullName || "", data.rollNumber || "", data.className || "", data.section || "",
    data.mobile || "", data.email || "", photoLink || "", data.isTeamEvent || "No", data.participants || 1,
  ].concat(teammateCells, ["Not marked", "", ""]);

  appendRow(data.eventName || "Unfiled", row);
  appendRow(ALL_REGISTRATIONS_SHEET, row);

  return { success: true, registrationId };
}

/* ------------------------------------------------------------------ */
/* Event open/close + coordinator settings                            */
/* ------------------------------------------------------------------ */
function getOrCreateSettingsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(EVENT_SETTINGS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(EVENT_SETTINGS_SHEET);
    sheet.appendRow(EVENT_SETTINGS_HEADERS);
    sheet.getRange(1, 1, 1, EVENT_SETTINGS_HEADERS.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getEventSettingsRows_() {
  const sheet = getOrCreateSettingsSheet();
  const values = sheet.getDataRange().getValues();
  const out = [];
  for (let r = 1; r < values.length; r++) {
    out.push({ rowNum: r + 1, eventId: values[r][0], eventName: values[r][1], closed: values[r][2], coordinatorName: values[r][3], coordinatorPassword: values[r][4] });
  }
  return out;
}

function upsertEventSettings(eventId, fields) {
  if (!eventId) throw new Error("Missing eventId.");
  const sheet = getOrCreateSettingsSheet();
  const rows = getEventSettingsRows_();
  const existing = rows.find((r) => r.eventId === eventId);
  const now = new Date();

  if (existing) {
    if (fields.eventName) sheet.getRange(existing.rowNum, 2).setValue(fields.eventName);
    if (typeof fields.closed === "boolean") sheet.getRange(existing.rowNum, 3).setValue(fields.closed);
    if (fields.coordinatorName !== undefined) sheet.getRange(existing.rowNum, 4).setValue(fields.coordinatorName);
    if (fields.coordinatorPassword !== undefined) sheet.getRange(existing.rowNum, 5).setValue(fields.coordinatorPassword);
    sheet.getRange(existing.rowNum, 6).setValue(now);
  } else {
    sheet.appendRow([
      eventId,
      fields.eventName || "",
      typeof fields.closed === "boolean" ? fields.closed : false,
      fields.coordinatorName || "",
      fields.coordinatorPassword || "",
      now,
    ]);
  }
}

function getClosedMap() {
  const map = {};
  getEventSettingsRows_().forEach((r) => {
    if (r.eventId) map[r.eventId] = r.closed === true || String(r.closed).toUpperCase() === "TRUE";
  });
  return map;
}

function isEventClosed(eventId) {
  if (!eventId) return false;
  return !!getClosedMap()[eventId];
}

function getEventSettingsList() {
  // Deliberately omits coordinatorPassword — this can be fetched by
  // anyone with the Apps Script URL, so the password is write-only.
  return getEventSettingsRows_().map((r) => ({
    eventId: r.eventId,
    eventName: r.eventName,
    closed: r.closed === true || String(r.closed).toUpperCase() === "TRUE",
    coordinatorName: r.coordinatorName || "",
    coordinatorConfigured: !!r.coordinatorPassword,
  }));
}

function verifyCoordinator(eventId, password) {
  const rows = getEventSettingsRows_();
  const entry = rows.find((r) => r.eventId === eventId);
  if (!entry || !entry.coordinatorPassword) {
    return { success: false, error: "No coordinator has been set up for this event yet. Ask the admin to add one." };
  }
  if (String(entry.coordinatorPassword) !== String(password)) {
    return { success: false, error: "Incorrect password." };
  }
  return { success: true, eventId, eventName: entry.eventName || eventId, coordinatorName: entry.coordinatorName || "Coordinator" };
}

/* ------------------------------------------------------------------ */
/* Attendance                                                          */
/* ------------------------------------------------------------------ */
function getRowsByEventId(eventId) {
  const all = sheetToObjects(getOrCreateSheet(ALL_REGISTRATIONS_SHEET));
  if (!eventId) return [];
  return all.filter((r) => String(r["Event ID"]) === String(eventId));
}

function markPresent(eventId, registrationId, coordinatorName) {
  if (!registrationId) return { success: false, error: "No registration ID given." };

  const allSheet = getOrCreateSheet(ALL_REGISTRATIONS_SHEET);
  const allValues = allSheet.getDataRange().getValues();
  if (allValues.length < 2) return { success: false, error: "No registrations found yet." };
  const headers = allValues[0];
  const idCol = headers.indexOf("Registration ID");
  const eventIdCol = headers.indexOf("Event ID");
  const nameCol = headers.indexOf("Full Name");
  const statusCol = headers.indexOf("Attendance Status");
  const presentAtCol = headers.indexOf("Present At");
  const markedByCol = headers.indexOf("Marked By");
  const eventNameCol = headers.indexOf("Event Name");

  let rowIndex = -1;
  for (let r = 1; r < allValues.length; r++) {
    if (String(allValues[r][idCol]).toLowerCase() === String(registrationId).toLowerCase()) { rowIndex = r; break; }
  }
  if (rowIndex === -1) return { success: false, error: "Registration ID not found." };

  if (eventId && String(allValues[rowIndex][eventIdCol]) !== String(eventId)) {
    return { success: false, error: "This ticket belongs to a different event." };
  }

  const participantName = allValues[rowIndex][nameCol];
  const eventName = allValues[rowIndex][eventNameCol];
  const alreadyMarked = String(allValues[rowIndex][statusCol]) === "Present";
  if (alreadyMarked) {
    return {
      success: true,
      alreadyMarked: true,
      name: participantName,
      message: `${participantName} was already marked present at ${allValues[rowIndex][presentAtCol]}.`,
    };
  }

  const timestamp = new Date();
  const rowNum = rowIndex + 1;
  allSheet.getRange(rowNum, statusCol + 1).setValue("Present");
  allSheet.getRange(rowNum, presentAtCol + 1).setValue(timestamp);
  allSheet.getRange(rowNum, markedByCol + 1).setValue(coordinatorName || "Coordinator");
  allSheet.getRange(rowNum, 1, 1, headers.length).setBackground(GREEN);

  // mirror onto the per-event tab too, best-effort
  try {
    const evSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(eventName);
    if (evSheet) {
      const evValues = evSheet.getDataRange().getValues();
      const evHeaders = evValues[0];
      const evIdCol = evHeaders.indexOf("Registration ID");
      for (let r = 1; r < evValues.length; r++) {
        if (String(evValues[r][evIdCol]).toLowerCase() === String(registrationId).toLowerCase()) {
          const evRowNum = r + 1;
          evSheet.getRange(evRowNum, evHeaders.indexOf("Attendance Status") + 1).setValue("Present");
          evSheet.getRange(evRowNum, evHeaders.indexOf("Present At") + 1).setValue(timestamp);
          evSheet.getRange(evRowNum, evHeaders.indexOf("Marked By") + 1).setValue(coordinatorName || "Coordinator");
          evSheet.getRange(evRowNum, 1, 1, evHeaders.length).setBackground(GREEN);
          break;
        }
      }
    }
  } catch (err) { /* non-fatal — All Registrations is the source of truth */ }

  return { success: true, alreadyMarked: false, name: participantName, message: `${participantName} marked present.` };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
function buildRegistrationId(eventId) {
  const prefix = (eventId || "GEN").slice(0, 3).toUpperCase();
  const ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "Etc/UTC", "yyMMddHHmmss");
  const rand = Math.floor(100 + Math.random() * 900);
  return `SPEC26-${prefix}-${ts}${rand}`;
}

function saveIdPhoto(idPhoto, registrationId) {
  if (!idPhoto || !idPhoto.data) return "";
  try {
    const folder = getOrCreateFolder();
    const bytes = Utilities.base64Decode(idPhoto.data);
    const mimeType = idPhoto.mimeType || "image/jpeg";
    const fileName = `${registrationId}_${idPhoto.fileName || "id-photo"}`;
    const blob = Utilities.newBlob(bytes, mimeType, fileName);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (err) {
    return `Upload failed: ${err}`;
  }
}

function getOrCreateFolder() {
  if (DRIVE_FOLDER_ID) return DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const name = "Connexion 26 - ID Photos";
  const existing = DriveApp.getFoldersByName(name);
  if (existing.hasNext()) return existing.next();
  return DriveApp.createFolder(name);
}

function getOrCreateSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function appendRow(sheetName, row) {
  getOrCreateSheet(sheetName).appendRow(row);
}

function sheetToObjects(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  const out = [];
  for (let r = 1; r < values.length; r++) {
    const obj = {};
    headers.forEach((h, i) => {
      let v = values[r][i];
      if (v instanceof Date) v = Utilities.formatDate(v, Session.getScriptTimeZone() || "Etc/UTC", "yyyy-MM-dd HH:mm:ss");
      obj[h] = v;
    });
    out.push(obj);
  }
  return out;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
