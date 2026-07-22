import React, { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  useListWorkers,
  useSetRate,
  getGetDashboardSummaryQueryKey,
  useCreatePayment,
  getListWorkersQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, Banknote, Clock, Wallet, Settings, ArrowRight,
  HandCoins, FileDown, CalendarRange, Search, X, TrendingUp,
  CheckCircle2, AlertCircle, UserCircle2, History,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import type { ReportFilters } from "@/lib/generate-pdf";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer } from "recharts";

function fmt(n: number) {
  return Math.round(n).toLocaleString("en-IN");
}

function StatCard({
  title, value, icon: Icon, description, accent,
}: {
  title: string; value: string | number; icon: any; description?: string;
  accent: "green" | "blue" | "violet" | "amber";
}) {
  const accents = {
    green:  { bar: "stat-card-emerald", bg: "bg-emerald-50 dark:bg-emerald-950/30", icon: "text-emerald-600" },
    blue:   { bar: "stat-card-blue",    bg: "bg-blue-50 dark:bg-blue-950/30",       icon: "text-blue-500" },
    violet: { bar: "stat-card-violet",  bg: "bg-violet-50 dark:bg-violet-950/30",   icon: "text-violet-600" },
    amber:  { bar: "stat-card-amber",   bg: "bg-amber-50 dark:bg-amber-950/30",     icon: "text-amber-600" },
  }[accent];

  return (
    <Card className={`${accents.bar} border border-border/60 shadow-sm`}>
      <CardContent className="pt-4 pb-3 px-4 sm:pt-5 sm:pb-4 sm:px-5">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5 min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest">{title}</p>
            <p className="text-lg sm:text-2xl font-bold tracking-tight truncate leading-tight">{value}</p>
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
          <div className={`${accents.bg} p-2 sm:p-2.5 rounded-xl shrink-0 mt-0.5`}>
            <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${accents.icon}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function WorkerAvatar({ name }: { name: string }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const colors = [
    "bg-emerald-500", "bg-blue-500", "bg-violet-500",
    "bg-amber-500", "bg-rose-500", "bg-cyan-500",
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`${color} text-white w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 shadow-sm`}>
      {initials}
    </div>
  );
}

function RateSettingDialog({ currentRate }: { currentRate: number }) {
  const [open, setOpen] = useState(false);
  const [rate, setRate] = useState(currentRate.toString());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const setRateMutation = useSetRate({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        setOpen(false);
        toast({ title: "Rate updated successfully" });
      },
      onError: () => {
        toast({ title: "Failed to update rate", variant: "destructive" });
      },
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-9">
          <Settings className="w-4 h-4" />
          <span>₹{currentRate}/hr</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Hourly Rate</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Label>Amount per hour (₹)</Label>
          <Input
            type="number" min="0" step="0.01" value={rate}
            onChange={(e) => setRate(e.target.value)} className="mt-2"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => {
            const val = parseFloat(rate);
            if (!isNaN(val) && val > 0) setRateMutation.mutate({ data: { amountPerHour: val } });
          }} disabled={setRateMutation.isPending}>
            {setRateMutation.isPending ? "Saving..." : "Save Rate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PaymentDialog({ workerId, workerName, pendingAmount, advanceBalance }: {
  workerId: number; workerName: string; pendingAmount: number; advanceBalance: number;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(pendingAmount > 0 ? pendingAmount.toFixed(0) : "");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const paymentMutation = useCreatePayment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListWorkersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        setOpen(false);
        setAmount("");
        toast({ title: "Payment recorded successfully" });
      },
      onError: () => {
        toast({ title: "Failed to record payment", variant: "destructive" });
      },
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => {
      setOpen(o);
      if (o) setAmount(pendingAmount > 0 ? pendingAmount.toFixed(0) : "");
    }}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant={pendingAmount > 0 ? "default" : "outline"}
          className="gap-1.5 h-9 min-w-[72px]"
        >
          <HandCoins className="w-3.5 h-3.5" />
          Pay
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <CardDescription>Customer: {workerName}</CardDescription>
        </DialogHeader>
        <div className="py-4 space-y-3">
          {advanceBalance > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300 p-3 rounded-lg text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Advance credit of <strong>₹{fmt(advanceBalance)}</strong> will be auto-applied
            </div>
          )}
          {pendingAmount > 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300 p-3 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Net amount to collect: <strong>₹{fmt(pendingAmount)}</strong>
            </div>
          )}
          <div>
            <Label>Amount Paid (₹)</Label>
            <Input
              type="number" min="0" step="1" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-2" placeholder="0"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => {
            const val = parseFloat(amount);
            if (!isNaN(val) && val > 0) paymentMutation.mutate({ data: { workerId, amountPaid: val } });
          }} disabled={paymentMutation.isPending || !amount}>
            {paymentMutation.isPending ? "Recording..." : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type DatePreset = "all" | "this_month" | "last_month" | "custom";

function DownloadReportDialog({ workers, jcbUserId, jcbName, ratePerHour }: {
  workers: Array<{ id: number; name: string; totalEarned: number; totalPaid: number; pendingAmount: number }>;
  jcbUserId?: number | null;
  jcbName?: string | null;
  ratePerHour?: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [workerFilter, setWorkerFilter] = useState<"all" | string>("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();
  const { token } = useAuth();

  const getDateRange = (): { from: Date | null; to: Date | null } => {
    const now = new Date();
    if (datePreset === "this_month") return { from: startOfMonth(now), to: endOfMonth(now) };
    if (datePreset === "last_month") { const l = subMonths(now, 1); return { from: startOfMonth(l), to: endOfMonth(l) }; }
    if (datePreset === "custom") return { from: fromDate ? new Date(fromDate) : null, to: toDate ? new Date(toDate) : null };
    return { from: null, to: null };
  };

  const dateLabel = (): string => {
    const { from, to } = getDateRange();
    if (!from && !to) return "All time";
    if (from && to) return `${format(from, "dd MMM")} – ${format(to, "dd MMM yyyy")}`;
    if (from) return `From ${format(from, "dd MMM yyyy")}`;
    return `Until ${format(to!, "dd MMM yyyy")}`;
  };

  const handleGenerate = async () => {
    if (!token) { toast({ title: "Not authenticated", variant: "destructive" }); return; }
    setGenerating(true);
    try {
      // Fetch client name for the PDF header
      let clientName: string | null = null;
      try {
        const clientRes = await fetch("/api/client/me", { headers: { Authorization: `Bearer ${token}` } });
        if (clientRes.ok) { const c = await clientRes.json(); clientName = c.name ?? null; }
      } catch { /* non-blocking */ }

      const { from, to } = getDateRange();
      const filters: ReportFilters = {
        workerIds: workerFilter === "all" ? "all" : [parseInt(workerFilter)],
        fromDate: from, toDate: to,
        jcbUserId: jcbUserId ?? null,
        jcbName: jcbName ?? null,
        clientName,
        ratePerHour: ratePerHour ?? null,
      };
      const { generateDashboardPDF } = await import("@/lib/generate-pdf");
      await generateDashboardPDF(workers, filters, token, "");
      setOpen(false);
      toast({ title: "PDF downloaded successfully" });
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to generate PDF", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-9">
          <FileDown className="w-4 h-4" />
          <span className="hidden sm:inline">Download PDF</span>
          <span className="sm:hidden">PDF</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="w-5 h-5 text-primary" />
            Download Report PDF
          </DialogTitle>
          <CardDescription>Apply filters before downloading</CardDescription>
        </DialogHeader>
        <div className="py-4 space-y-5">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Customer</Label>
            <Select value={workerFilter} onValueChange={setWorkerFilter}>
              <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {workers.map((w) => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1">
              <CalendarRange className="w-4 h-4" /> Date Range
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {(["all", "this_month", "last_month", "custom"] as DatePreset[]).map((p) => (
                <button key={p} type="button" onClick={() => setDatePreset(p)}
                  className={`text-sm px-3 py-2 rounded-lg border transition-all ${datePreset === p ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-background border-border hover:bg-muted"}`}>
                  {p === "all" && "All Time"}{p === "this_month" && "This Month"}{p === "last_month" && "Last Month"}{p === "custom" && "Custom Range"}
                </button>
              ))}
            </div>
            {datePreset === "custom" && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div><Label className="text-xs text-muted-foreground">From</Label><Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="mt-1" /></div>
                <div><Label className="text-xs text-muted-foreground">To</Label><Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="mt-1" /></div>
              </div>
            )}
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-2 border border-border/50">
            <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Report will include</p>
            <div className="flex justify-between"><span className="text-muted-foreground">Customers</span><span className="font-medium">{workerFilter === "all" ? `All (${workers.length})` : workers.find((w) => String(w.id) === workerFilter)?.name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Period</span><span className="font-medium">{dateLabel()}</span></div>
            {jcbUserId && jcbName && (
              <div className="flex justify-between"><span className="text-muted-foreground">Vehicle</span><span className="font-medium text-blue-600">{jcbName}</span></div>
            )}
            <div className="flex justify-between"><span className="text-muted-foreground">Sections</span><span className="font-medium text-right">Summary · Sessions · Payments</span></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={generating}>Cancel</Button>
          <Button onClick={handleGenerate} disabled={generating} className="gap-2">
            <FileDown className="w-4 h-4" />
            {generating ? "Generating..." : "Download PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface JcbUser { id: number; name: string; mobile: string; }
interface WorkerSummary {
  id: number; name: string; mobile?: string | null;
  totalEarned: number; totalPaid: number; pendingAmount: number;
  advanceBalance: number; createdAt: string;
}

export default function Dashboard() {
  const { user, token } = useAuth();
  const isSupervisorOrAdmin = user?.role === "supervisor" || user?.role === "admin";
  const isJcbUser = user?.role === "user";

  const [jcbFilter, setJcbFilter] = useState<string>(() => isJcbUser && user?.id ? String(user.id) : "all");
  const [jcbUsers, setJcbUsers] = useState<JcbUser[]>([]);

  useEffect(() => {
    if (!isSupervisorOrAdmin) return;
    const t = localStorage.getItem("token");
    fetch("/api/jcb-users", { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setJcbUsers)
      .catch(() => {});
  }, [isSupervisorOrAdmin]);

  const jcbUserIdFilter = isJcbUser ? user?.id ?? null : (jcbFilter !== "all" ? parseInt(jcbFilter) : null);
  const selectedJcbUser = jcbUsers.find(u => u.id === jcbUserIdFilter) ?? null;

  // Date range filter for summary cards
  type DashDatePreset = "all" | "today" | "this_month" | "last_month";
  const [dashDatePreset, setDashDatePreset] = useState<DashDatePreset>("all");
  const getDashDateRange = (): { from: string | null; to: string | null } => {
    const now = new Date();
    if (dashDatePreset === "today") {
      const d = now.toISOString().slice(0, 10);
      return { from: d, to: d };
    }
    if (dashDatePreset === "this_month") {
      return { from: format(startOfMonth(now), "yyyy-MM-dd"), to: format(endOfMonth(now), "yyyy-MM-dd") };
    }
    if (dashDatePreset === "last_month") {
      const l = subMonths(now, 1);
      return { from: format(startOfMonth(l), "yyyy-MM-dd"), to: format(endOfMonth(l), "yyyy-MM-dd") };
    }
    return { from: null, to: null };
  };
  const { from: dashFrom, to: dashTo } = getDashDateRange();

  const { data: summary, isLoading: loadingSummary } = useQuery<{
    totalWorkers: number; totalEarned: number; totalPaid: number; totalPending: number; amountPerHour: number;
  }>({
    queryKey: ["dashboard-summary-main", jcbUserIdFilter, dashFrom, dashTo],
    queryFn: async () => {
      const t = localStorage.getItem("token");
      const params = new URLSearchParams();
      if (jcbUserIdFilter) params.set("jcbUserId", String(jcbUserIdFilter));
      if (dashFrom) params.set("from", dashFrom);
      if (dashTo) params.set("to", dashTo);
      const url = `/api/dashboard/summary${params.size > 0 ? "?" + params.toString() : ""}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${t}` } });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: !!token,
  });

  const { data: workers, isLoading: loadingWorkers } = useQuery<WorkerSummary[]>({
    queryKey: jcbUserIdFilter ? [`/api/workers?jcbUserId=${jcbUserIdFilter}`] : ["/api/workers"],
    queryFn: async () => {
      const t = localStorage.getItem("token");
      const url = jcbUserIdFilter ? `/api/workers?jcbUserId=${jcbUserIdFilter}` : `/api/workers`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${t}` } });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const [search, setSearch] = useState("");

  // Home page always shows ONLY pending (not fully-paid) workers
  const pendingWorkers = useMemo(() => {
    if (!workers) return [];
    return workers.filter(w => w.pendingAmount > 0);
  }, [workers]);

  const filteredWorkers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pendingWorkers;
    return pendingWorkers.filter(w => w.name.toLowerCase().includes(q));
  }, [pendingWorkers, search]);

  const settledCount = useMemo(() => workers?.filter(w => w.pendingAmount <= 0).length ?? 0, [workers]);

  if (loadingSummary || loadingWorkers) {
    return (
      <div className="space-y-4 sm:space-y-6 animate-pulse">
        <div className="flex justify-between items-center gap-3">
          <div className="space-y-2">
            <div className="h-7 w-36 bg-muted rounded-lg" />
            <div className="h-4 w-52 bg-muted rounded-md" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-28 bg-muted rounded-lg" />
            <div className="h-9 w-24 bg-muted rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border bg-card shadow-sm p-4 sm:p-5 flex items-start justify-between gap-2">
              <div className="space-y-2 flex-1">
                <div className="h-3 w-16 bg-muted rounded" />
                <div className="h-6 w-20 bg-muted rounded-md" />
              </div>
              <div className="h-9 w-9 bg-muted rounded-lg shrink-0" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border bg-card shadow-sm p-4 sm:p-5">
          <div className="h-2.5 w-full bg-muted rounded-full" />
          <div className="flex justify-between mt-2">
            <div className="h-3 w-20 bg-muted rounded" />
            <div className="h-3 w-20 bg-muted rounded" />
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-5 w-40 bg-muted rounded-md" />
          {[...Array(2)].map((_, i) => (
            <div key={i} className="rounded-xl border bg-card shadow-sm p-4 flex items-center gap-3">
              <div className="h-10 w-10 bg-muted rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-3 w-20 bg-muted rounded" />
              </div>
              <div className="h-8 w-20 bg-muted rounded-lg shrink-0" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const paidPercent = summary && summary.totalEarned > 0
    ? Math.round((summary.totalPaid / summary.totalEarned) * 100)
    : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Field work & payments overview</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {workers && workers.length > 0 && (
            <DownloadReportDialog
              workers={workers}
              jcbUserId={jcbUserIdFilter}
              jcbName={isJcbUser ? user?.name : (selectedJcbUser?.mobile ?? null)}
              ratePerHour={summary?.amountPerHour ?? null}
            />
          )}
          {summary && <RateSettingDialog currentRate={summary.amountPerHour} />}
        </div>
      </div>

      {isSupervisorOrAdmin && jcbUsers.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          <Select value={jcbFilter} onValueChange={setJcbFilter}>
            <SelectTrigger className="flex-1 h-9 text-sm bg-white dark:bg-background">
              <SelectValue placeholder="Filter by Vehicle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vehicles</SelectItem>
              {jcbUsers.map(u => (
                <SelectItem key={u.id} value={String(u.id)}>{u.mobile}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Date range filter for summary cards */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <CalendarRange className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground font-medium mr-1">Date:</span>
        {(["all", "today", "this_month", "last_month"] as DashDatePreset[]).map((p) => {
          const labels: Record<DashDatePreset, string> = { all: "All", today: "Today", this_month: "This Month", last_month: "Last Month" };
          return (
            <button
              key={p}
              onClick={() => setDashDatePreset(p)}
              className={`text-xs px-3 py-1 rounded-full border transition-all ${dashDatePreset === p ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"}`}
            >
              {labels[p]}
            </button>
          );
        })}
      </div>

      {summary && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
            <StatCard title="Customers" value={summary.totalWorkers} icon={Users} accent="blue" description="Active customers" />
            <StatCard title="Total Earned" value={`₹${fmt(summary.totalEarned)}`} icon={TrendingUp} accent="green" description="All sessions" />
            <StatCard title="Total Paid" value={`₹${fmt(summary.totalPaid)}`} icon={Wallet} accent="violet" description={`${paidPercent}% paid`} />
            <StatCard title="Pending" value={`₹${fmt(summary.totalPending)}`} icon={Clock} accent="amber" description="Amount owed" />
          </div>

          {summary.totalEarned > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
              {/* Payment progress bar */}
              <Card className="border shadow-sm">
                <CardContent className="pt-3 pb-3 px-4 sm:pt-4 sm:pb-3 sm:px-5 flex flex-col justify-center h-full">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs sm:text-sm font-medium text-muted-foreground">Payment Progress</span>
                    <span className="text-xs sm:text-sm font-semibold">{paidPercent}% paid</span>
                  </div>
                  <div className="h-2 sm:h-2.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-700"
                      style={{ width: `${paidPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[10px] sm:text-xs text-muted-foreground">₹{fmt(summary.totalPaid)} paid</span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground">₹{fmt(summary.totalPending)} pending</span>
                  </div>
                </CardContent>
              </Card>

              {/* Pie chart — collected vs pending */}
              {(summary.totalPaid > 0 || summary.totalPending > 0) && (() => {
                const pieData = [
                  { name: "Collected", value: Math.round(summary.totalPaid) },
                  { name: "Pending", value: Math.round(summary.totalPending) },
                ].filter(d => d.value > 0);
                const PIE_COLORS = ["#22c55e", "#f59e0b"];
                return (
                  <Card className="border shadow-sm">
                    <CardHeader className="pb-0 pt-3 px-4">
                      <CardTitle className="text-xs sm:text-sm font-semibold text-muted-foreground">Payment Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="px-2 pb-2 pt-1">
                      <ResponsiveContainer width="100%" height={140}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={38}
                            outerRadius={58}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {pieData.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <ReTooltip
                            formatter={(v: number) => [`₹${fmt(v)}`, ""]}
                            contentStyle={{ fontSize: 11, borderRadius: 8 }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex gap-4 justify-center mt-1">
                        {pieData.map((d, i) => (
                          <span key={d.name} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                            {d.name}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}
            </div>
          )}
        </>
      )}

      <Card className="border shadow-sm">
        <CardHeader className="pb-3 px-3 sm:px-6">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div>
              <CardTitle className="text-sm sm:text-base font-semibold">Pending Customers</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {filteredWorkers.length} with outstanding balance
                {settledCount > 0 && (
                  <span className="ml-1.5 text-muted-foreground/70">· {settledCount} fully settled</span>
                )}
              </CardDescription>
            </div>
          </div>
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9 h-10 text-sm w-full"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:px-4 pb-4">
          {filteredWorkers.length > 0 ? (
            <div className="space-y-2">
              {filteredWorkers.map((worker) => (
                <div
                  key={worker.id}
                  className="flex items-center gap-2 sm:gap-3 p-3 rounded-xl border border-border/60 bg-card active:bg-muted/60 hover:bg-muted/40 transition-colors"
                >
                  <WorkerAvatar name={worker.name} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-sm truncate">{worker.name}</span>
                      {worker.pendingAmount > 0 ? (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 shrink-0">Due</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Paid</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-2 gap-y-0 mt-0.5">
                      <span className="text-xs text-muted-foreground">₹{fmt(worker.totalEarned)} earned</span>
                      {worker.pendingAmount > 0 && (
                        <span className="text-xs text-destructive font-semibold">₹{fmt(worker.pendingAmount)} due</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <PaymentDialog workerId={worker.id} workerName={worker.name} pendingAmount={worker.pendingAmount} advanceBalance={worker.advanceBalance ?? 0} />
                    <Link href={`/workers/${worker.id}`}>
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-primary/10">
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : search ? (
            <div className="text-center py-12">
              <UserCircle2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No pending customers match "{search}"</p>
              <button onClick={() => setSearch("")} className="text-xs text-primary hover:underline mt-1">Clear search</button>
            </div>
          ) : settledCount > 0 && pendingWorkers.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <p className="text-sm font-medium">All customers are fully settled!</p>
              <p className="text-xs text-muted-foreground mt-1">No outstanding balances</p>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No customers yet. Start tracking time to add customers.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
