# Connexion 26 — Lucafama Cultural Forum Registration Website

A premium, animated, fully responsive registration website for a cultural
forum, with a Google Sheets backend (no database or server required).

**Design concept:** the fest is themed around a prism splitting white light
into six color "bands" — Stage, Visual, Mind, Arena, and Social. Every
event belongs to a band, and that band's color follows it through the
event card, the badge, and the registration page. It's the one signature
device the whole site is built around; everything else stays quiet on
purpose.

---

## 1. File structure

```
connexion26/
├── index.html        Landing page (hero, about, categories, events, gallery, FAQ, contact)
├── register.html     Multi-step registration form (event auto-filled & locked from URL)
├── success.html      Confirmation page with QR code + downloadable receipt
├── admin.html         Admin dashboard (totals, chart, search, CSV/Excel export,
│                       event open/close, coordinator setup)
├── coordinator.html   Per-event coordinator portal (QR scan / manual entry
│                       attendance marking) — one shared page, event picked at login
├── style.css          Design tokens + all shared/component styles
├── events.js          Single source of truth for event data — add events here
├── script.js          Homepage behaviour (nav, theme, countdown, cards, FAQ)
├── register.js        Registration form logic, validation, submit to Apps Script
├── admin.js           Admin dashboard logic
├── coordinator.js     Coordinator portal logic (login, scanner, table)
├── Code.gs            Google Apps Script backend — paste into your Sheet's
│                       Apps Script editor (Extensions → Apps Script)
├── logo.png.jpeg      Fest logo used in the navbar (already in your repo)
├── loader-logo.jpg    Fest logo used for the branded loading screen /
│                       "submitting…" overlay — must sit next to index.html
└── README.md          You are here
```

