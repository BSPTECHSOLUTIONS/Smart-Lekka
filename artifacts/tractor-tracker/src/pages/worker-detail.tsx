import React, { useState } from "react";
import { useParams, Link } from "wouter";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  useGetWorker, useGetWorkerLogs, useGetWorkerPayments, useCreatePayment,
  getGetWorkerPaymentsQueryKey, getGetWorkerQueryKey, getListWorkersQueryKey,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Clock, Wallet, HandCoins, Calendar, MessageCircle,
  CheckCircle2, Send, History, Banknote, AlertCircle, ChevronDown, ChevronUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useGetRate } from "@workspace/api-client-react";

function fmt(n: number) {
  return Math.round(n).toLocaleString("en-IN");
}

function fmtDec(n: number) {
  return n % 1 === 0 ? fmt(n) : n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function WorkerAvatar({ name }: { name: string }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["bg-emerald-500", "bg-blue-500", "bg-violet-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`${color} text-white w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-lg sm:text-xl font-bold shadow-md shrink-0`}>
      {initials}
    </div>
  );
}

type WorkLog = {
  id: number;
  workerId: number;
  fieldName: string;
  startTime: string;
  endTime: string;
  totalHours: number;
  amount: number;
  paidAmount: number;
  status: "PENDING" | "PARTIAL" | "PAID";
  jcbUserId?: number | null;
  workerName?: string | null;
  createdAt?: string;
};

function StatusBadge({ status, paidAmount, amount }: { status: string; paidAmount: number; amount: number }) {
  if (status === "PAID") {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-0 gap-1 text-[10px] px-1.5 py-0 h-5 shrink-0">
        <CheckCircle2 className="w-2.5 h-2.5" /> Paid
      </Badge>
    );
  }
  if (status === "PARTIAL") {
    const pct = Math.round((paidAmount / amount) * 100);
    return (
      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-0 gap-1 text-[10px] px-1.5 py-0 h-5 shrink-0">
        <AlertCircle className="w-2.5 h-2.5" /> Partial {pct}%
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="gap-1 text-[10px] px-1.5 py-0 h-5 shrink-0">
      <Clock className="w-2.5 h-2.5" /> Pending
    </Badge>
  );
}

function sessionWhatsAppMsg(clientName: string, workerName: string, log: WorkLog, ratePerHour: number): string {
  const start = new Date(log.startTime);
  const end = new Date(log.endTime);
  const sessionDue = Math.max(0, log.amount - log.paidAmount);
  const isPaid = sessionDue <= 0;
  return [
    `*${clientName} \u2014 Work Entry*`,
    ``,
    `👷 Worker : ${workerName}`,
    `🌾 Field  : ${log.fieldName}`,
    `📅 Date   : ${format(start, "dd MMM yyyy")}`,
    ``,
    `⏰ Start  : ${format(start, "hh:mm a")}`,
    `🏁 End    : ${format(end, "hh:mm a")}`,
    `⌛ Hours  : ${log.totalHours.toFixed(2)} hrs`,
    `💰 Rate   : Rs.${fmt(ratePerHour)}/hr`,
    ``,
    `\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`,
    `💵 Work Amount  : Rs.${fmt(log.amount)}`,
    `💼 Paid         : Rs.${fmt(log.paidAmount)}`,
    `⏳ Balance Due  : Rs.${fmt(sessionDue)}`,
    `\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`,
    `Status: ${isPaid ? "✅ Settled" : "⏳ Pending"}`,
    ``,
    `✨ Thank You for Your Work!`,
    `\u2014 Smart Lekka \u00B7 Track Work. Settle Easy.`,
  ].join("\n");
}

export default function WorkerDetail() {
  const params = useParams<{ id: string }>();
  const workerId = parseInt(params.id || "0");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { token, user: authUser } = useAuth();

  // Fetch client name for WhatsApp messages
  const { data: clientInfo } = useQuery<{ name: string }>({
    queryKey: ["client-me"],
    queryFn: async () => {
      const r = await fetch("/api/client/me", { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) return { name: "Smart Lekka" };
      return r.json();
    },
    enabled: !!token,
  });
  const clientName = clientInfo?.name || "Smart Lekka";

  const { data: jcbUsers = [] } = useQuery<Array<{ id: number; mobile: string; name: string }>>({
    queryKey: ["jcb-users-detail"],
    queryFn: async () => {
      const r = await fetch("/api/jcb-users", { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) return [];
      return r.json();
    },
    enabled: !!token,
  });

  const { data: worker, isLoading: loadingWorker } = useGetWorker(workerId, {
    query: { enabled: !!workerId, queryKey: getGetWorkerQueryKey(workerId) }
  });
  const { data: logs, isLoading: loadingLogs } = useGetWorkerLogs(workerId, {
    query: { enabled: !!workerId, queryKey: [`/api/workers/${workerId}/logs`] }
  });
  const { data: payments, isLoading: loadingPayments } = useGetWorkerPayments(workerId, {
    query: { enabled: !!workerId, queryKey: getGetWorkerPaymentsQueryKey(workerId) }
  });
  const { data: rateData } = useGetRate();

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [collectingJcbId, setCollectingJcbId] = useState<number | null>(null);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getGetWorkerQueryKey(workerId) });
    queryClient.invalidateQueries({ queryKey: getGetWorkerPaymentsQueryKey(workerId) });
    queryClient.invalidateQueries({ queryKey: getListWorkersQueryKey() });
    queryClient.invalidateQueries({ queryKey: [`/api/workers/${workerId}/logs`] });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
  };

  const paymentMutation = useCreatePayment({
    mutation: {
      onSuccess: () => {
        invalidateAll();
        setPaymentOpen(false);
        setAmount("");
        toast({ title: "Payment recorded & allocated automatically" });
      },
      onError: () => toast({ title: "Failed to record payment", variant: "destructive" }),
    },
  });

  const totalPendingFromLogs = (logs ?? []).reduce(
    (s, l) => s + Math.max(0, (l.amount ?? 0) - (l.paidAmount ?? 0)),
    0
  );

  const handleOpenPayment = (open: boolean) => {
    setPaymentOpen(open);
    if (open) {
      const pending = logs ? totalPendingFromLogs : (worker?.pendingAmount ?? 0);
      if (pending > 0) setAmount(Math.round(pending).toString());
      // Auto-set collecting JCB: JCB user → themselves, else null (supervisor picks)
      const myId = (authUser as any)?.id ?? null;
      const myRole = (authUser as any)?.role ?? null;
      if (myRole === "user" && myId) setCollectingJcbId(myId);
      else if (jcbUsers.length === 1) setCollectingJcbId(jcbUsers[0].id);
      else setCollectingJcbId(null);
    } else {
      setAmount("");
      setCollectingJcbId(null);
    }
  };

  const handleWhatsAppOverall = () => {
    if (!worker) return;
    const balance = Math.max(0, worker.pendingAmount);
    const isPaid = balance <= 0;
    const msg = [
      `*${clientName} \u2014 Payment Summary*`,
      ``,
      `👷 Worker : ${worker.name}`,
      `📅 Date   : ${format(new Date(), "dd MMM yyyy")}`,
      ``,
      `\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`,
      `💰 Total Earned : Rs.${fmt(worker.totalEarned)}`,
      `💼 Total Paid   : Rs.${fmt(worker.totalPaid)}`,
      `⏳ Balance Due  : Rs.${fmt(balance)}`,
      `\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`,
      `Status: ${isPaid ? "✅ All Settled" : "⏳ Pending"}`,
      ``,
      `✨ Thank You for Your Work!`,
      `\u2014 Smart Lekka \u00B7 Track Work. Settle Easy.`,
    ].join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleWhatsAppSession = (log: WorkLog) => {
    if (!worker) return;
    const rate = rateData?.amountPerHour || 0;
    const msg = sessionWhatsAppMsg(clientName, worker.name, log, rate);
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  if (loadingWorker) {
    return (
      <div className="flex flex-col items-center justify-center p-16 gap-3">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!worker) {
    return <div className="p-8 text-center text-destructive">Worker not found.</div>;
  }

  const isSettled = worker.pendingAmount <= 0;
  const paidPercent = worker.totalEarned > 0 ? Math.min(100, Math.round((worker.totalPaid / worker.totalEarned) * 100)) : 100;

  // Split logs into active (pending/partial) and history (paid)
  const activeLogs = logs
    ? [...logs].filter(l => l.status !== "PAID").sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    : [];
  const paidLogs = logs
    ? [...logs].filter(l => l.status === "PAID").sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    : [];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-3 -ml-2 text-muted-foreground gap-1.5 h-9">
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Button>
        </Link>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <WorkerAvatar name={worker.name} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{worker.name}</h1>
                {isSettled ? (
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-0 gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Settled
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <Clock className="w-3 h-3" /> Pending
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Since {format(new Date(worker.createdAt), "MMM yyyy")}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-2 h-10 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950"
              onClick={handleWhatsAppOverall}
            >
              <MessageCircle className="w-4 h-4" />
              Overall Summary
            </Button>
            <Dialog open={paymentOpen} onOpenChange={handleOpenPayment}>
              <DialogTrigger asChild>
                <Button size="sm" className="flex-1 gap-2 h-10" disabled={isSettled}>
                  <HandCoins className="w-4 h-4" />
                  {isSettled ? "Settled" : "Add Payment"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Payment — {worker.name}</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  {totalPendingFromLogs > 0 && (
                    <div className="bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 p-3 rounded-lg text-sm text-amber-800 dark:text-amber-300 flex justify-between items-center">
                      <span>Total Pending (All Sessions)</span>
                      <strong className="text-base">₹{fmt(totalPendingFromLogs)}</strong>
                    </div>
                  )}
                  {jcbUsers.length > 1 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Collected by JCB</Label>
                      <Select
                        value={collectingJcbId ? String(collectingJcbId) : ""}
                        onValueChange={(v) => setCollectingJcbId(v ? parseInt(v) : null)}
                      >
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Select JCB that collected money" />
                        </SelectTrigger>
                        <SelectContent>
                          {jcbUsers.map((u) => (
                            <SelectItem key={u.id} value={String(u.id)}>
                              {u.mobile} {u.name ? `— ${u.name}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {(() => {
                    const pendingLogs = (logs ?? []).filter(l => (l.amount ?? 0) - (l.paidAmount ?? 0) > 0.01);
                    if (!pendingLogs.length) return null;
                    return (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pending Sessions</p>
                        <div className="rounded-lg border border-border overflow-hidden">
                          <div className="grid grid-cols-[1fr_auto_auto] text-[10px] uppercase font-semibold text-muted-foreground px-2.5 py-1.5 bg-muted/50 gap-2">
                            <span>Date · Field · JCB</span>
                            <span className="text-right">Earned</span>
                            <span className="text-right">Due</span>
                          </div>
                          {pendingLogs.map(l => {
                            const due = (l.amount ?? 0) - (l.paidAmount ?? 0);
                            const jcb = jcbUsers.find(u => u.id === l.jcbUserId);
                            return (
                              <div key={l.id} className="grid grid-cols-[1fr_auto_auto] text-xs px-2.5 py-2 gap-2 border-t border-border/60 bg-background">
                                <div className="min-w-0">
                                  <div className="font-medium truncate">{l.fieldName ?? "—"}</div>
                                  <div className="text-muted-foreground text-[10px]">
                                    {l.startTime ? new Date(l.startTime).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                                    {jcb ? <span className="ml-1.5 text-blue-500">· {jcb.mobile}</span> : null}
                                  </div>
                                </div>
                                <span className="text-right font-medium self-center">₹{fmt(l.amount ?? 0)}</span>
                                <span className="text-right font-semibold text-amber-600 dark:text-amber-400 self-center">₹{fmt(due)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                  <div>
                    <Label>Amount to Pay (₹)</Label>
                    <Input type="number" min="0" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-2" placeholder="Enter amount" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button>
                  <Button onClick={() => {
                    const val = parseFloat(amount);
                    if (!isNaN(val) && val > 0) paymentMutation.mutate({ data: { workerId, amountPaid: val, jcbUserId: collectingJcbId ?? undefined } });
                  }} disabled={paymentMutation.isPending || !amount}>
                    {paymentMutation.isPending ? "Allocating..." : "Record & Allocate"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* 3 summary mini cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card className="border-blue-100 dark:border-blue-900">
          <CardContent className="pt-3 pb-2.5 px-3 sm:pt-4 sm:pb-3 sm:px-5">
            <p className="text-[9px] sm:text-xs text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Earned</p>
            <p className="text-base sm:text-2xl font-bold leading-tight">₹{fmt(worker.totalEarned)}</p>
          </CardContent>
        </Card>
        <Card className="border-violet-100 dark:border-violet-900">
          <CardContent className="pt-3 pb-2.5 px-3 sm:pt-4 sm:pb-3 sm:px-5">
            <p className="text-[9px] sm:text-xs text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Paid</p>
            <p className="text-base sm:text-2xl font-bold leading-tight">₹{fmt(worker.totalPaid)}</p>
          </CardContent>
        </Card>
        <Card className={isSettled ? "border-emerald-100 dark:border-emerald-900" : "border-destructive/40"}>
          <CardContent className="pt-3 pb-2.5 px-3 sm:pt-4 sm:pb-3 sm:px-5">
            <p className="text-[9px] sm:text-xs text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Due</p>
            <p className={`text-base sm:text-2xl font-bold leading-tight ${isSettled ? "text-emerald-600" : "text-destructive"}`}>
              ₹{fmt(worker.pendingAmount)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-3 pb-3 px-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-muted-foreground">Payment Progress</span>
            <span className="text-xs font-semibold">{paidPercent}%</span>
          </div>
          <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${isSettled ? "bg-gradient-to-r from-blue-500 to-blue-400" : "bg-gradient-to-r from-amber-500 to-amber-400"}`}
              style={{ width: `${paidPercent}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Active Work Sessions (Pending / Partial) ── */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Banknote className="w-4 h-4 text-amber-500" />
            Active Work Sessions
          </CardTitle>
          <CardDescription className="text-xs">
            {activeLogs.length} pending · tap WhatsApp to share any session details
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          {loadingLogs ? (
            <div className="text-center py-6 text-muted-foreground text-sm">Loading...</div>
          ) : activeLogs.length > 0 ? (
            <div className="space-y-2">
              {activeLogs.map(log => {
                const due = log.amount - log.paidAmount;
                return (
                  <div key={log.id} className="p-3 border rounded-xl bg-card hover:bg-muted/30 transition-colors">
                    <div className="flex justify-between items-start mb-1.5">
                      <div className="min-w-0 flex-1 mr-2">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <span className="font-medium text-sm truncate">{log.fieldName}</span>
                          <StatusBadge status={log.status} paidAmount={log.paidAmount} amount={log.amount} />
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3 shrink-0" />
                          {format(new Date(log.startTime), "dd MMM yyyy")} · {format(new Date(log.startTime), "hh:mm a")} → {format(new Date(log.endTime), "hh:mm a")} · {log.totalHours.toFixed(1)}h
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-sm text-primary">₹{fmt(log.amount)}</div>
                        {log.status === "PARTIAL" && (
                          <div className="text-[10px] text-destructive font-medium">Due: ₹{fmt(due)}</div>
                        )}
                      </div>
                    </div>

                    {/* Per-entry partial progress bar */}
                    {log.status === "PARTIAL" && (
                      <div className="mb-2">
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full"
                            style={{ width: `${Math.round((log.paidAmount / log.amount) * 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-0.5">
                          <span className="text-[10px] text-muted-foreground">Paid ₹{fmt(log.paidAmount)}</span>
                          <span className="text-[10px] text-muted-foreground">Due ₹{fmt(due)}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-1.5 mt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 h-7 text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        onClick={() => handleWhatsAppSession(log as WorkLog)}
                      >
                        <Send className="w-3 h-3" />
                        Send via WhatsApp
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg text-sm">
              {isSettled ? "All sessions are paid ✓" : "No pending sessions."}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Payment History ── */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Wallet className="w-4 h-4 text-violet-500" />
            Payment History
          </CardTitle>
          <CardDescription className="text-xs">{payments?.length ?? 0} payments recorded</CardDescription>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          {loadingPayments ? (
            <div className="text-center py-6 text-muted-foreground text-sm">Loading...</div>
          ) : payments && payments.length > 0 ? (
            <div className="space-y-2">
              {[...payments].sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()).map(payment => (
                <div key={payment.id} className="flex justify-between items-center p-3 border rounded-xl bg-card hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="bg-violet-100 dark:bg-violet-950 p-1.5 rounded-lg shrink-0">
                      <Wallet className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{format(new Date(payment.paymentDate), "dd MMM yyyy")}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(payment.paymentDate), "hh:mm a")}</div>
                    </div>
                  </div>
                  <div className="font-bold text-sm text-emerald-600">₹{fmt(payment.amountPaid)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg text-sm">
              No payments yet.
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Paid Sessions (History) ── */}
      {paidLogs.length > 0 && (
        <Card className="border-emerald-100 dark:border-emerald-900">
          <CardHeader className="pb-2 pt-4 px-4">
            <button
              className="flex items-center justify-between w-full text-left"
              onClick={() => setShowHistory(h => !h)}
            >
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-500" />
                  Paid Sessions
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">{paidLogs.length} completed sessions</CardDescription>
              </div>
              {showHistory ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
          </CardHeader>
          {showHistory && (
            <CardContent className="px-3 pb-3">
              <div className="space-y-2">
                {paidLogs.map(log => (
                  <div key={log.id} className="p-3 border border-emerald-100 dark:border-emerald-900 rounded-xl bg-emerald-50/30 dark:bg-emerald-950/20">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 flex-1 mr-2">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <span className="font-medium text-sm truncate text-muted-foreground">{log.fieldName}</span>
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-0 gap-1 text-[10px] px-1.5 py-0 h-5">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Paid
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3 shrink-0" />
                          {format(new Date(log.startTime), "dd MMM yyyy")} · {log.totalHours.toFixed(1)}h
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-sm text-emerald-600">₹{fmt(log.amount)}</div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-7 mt-1.5 text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100"
                      onClick={() => handleWhatsAppSession(log as WorkLog)}
                    >
                      <Send className="w-3 h-3" />
                      Send via WhatsApp
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
