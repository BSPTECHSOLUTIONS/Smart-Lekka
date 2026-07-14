import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart3, Calendar, Tractor, Banknote, Wallet, TrendingUp,
  Clock, MapPin, ArrowRight, Loader2, CheckCircle2, AlertCircle,
  Receipt, HandCoins,
} from "lucide-react";
import { format } from "date-fns";

function fmt(n: number) {
  return Math.round(n).toLocaleString("en-IN");
}

function fmtHours(h: number) {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

interface JcbUser { id: number; name: string; mobile: string; }

interface SiteLog {
  id: number; fieldName: string; startTime: string; endTime: string;
  totalHours: number; amount: number; paidAmount: number; status: string;
  jcbUserId: number;
}

interface ReportSummary {
  amountReceived: number; expensesPaid: number; netAmount: number;
  totalHours: number; sitesCount: number; previousPending: number;
  totalToCollect: number;
}

interface ReportData {
  date: string; summary: ReportSummary; sites: SiteLog[];
  expenses: Array<{ id: number; description: string; amount: number; amountPaid: number; date: string; }>;
}

interface JcbCard {
  jcbId: number; jcbName: string; jcbMobile: string;
  amountReceived: number; expensesPaid: number; netAmount: number;
  previousPending: number; totalToCollect: number;
  totalHours: number; sitesCount: number;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "PAID") return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">Paid</Badge>;
  if (status === "PARTIAL") return <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">Partial</Badge>;
  return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">Pending</Badge>;
}

function SummaryCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string; sub?: string;
  icon: any; accent: "orange" | "emerald" | "blue" | "violet" | "amber" | "rose";
}) {
  const styles = {
    orange:  { bar: "stat-card-orange", bg: "bg-orange-50 dark:bg-orange-950/30", icon: "text-orange-500" },
    emerald: { bar: "stat-card-emerald", bg: "bg-emerald-50 dark:bg-emerald-950/30", icon: "text-emerald-600" },
    blue:    { bar: "stat-card-blue",    bg: "bg-blue-50 dark:bg-blue-950/30",    icon: "text-blue-500" },
    violet:  { bar: "stat-card-violet",  bg: "bg-violet-50 dark:bg-violet-950/30", icon: "text-violet-600" },
    amber:   { bar: "stat-card-amber",   bg: "bg-amber-50 dark:bg-amber-950/30",  icon: "text-amber-600" },
    rose:    { bar: "stat-card-rose",    bg: "bg-rose-50 dark:bg-rose-950/30",    icon: "text-rose-500" },
  }[accent];

  return (
    <Card className={`${styles.bar} shadow-sm border border-border/60`}>
      <CardContent className="pt-4 pb-3 px-4 sm:pt-5 sm:pb-4 sm:px-5">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5 min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest">{label}</p>
            <p className="text-lg sm:text-2xl font-bold tracking-tight truncate">{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className={`${styles.bg} p-2 sm:p-2.5 rounded-xl shrink-0`}>
            <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${styles.icon}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SettlementDialog({
  open, onClose, jcbId, jcbName, summary, date,
}: {
  open: boolean; onClose: () => void;
  jcbId: number; jcbName: string; summary: ReportSummary; date: string;
}) {
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [collected, setCollected] = useState(summary.totalToCollect.toFixed(0));
  const [notes, setNotes] = useState("");

  const pending = Math.max(0, parseFloat(summary.totalToCollect.toFixed(2)) - (parseFloat(collected) || 0));

  const settleMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/jcb-report/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          jcbUserId: jcbId,
          settlementDate: date,
          amountReceived: summary.amountReceived,
          expensesPaid: summary.expensesPaid,
          netAmount: summary.netAmount,
          previousPending: summary.previousPending,
          totalToCollect: summary.totalToCollect,
          collected,
          notes,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jcb-report-cards"] });
      queryClient.invalidateQueries({ queryKey: ["jcb-report"] });
      toast({ title: "Settlement recorded successfully" });
      onClose();
    },
    onError: () => toast({ title: "Failed to record settlement", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HandCoins className="w-5 h-5 text-primary" />
            Record Settlement — {jcbName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-muted/40 rounded-xl p-4 space-y-2 border border-border/60">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Settlement Summary · {date}</p>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount Received</span>
              <span className="font-semibold">₹{fmt(summary.amountReceived)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Expenses Paid</span>
              <span className="font-semibold text-red-600">− ₹{fmt(summary.expensesPaid)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-border pt-2">
              <span className="text-muted-foreground">Net Amount</span>
              <span className="font-bold">₹{fmt(summary.netAmount)}</span>
            </div>
            {summary.previousPending > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Previous Pending</span>
                <span className="font-semibold text-amber-600">+ ₹{fmt(summary.previousPending)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 mt-1">
              <span className="font-semibold text-primary">Total to Collect</span>
              <span className="font-bold text-primary">₹{fmt(summary.totalToCollect)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Amount Collected (₹)</Label>
            <Input
              type="number" min="0" step="1"
              value={collected}
              onChange={(e) => setCollected(e.target.value)}
              className="h-11"
              placeholder="0"
            />
            {pending > 0 && (
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>₹{fmt(pending)} will carry forward to tomorrow</span>
              </div>
            )}
            {pending === 0 && collected && parseFloat(collected) > 0 && (
              <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Fully settled — no pending amount</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Input
              value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Cash received, UPI transfer…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => settleMutation.mutate()}
            disabled={settleMutation.isPending || !collected}
            className="gap-2"
          >
            {settleMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {settleMutation.isPending ? "Saving…" : "Record Settlement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function JcbCardComponent({ card, onSettle, onViewReport }: {
  card: JcbCard;
  onSettle: (card: JcbCard) => void;
  onViewReport: (jcbId: number) => void;
}) {
  const isPending = card.totalToCollect > 0;
  return (
    <Card className="border border-border/60 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 px-5 pt-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Tractor className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">{card.jcbName}</CardTitle>
              <p className="text-xs text-muted-foreground">{card.jcbMobile}</p>
            </div>
          </div>
          <Badge variant={isPending ? "destructive" : "outline"} className={isPending ? "" : "border-emerald-300 text-emerald-700 bg-emerald-50"}>
            {isPending ? `₹${fmt(card.totalToCollect)} Due` : "Settled"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/40 rounded-lg p-3 border border-border/40">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Received</p>
            <p className="text-base font-bold mt-0.5">₹{fmt(card.amountReceived)}</p>
          </div>
          <div className="bg-muted/40 rounded-lg p-3 border border-border/40">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Expenses</p>
            <p className="text-base font-bold mt-0.5 text-red-600">₹{fmt(card.expensesPaid)}</p>
          </div>
          <div className="bg-muted/40 rounded-lg p-3 border border-border/40">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Net Amount</p>
            <p className="text-base font-bold mt-0.5 text-emerald-600">₹{fmt(card.netAmount)}</p>
          </div>
          {card.previousPending > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
              <p className="text-[10px] text-amber-600 uppercase tracking-wider font-semibold">Prev. Pending</p>
              <p className="text-base font-bold mt-0.5 text-amber-700">₹{fmt(card.previousPending)}</p>
            </div>
          )}
        </div>
        <div className="flex gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{fmtHours(card.totalHours)}</span>
          <span className="text-border">|</span>
          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{card.sitesCount} site{card.sitesCount !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm" className="flex-1 gap-1.5 h-9"
            onClick={() => onSettle(card)}
            disabled={card.totalToCollect <= 0}
            variant={isPending ? "default" : "outline"}
          >
            <HandCoins className="w-3.5 h-3.5" />
            Received
          </Button>
          <Button
            size="sm" variant="outline" className="flex-1 gap-1.5 h-9"
            onClick={() => onViewReport(card.jcbId)}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            View Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function JcbReportPage() {
  const { token, user } = useAuth();
  const { toast } = useToast();

  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedJcb, setSelectedJcb] = useState<string>("all");
  const [settleCard, setSettleCard] = useState<JcbCard | null>(null);

  if (user?.role !== "supervisor") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Access restricted to supervisors</p>
        </div>
      </div>
    );
  }

  // Fetch JCB users list
  const { data: jcbUsers = [] } = useQuery<JcbUser[]>({
    queryKey: ["jcb-users"],
    queryFn: async () => {
      const r = await fetch("/api/jcb-users", { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) return [];
      return r.json();
    },
    enabled: !!token,
  });

  // Fetch JCB report cards
  const { data: cards = [], isLoading: loadingCards } = useQuery<JcbCard[]>({
    queryKey: ["jcb-report-cards"],
    queryFn: async () => {
      const r = await fetch("/api/jcb-report/cards", { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) return [];
      return r.json();
    },
    enabled: !!token,
  });

  // Fetch report data for selected date + JCB
  const reportQueryKey = ["jcb-report", selectedDate, selectedJcb];
  const { data: reportData, isLoading: loadingReport } = useQuery<ReportData>({
    queryKey: reportQueryKey,
    queryFn: async () => {
      const params = new URLSearchParams({ date: selectedDate });
      if (selectedJcb !== "all") params.set("jcbUserId", selectedJcb);
      const r = await fetch(`/api/jcb-report?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: !!token,
  });

  const summary = reportData?.summary;
  const sites = reportData?.sites ?? [];

  const handleViewReport = (jcbId: number) => {
    setSelectedJcb(String(jcbId));
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-primary" />
            JCB Report
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Daily financial & operational summary per JCB</p>
        </div>
      </div>

      {/* JCB Cards — today's overview */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Today's JCB Overview</h2>
        {loadingCards ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="rounded-xl border bg-card shadow-sm p-5 animate-pulse space-y-3">
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-muted rounded-xl" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 w-28 bg-muted rounded" />
                    <div className="h-3 w-20 bg-muted rounded" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[...Array(4)].map((_, j) => <div key={j} className="h-14 bg-muted rounded-lg" />)}
                </div>
              </div>
            ))}
          </div>
        ) : cards.length === 0 ? (
          <Card className="border border-dashed">
            <CardContent className="py-10 text-center">
              <Tractor className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground text-sm">No JCB users found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {cards.map((card) => (
              <JcbCardComponent
                key={card.jcbId} card={card}
                onSettle={(c) => setSettleCard(c)}
                onViewReport={handleViewReport}
              />
            ))}
          </div>
        )}
      </section>

      {/* Divider */}
      <div className="border-t border-border/60" />

      {/* Detailed Report — date + JCB filter */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-6">
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Detailed Report</h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="pl-9 h-9 w-[160px] text-sm"
                />
              </div>
            </div>
            {jcbUsers.length > 1 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">JCB</Label>
                <Select value={selectedJcb} onValueChange={setSelectedJcb}>
                  <SelectTrigger className="h-9 w-[160px] text-sm">
                    <SelectValue placeholder="All JCBs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All JCBs</SelectItem>
                    {jcbUsers.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>{u.mobile}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Summary cards */}
        {loadingReport ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6 animate-pulse">
            {[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl" />)}
          </div>
        ) : summary ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            <SummaryCard label="Amount Received" value={`₹${fmt(summary.amountReceived)}`} icon={Banknote} accent="emerald" sub="From customers" />
            <SummaryCard label="Expenses Paid" value={`₹${fmt(summary.expensesPaid)}`} icon={Receipt} accent="rose" sub="JCB expenses" />
            <SummaryCard label="Net to Collect" value={`₹${fmt(summary.netAmount)}`} icon={TrendingUp} accent="blue" sub="Received − Expenses" />
            <SummaryCard label="Hours Worked" value={fmtHours(summary.totalHours)} icon={Clock} accent="violet" sub="Total tracked" />
            <SummaryCard label="Sites Worked" value={String(summary.sitesCount)} icon={MapPin} accent="amber" sub={`on ${format(new Date(selectedDate + "T00:00:00"), "dd MMM")}`} />
          </div>
        ) : null}

        {/* Carry-forward notice */}
        {summary && summary.previousPending > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-800 dark:text-amber-300">Carry-Forward Pending</p>
              <div className="mt-1.5 space-y-0.5 text-amber-700 dark:text-amber-400">
                <p>Yesterday's Pending: <strong>₹{fmt(summary.previousPending)}</strong></p>
                <p>Today's Net Amount: <strong>₹{fmt(summary.netAmount)}</strong></p>
                <p className="font-bold text-amber-800 dark:text-amber-200">Total to Collect: ₹{fmt(summary.totalToCollect)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Sites worked table */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-3 px-5 pt-4 border-b border-border/60">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Sites Worked
              </CardTitle>
              <Badge variant="outline" className="text-xs">{sites.length} site{sites.length !== 1 ? "s" : ""}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingReport ? (
              <div className="p-5 space-y-3 animate-pulse">
                {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-muted rounded-lg" />)}
              </div>
            ) : sites.length === 0 ? (
              <div className="py-12 text-center">
                <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                <p className="text-sm text-muted-foreground">No sites worked on this date</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {/* Header row */}
                <div className="hidden sm:grid sm:grid-cols-6 gap-3 px-5 py-2.5 bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <span className="col-span-2">Site / Field</span>
                  <span>Date</span>
                  <span>Hours</span>
                  <span>Amount</span>
                  <span>Status</span>
                </div>
                {sites.map((site) => {
                  const start = new Date(site.startTime);
                  return (
                    <div key={site.id} className="px-4 sm:px-5 py-3.5 sm:grid sm:grid-cols-6 sm:gap-3 sm:items-center hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-2.5 col-span-2 mb-2 sm:mb-0">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <MapPin className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{site.fieldName}</p>
                          <p className="text-xs text-muted-foreground sm:hidden">
                            {format(start, "hh:mm a")} — {format(new Date(site.endTime), "hh:mm a")}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground hidden sm:block">{format(start, "dd MMM")}</p>
                      <p className="text-sm font-medium hidden sm:block">{fmtHours(site.totalHours)}</p>
                      <div className="hidden sm:block">
                        <p className="text-sm font-semibold">₹{fmt(site.amount)}</p>
                        {site.paidAmount > 0 && <p className="text-xs text-muted-foreground">Paid: ₹{fmt(site.paidAmount)}</p>}
                      </div>
                      <div className="flex sm:block items-center justify-between">
                        <StatusBadge status={site.status} />
                        {/* Mobile only extras */}
                        <div className="sm:hidden text-right">
                          <p className="text-sm font-semibold">₹{fmt(site.amount)}</p>
                          <p className="text-xs text-muted-foreground">{fmtHours(site.totalHours)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Settlement dialog */}
      {settleCard && summary && (
        <SettlementDialog
          open={!!settleCard}
          onClose={() => setSettleCard(null)}
          jcbId={settleCard.jcbId}
          jcbName={settleCard.jcbName}
          summary={{
            amountReceived: settleCard.amountReceived,
            expensesPaid: settleCard.expensesPaid,
            netAmount: settleCard.netAmount,
            previousPending: settleCard.previousPending,
            totalToCollect: settleCard.totalToCollect,
            totalHours: settleCard.totalHours,
            sitesCount: settleCard.sitesCount,
          }}
          date={today}
        />
      )}
    </div>
  );
}
