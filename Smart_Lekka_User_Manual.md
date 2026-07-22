# Smart Lekka — User Manual
**BSP Tech Solutions · Track Work. Settle Easy.**

---

## Table of Contents

1. [Login](#1-login)
2. [Supervisor Role](#2-supervisor-role)
   - 2.1 Dashboard
   - 2.2 History
   - 2.3 Expenses
   - 2.4 Overview (Supervisor)
   - 2.5 Invoices
3. [Vehicle User Role](#3-vehicle-user-role)
   - 3.1 Dashboard
   - 3.2 Track Work
   - 3.3 History
   - 3.4 Expenses
4. [WhatsApp Sharing](#4-whatsapp-sharing)
5. [PDF Download](#5-pdf-download)
6. [Quick Reference](#6-quick-reference)

---

## 1. Login

**Who uses this:** Every user — Supervisor and Vehicle User

### Steps

1. Open the Smart Lekka app in your browser.
2. You will see the **Login** screen.
3. Enter your credentials:
   - **Vehicle Number / Mobile** — your registered mobile number or Vehicle ID (e.g., `VEH001` or `9988776655`)
   - **Password** — your assigned password
4. Tap **Login**.
5. You will be taken directly to the correct dashboard for your role.

### Notes
- If your login fails, double-check your Vehicle Number / Mobile and Password.
- Supervisor and Vehicle users see different pages after logging in — this is by design.
- To log out, tap the **Logout** button at the bottom of the left sidebar (desktop) or the menu on mobile.

---

---

## 2. Supervisor Role

A Supervisor manages one or more Vehicle users under a single client account. The supervisor can view all data, record payments, manage invoices, and download reports — but cannot start or log work sessions (that is the Vehicle user's job).

### Pages available to Supervisor
| Page | What it does |
|---|---|
| Dashboard (`/`) | Summary cards + customer list + quick payments |
| History (`/history`) | Full work session log with filters |
| Expenses (`/expenses`) | Manage all Vehicle expenses |
| Overview (`/supervisor-overview`) | Vehicle-level summary + PDF report |
| Invoices (`/invoices`) | Create and manage client invoices |

---

### 2.1 Dashboard

**Path:** `/` (Home)

The Dashboard is the first screen you see after login. It gives a quick financial snapshot of all customers under your account.

#### Summary Cards (top row)
| Card | What it shows |
|---|---|
| Total Earned | Total wages earned across all customers |
| Total Paid | Total amount already paid out |
| Balance Due | Remaining unpaid amount (Earned − Paid) |
| Total Sessions | Number of recorded work sessions |

#### Customer List (below the cards)
- Each row shows: **Customer Name**, total earned, total paid, balance due, and status badge.
- Status badges:
  - **Settled** (green) — no pending payment
  - **Pending** (red) — customer has an outstanding balance

#### Actions on each customer row
- **Pay** button — Opens a payment dialog.
  - Enter the amount to pay.
  - Optionally add a note (e.g., "Cash payment", "UPI").
  - Tap **Record Payment**. The balance updates immediately.
- **View** (tap the customer name or row) — Goes to the **Customer Detail** page (see History section for details).

#### Set Rate button (top-right area)
- Opens a dialog to set the **Rate per Hour** (Rs./hr) for work sessions.
- This rate applies to all new session calculations.

---

### 2.2 History

**Path:** `/history`

History shows a complete log of all work sessions recorded across all Vehicle users.

#### Filters (Supervisor sees all three)

| Filter | Options | Purpose |
|---|---|---|
| Filter by Vehicle | Dropdown of all your Vehicle users | View sessions for one specific Vehicle machine |
| Filter by Customer | Dropdown of all customers | View sessions for one specific customer |
| Status | All / Pending / Settled | Show only unpaid or fully paid sessions |

#### Session Log Table
Each row shows:
- Customer name
- Field name
- Date
- Start time → End time
- Hours worked
- Amount earned
- Paid amount
- Balance (due)
- Status badge

#### Customer Detail Page
Tap any customer's name (from Dashboard or History) to open their full detail page.

**What you see:**
- Customer summary card (total earned, total paid, balance)
- **Work Sessions** tab — every session with its own earned/paid/balance row
- **Payments** tab — every payment recorded, with date and note

**Actions on Customer Detail:**
- **Pay** button (top) — Record a lump-sum payment for that customer
- **WhatsApp (Overall)** button — Send the customer's full payment summary via WhatsApp
- **WhatsApp** button on each session row — Send that specific session's details via WhatsApp
- **Download PDF** — Download a PDF receipt of all work sessions for that customer

---

### 2.3 Expenses

**Path:** `/expenses`

Expenses track additional costs like fuel, maintenance, or other field expenses for each Vehicle user.

#### Vehicle Filter (Supervisor-only)
- Dropdown at the top to filter expenses by a specific Vehicle user.
- Leave it on **All** to see every expense across all your Vehicle users.

#### Expense List
Each row shows:
- Description of the expense
- Vehicle user it belongs to
- Date
- Total amount
- Amount paid
- Balance due
- Status badge (Settled / Partial / Pending)

#### Add Expense
1. Tap **+ Add Expense** (top-right).
2. Fill in:
   - **Description** — what the expense is for (e.g., "Diesel — 20 litres")
   - **Amount** — total cost in Rs.
   - **Vehicle User** — which Vehicle user this belongs to
   - **Date** — date of the expense
3. Tap **Save**.

#### Pay an Expense
1. Find the expense in the list.
2. Tap the **Pay** button on that row.
3. Enter the amount being paid.
4. Add an optional note.
5. Tap **Record Payment**.

#### Delete an Expense
- Tap the **Delete** (trash) icon on the expense row.
- Confirm when prompted.
- Fully settled expenses can also be deleted.

---

### 2.4 Overview

**Path:** `/supervisor-overview`

This page gives you a high-level Vehicle-by-Vehicle breakdown and lets you download reports.

#### Summary Cards
Same as Dashboard: Total Earned, Total Paid, Balance Due, Total Sessions — but now grouped per Vehicle.

#### Vehicle Filter
- Switch between Vehicle users using the dropdown at the top.
- The cards and customer list below update to show only that Vehicle's data.

#### Customers Pending Payment
- A list of customers who still have an outstanding balance under the selected Vehicle user.
- Quick overview: customer name, balance due, status.

#### Download PDF Report
1. Tap **Download PDF** button.
2. A dialog opens where you can select:
   - Which Vehicle user (or all)
   - Date range (optional)
3. Tap **Download**.
4. A PDF report is generated and downloaded to your device — covering customers, sessions, and payments for the selected scope.

---

### 2.5 Invoices

**Path:** `/invoices`

Invoices let you bill your clients directly from Smart Lekka. Only supervisors can create and manage invoices.

#### Invoice List
The main screen shows all invoices with:
- Invoice number (e.g., INV-0001)
- Client name
- Date
- Total amount
- Amount paid
- Balance due
- Status badge: **Paid** / **Partial** / **Pending**

#### Create Invoice
1. Tap **+ New Invoice** (top-right).
2. Fill in the invoice header:
   - **Invoice Number** — auto-filled (e.g., INV-0003), you can edit it
   - **Client Name** — who you are billing
   - **Client Mobile** — client's WhatsApp/phone number
   - **Invoice Date** — defaults to today
   - **Notes** — optional remarks
3. Add **Line Items**:
   - Each item has: Description, Quantity, Rate, and the Amount is auto-calculated.
   - Tap **+ Add Item** to add more rows.
   - Tap the trash icon on a row to remove it.
4. Enter **Amount Paid** if the client has already paid a portion.
5. Review the **Total**, **Paid**, and **Balance** at the bottom.
6. Tap **Create Invoice**.

#### View Invoice Detail
- Tap any invoice in the list to open its full detail view.
- You see all line items, payment history, and current balance.

#### Record a Payment on an Invoice
1. Open the invoice detail.
2. Tap **Record Payment**.
3. Enter the amount received and an optional note.
4. Tap **Save**. The invoice status updates automatically (Pending → Partial → Paid).

#### Download Invoice PDF
- Open the invoice detail.
- Tap **Download PDF**.
- A formatted PDF is generated with:
  - **Header:** `[Client Name] — Invoice`
  - Invoice number, date, status
  - Full line-items table
  - Payment history
  - Balance due
  - **Footer:** `✨ Thank You for Your Work! — Smart Lekka · Track Work. Settle Easy.`

#### Share Invoice via WhatsApp
- Open the invoice detail.
- Tap **WhatsApp** button.
- WhatsApp opens (web or app) with a pre-filled message containing:
  - Invoice number and date
  - Total amount, paid amount, balance due
  - Status and footer

#### Delete Invoice
- Open the invoice detail.
- Tap **Delete** (trash icon).
- Confirm the deletion.
- **Note:** Deleted invoices cannot be recovered.

---

---

## 3. Vehicle User Role

A Vehicle user is the machine operator on the ground. They log their own work sessions, view their own history, and track their own expenses. They cannot see other Vehicle users' data, invoices, or the supervisor overview.

### Pages available to Vehicle User
| Page | What it does |
|---|---|
| Dashboard (`/`) | Your personal summary + your customer list |
| Track (`/track`) | Log a work session (live timer or manual) |
| History (`/history`) | Your own work session records |
| Expenses (`/expenses`) | Your own expenses |

---

### 3.1 Dashboard

**Path:** `/` (Home)

Your personal financial summary.

#### Summary Cards
| Card | What it shows |
|---|---|
| Total Earned | Total wages earned by your customers |
| Total Paid | Total paid out by the supervisor |
| Balance Due | What is still pending |
| Total Sessions | Number of sessions you have logged |

#### Customer List
- Shows only the customers you have created and logged under your Vehicle account.
- Each row: customer name, earned, paid, balance, status badge.
- **View** — tap a customer name to see their full session history.

---

### 3.2 Track Work

**Path:** `/track`

This is where you record a new work session — either using the live timer or entering times manually.

#### Step 1 — Select or Create a Customer
- Tap the **Customer** dropdown.
- Select an existing customer from the list.
- Or tap **+ New Customer** to add a new one — enter their name and tap **Save**.

#### Step 2 — Enter Field Name
- Type the name of the field or location where the work is happening (e.g., "North Farm", "Survey No. 14").

#### Step 3A — Live Timer (recommended)
1. Tap **Start Work** to begin the timer. The timer starts counting.
2. When the work is done, tap **Stop Work**. The end time is recorded.
3. The session summary appears: start time, end time, hours, and estimated earnings based on the current rate.
4. Tap **Save Session** to save the record.

#### Step 3B — Manual Entry
- If you are recording a session that already happened:
  1. Enter **Start Date & Time** manually.
  2. Enter **End Date & Time** manually.
  3. The hours and earnings are auto-calculated.
  4. Tap **Save Session**.

#### After Saving
- The session is saved under your account.
- The customer's total earned and balance will update on the Dashboard and History pages.
- The supervisor can see this session immediately.

#### Important Notes
- You can only have **one active live session at a time**.
- If you close the app mid-session, the timer is lost — always stop and save before closing.
- The rate per hour is set by your supervisor or admin.

---

### 3.3 History

**Path:** `/history`

View all the work sessions you have logged.

#### Filters available to Vehicle User
| Filter | Options | Purpose |
|---|---|---|
| Filter by Customer | Dropdown | See sessions for one customer only |
| Status | All / Pending / Settled | Filter by payment status |

> Note: Vehicle users do **not** see a "Filter by Vehicle" dropdown — that is supervisor-only.

#### Session Log Table
Each row shows:
- Customer name
- Field name
- Date
- Start → End time
- Hours worked
- Amount earned
- Paid amount
- Balance
- Status badge

#### Customer Detail Page
Tap a customer's name to open their full detail:
- Summary card (total earned, total paid, balance)
- Work Sessions tab — every session
- Payments tab — every payment recorded by the supervisor

**Actions (visible but controlled by supervisor):**
- **WhatsApp** buttons — share session or overall summary via WhatsApp
- **Download PDF** — download a PDF receipt for that customer

---

### 3.4 Expenses

**Path:** `/expenses`

Track your own field expenses (fuel, maintenance, misc).

#### Expense List
Shows only expenses created under your Vehicle user account.

Columns: Description, Date, Total Amount, Paid, Balance, Status.

#### Add Expense
1. Tap **+ Add Expense**.
2. Fill in:
   - **Description** (e.g., "Fuel — 15L")
   - **Amount**
   - **Date**
3. Tap **Save**.

#### Pay an Expense (if supervisor has granted a payment)
- Tap **Pay** on an expense row.
- Enter the amount.
- Tap **Record Payment**.

#### Delete an Expense
- Tap the trash icon on the row.
- Confirm deletion.

> Note: You can only see and manage **your own expenses**. Other Vehicle users' expenses are not visible to you.

---

---

## 4. WhatsApp Sharing

WhatsApp sharing is available from two places: the Customer Detail page and the Invoice Detail page.

### Customer — Session WhatsApp
- Tap the **WhatsApp** button on any individual session row.
- Message sent to WhatsApp includes:
  ```
  *[Client Name] — Work Entry*

  👷 Customer : [Name]
  🌾 Field  : [Field]
  📅 Date   : [Date]

  ⏰ Start  : [Start Time]
  🏁 End    : [End Time]
  ⌛ Hours  : [X] hrs
  💰 Rate   : Rs.[X]/hr

  ─────────────────────
  💰 Total Earned : Rs.[X]
  💼 Total Paid   : Rs.[X]
  ⏳ Balance Due  : Rs.[X]
  ─────────────────────
  Status: ⏳ Pending / ✅ All Settled

  ✨ Thank You for Your Work!
  — Smart Lekka · Track Work. Settle Easy.
  ```

### Customer — Overall Payment Summary WhatsApp
- Tap the **WhatsApp (Overall)** button at the top of the Customer Detail page.
- Sends the customer's cumulative total (all sessions combined).

### Invoice WhatsApp
- Tap **WhatsApp** on the Invoice Detail page.
- Sends invoice number, total, paid, balance due, and status.

---

---

## 5. PDF Download

### Customer PDF
- Available on the Customer Detail page.
- Contains: all work sessions, payment history, and running balance for that customer.

### Supervisor Overview PDF
- Available on the Overview page.
- Scope can be filtered by Vehicle user and/or date range.
- Contains: summary per customer, sessions, payments, and totals.

### Invoice PDF
- Available on the Invoice Detail page.
- Contains: client name, invoice number, date, line items, payment history, and balance.
- Header: `[Client Name] — Invoice`
- Footer: `✨ Thank You for Your Work! — Smart Lekka · Track Work. Settle Easy.`

---

---

## 6. Quick Reference

### Role Comparison

| Feature | Vehicle User | Supervisor |
|---|---|---|
| Login | Yes | Yes |
| Dashboard | Own data only | All Vehicle users |
| Track Work (live timer) | Yes | No |
| History | Own sessions only | All Vehicle sessions + Vehicle filter |
| Expenses | Own only | All Vehicle users + Vehicle filter |
| Supervisor Overview | No | Yes |
| Invoices | No (403 Forbidden) | Yes — full CRUD |
| Customer Detail | Own customers | All customers |
| WhatsApp Share | Yes | Yes |
| PDF Download | Yes | Yes (+ overview report) |
| Set Rate | No | Yes (via Dashboard) |

### Credentials Format
| Role | Login Field | Example |
|---|---|---|
| Supervisor | Mobile Number | `9988776655` |
| Vehicle User | Vehicle Number | `VEH001` |

### Status Badge Meanings
| Badge | Meaning |
|---|---|
| Settled / Paid | No balance remaining |
| Partial | Some payment made, balance still due |
| Pending | No payment made yet |

---

*Smart Lekka — BSP Tech Solutions · Track Work. Settle Easy.*
