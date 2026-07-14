import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, IndianRupee, Calendar, Trash2, CreditCard, Fuel, Wrench, Users, Package, MoreHorizontal } from "lucide-react";

const BASE = "/api";
const headers = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

function fmt(n: number) {
  return Math.round(n).toLocaleString("en-IN");
}

interface Expense {
  id: number;
  description: string;
  category: string;
  amount: number;
  amountPaid: number;
  pendingAmount: number;
  isPaid: boolean;
  date: string;
  createdAt: string;
}

const CATEGORIES = [
  { value: "fuel",        label: "Fuel",       icon: Fuel },
  { value: "maintenance", label: "Maintenance", icon: Wrench },
  { value: "salary",      label: "Salary",     icon: Users },
  { value: "materials",   label: "Materials",  icon: Package },
  { value: "other",       label: "Other",      icon: MoreHorizontal },
];

function categoryLabel(val: string) {
  return CATEGORIES.find(c => c.value === val)?.label ?? val;
}

function categoryColor(val: string) {
  switch (val) {
    case "fuel":        return "bg-orange-100 text-orange-700 border-orange-200";
    case "maintenance": return "bg-blue-100 text-blue-700 border-blue-200";
    case "salary":      return "bg-purple-100 text-purple-700 border-purple-200";
    case "materials":   return "bg-green-100 text-green-700 border-green-200";
    default:            return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

interface JcbUser { id: number; name: string; mobile: string; }

async function fetchExpenses(from?: string, to?: string, jcbUserId?: number | null): Promise<Expense[]> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (jcbUserId) params.set("jcbUserId", String(jcbUserId));
  const url = `${BASE}/expenses${params.toString() ? `?${params}` : ""}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error("Failed to fetch expenses");
  return res.json();
}

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const isSupervisorOrAdmin = user?.role === "supervisor" || user?.role === "admin";

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + "-01";

  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [showAdd, setShowAdd] = useState(false);
  const [payDialog, setPayDialog] = useState<Expense | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [jcbFilter, setJcbFilter] = useState<string>("all");
  const [jcbUsers, setJcbUsers] = useState<JcbUser[]>([]);

  const [newDesc, setNewDesc] = useState("");
  const [newCat, setNewCat] = useState("fuel");
  const [newAmount, setNewAmount] = useState("");
  const [newDate, setNewDate] = useState(today);

  useEffect(() => {
    if (!isSupervisorOrAdmin) return;
    const t = localStorage.getItem("token");
    fetch("/api/jcb-users", { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setJcbUsers)
      .catch(() => {});
  }, [isSupervisorOrAdmin]);

  const jcbUserIdFilter = isSupervisorOrAdmin && jcbFilter !== "all" ? parseInt(jcbFilter) : null;

  const qKey = ["expenses", from, to, jcbFilter];

  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: qKey,
    queryFn: () => fetchExpenses(from || undefined, to || undefined, jcbUserIdFilter),
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE}/expenses`, {
        method: "POST", headers: headers(),
        body: JSON.stringify({ description: newDesc, category: newCat, amount: parseFloat(newAmount), date: newDate }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setShowAdd(false);
      setNewDesc(""); setNewAmount(""); setNewDate(today); setNewCat("fuel");
      toast({ title: "Expense added" });
    },
    onError: () => toast({ title: "Failed to add expense", variant: "destructive" }),
  });

  const payMutation = useMutation({
    mutationFn: async ({ id, amount }: { id: number; amount: number }) => {
      const res = await fetch(`${BASE}/expenses/${id}/payments`, {
        method: "POST", headers: headers(),
        body: JSON.stringify({ amountPaid: amount }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setPayDialog(null); setPayAmount("");
      toast({ title: "Payment recorded" });
    },
    onError: () => toast({ title: "Failed to record payment", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${BASE}/expenses/${id}`, { method: "DELETE", headers: headers() });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["expenses"] }); toast({ title: "Deleted" }); },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const totalAmount  = expenses.reduce((s, e) => s + e.amount, 0);
  const totalPaid    = expenses.reduce((s, e) => s + e.amountPaid, 0);
  const totalPending = expenses.reduce((s, e) => s + e.pendingAmount, 0);

  const handleAddSave = () => {
    if (!newDesc.trim()) { toast({ title: "Description is required", variant: "destructive" }); return; }
    const amt = parseFloat(newAmount);
    if (isNaN(amt) || amt <= 0) { toast({ title: "Enter a valid amount", variant: "destructive" }); return; }
    addMutation.mutate();
  };

  const handlePay = () => {
    if (!payDialog) return;
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) { toast({ title: "Enter a valid amount", variant: "destructive" }); return; }
    if (amt > payDialog.pendingAmount + 0.01) { toast({ title: `Max ₹${fmt(payDialog.pendingAmount)}`, variant: "destructive" }); return; }
    payMutation.mutate({ id: payDialog.id, amount: amt });
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Track expenses & payments</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-1.5 h-10 shrink-0">
          <Plus className="w-4 h-4" />
          Add
        </Button>
      </div>

      {/* Date filters */}
      <Card className="border shadow-sm">
        <CardContent className="pt-3 pb-3 px-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">From</Label>
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-10 w-full" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">To</Label>
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-10 w-full" />
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs"
            onClick={() => { setFrom(""); setTo(""); }}
          >
            Show All Time
          </Button>
        </CardContent>
      </Card>

      {/* JCB filter */}
      {isSupervisorOrAdmin && jcbUsers.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          <Select value={jcbFilter} onValueChange={setJcbFilter}>
            <SelectTrigger className="flex-1 h-9 text-sm bg-white dark:bg-background">
              <SelectValue placeholder="Filter by JCB" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All JCBs</SelectItem>
              {jcbUsers.map(u => (
                <SelectItem key={u.id} value={String(u.id)}>{u.mobile}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="border shadow-sm">
          <CardContent className="pt-3 pb-2.5 px-3">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Total</p>
            <p className="text-base font-bold leading-tight">₹{fmt(totalAmount)}</p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm border-emerald-100">
          <CardContent className="pt-3 pb-2.5 px-3">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Paid</p>
            <p className="text-base font-bold leading-tight text-emerald-600">₹{fmt(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm border-orange-100">
          <CardContent className="pt-3 pb-2.5 px-3">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Pending</p>
            <p className="text-base font-bold leading-tight text-orange-600">₹{fmt(totalPending)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Expense list */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold">
            {expenses.length} expense{expenses.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-10 text-sm">Loading...</p>
          ) : expenses.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <IndianRupee className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No expenses for this period</p>
              <button onClick={() => setShowAdd(true)} className="mt-2 text-xs text-primary hover:underline">Add first expense</button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {expenses.map((e) => (
                <li key={e.id} className="flex items-start gap-3 px-3 sm:px-4 py-3 active:bg-muted/60 hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-sm">{e.description}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium leading-none ${categoryColor(e.category)}`}>
                        {categoryLabel(e.category)}
                      </span>
                      {e.isPaid ? (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50 text-[10px] h-4 px-1.5">Paid</Badge>
                      ) : e.amountPaid > 0 ? (
                        <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50 text-[10px] h-4 px-1.5">Partial</Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50 text-[10px] h-4 px-1.5">Unpaid</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <Calendar className="w-3 h-3" />
                        {new Date(e.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                      <span>₹{fmt(e.amount)}</span>
                      {e.pendingAmount > 0 && <span className="text-orange-600 font-medium">₹{fmt(e.pendingAmount)} due</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 pt-0.5">
                    {!e.isPaid && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => { setPayDialog(e); setPayAmount(String(Math.round(e.pendingAmount))); }}
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteMutation.mutate(e.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Add Expense Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label>Description</Label>
              <Input placeholder="e.g. Diesel for tractor" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={newCat} onValueChange={setNewCat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input type="number" min={1} placeholder="0" value={newAmount} onChange={e => setNewAmount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAddSave} disabled={addMutation.isPending} className="flex-1 sm:flex-none">
              {addMutation.isPending ? "Saving..." : "Save Expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={!!payDialog} onOpenChange={(o) => { if (!o) { setPayDialog(null); setPayAmount(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          {payDialog && (
            <div className="space-y-4 py-1">
              <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-0.5">
                <p className="font-medium">{payDialog.description}</p>
                <p className="text-muted-foreground text-xs">Pending: ₹{fmt(payDialog.pendingAmount)}</p>
              </div>
              <div className="space-y-2">
                <Label>Amount to Pay (₹)</Label>
                <Input
                  type="number" min={1} max={payDialog.pendingAmount}
                  value={payAmount} onChange={e => setPayAmount(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => { setPayDialog(null); setPayAmount(""); }}>Cancel</Button>
            <Button onClick={handlePay} disabled={payMutation.isPending} className="flex-1 sm:flex-none">
              {payMutation.isPending ? "Saving..." : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
