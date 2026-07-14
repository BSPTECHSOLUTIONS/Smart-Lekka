import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus, Trash2, FileText, MessageCircle, CreditCard,
  ChevronRight, MoreVertical, IndianRupee, CheckCircle2, Clock, AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function fmt(n: number) {
  return Math.round(n).toLocaleString("en-IN");
}

interface LineItem {
  description: string;
  amount: string;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  clientName: string;
  clientMobile: string | null;
  totalAmount: number;
  paidAmount: number;
  status: "PENDING" | "PARTIAL" | "PAID";
  notes: string | null;
  createdAt: string;
}

interface InvoiceDetail extends Invoice {
  items: Array<{ id: number; description: string; amount: number; sortOrder: number }>;
  payments: Array<{ id: number; amountPaid: number; note: string | null; paymentDate: string }>;
}

function statusBadge(status: string) {
  if (status === "PAID") return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border text-[10px] px-1.5">Paid</Badge>;
  if (status === "PARTIAL") return <Badge className="bg-blue-100 text-blue-700 border-blue-200 border text-[10px] px-1.5">Partial</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 border-amber-200 border text-[10px] px-1.5">Pending</Badge>;
}

function generateInvoicePDF(invoice: InvoiceDetail) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentW = pageW - margin * 2;
  const accentColor: [number, number, number] = [29, 78, 162];
  const accentLight: [number, number, number] = [219, 234, 254];
  const darkText: [number, number, number] = [15, 23, 42];
  const lightGray: [number, number, number] = [245, 248, 255];

  // Header — "[Client Name] — Invoice"
  const headerH = 30;
  doc.setFillColor(...accentColor);
  doc.rect(0, 0, pageW, headerH, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text(`${invoice.clientName} \u2014 Invoice`, margin, 13);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text(`No: ${invoice.invoiceNumber}`, pageW - margin, 12, { align: "right" });
  doc.text(`Date: ${format(new Date(invoice.createdAt), "dd MMM yyyy")}`, pageW - margin, 20, { align: "right" });

  // Status pill in header
  const statusLabel = invoice.status === "PAID" ? "PAID" : invoice.status === "PARTIAL" ? "PARTIAL" : "PENDING";
  const statusBg: [number, number, number] = invoice.status === "PAID" ? [5, 150, 105] : invoice.status === "PARTIAL" ? [245, 158, 11] : [239, 68, 68];
  doc.setFillColor(...statusBg);
  doc.roundedRect(margin, 18, 22, 7, 1.5, 1.5, "F");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(statusLabel, margin + 11, 23, { align: "center" });

  let y = headerH + 8;

  // Mobile info (compact, under header)
  if (invoice.clientMobile) {
    doc.setTextColor(...accentColor);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Mobile: ${invoice.clientMobile}`, margin, y);
    y += 6;
  }

  // Line items table
  doc.setTextColor(...accentColor);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Line Items", margin, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [["#", "Description", "Amount (Rs.)"]],
    body: invoice.items.map((item, i) => [i + 1, item.description, `Rs. ${fmt(item.amount)}`]),
    headStyles: { fillColor: accentColor, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5, textColor: darkText, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 } },
    alternateRowStyles: { fillColor: lightGray },
    columnStyles: { 0: { cellWidth: 12 }, 1: { cellWidth: contentW - 12 - 36 }, 2: { cellWidth: 36, halign: "right" } },
    margin: { left: margin, right: margin },
    tableWidth: contentW,
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // Totals block
  const totalsX = pageW - margin - 65;
  doc.setFillColor(...accentLight);
  doc.roundedRect(totalsX, y, 65, 32, 2, 2, "F");

  const drawRow = (label: string, value: string, bold = false, yOff = 0) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 9 : 8.5);
    doc.setTextColor(...accentColor);
    doc.text(label, totalsX + 4, y + yOff);
    doc.setTextColor(...darkText);
    doc.text(value, pageW - margin - 3, y + yOff, { align: "right" });
  };
  drawRow("Total Amount:", `Rs. ${fmt(invoice.totalAmount)}`, false, 8);
  doc.setDrawColor(200, 215, 240);
  doc.line(totalsX + 2, y + 12, totalsX + 63, y + 12);
  drawRow("Paid Amount:", `Rs. ${fmt(invoice.paidAmount)}`, false, 20);
  drawRow("Pending:", `Rs. ${fmt(Math.max(0, invoice.totalAmount - invoice.paidAmount))}`, true, 28);

  y += 42;

  // Payment history
  if (invoice.payments.length > 0) {
    doc.setTextColor(...accentColor);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Payment History", margin, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [["Date", "Note", "Amount Paid"]],
      body: invoice.payments.map((p) => [
        format(new Date(p.paymentDate), "dd MMM yyyy"),
        p.note || "-",
        `Rs. ${fmt(p.amountPaid)}`,
      ]),
      headStyles: { fillColor: accentColor, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
      bodyStyles: { fontSize: 8.5, textColor: darkText, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 } },
      alternateRowStyles: { fillColor: lightGray },
      columnStyles: { 0: { cellWidth: 36 }, 1: { cellWidth: contentW - 36 - 40 }, 2: { cellWidth: 40, halign: "right" } },
      margin: { left: margin, right: margin },
      tableWidth: contentW,
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  if (invoice.notes) {
    doc.setTextColor(...accentColor);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.text("Notes:", margin, y);
    doc.setTextColor(...darkText);
    doc.setFont("helvetica", "normal");
    doc.text(invoice.notes, margin + 14, y);
  }

  // Footer — Smart Lekka branding only here
  const ph = doc.internal.pageSize.getHeight();
  doc.setFillColor(...accentColor);
  doc.rect(0, ph - 14, pageW, 14, "F");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("\u2728 Thank You for Your Work!", pageW / 2, ph - 8, { align: "center" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 220, 255);
  doc.text("\u2014 Smart Lekka \u00B7 Track Work. Settle Easy.", pageW / 2, ph - 3, { align: "center" });

  doc.save(`Invoice_${invoice.invoiceNumber}_${format(new Date(), "yyyyMMdd")}.pdf`);
}

// ── Create Invoice Dialog ──────────────────────────────────────────────────
function CreateInvoiceDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientMobile, setClientMobile] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ description: "", amount: "" }]);
  const [fullyPaid, setFullyPaid] = useState(false);
  const [paidAmount, setPaidAmount] = useState("");
  const [notes, setNotes] = useState("");
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const totalAmount = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const computedPaid = fullyPaid ? totalAmount : parseFloat(paidAmount) || 0;

  const fetchNextNumber = async () => {
    if (!token) return;
    const r = await fetch("/api/invoices/next-number", { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) { const d = await r.json(); setInvoiceNumber(d.invoiceNumber); }
  };

  const handleOpen = async (o: boolean) => {
    setOpen(o);
    if (o) {
      setInvoiceNumber(""); setClientName(""); setClientMobile("");
      setItems([{ description: "", amount: "" }]);
      setFullyPaid(false); setPaidAmount(""); setNotes("");
      await fetchNextNumber();
    }
  };

  const addItem = () => setItems((prev) => [...prev, { description: "", amount: "" }]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof LineItem, value: string) => {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!invoiceNumber.trim() || !clientName.trim()) throw new Error("Invoice number and client name required");
      if (items.some((i) => !i.description.trim() || !i.amount)) throw new Error("All line items must have description and amount");
      const r = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          invoiceNumber: invoiceNumber.trim(),
          clientName: clientName.trim(),
          clientMobile: clientMobile.trim() || undefined,
          items: items.map((it) => ({ description: it.description.trim(), amount: parseFloat(it.amount) || 0 })),
          paidAmount: computedPaid,
          notes: notes.trim() || undefined,
        }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || "Failed to create invoice"); }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({ title: "Invoice created" });
      setOpen(false);
      onCreated();
    },
    onError: (e: Error) => {
      toast({ title: e.message, variant: "destructive" });
    },
  });

  return (
    <>
      <Button size="sm" className="gap-1.5 h-9" onClick={() => handleOpen(true)}>
        <Plus className="w-4 h-4" /> New Invoice
      </Button>
      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Create Invoice
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Invoice Number</Label>
                <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="INV-0001" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Client Mobile</Label>
                <Input value={clientMobile} onChange={(e) => setClientMobile(e.target.value)} placeholder="9876543210" className="h-9 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Client Name</Label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client name" className="h-9 text-sm" />
            </div>

            {/* Line items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground">Line Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-7 text-xs gap-1">
                  <Plus className="w-3 h-3" /> Add Item
                </Button>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <div className="grid grid-cols-[auto_1fr_28px] bg-muted/50 px-3 py-2 gap-2 text-[10px] font-semibold text-muted-foreground uppercase">
                  <span className="w-7">#</span><span>Description</span><span></span>
                </div>
                {items.map((item, idx) => (
                  <div key={idx} className="grid gap-2 px-3 py-2 border-t items-center" style={{ gridTemplateColumns: "28px 1fr 100px 28px" }}>
                    <span className="text-xs font-semibold text-muted-foreground text-center">{idx + 1}</span>
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(idx, "description", e.target.value)}
                      placeholder="Service description"
                      className="h-8 text-sm"
                    />
                    <Input
                      type="number"
                      min="0"
                      value={item.amount}
                      onChange={(e) => updateItem(idx, "amount", e.target.value)}
                      placeholder="Amount"
                      className="h-8 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      disabled={items.length === 1}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <div className="px-3 py-2 bg-muted/30 border-t flex justify-between items-center">
                  <span className="text-xs font-semibold text-muted-foreground">Total Amount</span>
                  <span className="text-sm font-bold text-primary">₹{fmt(totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Payment section */}
            <div className="space-y-2.5">
              <Label className="text-xs font-semibold text-muted-foreground">Payment</Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="fully-paid"
                  checked={fullyPaid}
                  onCheckedChange={(v) => setFullyPaid(v === true)}
                />
                <label htmlFor="fully-paid" className="text-sm cursor-pointer">Fully Paid</label>
              </div>
              {!fullyPaid && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Paid Amount</Label>
                  <Input
                    type="number" min="0"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder="0"
                    className="h-9 text-sm"
                  />
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 text-center bg-muted/30 rounded-lg px-3 py-2">
                <div>
                  <p className="text-[10px] text-muted-foreground">Total</p>
                  <p className="text-xs font-bold">₹{fmt(totalAmount)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Paid</p>
                  <p className="text-xs font-bold text-emerald-600">₹{fmt(computedPaid)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Pending</p>
                  <p className="text-xs font-bold text-amber-600">₹{fmt(Math.max(0, totalAmount - computedPaid))}</p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Notes (optional)</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any remarks..." className="h-9 text-sm" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending} className="gap-1.5">
              <FileText className="w-4 h-4" />
              {mutation.isPending ? "Saving…" : "Save Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Record Payment Dialog ──────────────────────────────────────────────────
function RecordPaymentDialog({ invoice, onDone }: { invoice: Invoice; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const remaining = invoice.totalAmount - invoice.paidAmount;

  const mutation = useMutation({
    mutationFn: async () => {
      const a = parseFloat(amount);
      if (!a || a <= 0) throw new Error("Enter a valid amount");
      const r = await fetch(`/api/invoices/${invoice.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amountPaid: a, note: note.trim() || undefined }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || "Failed"); }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice", invoice.id] });
      toast({ title: "Payment recorded" });
      setOpen(false); setAmount(""); setNote("");
      onDone();
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setOpen(true)}>
        <CreditCard className="w-3.5 h-3.5" /> Record Payment
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" /> Record Payment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-xs text-muted-foreground">
              Invoice <span className="font-semibold text-foreground">{invoice.invoiceNumber}</span> ·
              Remaining <span className="font-semibold text-amber-600">₹{fmt(remaining)}</span>
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">Amount Paid</Label>
              <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder={String(Math.round(remaining))} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Note (optional)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Cash payment" className="h-9 text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Invoice Detail Drawer ──────────────────────────────────────────────────