Everything runs from static files — no build step, no npm install. Open
`index.html` in a browser, or upload the folder to any static host
(GitHub Pages, Netlify, Vercel, or your college's own web space).

**`loader-logo.jpg` is a required asset** — copy it to the same folder
as `index.html`. Without it, the loading screen and the "Submitting
your registration…" overlay will just show a broken image icon
(everything else still works).

**All five files that talk to Google Sheets — `register.js`,
`script.js`, `admin.js`, `coordinator.js` — must have the exact same
`APPS_SCRIPT_URL`** at the top. If you update your Apps Script
deployment, update it in all four places.

---

## 2. Adding or editing events

Open `events.js` and add an object to the `EVENTS` array:

```js
{
  id: "your-event-id",       // used in the register.html?event= URL — keep it URL-safe
  name: "Your Event Name",
  band: "stage",              // one of: stage, visual, mind, arena, social
  tagline: "One line hook",
  description: "1–2 sentence description shown on the card.",
  image: "https://...",       // banner image URL
  date: "2026-09-18",         // ISO date
  time: "4:00 PM",
  venue: "Venue name",
  fee: 250,                   // registration fee in ₹
  prize: "₹15,000 + Trophy",
  seats: 60,
  seatsLeft: 22,
  teamEvent: true,            // optional — cosmetic only, doesn't change the form
}
```

No other file needs to change — the homepage grid, filters, and the
registration page all read from this array.

---

## 3. Registration form fields

The form asks each registrant for:

- Full name
- Roll number
- Mobile number
- Class
- Section
- Email address
- ID card photo (required upload — saved to Google Drive)

If the event is a **group event** (`teamEvent: true` in `events.js`),
a second step also asks for:

- Number of participants (a dropdown built from `teamMin`/`teamMax` on
  the event — e.g. IPL Auction is locked to exactly 3, 2 Mins Short
  Film lets you pick 2–5)
- For each teammate beyond the registrant: **name, roll number, and
  mobile number**

Solo events skip straight past the team step — no team fields shown.

To set the team size for a group event, add `teamMin` / `teamMax` to
its entry in `events.js`:

```js
{
  id: "your-event-id",
  ...
  teamEvent: true,
  teamMin: 2,   // smallest allowed team size (incl. the registrant)
  teamMax: 5,   // largest allowed team size (incl. the registrant)
}
```

If you omit `teamMin`/`teamMax` on a `teamEvent: true` entry, it
defaults to a fixed team size of 2. The form currently supports team
sizes up to 6 total members (registrant + 5 teammates) — to go bigger,
extend `MAX_TEAMMATES` in `register.js` and the `TEAMMATE_COLUMNS` loop
in `Code.gs` to match.

---

## 4. Google Sheets backend setup (Google Apps Script)

1. Create a new Google Sheet — this is your registrations database.
2. In the Sheet, go to **Extensions → Apps Script**.
3. Delete the placeholder `myFunction()` code and paste the full contents
   of `Code.gs`.
4. Click **Deploy → New deployment**.
   - Select type: **Web app**.
   - Description: `Connexion 26 registrations`.
   - Execute as: **Me**.
   - Who has access: **Anyone**.
5. Click **Deploy**, authorize the script when prompted (it needs Drive
   access to store ID card photos), and copy the **Web app URL** (ends
   in `/exec`).
6. Paste that URL into `APPS_SCRIPT_URL` at the top of **all four**:
   `register.js`, `script.js`, `admin.js`, `coordinator.js`.
7. Whenever you edit `Code.gs` after this, use **Deploy → Manage
   deployments → Edit (pencil icon) → New version** — just saving the
   script does not update the live URL.

### What the script does automatically

- Creates a new sheet tab named after the event on its first registration.
- Writes a bold header row into every new tab.
- Decodes the uploaded ID card photo, saves it into a Drive folder
  named **"Connexion 26 - ID Photos"** (auto-created on first use, or
  set `DRIVE_FOLDER_ID` in `Code.gs` to use a folder you already have),
  sets it to "anyone with the link can view", and writes the file's
  Drive link into the sheet.
- Appends each submission with a server-generated timestamp and
  registration ID (format: `SPEC26-<EVENTCODE>-<timestamp><random>`).
- Also logs every submission into an **"All Registrations"** tab, which
  powers the admin dashboard's totals, search, and exports, and is what
  the coordinator portal and attendance marking read/write against.
- Maintains an **"Event Settings"** tab (open/closed + coordinator
  login per event) — see §6 and §7.
- Returns a JSON response (`{ success, registrationId }` or
  `{ success: false, error }`).

### Sheet format (per-event tab and "All Registrations")

| Column | Notes |
|---|---|
| Timestamp | Server-generated |
| Registration ID | e.g. `SPEC26-IPL-260801102203482` — also what the QR code on the receipt encodes |
| Event Name | |
| Event ID | The event's slug from `events.js`, e.g. `ipl-auction` |
| Band | stage / visual / mind / arena / social |
| Full Name | |
| Roll Number | |
| Class | |
| Section | |
| Mobile Number | |
| Email Address | |
| ID Card Photo | Drive link to the uploaded photo |
| Team Event? | Yes / No |
| Team Size | Total participants including the registrant |
| Teammate 2 Name / Roll No / Mobile | Blank for solo entries |
| Teammate 3 Name / Roll No / Mobile | Blank if team is smaller |
| Teammate 4 Name / Roll No / Mobile | Blank if team is smaller |
| Teammate 5 Name / Roll No / Mobile | Blank if team is smaller |
| Teammate 6 Name / Roll No / Mobile | Blank if team is smaller |
| Attendance Status | "Not marked" until the coordinator scans them, then "Present" |
| Present At | Timestamp of the scan |
| Marked By | Coordinator's name |

When a coordinator marks someone present, `Code.gs` also **colors that
entire row green** — so scrolling the raw Sheet during the event
already tells you who's shown up, no filtering needed.

Example row (group event, team of 3):

| Timestamp | Registration ID | Event Name | Event ID | Band | Full Name | Roll Number | Class | Section | Mobile Number | Email Address | ID Card Photo | Team Event? | Team Size | Teammate 2 Name | Teammate 2 Roll No | Teammate 2 Mobile | Attendance Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-08-01 10:22:03 | SPEC26-IPL-260801102203482 | IPL Auction | ipl-auction | arena | Aditi Rao | 22CS091 | II BCA | A | 9876543210 | aditi@email.com | https://drive.google.com/... | Yes | 3 | Rohan Kapoor | 22CS077 | 9876500001 | Not marked |

---

## 5. Registration flow

1. Visitor clicks **Register Now** on an event card →
   `register.html?event=dance-battle`
2. `register.js` reads the `event` URL parameter, looks it up in
   `events.js`, and locks it into the form (not editable).
3. The three-step form validates each step before letting the visitor
   continue (required fields, email format, 10-digit Indian mobile
   format). Step 2 (team details) only asks for anything on group
   events — solo events show a short notice and skip straight through.
4. On submit, a full-screen branded overlay ("Submitting your
   registration…", using `loader-logo.jpg`) covers the page while the
   ID photo is converted to base64 and the form `POST`s JSON to your
   Apps Script Web App URL — this can take a few seconds, and the
   overlay is there so it reads as "working" instead of "frozen."
5. On success, the visitor is redirected to
   `success.html?regId=...&name=...&event=...` which renders a QR code
   and a downloadable PNG receipt.

**Receipt download:** the receipt PNG is drawn on a plain `<canvas>`
by `success.html` — it does **not** screenshot the on-page card. An
earlier version used `html2canvas` to capture the card directly, but
that card's `backdrop-filter`/`color-mix()` styling isn't something
html2canvas can parse, so it silently failed with "Couldn't generate
the receipt image." Drawing directly to canvas has no such dependency
and always works.

**Note on data flow:** registration and receipt details travel between
`register.html` and `success.html` via URL parameters rather than
browser storage, so the flow works reliably in any browser and in
in-app/embedded webviews.

---

## 6. Admin dashboard

`admin.html` is unauthenticated by default beyond the client-side
password gate — anyone with the link and the password can view
registrant contact details and export data. Before sharing it:
- Change `ADMIN_PASSWORD` in `admin.js` (and matching `ADMIN_KEY` in
  `Code.gs`) from the default, **and**
- Put it behind your college SSO, a shared private link, or basic auth
  at your hosting layer for real protection — the password field alone
  is a deterrent, not authentication (see the security note below).

It reads live data from your Apps Script (`?action=all` and
`?action=stats`) and supports CSV and Excel (`.xlsx`) export, plus a
free-text search across every field.

### Hosting admin separately from the main site

`admin.html` is a fully standalone static page — it only needs
`style.css`, `events.js`, and `admin.js` alongside it (plus its CDN
scripts). You can host it on a completely different domain/subdomain
from `index.html`/`register.html`; it talks to the same Apps Script
Web App URL either way, so nothing else needs to change.

### Event controls: open/close + coordinator setup

The dashboard has an **"Event controls"** panel. On the left, every
event from `events.js` shows as a card with its current **Open/Closed**
state, whether a coordinator is configured yet, and a quick
Close/Reopen button. Clicking a card also loads it into the form on
the right, where you can:

- Toggle **Registration open** for that event.
- Set the **coordinator's name and password** — this is the login
  they'll use on `coordinator.html`. Leave the password field blank to
  keep whatever password is already set; type a new one to replace it.

Click **Save settings** to push both to `Code.gs`, which stores them in
a new **"Event Settings"** tab in your Sheet (columns: Event ID, Event
Name, Closed, Coordinator Name, Coordinator Password, Updated At).

**Closing registration:**
- On the public site, `script.js` checks event status on page load: a
  closed event's card shows a red **Closed** badge and its **Register
  Now** button is replaced with a disabled "Registration Closed" button.
- If someone still opens `register.html?event=...` for a closed event
  directly, the form is replaced with a "Registration closed" notice.
- `Code.gs` itself also rejects any registration `POST` for a closed
  event no matter how the request arrives — enforced server-side, not
  just hidden in the UI.

**Security note:** both the admin panel and the coordinator portal use
plain client-side password checks — fine for a fest-scale internal
tool, not real authentication. `Code.gs` never sends the coordinator's
password back out over `?action=eventSettings` (it's write-only from
the admin form), but it *is* sent as a URL query parameter when a
coordinator logs in on `coordinator.html`, so avoid reusing sensitive
passwords here.

---

## 7. Coordinator portal — QR attendance

`coordinator.html` is what whoever's running the entry desk for an
event opens on their phone. One page serves every event — they pick
their event and enter the password an admin set for them (see above).

**How it works:**
1. Each participant's `success.html` shows a QR code that encodes
   nothing but their **Registration ID** — the same ID already in your
   Sheet, so there's no separate code to keep in sync.
2. At the door, the coordinator taps **Start camera** and scans it (or
   types the Registration ID in manually if the camera's unavailable
   or the phone won't cooperate).
3. `coordinator.js` sends `{ eventId, registrationId, coordinatorName }`
   to `Code.gs`'s `markPresent` action, which:
   - Confirms the ticket belongs to *this* event (rejects tickets
     scanned at the wrong desk).
   - Sets **Attendance Status** to "Present", stamps **Present At** and
     **Marked By**, and — this is the part you asked about — **colors
     the entire row green** in both the "All Registrations" tab and
     that event's own tab, so it's visually obvious in the Sheet who's
     shown up without opening the dashboard at all.
   - If that ticket was already scanned, it responds with an "already
     marked" message instead of double-counting — safe to scan twice
     by accident.
4. The portal's own table refreshes after every scan, with a live
   Present/Registered count at the top and a search box to look
   someone up manually.

The scanner uses [html5-qrcode](https://github.com/mebjas/html5-qrcode)
(loaded from a CDN, no install needed) and asks for camera permission
the first time — it needs to run over `https://` (or `localhost`) for
the browser to allow camera access at all, which GitHub Pages already
gives you for free.

---

## 8. Customizing the look

All design tokens (colors, radii, fonts) live at the top of `style.css`
under `:root`. The six event band colors (`--violet`, `--blue`, `--cyan`,
`--green`, `--amber`, `--red`) and the `BANDS` object in `events.js`
are the two places to edit if you want to re-theme the category colors.
Dark mode is the default; light mode is a full token swap under
`[data-theme="light"]`.

---

## 9. Tech used

HTML5 · CSS3 (custom properties, no preprocessor) · Vanilla JavaScript
(ES6) · Tailwind CSS (CDN, for layout utilities) · Font Awesome 6 ·
Google Fonts (Space Grotesk, Inter, JetBrains Mono) · AOS (scroll
animation) · GSAP (entrance animation) · qrcode.js · html2canvas ·
Chart.js · SheetJS · Google Apps Script.
