import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

interface WorkerSummary {
  id: number;
  name: string;
  totalEarned: number;
  totalPaid: number;
  pendingAmount: number;
}

interface WorkLog {
  id: number;
  workerId: number;
  workerName?: string | null;
  fieldName: string;
  startTime: string;
  endTime: string;
  totalHours: number;
  amount: number;
}

interface Payment {
  id: number;
  workerId: number;
  amountPaid: number;
  paymentDate: string;
}

export interface ReportFilters {
  workerIds: number[] | "all";
  fromDate: Date | null;
  toDate: Date | null;
  jcbUserId?: number | null;
  jcbName?: string | null;
  clientName?: string | null;
  ratePerHour?: number | null;
}

function applyDateFilter<T extends { startTime?: string; paymentDate?: string }>(
  items: T[],
  fromDate: Date | null,
  toDate: Date | null,
  dateKey: "startTime" | "paymentDate"
): T[] {
  return items.filter((item) => {
    const d = new Date(item[dateKey] as string);
    if (fromDate && d < fromDate) return false;
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      if (d > end) return false;
    }
    return true;
  });
}

function rupee(n: number): string {
  return `Rs. ${Math.round(n).toLocaleString("en-IN")}`;
}

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateDashboardPDF(
  workers: WorkerSummary[],
  filters: ReportFilters,
  token: string,
  baseUrl: string
) {
  const selectedWorkers =
    filters.workerIds === "all"
      ? workers
      : workers.filter((w) => (filters.workerIds as number[]).includes(w.id));

  const authHeaders = { Authorization: `Bearer ${token}` };

  const allLogs: WorkLog[] = [];
  const allPayments: Payment[] = [];

  await Promise.all(
    selectedWorkers.map(async (w) => {
      const logsUrl = filters.jcbUserId
        ? `${baseUrl}/api/workers/${w.id}/logs?jcbUserId=${filters.jcbUserId}`
        : `${baseUrl}/api/workers/${w.id}/logs`;
      const [logsRes, paymentsRes] = await Promise.all([
        fetch(logsUrl, { headers: authHeaders }),
        fetch(`${baseUrl}/api/workers/${w.id}/payments`, { headers: authHeaders }),
      ]);
      const logs: WorkLog[] = logsRes.ok ? await logsRes.json() : [];
      const payments: Payment[] = paymentsRes.ok ? await paymentsRes.json() : [];
      allLogs.push(...logs.map((l) => ({ ...l, workerName: l.workerName ?? w.name })));
      allPayments.push(...payments.map((p) => ({ ...p, workerName: w.name })));
    })
  );

  const filteredLogs = applyDateFilter(allLogs, filters.fromDate, filters.toDate, "startTime");
  const filteredPayments = applyDateFilter(allPayments, filters.fromDate, filters.toDate, "paymentDate");

  // Load logo
  const logoBase64 = await loadImageAsBase64("/smart-lekka-logo.png");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 12;

  // Layout
  const contentW = pageW - margin * 2;   // 186 mm on A4

  // Blue & white palette
  const accentColor: [number, number, number] = [29, 78, 162];      // deep blue header
  const accentLight: [number, number, number] = [219, 234, 254];    // blue-100 row highlight
  const accentMid: [number, number, number] = [59, 130, 246];       // blue-500 for section titles
  const lightGray: [number, number, number] = [245, 248, 255];      // very light blue-white alt row
  const darkText: [number, number, number] = [15, 23, 42];          // slate-900

  // Header banner
  const headerH = 26;
  doc.setFillColor(...accentColor);
  doc.rect(0, 0, pageW, headerH, "F");

  // Logo image or fallback text
  const logoW = 22;
  const logoH = 22;
  const logoX = margin;
  const logoY = 2;

  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", logoX, logoY, logoW, logoH);
    } catch {
      // fallback
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(logoX, logoY + 3, 36, 14, 2, 2, "F");
      doc.setTextColor(...accentColor);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Smart Lekka", logoX + 3, logoY + 12);
    }
  } else {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(logoX, logoY + 3, 36, 14, 2, 2, "F");
    doc.setTextColor(...accentColor);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Smart Lekka", logoX + 3, logoY + 12);
  }

  // Report title & date
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Dashboard Report", logoX + logoW + 6, 14);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${format(new Date(), "dd MMM yyyy, hh:mm a")}`, pageW - margin, 14, { align: "right" });

  let y = headerH + 6;

  // ── Client info & Rate bar ──
  if (filters.clientName || filters.ratePerHour) {
    doc.setFillColor(...accentLight);
    doc.rect(0, y - 3, pageW, 10, "F");

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...accentColor);

    const leftLabel = filters.clientName ? `Client: ${filters.clientName}` : "";
    const rightLabel = filters.ratePerHour ? `Rate: Rs.${filters.ratePerHour}/hr` : "";

    if (leftLabel) doc.text(leftLabel, margin, y + 3.5);
    if (rightLabel) doc.text(rightLabel, pageW - margin, y + 3.5, { align: "right" });

    y += 13;
  }

  doc.setTextColor(...darkText);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");

  const filterParts: string[] = [];
  filterParts.push(
    filters.workerIds === "all"
      ? "Workers: All"
      : `Workers: ${selectedWorkers.map((w) => w.name).join(", ")}`
  );
  if (filters.fromDate && filters.toDate) {
    filterParts.push(
      `Period: ${format(filters.fromDate, "dd MMM yyyy")} - ${format(filters.toDate, "dd MMM yyyy")}`
    );
  } else if (filters.fromDate) {
    filterParts.push(`From: ${format(filters.fromDate, "dd MMM yyyy")}`);
  } else if (filters.toDate) {
    filterParts.push(`Until: ${format(filters.toDate, "dd MMM yyyy")}`);
  } else {
    filterParts.push("Period: All Time");
  }
  if (filters.jcbUserId && filters.jcbName) {
    filterParts.push(`JCB: ${filters.jcbName}`);
  }
  doc.text(filterParts.join("   |   "), margin, y);
  y += 7;

  doc.setDrawColor(200, 215, 240);
  doc.line(margin, y, pageW - margin, y);
  y += 7;

  // ── Section: Worker Summary ──
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...accentMid);
  doc.text("Worker Summary", margin, y);
  y += 5;

  const workerRows = selectedWorkers.map((w) => {
    const workerLogs = filteredLogs.filter((l) => l.workerId === w.id);
    const workerPayments = filteredPayments.filter((p) => p.workerId === w.id);
    const earned = workerLogs.reduce((s, l) => s + l.amount, 0);
    const paid = workerPayments.reduce((s, p) => s + p.amountPaid, 0);
    const pending = earned - paid;
    return [w.name, rupee(earned), rupee(paid), rupee(Math.max(0, pending))];
  });

  const workerTotalEarned = selectedWorkers.reduce((s, w) => {
    return s + filteredLogs.filter(l => l.workerId === w.id).reduce((a, l) => a + l.amount, 0);
  }, 0);
  const workerTotalPaid = selectedWorkers.reduce((s, w) => {
    return s + filteredPayments.filter(p => p.workerId === w.id).reduce((a, p) => a + p.amountPaid, 0);
  }, 0);
  const workerTotalPending = workerTotalEarned - workerTotalPaid;

  // Worker Summary: col align [left, right, right, right] — cols sum = 65+41+40+40 = 186mm
  const wsColAlign: Array<"left" | "center" | "right"> = ["left", "right", "right", "right"];
  autoTable(doc, {
    startY: y,
    head: [["Worker Name", "Total Earned", "Total Paid", "Pending Balance"]],
    body: [
      ...workerRows,
      ["TOTAL", rupee(workerTotalEarned), rupee(workerTotalPaid), rupee(Math.max(0, workerTotalPending))],
    ],
    headStyles: {
      fillColor: accentColor, textColor: [255, 255, 255], fontStyle: "bold",
      fontSize: 8.5, valign: "middle", cellPadding: { top: 3, bottom: 3, left: 3, right: 3 }
    },
    bodyStyles: { fontSize: 8, textColor: darkText, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 } },
    alternateRowStyles: { fillColor: lightGray },
    columnStyles: {
      0: { cellWidth: 65 },
      1: { cellWidth: 41 },
      2: { cellWidth: 40 },
      3: { cellWidth: 40 },
    },
    didParseCell(data) {
      // Force correct alignment for BOTH header and body cells
      data.cell.styles.halign = wsColAlign[data.column.index] ?? "left";
      if (data.row.index === workerRows.length && data.section === "body") {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = accentLight;
        data.cell.styles.textColor = accentColor;
      }
    },
    margin: { left: margin, right: margin },
    tableWidth: contentW,
  });

  y = (doc as any).lastAutoTable.finalY + 12;
  if (y > 240) { doc.addPage(); y = 20; }

  // ── Section: Work Sessions ──
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...accentMid);
  doc.text("Work Sessions", margin, y);
  y += 5;

  const logsSorted = [...filteredLogs].sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );
  const logRows = logsSorted.map((l) => [
    l.workerName ?? "",
    l.fieldName,
    format(new Date(l.startTime), "dd MMM yyyy"),
    format(new Date(l.startTime), "hh:mm a"),
    format(new Date(l.endTime), "hh:mm a"),
    `${l.totalHours.toFixed(2)}h`,
    rupee(l.amount),
  ]);

  const totalLogEarned = filteredLogs.reduce((s, l) => s + l.amount, 0);
  const totalLogHours = filteredLogs.reduce((s, l) => s + l.totalHours, 0);

  // Work Sessions: col align [left,left,center,center,center,right,right] — cols sum = 32+36+27+23+23+17+28 = 186mm
  const wkColAlign: Array<"left" | "center" | "right"> = ["left", "left", "center", "center", "center", "right", "right"];
  autoTable(doc, {
    startY: y,
    head: [["Worker", "Field", "Date", "Start", "End", "Hours", "Amount"]],
    body:
      logRows.length > 0
        ? [
            ...logRows,
            ["TOTAL", "", "", "", "", `${totalLogHours.toFixed(2)}h`, rupee(totalLogEarned)],
          ]
        : [["No work sessions found", "", "", "", "", "", ""]],
    headStyles: {
      fillColor: accentColor, textColor: [255, 255, 255], fontStyle: "bold",
      fontSize: 7.5, valign: "middle", cellPadding: { top: 3, bottom: 3, left: 2.5, right: 2.5 }
    },
    bodyStyles: { fontSize: 7.5, textColor: darkText, cellPadding: { top: 2.5, bottom: 2.5, left: 2.5, right: 2.5 } },
    alternateRowStyles: { fillColor: lightGray },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 36 },
      2: { cellWidth: 27 },
      3: { cellWidth: 23 },
      4: { cellWidth: 23 },
      5: { cellWidth: 17 },
      6: { cellWidth: 28 },
    },
    didParseCell(data) {
      data.cell.styles.halign = wkColAlign[data.column.index] ?? "left";
      if (logRows.length > 0 && data.row.index === logRows.length && data.section === "body") {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = accentLight;
        data.cell.styles.textColor = accentColor;
      }
    },
    margin: { left: margin, right: margin },
    tableWidth: contentW,
  });

  y = (doc as any).lastAutoTable.finalY + 12;
  if (y > 240) { doc.addPage(); y = 20; }

  // ── Section: Payment History ──
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...accentMid);
  doc.text("Payment History", margin, y);
  y += 5;

  const paymentsSorted = [...filteredPayments].sort(
    (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
  );

  const workerNameMap = Object.fromEntries(selectedWorkers.map((w) => [w.id, w.name]));
  const paymentRows = paymentsSorted.map((p) => [
    workerNameMap[p.workerId] ?? "",
    format(new Date(p.paymentDate), "dd MMM yyyy"),
    format(new Date(p.paymentDate), "hh:mm a"),
    rupee(p.amountPaid),
  ]);
  const totalPaid = filteredPayments.reduce((s, p) => s + p.amountPaid, 0);

  // Payment History: col align [left,center,center,right] — cols sum = 65+47+30+44 = 186mm
  const phColAlign: Array<"left" | "center" | "right"> = ["left", "center", "center", "right"];
  autoTable(doc, {
    startY: y,
    head: [["Worker", "Payment Date", "Time", "Amount Paid"]],
    body:
      paymentRows.length > 0
        ? [
            ...paymentRows,
            ["TOTAL", "", "", rupee(totalPaid)],
          ]
        : [["No payments recorded", "", "", ""]],
    headStyles: {
      fillColor: accentColor, textColor: [255, 255, 255], fontStyle: "bold",
      fontSize: 8.5, valign: "middle", cellPadding: { top: 3, bottom: 3, left: 3, right: 3 }
    },
    bodyStyles: { fontSize: 8, textColor: darkText, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 } },
    alternateRowStyles: { fillColor: lightGray },
    columnStyles: {
      0: { cellWidth: 65 },
      1: { cellWidth: 47 },
      2: { cellWidth: 30 },
      3: { cellWidth: 44 },
    },
    didParseCell(data) {
      data.cell.styles.halign = phColAlign[data.column.index] ?? "left";
      if (paymentRows.length > 0 && data.row.index === paymentRows.length && data.section === "body") {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = accentLight;
        data.cell.styles.textColor = accentColor;
      }
    },
    margin: { left: margin, right: margin },
    tableWidth: contentW,
  });

  // Page numbers & footer
  const pageCount = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const ph = doc.internal.pageSize.getHeight();

    // footer bar
    doc.setFillColor(...accentColor);
    doc.rect(0, ph - 10, pageW, 10, "F");

    doc.setFontSize(7);
    doc.setTextColor(200, 220, 255);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Smart Lekka  |  Page ${i} of ${pageCount}  |  All Rights Reserved by BSP Tech Solutions 2026`,
      pageW / 2,
      ph - 3.5,
      { align: "center" }
    );
  }

  const fileName = `SmartLekka_Report_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`;
  doc.save(fileName);
}
