import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, Table, TableRow, TableCell, WidthType,
  BorderStyle, ShadingType, convertInchesToTwip, PageBreak,
  NumberingLevel, UnderlineType, Header, Footer,
  ImageRun, PageOrientation
} from "docx";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "artifacts", "tractor-tracker", "public");

// ─── Colour palette ─────────────────────────────────────────────────────────
const BLUE   = "1D4ED8";
const DBLUE  = "1E3A8A";
const GREEN  = "047857";
const DGREEN = "064E3B";
const INDIGO = "4F46E5";
const AMBER  = "D97706";
const SLATE  = "475569";
const LIGHT  = "F0F4FF";
const LTGN   = "F0FDF4";
const WHITE  = "FFFFFF";
const LBLUE  = "EFF6FF";
const LGRAY  = "F8FAFC";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function bold(text, opts = {}) {
  return new TextRun({ text, bold: true, ...opts });
}
function run(text, opts = {}) {
  return new TextRun({ text, ...opts });
}
function br() {
  return new TextRun({ text: "", break: 1 });
}

function heading1(text, color = DBLUE) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 120 },
    children: [new TextRun({ text, bold: true, color, size: 36 })],
  });
}

function heading2(text, color = BLUE) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 100 },
    children: [new TextRun({ text, bold: true, color, size: 28 })],
  });
}

function heading3(text, color = SLATE) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, bold: true, color, size: 24 })],
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, size: 22, color: "374151", ...opts })],
  });
}

function bullet(text, bold_part = "", rest = "") {
  const children = [];
  if (bold_part) {
    children.push(new TextRun({ text: bold_part, bold: true, size: 22, color: "1E293B" }));
    if (rest) children.push(new TextRun({ text: " " + rest, size: 22, color: "374151" }));
  } else {
    children.push(new TextRun({ text, size: 22, color: "374151" }));
  }
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 80 },
    children,
  });
}

function step(num, title, detail) {
  return new Paragraph({
    spacing: { after: 100 },
    children: [
      new TextRun({ text: `${num}.  `, bold: true, color: BLUE, size: 22 }),
      new TextRun({ text: title, bold: true, size: 22, color: "1E293B" }),
      new TextRun({ text: detail ? `  —  ${detail}` : "", size: 22, color: SLATE }),
    ],
  });
}

function stepGreen(num, title, detail) {
  return new Paragraph({
    spacing: { after: 100 },
    children: [
      new TextRun({ text: `${num}.  `, bold: true, color: GREEN, size: 22 }),
      new TextRun({ text: title, bold: true, size: 22, color: "1E293B" }),
      new TextRun({ text: detail ? `  —  ${detail}` : "", size: 22, color: SLATE }),
    ],
  });
}

function tip(text, emoji = "💡") {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    margins: { top: 80, bottom: 80, left: 160, right: 160 },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: LBLUE, type: ShadingType.SOLID },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 12, color: "93C5FD" },
              bottom: { style: BorderStyle.SINGLE, size: 12, color: "93C5FD" },
              left: { style: BorderStyle.THICK, size: 24, color: BLUE },
              right: { style: BorderStyle.NONE },
            },
            children: [
              new Paragraph({
                spacing: { before: 80, after: 80 },
                children: [
                  new TextRun({ text: `${emoji}  `, size: 22 }),
                  new TextRun({ text, size: 22, color: DBLUE }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function tipGreen(text, emoji = "💡") {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    margins: { top: 80, bottom: 80, left: 160, right: 160 },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: LTGN, type: ShadingType.SOLID },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 12, color: "86EFAC" },
              bottom: { style: BorderStyle.SINGLE, size: 12, color: "86EFAC" },
              left: { style: BorderStyle.THICK, size: 24, color: GREEN },
              right: { style: BorderStyle.NONE },
            },
            children: [
              new Paragraph({
                spacing: { before: 80, after: 80 },
                children: [
                  new TextRun({ text: `${emoji}  `, size: 22 }),
                  new TextRun({ text, size: 22, color: DGREEN }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function warn(text) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    margins: { top: 80, bottom: 80, left: 160, right: 160 },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: "FFF7ED", type: ShadingType.SOLID },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 12, color: "FED7AA" },
              bottom: { style: BorderStyle.SINGLE, size: 12, color: "FED7AA" },
              left: { style: BorderStyle.THICK, size: 24, color: "F97316" },
              right: { style: BorderStyle.NONE },
            },
            children: [
              new Paragraph({
                spacing: { before: 80, after: 80 },
                children: [new TextRun({ text: `⚠️  ${text}`, size: 22, color: "9A3412" })],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function infoBox(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    margins: { top: 40, bottom: 40, left: 120, right: 120 },
    rows: rows.map(([label, value, valueColor]) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            shading: { fill: LGRAY, type: ShadingType.SOLID },
            borders: allBorders("E2E8F0"),
            children: [new Paragraph({
              spacing: { before: 60, after: 60 },
              children: [new TextRun({ text: label, size: 21, color: "374151" })],
            })],
          }),
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            shading: { fill: WHITE, type: ShadingType.SOLID },
            borders: allBorders("E2E8F0"),
            children: [new Paragraph({
              spacing: { before: 60, after: 60 },
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: value, bold: true, size: 21, color: valueColor || BLUE })],
            })],
          }),
        ],
      })
    ),
  });
}