function InvoiceDetailDialog({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [paymentRefresh, setPaymentRefresh] = useState(0);

  const { data: detail } = useQuery<InvoiceDetail>({
    queryKey: ["invoice", invoice.id, paymentRefresh],
    queryFn: async () => {
      const r = await fetch(`/api/invoices/${invoice.id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error("Failed to load");
      return r.json();
    },
    enabled: !!token,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/invoices/${invoice.id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({ title: "Invoice deleted" });
      onClose();
    },
    onError: () => toast({ title: "Failed to delete invoice", variant: "destructive" }),
  });

  const handleWhatsApp = () => {
    if (!detail) return;
    const pending = Math.max(0, detail.totalAmount - detail.paidAmount);
    const isPaid = detail.status === "PAID";
    const statusText = isPaid ? "✅ All Settled" : detail.status === "PARTIAL" ? "⏳ Partially Paid" : "⏳ Pending";
    const msg = [
      `*${detail.clientName} \u2014 Invoice*`,
      ``,
      `📄 Invoice No : ${detail.invoiceNumber}`,
      `📅 Date       : ${format(new Date(detail.createdAt), "dd MMM yyyy")}`,
      ``,
      `\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`,
      `💰 Total Amount : ₹${fmt(detail.totalAmount)}`,
      `💼 Total Paid   : ₹${fmt(detail.paidAmount)}`,
      `⏳ Balance Due  : ₹${fmt(pending)}`,
      `\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`,
      `Status: ${statusText}`,
      ``,
      `✨ Thank You for Your Work!`,
      `\u2014 Smart Lekka \u00B7 Track Work. Settle Easy.`,
    ].join("\n");

    const mobile = detail.clientMobile?.replace(/\D/g, "");
    const url = mobile
      ? `https://wa.me/91${mobile}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <DialogTitle className="text-base">{invoice.invoiceNumber}</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{invoice.clientName} · {format(new Date(invoice.createdAt), "dd MMM yyyy")}</p>
            </div>
            {statusBadge(invoice.status)}
          </div>
        </DialogHeader>

        {detail ? (
          <div className="space-y-5 py-1">
            {/* Totals */}
            <div className="grid grid-cols-3 gap-2 text-center bg-muted/30 rounded-xl px-3 py-3">
              <div>
                <p className="text-[10px] text-muted-foreground">Total</p>
                <p className="text-sm font-bold">₹{fmt(detail.totalAmount)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Paid</p>
                <p className="text-sm font-bold text-emerald-600">₹{fmt(detail.paidAmount)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Pending</p>
                <p className="text-sm font-bold text-amber-600">₹{fmt(Math.max(0, detail.totalAmount - detail.paidAmount))}</p>
              </div>
            </div>

            {/* Line items */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Line Items</p>
              <div className="border rounded-lg overflow-hidden">
                {detail.items.map((item, i) => (
                  <div key={item.id} className={`flex justify-between items-center px-3 py-2.5 text-sm ${i > 0 ? "border-t" : ""}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-bold text-muted-foreground w-5 shrink-0">{i + 1}</span>
                      <span className="truncate">{item.description}</span>
                    </div>
                    <span className="font-semibold shrink-0 ml-3">₹{fmt(item.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center px-3 py-2.5 bg-primary/5 border-t">
                  <span className="text-xs font-bold text-primary">Total</span>
                  <span className="text-sm font-bold text-primary">₹{fmt(detail.totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Payment history */}
            {detail.payments.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Payment History</p>
                <div className="border rounded-lg overflow-hidden divide-y">
                  {detail.payments.map((p) => (
                    <div key={p.id} className="flex justify-between items-center px-3 py-2.5">
                      <div>
                        <p className="text-xs font-medium">{format(new Date(p.paymentDate), "dd MMM yyyy, hh:mm a")}</p>
                        {p.note && <p className="text-[10px] text-muted-foreground">{p.note}</p>}
                      </div>
                      <span className="text-sm font-semibold text-emerald-600">+₹{fmt(p.amountPaid)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detail.notes && (
              <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                <span className="font-semibold text-foreground">Notes: </span>{detail.notes}
              </p>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
        )}

        <DialogFooter className="flex-wrap gap-2 sm:justify-between">
          <div className="flex gap-2 flex-wrap">
            {detail && invoice.status !== "PAID" && (
              <RecordPaymentDialog invoice={invoice} onDone={() => setPaymentRefresh((p) => p + 1)} />
            )}
            {detail && (
              <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs"
                onClick={() => generateInvoicePDF(detail)}>
                <FileText className="w-3.5 h-3.5" /> PDF
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
              onClick={handleWhatsApp}>
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs text-destructive hover:bg-destructive/10"
            onClick={() => { if (confirm("Delete this invoice?")) deleteMutation.mutate(); }}>
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Invoices Page ────────────────────────────────────────────────────
export default function InvoicesPage() {
  const { token, user } = useAuth();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [refresh, setRefresh] = useState(0);

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ["invoices", refresh],
    queryFn: async () => {
      const r = await fetch("/api/invoices", { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) return [];
      return r.json();
    },
    enabled: !!token && user?.role === "supervisor",
  });

  if (user?.role !== "supervisor") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="w-10 h-10 text-destructive mb-3" />
        <p className="font-semibold">Access Denied</p>
        <p className="text-sm text-muted-foreground mt-1">This page is only for supervisors</p>
      </div>
    );
  }

  const totalInvoiced = invoices.reduce((s, i) => s + i.totalAmount, 0);
  const totalReceived = invoices.reduce((s, i) => s + i.paidAmount, 0);
  const totalPending = invoices.reduce((s, i) => s + Math.max(0, i.totalAmount - i.paidAmount), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Manage client billing & payments</p>
        </div>
        <CreateInvoiceDialog onCreated={() => setRefresh((p) => p + 1)} />
      </div>

      {/* Summary cards */}
      {invoices.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Card className="border-blue-100 shadow-sm">
            <CardContent className="px-3 py-3 sm:px-4 sm:py-4">
              <p className="text-[9px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Invoiced</p>
              <p className="text-sm sm:text-xl font-bold mt-0.5">₹{fmt(totalInvoiced)}</p>
            </CardContent>
          </Card>
          <Card className="border-emerald-100 shadow-sm">
            <CardContent className="px-3 py-3 sm:px-4 sm:py-4">
              <p className="text-[9px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Received</p>
              <p className="text-sm sm:text-xl font-bold mt-0.5 text-emerald-600">₹{fmt(totalReceived)}</p>
            </CardContent>
          </Card>
          <Card className="border-amber-100 shadow-sm">
            <CardContent className="px-3 py-3 sm:px-4 sm:py-4">
              <p className="text-[9px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Pending</p>
              <p className="text-sm sm:text-xl font-bold mt-0.5 text-amber-600">₹{fmt(totalPending)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Invoice list */}
      {isLoading ? (
        <Card className="border-border shadow-sm">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">Loading invoices…</CardContent>
        </Card>
      ) : invoices.length === 0 ? (
        <Card className="border-border shadow-sm">
          <CardContent className="py-14 text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-medium">No invoices yet</p>
            <p className="text-xs text-muted-foreground mt-1">Create your first invoice to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {invoices.map((inv) => {
            const pending = Math.max(0, inv.totalAmount - inv.paidAmount);
            return (
              <Card key={inv.id} className="border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedInvoice(inv)}>
                <CardContent className="px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <FileText className="w-4.5 h-4.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold">{inv.invoiceNumber}</p>
                          {statusBadge(inv.status)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{inv.clientName}</p>
                        <p className="text-[10px] text-muted-foreground">{format(new Date(inv.createdAt), "dd MMM yyyy")}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold">₹{fmt(inv.totalAmount)}</p>
                      {pending > 0 && <p className="text-[10px] text-amber-600 font-medium mt-0.5">₹{fmt(pending)} due</p>}
                      {inv.status === "PAID" && <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Settled</p>}
                      <ChevronRight className="w-4 h-4 text-muted-foreground mt-1 ml-auto" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {selectedInvoice && (
        <InvoiceDetailDialog
          invoice={selectedInvoice}
          onClose={() => { setSelectedInvoice(null); setRefresh((p) => p + 1); }}
        />
      )}
    </div>
  );
}
