import React, { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { useListWorkers, useGetWorkerLogs, useGetWorkerPayments } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Wallet, ArrowRight, History as HistoryIcon, Filter } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth";

function fmt(n: number) {
  return Math.round(n).toLocaleString("en-IN");
}

interface JcbUser { id: number; name: string; mobile: string; }

function WorkerSection({ workerId, workerName, jcbUserIdFilter }: {
  workerId: number;
  workerName: string;
  jcbUserIdFilter?: number | null;
}) {
  const queryKey = jcbUserIdFilter
    ? [`/api/workers/${workerId}/logs?jcbUserId=${jcbUserIdFilter}`]
    : [`/api/workers/${workerId}/logs`];

  const { data: logs, isLoading: logsLoading } = useGetWorkerLogs(workerId, {
    query: {
      enabled: true,
      queryKey,
      queryFn: async () => {
        const token = localStorage.getItem("token");
        const url = jcbUserIdFilter
          ? `/api/workers/${workerId}/logs?jcbUserId=${jcbUserIdFilter}`
          : `/api/workers/${workerId}/logs`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error("Failed to fetch logs");
        return res.json();
      },
    },
  });

  const { data: payments, isLoading: paymentsLoading } = useGetWorkerPayments(workerId, {
    query: { enabled: true, queryKey: [`/api/workers/${workerId}/payments`] },
  });

  const totalEarned = logs?.reduce((s, l) => s + l.amount, 0) ?? 0;
  const totalPaid = payments?.reduce((s, p) => s + p.amountPaid, 0) ?? 0;
  const pending = totalEarned - totalPaid;
  const isLoading = logsLoading || paymentsLoading;

  if (!isLoading && (!logs || logs.length === 0)) return null;

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3 border-b px-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
              {workerName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold truncate">{workerName}</CardTitle>
              <div className="flex flex-wrap gap-x-2 gap-y-0 mt-0.5 text-xs text-muted-foreground">
                <span>₹{fmt(totalEarned)} earned</span>
                <span>₹{fmt(totalPaid)} paid</span>
                {pending > 0 && <span className="text-destructive font-medium">₹{fmt(pending)} due</span>}
              </div>
            </div>
          </div>
          <Link href={`/workers/${workerId}`} className="shrink-0">
            <Button variant="ghost" size="sm" className="gap-1 text-xs h-8 px-2">
              View <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="pt-3 px-3 pb-3">
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground text-sm">Loading...</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                Sessions ({logs?.length ?? 0})
              </p>
              {logs && logs.length > 0 ? (
                <div className="space-y-1.5">
                  {[...logs].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()).map(log => (
                    <div key={log.id} className="flex justify-between items-center px-3 py-2.5 rounded-lg bg-muted/40 active:bg-muted transition-colors">
                      <div className="min-w-0 flex-1 mr-2">
                        <span className="font-medium text-sm truncate block">{log.fieldName}</span>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 shrink-0" />
                          {format(new Date(log.startTime), "dd MMM")} · {log.totalHours.toFixed(1)}h
                        </div>
                      </div>
                      <span className="font-semibold text-primary text-sm shrink-0">₹{fmt(log.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded-lg">No sessions</p>
              )}
            </div>

            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                Payments ({payments?.length ?? 0})
              </p>
              {payments && payments.length > 0 ? (
                <div className="space-y-1.5">
                  {[...payments].sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()).map(payment => (
                    <div key={payment.id} className="flex justify-between items-center px-3 py-2.5 rounded-lg bg-muted/40 active:bg-muted transition-colors">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                        <span className="text-sm font-medium">{format(new Date(payment.paymentDate), "dd MMM yyyy")}</span>
                      </div>
                      <span className="font-semibold text-emerald-600 text-sm">₹{fmt(payment.amountPaid)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded-lg">No payments</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function HistoryPage() {
  const { user } = useAuth();
  const { data: workers, isLoading } = useListWorkers();
  const [workerFilter, setWorkerFilter] = useState<"all" | string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "settled">("all");
  const [jcbFilter, setJcbFilter] = useState<"all" | string>("all");
  const [jcbUsers, setJcbUsers] = useState<JcbUser[]>([]);

  const isSupervisor = user?.role === "supervisor" || user?.role === "admin";

  useEffect(() => {
    if (!isSupervisor) return;
    const token = localStorage.getItem("token");
    fetch("/api/jcb-users", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setJcbUsers)
      .catch(() => {});
  }, [isSupervisor]);

  const displayedWorkers = useMemo(() => {
    if (!workers) return [];
    let list = workers;
    if (statusFilter === "pending") list = list.filter(w => w.pendingAmount > 0);
    if (statusFilter === "settled") list = list.filter(w => w.pendingAmount <= 0);
    if (workerFilter !== "all") list = list.filter(w => String(w.id) === workerFilter);
    return list;
  }, [workers, workerFilter, statusFilter]);

  const jcbUserIdFilter = isSupervisor && jcbFilter !== "all" ? parseInt(jcbFilter) : null;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <HistoryIcon className="w-6 h-6 text-primary" />
          History
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">All sessions & payments</p>
      </div>

      <div className="flex flex-col gap-2">
        {/* Supervisor: JCB filter */}
        {isSupervisor && jcbUsers.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-lg">
            <Filter className="w-4 h-4 text-blue-600 shrink-0" />
            <Select value={jcbFilter} onValueChange={setJcbFilter}>
              <SelectTrigger className="flex-1 h-9 text-sm bg-white dark:bg-background">
                <SelectValue placeholder="Filter by JCB" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All JCBs</SelectItem>
                {jcbUsers.map(u => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.mobile}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Select value={workerFilter} onValueChange={setWorkerFilter}>
          <SelectTrigger className="w-full h-10">
            <SelectValue placeholder="Filter by worker" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Workers</SelectItem>
            {workers?.map(w => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          {(["all", "pending", "settled"] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`flex-1 h-10 px-3 text-sm rounded-lg border transition-all active:scale-95 ${
                statusFilter === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:bg-muted text-muted-foreground"
              }`}
            >
              {s === "all" ? "All" : s === "pending" ? "Pending" : "Settled"}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      ) : displayedWorkers.length > 0 ? (
        <div className="space-y-3">
          {displayedWorkers.map(w => (
            <WorkerSection key={`${w.id}-${jcbFilter}`} workerId={w.id} workerName={w.name} jcbUserIdFilter={jcbUserIdFilter} />
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="text-center py-16">
            <HistoryIcon className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No history found.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