function allBorders(color = "E2E8F0") {
  const b = { style: BorderStyle.SINGLE, size: 6, color };
  return { top: b, bottom: b, left: b, right: b };
}

function spacer(before = 160) {
  return new Paragraph({ spacing: { before, after: 0 }, children: [] });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function coverTitle(text, size = 56, color = WHITE) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    children: [new TextRun({ text, bold: true, size, color })],
  });
}

function coverSub(text, color = "BFD3FF") {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [new TextRun({ text, size: 24, color })],
  });
}

function sectionLabel(num, color = BLUE) {
  return new Paragraph({
    spacing: { before: 320, after: 80 },
    children: [
      new TextRun({
        text: `  SECTION ${num}  `,
        bold: true, size: 16, color: WHITE,
        shading: { type: ShadingType.SOLID, fill: color },
      }),
    ],
  });
}

function divider(color = "E2E8F0") {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({ children: [new TableCell({
      borders: { bottom: { style: BorderStyle.SINGLE, size: 8, color }, top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
      children: [new Paragraph({ children: [] })],
    })] })],
  });
}

function compareRow(feature, svValue, jbValue) {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 35, type: WidthType.PERCENTAGE },
        shading: { fill: LGRAY, type: ShadingType.SOLID },
        borders: allBorders("E2E8F0"),
        children: [new Paragraph({ spacing: { before: 60, after: 60 }, children: [new TextRun({ text: feature, size: 20, bold: true, color: "374151" })] })],
      }),
      new TableCell({
        width: { size: 32, type: WidthType.PERCENTAGE },
        shading: { fill: LBLUE, type: ShadingType.SOLID },
        borders: allBorders("93C5FD"),
        children: [new Paragraph({ spacing: { before: 60, after: 60 }, children: [new TextRun({ text: svValue, size: 20, color: DBLUE })] })],
      }),
      new TableCell({
        width: { size: 33, type: WidthType.PERCENTAGE },
        shading: { fill: LTGN, type: ShadingType.SOLID },
        borders: allBorders("86EFAC"),
        children: [new Paragraph({ spacing: { before: 60, after: 60 }, children: [new TextRun({ text: jbValue, size: 20, color: DGREEN })] })],
      }),
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SUPERVISOR MANUAL
// ═══════════════════════════════════════════════════════════════════════════
function buildSupervisorManual() {
  const sections = [];

  // Cover page
  sections.push(...[
    spacer(1200),
    coverTitle("Smart Lekka", 72, WHITE),
    coverSub("Supervisor Role — User Manual", "BFD3FF"),
    spacer(80),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: "────────────────────────────", color: "93C5FD", size: 22 })] }),
    spacer(80),
    coverSub("Complete guide to managing Vehicle customers,", WHITE),
    coverSub("work sessions, payments & expenses.", WHITE),
    spacer(200),
    coverSub("BSP Tech Solutions · Track Work. Settle Easy.", "93C5FD"),
    pageBreak(),
  ]);

  // S1: Login
  sections.push(
    sectionLabel("1"),
    heading1("Logging In"),
    body("Use your mobile number and password provided by your Admin to sign in as a Supervisor."),
    spacer(80),
    heading3("Steps to Log In"),
    step(1, "Open Smart Lekka in your phone browser", "The login screen appears automatically."),
    step(2, "Enter your Mobile Number", 'Type your 10-digit mobile number in the "Vehicle Number / Mobile" field.'),
    step(3, "Enter your Password", "Type the password given to you by the admin."),
    step(4, "Tap Sign In", "You will be taken to the Dashboard."),
    spacer(120),
    tip("Your mobile number is your login ID. If you forget your password, ask your Admin to reset it from the Admin panel."),
    spacer(120),
  );

  // S2: Dashboard
  sections.push(
    pageBreak(),
    sectionLabel("2"),
    heading1("Dashboard Overview"),
    body("The Dashboard is your main overview. It shows a summary of all customers under your client — their earnings, payments made, and pending balances."),
    heading3("Summary Cards"),
    body("At the top of the Dashboard you will see four summary cards:"),
    spacer(80),
    infoBox([
      ["👷  Customers", "Total active customers", BLUE],
      ["📈  Total Earned", "All sessions combined", "059669"],
      ["💼  Total Paid", "Amount already paid out", BLUE],
      ["⏳  Pending", "Amount still owed", AMBER],
    ]),
    spacer(120),
    heading3("Payment Progress Bar"),
    body('Below the cards, a progress bar shows what percentage of earnings have been paid. For example, "62% paid" means 62% of total earned has been settled.'),
    heading3("Pending Customers List"),
    body("Below the progress bar you will see a card for each customer with a pending balance. Each card shows:"),
    bullet("", "Customer's name and initials circle"),
    bullet("", "Total earned, total paid, and pending amount"),
    bullet('', 'A "Pay" button to record a payment'),
    spacer(120),
  );

  // S3: Vehicle Filter
  sections.push(
    pageBreak(),
    sectionLabel("3"),
    heading1("Filtering by Vehicle Machine"),
    body("As a Supervisor, you oversee multiple Vehicle machines. Use the Vehicle filter to view data for one specific Vehicle at a time."),
    heading3("Where to Find the Filter"),
    body("Just below the Dashboard title, you will see a blue filter bar with a dropdown showing the current Vehicle selection."),
    spacer(80),
    infoBox([
      ["Default view", "All Vehicles (combined data)", BLUE],
      ["Filtered view", "Vehicle-001 only, or Vehicle-002, etc.", GREEN],
    ]),
    spacer(120),
    heading3("How to Use the Filter"),
    step(1, "Tap the filter dropdown", 'Shows "All Vehicles" by default — combined data from all machines.'),
    step(2, "Select a Vehicle machine", "Choose Vehicle-001, Vehicle-002, etc. The customer list and summary update instantly."),
    step(3, "Return to combined view", 'Select "All Vehicles" to see data from all machines together.'),
    spacer(120),
    tip("The same Vehicle filter is available on the Expenses page and the History page. Each page has its own independent filter."),
    spacer(120),
  );

  // S4: Customers
  sections.push(
    pageBreak(),
    sectionLabel("4"),
    heading1("Customer Payment Cards"),
    body("Each customer with a pending balance appears as a card on the Dashboard. Fully paid customers are hidden here — you can view them on the History page."),
    heading3("Reading a Customer Card"),
    spacer(80),
    infoBox([
      ["Name / Initials circle", "Identifies the customer", BLUE],
      ["Pending badge (orange)", "Amount still owed", AMBER],
      ["Earned", "All-time total earned", "059669"],
      ["Paid", "All-time total paid", BLUE],
    ]),
    spacer(120),
    heading3("Viewing Customer Detail"),
    body("Tap the customer card (or the arrow icon) to open the full detail page showing all individual work sessions and every payment made."),
    spacer(120),
  );

  // S5: Pay Customer
  sections.push(
    pageBreak(),
    sectionLabel("5"),
    heading1("Recording a Payment"),
    body("When you pay a customer, record it in Smart Lekka so the pending balance stays accurate."),
    heading3("Steps to Record a Payment"),
    step(1, "Find the customer on the Dashboard", "Scroll the pending customers list."),
    step(2, 'Tap the "Pay" button', "A payment dialog opens showing the current pending amount."),
    step(3, "Enter the amount paid", "Can be partial or the full pending amount."),
    step(4, 'Tap "Record Payment"', "The balance updates immediately. If fully paid, the customer moves off the home screen."),
    spacer(120),
    tip("Partial Payments are OK — you can make multiple partial payments over time. Each payment is logged with a date for a full audit trail."),
    spacer(80),
    warn("Payments cannot be undone. Double-check the amount before saving."),
    spacer(120),
  );

  // S6: History
  sections.push(
    pageBreak(),
    sectionLabel("6"),
    heading1("History Page"),
    body("The History page shows all customers — pending and fully paid — along with every work session and payment in detail."),
    heading3("Available Filters"),
    bullet("Vehicle Filter", "", "Show sessions from a specific Vehicle machine only (blue filter bar)."),
    bullet("Customer Filter", "", "Choose a specific customer from the dropdown."),
    bullet("Status — Pending", "", "Show only customers with remaining balances."),
    bullet("Status — Settled", "", "Show only customers who are fully paid up."),
    spacer(120),
    heading3("Reading Session Entries"),
    body("Each session shows: field name, date, start → end time, hours worked, and amount earned."),
    heading3("Reading Payment Entries"),
    body("Each payment shows: date and amount paid. Running totals (earned / paid / pending) are shown at the top of each customer section."),
    spacer(120),
  );

  // S7: Expenses
  sections.push(
    pageBreak(),
    sectionLabel("7"),
    heading1("Expenses Page"),
    body("Track all Vehicle-related expenses — fuel, maintenance, salaries, materials, and other costs."),
    heading3("Vehicle Filter on Expenses"),
    body("As a Supervisor, you see expenses from all Vehicle machines by default. Use the blue Vehicle filter bar to narrow to a specific machine."),
    heading3("Date Range Filter"),
    body('Set a From and To date to see expenses for a specific period. Tap "Show All Time" to remove the filter.'),
    heading3("Expense Categories"),
    spacer(80),
    infoBox([
      ["⛽  Fuel", "Diesel and fuel costs", SLATE],
      ["🔧  Maintenance", "Repairs and servicing", SLATE],
      ["👷  Salary", "Operator salaries", SLATE],
      ["📦  Materials", "Parts and consumables", SLATE],
      ["📋  Other", "Miscellaneous costs", SLATE],
    ]),
    spacer(120),
    heading3("Expense Summary"),
    body("At the top of the Expenses page you will see totals for: Total expenses, Paid expenses, and Pending expenses."),
    spacer(120),
  );

  // S8: Reports
  sections.push(
    pageBreak(),
    sectionLabel("8"),
    heading1("Downloading PDF Reports"),
    body("Generate a professional PDF report for any time period, for all or selected customers, with an optional Vehicle filter."),
    heading3("Steps to Download a Report"),
    step(1, "Go to the Dashboard", 'Set the Vehicle filter first if you want a per-machine report.'),
    step(2, 'Tap "Download Report"', "Appears in the top-right of the Dashboard."),
    step(3, "Choose Customers", 'Select "All Customers" or a specific customer.'),
    step(4, "Choose a Date Period", "Options: All Time, This Month, Last Month, or Custom."),
    step(5, 'Review "Report will include" summary', "If a Vehicle filter is active, the Vehicle name is shown in blue."),
    step(6, 'Tap "Generate PDF"', "The PDF downloads to your device automatically."),
    spacer(120),
    tip("The PDF includes: a summary table per customer, all individual work sessions with dates and hours, and all payment records."),
    spacer(120),
  );

  // S9: Navigation
  sections.push(
    pageBreak(),
    sectionLabel("9"),
    heading1("Navigation Guide"),
    body("The app has a bottom navigation bar with the following pages:"),
    spacer(80),
    infoBox([
      ["🏠  Home (Dashboard)", "Summary + pending customers + Vehicle filter", BLUE],
      ["⏱  Track", "Start live timer or add manual work entry", BLUE],
      ["📋  History", "Full session and payment history", BLUE],
      ["💰  Expenses", "All expenses with Vehicle filter and date range", BLUE],
    ]),
    spacer(120),
    tip("As a Supervisor you do NOT have access to the Admin panel. Admin-only features are handled by the system administrator."),
    spacer(120),
  );

  return new Document({
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 22 } },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 },
        },
        background: { color: LIGHT },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "CBD5E1" } },
            children: [
              new TextRun({ text: "Smart Lekka  ·  Supervisor Manual", size: 18, color: "94A3B8" }),
            ],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 6, color: "CBD5E1" } },
            children: [new TextRun({ text: "BSP Tech Solutions  ·  Track Work. Settle Easy.  ·  Support@BSPTechSolutions.com", size: 16, color: "94A3B8" })],
          })],
        }),
      },
      children: sections,
    }],
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Vehicle OPERATOR MANUAL
// ═══════════════════════════════════════════════════════════════════════════
function buildJcbManual() {
  const sections = [];

  // Cover
  sections.push(...[
    spacer(1200),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: "Smart Lekka", bold: true, size: 72, color: WHITE })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: "Vehicle Operator Role — User Manual", size: 26, color: "A7F3D0" })] }),
    spacer(80),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: "────────────────────────────", color: "6EE7B7", size: 22 })] }),
    spacer(80),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: "Complete guide to tracking work sessions, logging hours,", size: 24, color: WHITE })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: "adding expenses & viewing payment history.", size: 24, color: WHITE })] }),
    spacer(200),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "BSP Tech Solutions · Track Work. Settle Easy.", size: 20, color: "6EE7B7" })] }),
    pageBreak(),
  ]);

  // S1: Login
  sections.push(
    sectionLabel("1", GREEN),
    heading1("Logging In", DGREEN),
    body("Use your Vehicle machine number and password to sign in. Your credentials are provided by your admin or supervisor."),
    heading3("Steps to Log In"),
    stepGreen(1, "Open Smart Lekka in your phone browser", "The login screen appears."),
    stepGreen(2, "Enter your Vehicle Number", "Type your machine number (e.g. VEH001, VEH002) in the Vehicle Number / Mobile field."),
    stepGreen(3, "Enter your Password", "Given to you by the admin."),
    stepGreen(4, "Tap Sign In", "You land on your personal Dashboard."),
    spacer(120),
    tipGreen("Your Vehicle Number is your login ID. It is usually in the format VEH001, VEH002, etc. Contact your admin if you need your credentials."),
    spacer(120),
  );

  // S2: Dashboard
  sections.push(
    pageBreak(),
    sectionLabel("2", GREEN),
    heading1("Dashboard Overview", DGREEN),
    body("Your Dashboard shows a summary of customers and their payment status — all work logged by your Vehicle machine. No Vehicle filter is needed; it is automatically set to your machine."),
    heading3("Summary Cards"),
    spacer(80),
    infoBox([
      ["👷  Customers", "Customers who worked on your Vehicle sessions", GREEN],
      ["📈  Total Earned", "Total from all your logged sessions", GREEN],
      ["💼  Total Paid", "Amount already paid out", GREEN],
      ["⏳  Pending", "Amount still to be paid", AMBER],
    ]),
    spacer(120),
    heading3("Payment Progress Bar"),
    body("The progress bar shows what percentage of total earned has been paid. Green means mostly paid, amber means a lot is pending."),
    spacer(120),
  );

  // S3: Live Tracking
  sections.push(
    pageBreak(),
    sectionLabel("3", GREEN),
    heading1("Tracking a Live Work Session", DGREEN),
    body("Use the live timer to track work in real time. Start when work begins, stop when it ends."),
    heading3("Starting a Session"),
    stepGreen(1, 'Tap "Track" in the bottom navigation', "Track page opens on the Timer tab."),
    stepGreen(2, "Select or add a Customer", 'Choose from the dropdown, or tick "Add new customer on the fly".'),
    stepGreen(3, "Enter the Field Name", 'e.g. "North Pasture", "Village Road".'),
    stepGreen(4, 'Tap "START TRACKING"', "The live timer begins. You can close the app safely — the session stays active."),
    spacer(120),
    tipGreen("Auto-Calculated Payment — Amount = Hours Worked × Rate per Hour. The current rate is set by your admin."),
    spacer(120),
    heading3("Stopping the Session"),
    stepGreen(1, "Return to the Track page", "The active timer is shown with elapsed time."),
    stepGreen(2, 'Tap "Stop"', "A review screen shows total hours and the payment amount."),
    stepGreen(3, 'Tap "Save Work Session"', "Saved permanently and added to History."),
    spacer(120),
  );

  // S4: Manual Entry
  sections.push(
    pageBreak(),
    sectionLabel("4", GREEN),
    heading1("Adding a Manual Work Entry", DGREEN),
    body("Use Manual Entry to log a past work session when you forgot to use the live timer."),
    heading3("Steps"),
    stepGreen(1, 'Tap "Track" → switch to "Manual Entry" tab', "The manual form opens."),
    stepGreen(2, "Select the Customer", "Choose from the dropdown or add a new customer."),
    stepGreen(3, "Enter the Field Name", "Where the work was done."),
    stepGreen(4, "Set the Date", "Pick the exact date when the work happened."),
    stepGreen(5, "Set Start Time", "Choose hour, minute, and AM/PM. On mobile the pickers are stacked for easy tapping."),
    stepGreen(6, "Set End Time", "Same as Start Time. Must be later than start."),
    stepGreen(7, "Check the Amount", "Auto-calculated. You can edit it if needed."),
    stepGreen(8, 'Tap "Save Work Entry"', "Saved and appears in History."),
    spacer(120),
    tipGreen("Start Time & End Time on Mobile — On a phone the Start and End time pickers appear stacked (one above the other) so they are easier to tap."),
    spacer(80),
    warn("End Time must be after Start Time. If end time is earlier, the calculated hours will be zero. Always double-check both times."),
    spacer(120),
  );

  // S5: History
  sections.push(
    pageBreak(),
    sectionLabel("5", GREEN),
    heading1("Viewing Work History", DGREEN),
    body("The History page shows all sessions logged under your Vehicle and all payments made to customers."),
    heading3("Filters"),
    bullet("Customer Filter", "", "Choose a specific customer from the dropdown."),
    bullet("Status: Pending", "", "Customers who still have unpaid balances."),
    bullet("Status: Settled", "", "Customers who have been fully paid."),
    bullet("Status: All", "", "All customers regardless of payment status."),
    spacer(120),
    heading3("Reading Session Entries"),
    body("Each session shows: Field Name, Date, Start → End time, Hours worked, and Amount earned (Hours × Rate)."),
    heading3("Reading Payment Entries"),
    body("Each payment entry shows the date and amount paid. Payments are grouped under the customer they belong to."),
    spacer(120),
  );

  // S6: Expenses
  sections.push(
    pageBreak(),
    sectionLabel("6", GREEN),
    heading1("Adding Expenses", DGREEN),
    body("Log any Vehicle-related cost — fuel, repairs, or materials. These are tracked separately from customer wages."),
    heading3("How to Add an Expense"),
    stepGreen(1, 'Tap "Expenses" in the bottom navigation', "Shows this month's expenses by default."),
    stepGreen(2, 'Tap the "+ Add" button', "The add expense form opens."),
    stepGreen(3, "Enter a Description", 'e.g. "Diesel fill-up 40L", "Oil change".'),
    stepGreen(4, "Select a Category", "Fuel / Maintenance / Salary / Materials / Other."),
    stepGreen(5, "Enter the Amount (₹)", "The total cost of this expense."),
    stepGreen(6, "Set the Date", "Defaults to today. Change if it was an earlier date."),
    stepGreen(7, 'Tap "Add Expense"', "Saved and shows in the list immediately."),
    spacer(120),
    heading3("Filtering by Date"),
    body('Use the From and To date fields to see expenses for a specific period. Tap "Show All Time" to see everything.'),
    spacer(120),
  );

  // S7: Reports
  sections.push(
    pageBreak(),
    sectionLabel("7", GREEN),
    heading1("Downloading Your PDF Report", DGREEN),
    body("Get a PDF of your work sessions and customer payments from the Dashboard."),
    heading3("Steps"),
    stepGreen(1, "Go to the Dashboard (Home)", "Your data is shown automatically."),
    stepGreen(2, 'Tap "Download Report"', "Top-right button (appears when you have customer data)."),
    stepGreen(3, "Choose Customers and Date Range", "Select all or a specific customer. Choose the time period."),
    stepGreen(4, 'Tap "Generate PDF"', "Downloads to your device. Your Vehicle name is shown in the PDF header automatically."),
    spacer(120),
    tipGreen("Your Vehicle name/number is included in the downloaded PDF header automatically since you are logged in as a Vehicle operator."),
    spacer(120),
  );

  // S8: Navigation
  sections.push(
    pageBreak(),
    sectionLabel("8", GREEN),
    heading1("Navigation Guide", DGREEN),
    body("Use the bottom navigation bar to move between pages:"),
    spacer(80),
    infoBox([
      ["🏠  Home", "Dashboard — summary totals + pending customers", GREEN],
      ["⏱  Track", "Start live timer OR add a past work entry manually", GREEN],
      ["📋  History", "All sessions and payment records per customer", GREEN],
      ["💰  Expenses", "Log and track all Vehicle expenses", GREEN],
    ]),
    spacer(120),
    tipGreen("The app works best on mobile. Save the Smart Lekka URL to your phone's home screen for one-tap access every day."),
    spacer(120),
  );

  return new Document({
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 22 } },
      },
    },
    sections: [{
      properties: {
        page: { margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 } },
        background: { color: LTGN },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "CBD5E1" } },
            children: [new TextRun({ text: "Smart Lekka  ·  Vehicle Operator Manual", size: 18, color: "94A3B8" })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 6, color: "CBD5E1" } },
            children: [new TextRun({ text: "BSP Tech Solutions  ·  Track Work. Settle Easy.  ·  Support@BSPTechSolutions.com", size: 16, color: "94A3B8" })],
          })],
        }),
      },
      children: sections,
    }],
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// COMBINED MANUAL
// ═══════════════════════════════════════════════════════════════════════════
function buildCombinedManual() {
  const sections = [];

  // Cover
  sections.push(...[
    spacer(1000),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: "Smart Lekka", bold: true, size: 80, color: WHITE })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: "Complete User Manual", size: 30, color: "C7D2FE" })] }),
    spacer(80),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: "────────────────────────────", color: "A5B4FC", size: 22 })] }),
    spacer(80),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: "🏗️  Supervisor  ·  🚜  Vehicle Operator", size: 26, color: WHITE })] }),
    spacer(80),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: "Everything you need to know to track work, log sessions,", size: 22, color: "C7D2FE" })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: "manage payments and expenses using Smart Lekka.", size: 22, color: "C7D2FE" })] }),
    spacer(200),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "BSP Tech Solutions  ·  Track Work. Settle Easy.", size: 20, color: "A5B4FC" })] }),
    pageBreak(),
  ]);

  // ── PART A: SUPERVISOR ──────────────────────────────────────────────────
  sections.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
      shading: { type: ShadingType.SOLID, fill: DBLUE },
      children: [
        new TextRun({ text: "  ──────  PART A — SUPERVISOR ROLE  ──────  ", bold: true, size: 32, color: WHITE }),
      ],
    }),
    sectionLabel("A1"),
    heading1("Logging In (Supervisor)"),
    body("Use your mobile number and password provided by your Admin to sign in."),
    step(1, "Open Smart Lekka in your phone browser", "The login screen appears."),
    step(2, "Enter your Mobile Number", "Your 10-digit mobile in the Vehicle Number / Mobile field."),
    step(3, "Enter your Password", "Given to you by the admin."),
    step(4, "Tap Sign In", "You land on the Dashboard."),
    spacer(100),
    tip("Your mobile number is your login ID. Contact your admin to reset your password."),
    spacer(100),

    pageBreak(),
    sectionLabel("A2"),
    heading1("Dashboard Overview (Supervisor)"),
    body("The Dashboard shows a full summary across all Vehicles — or for one specific Vehicle when filtered."),
    spacer(80),
    infoBox([
      ["👷  Customers", "Active customers in your client", BLUE],
      ["📈  Total Earned", "All sessions combined", "059669"],
      ["💼  Total Paid", "Already paid out", BLUE],
      ["⏳  Pending", "Amount still owed", AMBER],
    ]),
    spacer(100),
    body("The Payment Progress Bar below the cards shows percentage paid. Pending customers appear below as cards with a Pay button."),
    spacer(100),

    pageBreak(),
    sectionLabel("A3"),
    heading1("Vehicle Machine Filter (Supervisor)"),
    body("The blue Vehicle filter bar lets you focus on one machine. It appears on Dashboard, History, and Expenses."),
    bullet("All Vehicles", "", "Default — shows combined data from all machines."),
    bullet("Vehicle-001, Vehicle-002…", "", "Filters to that machine's customers and sessions only."),
    spacer(100),
    tip("The Vehicle filter is independent on each page — changing it on Dashboard does not affect Expenses or History."),
    spacer(100),

    pageBreak(),
    sectionLabel("A4"),
    heading1("Recording a Payment (Supervisor)"),
    body("Record every payment to keep balances accurate."),
    step(1, "Find the customer card on the Dashboard", "Scroll the pending customers list."),
    step(2, 'Tap "Pay"', "Dialog opens with pending amount."),
    step(3, "Enter the amount paid", "Partial or full payment."),
    step(4, 'Tap "Record Payment"', "Balance updates instantly."),
    spacer(100),
    tip("Partial payments are OK — each is logged with a date for a full audit trail."),
    spacer(80),
    warn("Payments cannot be undone. Double-check before saving."),
    spacer(100),

    pageBreak(),
    sectionLabel("A5"),
    heading1("History Page (Supervisor)"),
    body("Shows ALL customers (pending and settled) with every session and payment. Filter by Vehicle, Customer, or Status."),
    bullet("Vehicle Filter", "", "Blue filter bar — one machine or all."),
    bullet("Customer Filter", "", "Focus on one customer's full history."),
    bullet("Status: Pending / Settled", "", "Filter by payment status."),
    spacer(100),

    pageBreak(),
    sectionLabel("A6"),
    heading1("Expenses Page (Supervisor)"),
    body("View expenses for all Vehicles or filter by machine. Date range filter is also available."),
    spacer(80),
    infoBox([
      ["⛽  Fuel", "Diesel & fuel costs", SLATE],
      ["🔧  Maintenance", "Repairs & servicing", SLATE],
      ["👷  Salary", "Operator salaries", SLATE],
      ["📦  Materials", "Parts & consumables", SLATE],
    ]),
    spacer(100),

    pageBreak(),
    sectionLabel("A7"),
    heading1("Downloading PDF Reports (Supervisor)"),
    body("Generate a report for any period with optional Vehicle filter."),
    step(1, "Set Vehicle filter on Dashboard", "All Vehicles or a specific machine."),
    step(2, 'Tap "Download Report"', "Top-right of Dashboard."),
    step(3, "Choose Customers and Period", "All Time / This Month / Last Month / Custom."),
    step(4, 'Tap "Generate PDF"', "Downloads automatically. Vehicle name shown in PDF header if filtered."),
    spacer(100),
  );

  // ── PART B: Vehicle OPERATOR ────────────────────────────────────────────────
  sections.push(
    pageBreak(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
      shading: { type: ShadingType.SOLID, fill: DGREEN },
      children: [
        new TextRun({ text: "  ──────  PART B — Vehicle OPERATOR ROLE  ──────  ", bold: true, size: 32, color: WHITE }),
      ],
    }),
    sectionLabel("B1", GREEN),
    heading1("Logging In (Vehicle Operator)", DGREEN),
    body("Use your Vehicle machine number as your login ID and the password given by your admin."),
    stepGreen(1, "Open Smart Lekka in your phone browser", ""),
    stepGreen(2, "Enter your Vehicle Number", "e.g. VEH001, VEH002."),
    stepGreen(3, "Enter your Password", "Given by admin."),
    stepGreen(4, "Tap Sign In", "You land on your Dashboard."),
    spacer(100),
    tipGreen("Bookmark the app to your phone home screen for one-tap access every day."),
    spacer(100),

    pageBreak(),
    sectionLabel("B2", GREEN),
    heading1("Dashboard Overview (Vehicle Operator)", DGREEN),
    body("Shows data only for customers with sessions logged under your Vehicle. No Vehicle filter is shown — it is automatically set to your machine."),
    spacer(80),
    infoBox([
      ["👷  Customers", "Customers on your sessions", GREEN],
      ["📈  Total Earned", "From all your logged sessions", GREEN],
      ["💼  Total Paid", "Amount paid out", GREEN],
      ["⏳  Pending", "Amount still owed", AMBER],
    ]),
    spacer(100),

    pageBreak(),
    sectionLabel("B3", GREEN),
    heading1("Tracking a Live Work Session", DGREEN),
    body("Start the timer when work begins. Stop it when work ends."),
    stepGreen(1, 'Tap "Track" in the bottom bar', "Timer tab opens."),
    stepGreen(2, "Select or add a Customer", 'Choose from dropdown or tick "Add new customer on the fly".'),
    stepGreen(3, "Enter the Field Name", 'e.g. "North Pasture".'),
    stepGreen(4, 'Tap "START TRACKING"', "Timer starts. App can be closed safely."),
    spacer(80),
    heading3("Stopping the Session"),
    stepGreen(1, "Return to Track page", "Active timer is shown."),
    stepGreen(2, 'Tap "Stop"', "Review screen shows hours and payment amount."),
    stepGreen(3, 'Tap "Save Work Session"', "Saved to History."),
    spacer(100),
    tipGreen("Payment = Hours × Rate per Hour. Rate is set by your admin."),
    spacer(100),

    pageBreak(),
    sectionLabel("B4", GREEN),
    heading1("Adding a Manual Work Entry", DGREEN),
    body("Log a past session when you forgot to use the live timer."),
    stepGreen(1, 'Tap "Track" → switch to "Manual Entry" tab', ""),
    stepGreen(2, "Select the Customer", ""),
    stepGreen(3, "Enter Field Name", ""),
    stepGreen(4, "Set the Date", "The actual date the work happened."),
    stepGreen(5, "Set Start Time", "Hour, minute, AM/PM. Stacked on mobile for easy tapping."),
    stepGreen(6, "Set End Time", "Must be later than Start Time."),
    stepGreen(7, "Check the Amount", "Auto-calculated. Editable if needed."),
    stepGreen(8, 'Tap "Save Work Entry"', "Saved to History."),
    spacer(100),
    warn("End Time must be after Start Time. Wrong times will give incorrect hours."),
    spacer(100),

    pageBreak(),
    sectionLabel("B5", GREEN),
    heading1("Viewing Work History (Vehicle Operator)", DGREEN),
    body("History shows all sessions under your Vehicle and all customer payments."),
    bullet("Customer Filter", "", "Focus on one customer."),
    bullet("Pending / Settled", "", "Filter by payment status."),
    spacer(100),

    pageBreak(),
    sectionLabel("B6", GREEN),
    heading1("Adding Expenses (Vehicle Operator)", DGREEN),
    body("Log any Vehicle cost — fuel, repairs, materials, etc."),
    stepGreen(1, 'Tap "Expenses"', ""),
    stepGreen(2, 'Tap "+ Add"', ""),
    stepGreen(3, "Enter Description", 'e.g. "Diesel fill-up".'),
    stepGreen(4, "Select Category", "Fuel / Maintenance / Salary / Materials / Other."),
    stepGreen(5, "Enter Amount (₹)", ""),
    stepGreen(6, "Set Date", "Defaults to today."),
    stepGreen(7, 'Tap "Add Expense"', "Saved immediately."),
    spacer(100),

    pageBreak(),
    sectionLabel("B7", GREEN),
    heading1("Downloading Your PDF Report (Vehicle Operator)", DGREEN),
    body("Generate a PDF of your sessions and payments from the Dashboard."),
    stepGreen(1, "Go to Dashboard", ""),
    stepGreen(2, 'Tap "Download Report"', ""),
    stepGreen(3, "Choose Customers and Period", ""),
    stepGreen(4, 'Tap "Generate PDF"', "Your Vehicle name is automatically shown in the PDF header."),
    spacer(100),
  );

  // ── COMPARISON TABLE ─────────────────────────────────────────────────────
  sections.push(
    pageBreak(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
      shading: { type: ShadingType.SOLID, fill: INDIGO },
      children: [new TextRun({ text: "  ──────  ROLE COMPARISON TABLE  ──────  ", bold: true, size: 32, color: WHITE })],
    }),
    heading1("What Each Role Can Do", INDIGO),
    body("Quick reference of features available to each role in Smart Lekka."),
    spacer(120),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            new TableCell({
              width: { size: 35, type: WidthType.PERCENTAGE },
              shading: { fill: "E2E8F0", type: ShadingType.SOLID },
              borders: allBorders("CBD5E1"),
              children: [new Paragraph({ children: [new TextRun({ text: "Feature", bold: true, size: 20, color: "374151" })] })],
            }),
            new TableCell({
              width: { size: 32, type: WidthType.PERCENTAGE },
              shading: { fill: DBLUE, type: ShadingType.SOLID },
              borders: allBorders("1D4ED8"),
              children: [new Paragraph({ children: [new TextRun({ text: "🏗️  Supervisor", bold: true, size: 20, color: WHITE })] })],
            }),
            new TableCell({
              width: { size: 33, type: WidthType.PERCENTAGE },
              shading: { fill: DGREEN, type: ShadingType.SOLID },
              borders: allBorders("047857"),
              children: [new Paragraph({ children: [new TextRun({ text: "🚜  Vehicle Operator", bold: true, size: 20, color: WHITE })] })],
            }),
          ],
        }),
        compareRow("Dashboard Overview", "✓  All Vehicles in client", "✓  Own Vehicle only"),
        compareRow("Vehicle Machine Filter", "✓  All machines", "–  Auto-filtered to own"),
        compareRow("Live Timer Tracking", "✓  Yes", "✓  Yes"),
        compareRow("Manual Work Entry", "✓  Yes", "✓  Yes"),
        compareRow("Record Customer Payments", "✓  Yes", "Depends on permissions"),
        compareRow("View Work History", "✓  All Vehicles + filter", "✓  Own sessions"),
        compareRow("Expenses — View", "✓  All Vehicles + filter", "✓  Own expenses"),
        compareRow("Expenses — Add", "✓  Yes", "✓  Yes"),
        compareRow("PDF Report Download", "✓  With Vehicle filter option", "✓  Auto-labelled with Vehicle"),
        compareRow("Admin Panel", "✗  No access", "✗  No access"),
      ],
    }),
    spacer(200),
  );

  return new Document({
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 22 } },
      },
    },
    sections: [{
      properties: {
        page: { margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 } },
        background: { color: "F5F3FF" },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "CBD5E1" } },
            children: [new TextRun({ text: "Smart Lekka  ·  Complete User Manual", size: 18, color: "94A3B8" })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 6, color: "CBD5E1" } },
            children: [new TextRun({ text: "BSP Tech Solutions  ·  Track Work. Settle Easy.  ·  Support@BSPTechSolutions.com", size: 16, color: "94A3B8" })],
          })],
        }),
      },
      children: sections,
    }],
  });
}

// ─── Write files ─────────────────────────────────────────────────────────────
async function main() {
  console.log("Generating Word documents...");
  const [svBuf, jbBuf, coBuf] = await Promise.all([
    Packer.toBuffer(buildSupervisorManual()),
    Packer.toBuffer(buildJcbManual()),
    Packer.toBuffer(buildCombinedManual()),
  ]);
  fs.writeFileSync(path.join(outDir, "SmartLekka-Supervisor-Manual.docx"), svBuf);
  fs.writeFileSync(path.join(outDir, "SmartLekka-Vehicle-Manual.docx"), jbBuf);
  fs.writeFileSync(path.join(outDir, "SmartLekka-Combined-Manual.docx"), coBuf);
  console.log("✓ SmartLekka-Supervisor-Manual.docx");
  console.log("✓ SmartLekka-Vehicle-Manual.docx");
  console.log("✓ SmartLekka-Combined-Manual.docx");
  console.log("All done!");
}
main().catch(e => { console.error(e); process.exit(1); });
