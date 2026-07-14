import React, { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users, Banknote, Wallet, TrendingUp, ArrowRight,
  FileDown, CalendarRange, Tractor, AlertCircle, BarChart3,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import type { ReportFilters } from "@/lib/generate-pdf";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

function fmt(n: number) {
  return Math.round(n).toLocaleString("en-IN");
}

type DatePreset = "all" | "this_month" | "last_month" | "custom";

interface JcbUser {
  id: number;
  name: string;
  mobile: string;
}

interface Worker {
  id: number;
  name: string;
  totalEarned: number;
  totalPaid: number;
  pendingAmount: number;
}

interface DashboardSummary {
  totalWorkers: number;
  totalEarned: number;
  totalPaid: number;
  totalPending: number;
  amountPerHour: number;
}

interface JcbCard {
  jcbId: number;
  jcbName: string;
  jcbMobile: string;
  amountReceived: number;
  expensesPaid: number;
  netAmount: number;
  previousPending: number;
  totalToCollect: number;
  totalHours: number;
  sitesCount: number;
}

interface TrendPoint {
  date: string;
  income: number;
  expenses: number;
  hours: number;
}

const PIE_COLORS = ["#f97316", "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#14b8a6"];

function StatCard({ title, value, icon: Icon, accent, sub }: {
  title: string; value: string; icon: any;
  accent: "blue" | "green" | "violet" | "amber"; sub?: string;
}) {
  const styles = {
    blue:   { bar: "stat-card-blue",    bg: "bg-blue-50 dark:bg-blue-950/30",    icon: "text-blue-500" },
    green:  { bar: "stat-card-emerald", bg: "bg-emerald-50 dark:bg-emerald-950/30", icon: "text-emerald-600" },
    violet: { bar: "stat-card-violet",  bg: "bg-violet-50 dark:bg-violet-950/30",   icon: "text-violet-600" },
    amber:  { bar: "stat-card-amber",   bg: "bg-amber-50 dark:bg-amber-950/30",  icon: "text-amber-600" },
  }[accent];

  return (
    <Card className={`${styles.bar} border border-border/60 shadow-sm`}>
      <CardContent className="pt-4 pb-3 px-4 sm:pt-5 sm:pb-4 sm:px-5">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5 min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest">{title}</p>
            <p className="text-lg sm:text-2xl font-bold tracking-tight truncate leading-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`${styles.bg} p-2 sm:p-2.5 rounded-xl shrink-0 mt-0.5`}>
            <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${styles.icon}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DownloadDialog({ workers, jcbUserId, jcbMobile }: {
  workers: Worker[];
  jcbUserId?: number | null;
  jcbMobile?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [workerFilter, setWorkerFilter] = useState<"all" | string>("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [generating, setGenerating] = useState(false);
  const { token } = useAuth();
  const { toast } = useToast();

  const getDateRange = (): { from: Date | null; to: Date | null } => {
    const now = new Date();
    if (datePreset === "this_month") return { from: startOfMonth(now), to: endOfMonth(now) };
    if (datePreset === "last_month") { const l = subMonths(now, 1); return { from: startOfMonth(l), to: endOfMonth(l) }; }
    if (datePreset === "custom") return { from: fromDate ? new Date(fromDate) : null, to: toDate ? new Date(toDate) : null };
    return { from: null, to: null };
  };

  const dateLabel = () => {
    const { from, to } = getDateRange();
    if (!from && !to) return "All time";
    if (from && to) return `${format(from, "dd MMM")} – ${format(to, "dd MMM yyyy")}`;
    if (from) return `From ${format(from, "dd MMM yyyy")}`;
    return `Until ${format(to!, "dd MMM yyyy")}`;
  };

  const handleGenerate = async () => {
    if (!token) return;
    setGenerating(true);
    try {
      let clientName: string | null = null;
      try {
        const r = await fetch("/api/client/me", { headers: { Authorization: `Bearer ${token}` } });
        if (r.ok) { const c = await r.json(); clientName = c.name ?? null; }
      } catch { /* non-blocking */ }

      const { from, to } = getDateRange();
      const filters: ReportFilters = {
        workerIds: workerFilter === "all" ? "all" : [parseInt(workerFilter)],
        fromDate: from, toDate: to,
        jcbUserId: jcbUserId ?? null,
        jcbName: jcbMobile ?? null,
        clientName,
      };
      const { generateDashboardPDF } = await import("@/lib/generate-pdf");
      await generateDashboardPDF(workers, filters, token, "");
      setOpen(false);
      toast({ title: "PDF downloaded" });
    } catch {
      toast({ title: "Failed to generate PDF", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 h-9">
          <FileDown className="w-4 h-4" />
          Download Report
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="w-5 h-5 text-primary" /> Download PDF Report
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Customer</Label>
            <Select value={workerFilter} onValueChange={setWorkerFilter}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {workers.map((w) => (
                  <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Date Range</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["all", "this_month", "last_month", "custom"] as DatePreset[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setDatePreset(p)}
                  className={`text-xs px-3 py-2 rounded-lg border font-medium transition-colors ${
                    datePreset === p
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {p === "all" ? "All Time" : p === "this_month" ? "This Month" : p === "last_month" ? "Last Month" : "Custom"}
                </button>
              ))}
            </div>
            {datePreset === "custom" && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">From</Label>
                  <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">To</Label>
                  <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-8 text-xs" />
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <CalendarRange className="w-3 h-3" /> {dateLabel()}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={handleGenerate} disabled={generating} className="gap-1.5">
            <FileDown className="w-4 h-4" />
            {generating ? "Generating…" : "Download PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SupervisorOverview() {
  const { token } = useAuth();
  const [selectedJcbId, setSelectedJcbId] = useState<number | null>(null);

  // Date range for JCB income cards
  type CardsPreset = "today" | "this_month" | "last_month" | "custom";
  const [cardsPreset, setCardsPreset] = useState<CardsPreset>("today");
  const [cardsFrom, setCardsFrom] = useState("");
  const [cardsTo, setCardsTo] = useState("");
  const getCardsDateRange = (): { from: string; to: string } => {
    const now = new Date();
    if (cardsPreset === "today") { const d = now.toISOString().slice(0, 10); return { from: d, to: d }; }
    if (cardsPreset === "this_month") return { from: format(startOfMonth(now), "yyyy-MM-dd"), to: format(endOfMonth(now), "yyyy-MM-dd") };
    if (cardsPreset === "last_month") { const l = subMonths(now, 1); return { from: format(startOfMonth(l), "yyyy-MM-dd"), to: format(endOfMonth(l), "yyyy-MM-dd") }; }
    const today = now.toISOString().slice(0, 10);
    return { from: cardsFrom || today, to: cardsTo || today };
  };
  const { from: cardFrom, to: cardTo } = getCardsDateRange();

  // JCB users list
  const { data: jcbUsers = [] } = useQuery<JcbUser[]>({
    queryKey: ["jcb-users-overview"],
    queryFn: async () => {
      const r = await fetch("/api/jcb-users", { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) return [];
      return r.json();
    },
    enabled: !!token,
  });

  // Dashboard summary — refetches when JCB filter changes
  const { data: summary } = useQuery<DashboardSummary>({
    queryKey: ["dashboard-summary", selectedJcbId],
    queryFn: async () => {
      const url = selectedJcbId
        ? `/api/dashboard/summary?jcbUserId=${selectedJcbId}`
        : "/api/dashboard/summary";
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: !!token,
  });

  // Workers list — refetches when JCB filter changes
  const { data: rawWorkers = [] } = useQuery<any[]>({
    queryKey: ["workers-list", selectedJcbId],
    queryFn: async () => {
      const url = selectedJcbId
        ? `/api/workers?jcbUserId=${selectedJcbId}`
        : "/api/workers";
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) return [];
      return r.json();
    },
    enabled: !!token,
  });

  // JCB income pie chart data from /api/jcb-report/cards
  const { data: jcbCards = [] } = useQuery<JcbCard[]>({
    queryKey: ["jcb-cards-overview", cardFrom, cardTo],
    queryFn: async () => {
      const params = new URLSearchParams({ from: cardFrom, to: cardTo });
      const r = await fetch(`/api/jcb-report/cards?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) return [];
      return r.json();
    },
    enabled: !!token,
  });

  // 10-day trend data
  const { data: trendData = [] } = useQuery<TrendPoint[]>({
    queryKey: ["trend-10d", selectedJcbId],
    queryFn: async () => {
      const url = selectedJcbId
        ? `/api/jcb-report/trend?days=10&jcbUserId=${selectedJcbId}`
        : "/api/jcb-report/trend?days=10";
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) return [];
      return r.json();
    },
    enabled: !!token,
  });

  const workers: Worker[] = useMemo(() => (rawWorkers as any[]).map((w: any) => ({
    id: w.id,
    name: w.name,
    totalEarned: Number(w.totalEarned || 0),
    totalPaid: Number(w.totalPaid || 0),
    pendingAmount: Number(w.pendingAmount || 0),
  })), [rawWorkers]);

  const pendingWorkers = workers.filter((w) => w.pendingAmount > 0);

  const totalEarned = summary ? Number(summary.totalEarned || 0) : 0;
  const totalPaid = summary ? Number(summary.totalPaid || 0) : 0;
  const pendingAmt = summary ? Number(summary.totalPending || 0) : 0;
  const workerCount = summary ? Number(summary.totalWorkers || 0) : 0;
  const paidPct = totalEarned > 0 ? Math.round((totalPaid / totalEarned) * 100) : 0;

  const selectedJcb = jcbUsers.find((j) => j.id === selectedJcbId) ?? null;

  // Pie chart data
  const pieData = jcbCards
    .filter((c) => c.amountReceived > 0)
    .map((c) => ({
      name: c.jcbMobile || c.jcbName,
      value: Math.round(c.amountReceived),
    }));

  // Trend chart: format date labels
  const trendFormatted = trendData.map((d) => ({
    ...d,
    label: format(new Date(d.date + "T12:00:00"), "dd MMM"),
  }));

  const hasTrendData = trendData.some((d) => d.income > 0 || d.expenses > 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Supervisor Overview</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Client-wide work & payment summary</p>
        </div>
        {workers.length > 0 && (
          <DownloadDialog
            workers={workers}
            jcbUserId={selectedJcbId}
            jcbMobile={selectedJcb?.mobile ?? null}
          />
        )}
      </div>

      {/* JCB Filter */}
      {jcbUsers.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Tractor className="w-3.5 h-3.5" /> Vehicle Filter
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedJcbId(null)}
              className={`shrink-0 text-xs px-3.5 py-1.5 rounded-full border font-medium transition-colors ${
                selectedJcbId === null
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground bg-background"
              }`}
            >
              All Vehicles
            </button>
            {jcbUsers.map((j) => (
              <button
                key={j.id}
                onClick={() => setSelectedJcbId(j.id)}
                className={`shrink-0 text-xs px-3.5 py-1.5 rounded-full border font-medium transition-colors ${
                  selectedJcbId === j.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground bg-background"
                }`}
              >
                {j.mobile}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <StatCard title="Total Customers" value={String(workerCount)} icon={Users} accent="blue" />
        <StatCard title="Total Earned" value={`₹${fmt(totalEarned)}`} icon={TrendingUp} accent="green" />
        <StatCard title="Total Paid" value={`₹${fmt(totalPaid)}`} icon={Banknote} accent="violet" />
        <StatCard title="Pending" value={`₹${fmt(pendingAmt)}`} icon={Wallet} accent="amber" />
      </div>

      {/* Payment progress bar */}
      {totalEarned > 0 && (
        <Card className="border-border shadow-sm">
          <CardContent className="px-4 py-3.5 sm:px-5 sm:py-4">
            <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment Progress</span>
                <Badge
                  className={`text-[10px] px-2 py-0.5 ${paidPct >= 100 ? "bg-emerald-100 text-emerald-700" : paidPct >= 50 ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}
                >
                  {paidPct}% Paid
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">{100 - paidPct}% Pending</span>
            </div>
            <Progress value={paidPct} className="h-2.5" />
            <div className="flex justify-between mt-1.5">
              <span className="text-xs text-muted-foreground">Paid: ₹{fmt(totalPaid)}</span>
              <span className="text-xs text-muted-foreground">Pending: ₹{fmt(pendingAmt)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts row */}
      {/* Date range for JCB income cards */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <CalendarRange className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground font-medium mr-1">Vehicle Income Period:</span>
        {(["today", "this_month", "last_month", "custom"] as CardsPreset[]).map((p) => {
          const labels: Record<CardsPreset, string> = { today: "Today", this_month: "This Month", last_month: "Last Month", custom: "Custom" };
          return (
            <button
              key={p}
              onClick={() => setCardsPreset(p)}
              className={`text-xs px-3 py-1 rounded-full border transition-all ${cardsPreset === p ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"}`}
            >
              {labels[p]}
            </button>
          );
        })}
        {cardsPreset === "custom" && (
          <div className="flex items-center gap-1.5 mt-1 w-full">
            <Input type="date" value={cardsFrom} onChange={(e) => setCardsFrom(e.target.value)} className="h-7 text-xs w-36" placeholder="From" />
            <span className="text-xs text-muted-foreground">–</span>
            <Input type="date" value={cardsTo} onChange={(e) => setCardsTo(e.target.value)} className="h-7 text-xs w-36" placeholder="To" />
          </div>
        )}
      </div>

      {(pieData.length > 0 || hasTrendData) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Pie chart — JCB income share */}
          {pieData.length > 0 && (
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-0 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" /> Vehicle Income Share
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-3 pt-2">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                      labelLine={false}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <ReTooltip
                      formatter={(v: number) => [`₹${fmt(v)}`, "Income"]}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-1">
                  {pieData.map((d, i) => (
                    <span key={d.name} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      {d.name}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 10-day trend line chart */}
          {hasTrendData && (
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-0 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" /> 10-Day Trend
                </CardTitle>
              </CardHeader>
              <CardContent className="px-1 pb-3 pt-2">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trendFormatted} margin={{ top: 4, right: 12, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                    />
                    <ReTooltip
                      formatter={(v: number, name: string) => [`₹${fmt(v)}`, name === "income" ? "Income" : "Expenses"]}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Legend
                      formatter={(v) => v === "income" ? "Income" : "Expenses"}
                      wrapperStyle={{ fontSize: 11 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="income"
                      stroke="#f97316"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#f97316" }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#ef4444" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Pending Workers */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-semibold">Pending Payments</h2>
          {pendingWorkers.length > 0 && (
            <Badge className="bg-amber-100 text-amber-700 text-[10px] px-2">{pendingWorkers.length}</Badge>
          )}
        </div>

        {pendingWorkers.length === 0 ? (
          <Card className="border-border shadow-sm">
            <CardContent className="py-8 text-center">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Banknote className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">All payments settled!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pendingWorkers.map((w) => {
              const pct = w.totalEarned > 0 ? Math.round((w.totalPaid / w.totalEarned) * 100) : 0;
              return (
                <Card key={w.id} className="border-border shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="px-4 py-3.5">
                    <div className="flex items-center justify-between mb-2.5 gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-amber-700">{w.name[0].toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{w.name}</p>
                          <Badge className="text-[9px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200 border">
                            ₹{fmt(w.pendingAmount)} due
                          </Badge>
                        </div>
                      </div>
                      <Link href={`/workers/${w.id}`}>
                        <button className="shrink-0 p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors">
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </Link>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center mb-2.5">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Earned</p>
                        <p className="text-xs font-semibold">₹{fmt(w.totalEarned)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Paid</p>
                        <p className="text-xs font-semibold text-emerald-600">₹{fmt(w.totalPaid)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Pending</p>
                        <p className="text-xs font-semibold text-amber-600">₹{fmt(w.pendingAmount)}</p>
                      </div>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                    <p className="text-[10px] text-muted-foreground mt-1 text-right">{pct}% paid</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* All Workers list */}
      {workers.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> All Customers
          </h2>
          <Card className="border-border shadow-sm overflow-hidden">
            <div className="divide-y divide-border">
              {workers.map((w) => (
                <Link key={w.id} href={`/workers/${w.id}`}>
                  <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">{w.name[0].toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{w.name}</p>
                      <p className="text-[10px] text-muted-foreground">Earned ₹{fmt(w.totalEarned)} · Paid ₹{fmt(w.totalPaid)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {w.pendingAmount > 0 ? (
                        <Badge className="text-[10px] px-1.5 bg-amber-50 text-amber-700 border-amber-200 border">
                          ₹{fmt(w.pendingAmount)} due
                        </Badge>
                      ) : (
                        <Badge className="text-[10px] px-1.5 bg-emerald-50 text-emerald-700 border-emerald-200 border">Settled</Badge>
                      )}
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      )}

      {workers.length === 0 && (
        <Card className="border-border shadow-sm">
          <CardContent className="py-12 text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-medium">No customers found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedJcbId ? "No customers for this vehicle. Try selecting a different vehicle." : "Customers will appear here once added to your client."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
