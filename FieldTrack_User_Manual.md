# FieldTrack — User Manual

**Version 1.0 · April 2026**

---

## Table of Contents

1. [Getting Started — Logging In](#1-getting-started--logging-in)
2. [Dashboard](#2-dashboard)
3. [Tracking Work Time](#3-tracking-work-time)
4. [Customer Details](#4-customer-details)
5. [Recording Payments](#5-recording-payments)
6. [History](#6-history)
7. [Sharing a Payment Summary via WhatsApp](#7-sharing-a-payment-summary-via-whatsapp)
8. [Downloading a PDF Report](#8-downloading-a-pdf-report)

---

## 1. Getting Started — Logging In

Open the FieldTrack app in your browser. You will see the login screen.

**Steps:**
1. Enter your registered **mobile number** in the first field.
2. Enter your **password** in the second field.
3. Tap **Login**.

If the credentials are correct, you will be taken to the Dashboard automatically.

> If you see "Invalid mobile number or password", double-check what you typed and try again. Contact your administrator if you have forgotten your password.

---

## 2. Dashboard

The Dashboard is your home screen. It gives you a quick overview of all farm activity.

### Summary Cards (top row)

| Card | What it shows |
|---|---|
| **Total Customers** | How many customers are registered |
| **Total Earned** | Total amount earned by all customers (₹) |
| **Total Paid** | Total amount already paid out (₹) |
| **Total Pending** | Amount still owed to customers (₹) |

### Payment Progress Bar

Below the cards, a progress bar shows what percentage of all earnings have been paid out so far.

### Customers List

All customers with a pending balance are listed here. Each row shows:
- Customer name and initials avatar
- Total earned / total paid / pending balance
- A **Settled** or **Pending** badge

**Searching for a customer:**
Type a name in the search box on the right side of the Customers section. The list filters in real time. Click the **×** button to clear the search.

**Showing settled customers:**
By default, customers with no pending balance are hidden. Click **Show Settled** to reveal them, and **Hide Settled** to hide them again. If all customers are fully settled, a message will confirm this.

**Going to a customer's detail page:**
Click the **→** arrow button on any customer row to open their full profile.

---

## 3. Tracking Work Time

The **Track Time** page lets you start a timer when a customer begins a field session, and stop it when they finish.

### Starting a Session

1. Click **Track Time** in the left sidebar.
2. Choose a customer:
   - Select an existing customer from the dropdown, **or**
   - Tick **Add new customer on the fly** and type their name.
3. Type the **Field Name** (e.g. "North Pasture").
4. Tap **START TRACKING**.

The page switches to a large running clock showing the elapsed time for the session.

### Active Session Banner

Once a session is running, a **green bar** appears at the very top of every page showing:
- The customer's name and field
- The live running timer

This means you can freely navigate to other pages (Dashboard, History, etc.) — the timer keeps running in the background. Click **Go to Tracker →** in the green bar at any time to return to the timer.

### Ending a Session

1. Go to the Track Time page (or tap **Go to Tracker →** in the green bar).
2. Tap the red **END SESSION** button.
3. A review screen appears showing:
   - Customer name and field
   - Total hours worked
   - Auto-calculated payment amount based on the current rate (₹/hr)

4. You can manually edit the payment amount if needed.
5. Tap **Save & View Customer** to save the session and go to that customer's detail page.
6. Tap **Discard** to cancel and delete the session without saving.

> The payment amount is automatically calculated as: **Hours worked × Hourly rate (₹/hr)**. Your administrator sets the hourly rate.

---

## 4. Customer Details

Click any customer's **→** button on the Dashboard (or **Details** link on the History page) to open their profile.

### Customer Summary

At the top you see:
- The customer's name and initials avatar
- A **Settled** badge (green) if they have no pending balance, or a **Pending** badge (red) if money is still owed
- Join date

### Stats Cards

Three cards show the customer's financial summary:
- **Total Earned** — sum of all work session amounts
- **Total Paid** — sum of all payments made
- **Pending Balance** — what is still owed (shown in red if unpaid)

### Payment Progress Bar

Shows what percentage of total earnings have been paid to this customer.

### Work History (left panel)

A list of every field session for this customer, showing:
- Field name
- Date and hours worked
- Amount earned (₹)

### Payment History (right panel)

A list of every payment recorded for this customer, showing:
- Payment date and time
- Amount paid (₹)

---

## 5. Recording Payments

When you pay a customer, record it in FieldTrack to keep the balance accurate.

1. Open the customer's detail page.
2. Click the **Add Payment** button (top-right of the page).
3. A dialog box opens showing the current pending balance.
4. The amount field is pre-filled with the full pending balance — you can change it to record a partial payment.
5. Click **Record Payment**.

The customer's pending balance updates immediately. If the balance reaches zero, their badge automatically changes to **Settled**.

> The **Add Payment** button is disabled if the customer is already fully settled.

---

## 6. History

The **History** page shows all work sessions and payments for every customer in one place.

1. Click **History** in the left sidebar.

### Filtering

**By customer:** Use the dropdown at the top to view only one specific customer, or keep it on **All Customers**.

**By payment status:** Use the three buttons to switch between:
- **All Status** — show everyone
- **⚠ Pending** — show only customers who still have an outstanding balance
- **✓ Settled** — show only fully paid customers

### Reading the History Cards

Each customer has their own card showing:
- Name, total earned, total paid, and any pending amount at the top
- **Work Sessions** on the left — sorted newest first, showing field, date, hours, and amount
- **Payments** on the right — sorted newest first, showing date, time, and amount paid

Click **Details →** on any card to jump to that customer's full detail page.

---

## 7. Sharing a Payment Summary via WhatsApp

You can send a customer's payment summary directly via WhatsApp.

1. Open the customer's detail page.
2. Click the green **WhatsApp** button near the top-right.
3. WhatsApp opens (in the app or in your browser) with a pre-written message:

```
*FieldTrack Payment Summary*
Customer: [Name]

Total Earned: ₹X,XXX.00
Total Paid: ₹X,XXX.00
Pending Balance: ₹X,XXX.00

Date: 16 Apr 2026
```

4. Select the contact you want to send it to, and tap Send.

> No phone number is dialled automatically — you choose who to send the message to inside WhatsApp.

---

## 8. Downloading a PDF Report

You can download a full PDF report of earnings and payments for any date range.

1. On the **Dashboard**, click the **Download PDF** button (top-right area of the page).
2. A dialog opens with filter options:

   **Customer:** Choose **All Customers** or a specific customer.

   **Date Range (Preset):**
   - **All Time** — every record ever
   - **This Month** — current calendar month
   - **Last Month** — previous calendar month
   - **Custom** — pick any start and end date yourself

3. Click **Generate PDF**.

The PDF downloads automatically and contains:
- A cover summary (total customers, earned, paid, pending)
- A **Customer Summary** table
- A **Work Sessions** table
- A **Payments** table

> Use **This Month** or **Last Month** to generate a monthly payroll report.

---

## Quick Reference

| Action | How to do it |
|---|---|
| Log in | Enter mobile + password on the login screen |
| Start tracking | Track Time → select customer & field → START TRACKING |
| Stop tracking | Track Time → END SESSION → review → Save |
| Check a customer's balance | Dashboard → click → on the customer row |
| Record a payment | Customer detail page → Add Payment |
| View all history | Click History in the sidebar |
| Share summary on WhatsApp | Customer detail page → WhatsApp button |
| Download PDF report | Dashboard → Download PDF |
| Show/hide settled customers | Dashboard → Show Settled / Hide Settled button |

---

*FieldTrack — Field Work & Customer Payment Tracker*
