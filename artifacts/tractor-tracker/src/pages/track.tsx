import React, { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  useListWorkers, useCreateWorker, useCreateWorkLog, useGetRate,
  getGetActiveWorkLogQueryKey, getListWorkersQueryKey, getGetDashboardSummaryQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Play, Square, Save, Clock, MapPin, PenLine, Plus, Check, ChevronsUpDown, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { saveSession, loadSession, clearSession, formatDuration } from "@/lib/active-session";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

function TimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parse = (v: string) => {
    const [h, m] = v ? v.split(":").map(Number) : [8, 0];
    const period = h < 12 ? "AM" : "PM";
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const minSnapped = Math.round(m / 5) * 5;
    return { hour: hour12, minute: String(minSnapped >= 60 ? 55 : minSnapped).padStart(2, "0"), period };
  };

  const { hour, minute, period } = parse(value);

  const emit = (h: number, m: string, p: string) => {
    let h24 = h % 12;
    if (p === "PM") h24 += 12;
    onChange(`${String(h24).padStart(2, "0")}:${m}`);
  };

  return (
    <div className="flex items-center gap-1.5">
      <select value={hour} onChange={(e) => emit(Number(e.target.value), minute, period)}
        className="h-10 flex-1 rounded-md border border-input bg-background px-2 text-sm font-medium text-center appearance-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer" style={{ fontSize: 16 }}>
        {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
      </select>
      <span className="text-lg font-bold text-muted-foreground select-none">:</span>
      <select value={minute} onChange={(e) => emit(hour, e.target.value, period)}
        className="h-10 flex-1 rounded-md border border-input bg-background px-2 text-sm font-medium text-center appearance-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer" style={{ fontSize: 16 }}>
        {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
      <div className="flex h-10 rounded-md border border-input overflow-hidden shrink-0">
        {(["AM", "PM"] as const).map((p) => (
          <button key={p} type="button" onClick={() => emit(hour, minute, p)}
            className={`px-3 text-sm font-semibold transition-colors ${period === p ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}>
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

type WorkerOption = { id: number; name: string; mobile?: string | null };

function WorkerCombobox({
  workers,
  workerId,
  onWorkerChange,
  onAddWorker,
}: {
  workers: WorkerOption[];
  workerId: string;
  onWorkerChange: (id: string) => void;
  onAddWorker: () => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = workers.find(w => String(w.id) === workerId);

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={open}
            className="flex-1 justify-between font-normal text-left h-10 overflow-hidden">
            <span className="truncate">
              {selected
                ? <><span className="font-medium">{selected.name}</span>{selected.mobile && <span className="ml-2 text-muted-foreground text-xs">{selected.mobile}</span>}</>
                : <span className="text-muted-foreground">Search by name or mobile...</span>}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command filter={(value, search) => {
            const w = workers.find(w => String(w.id) === value);
            if (!w) return 0;
            const q = search.toLowerCase();
            if (w.name.toLowerCase().includes(q)) return 1;
            if (w.mobile?.toLowerCase().includes(q)) return 1;
            return 0;
          }}>
            <CommandInput placeholder="Search by name or mobile..." />
            <CommandList>
              <CommandEmpty>No customers found.</CommandEmpty>
              <CommandGroup>
                {workers.map(w => (
                  <CommandItem key={w.id} value={String(w.id)} onSelect={(val) => {
                    onWorkerChange(val === workerId ? "" : val);
                    setOpen(false);
                  }}>
                    <Check className={cn("mr-2 h-4 w-4", workerId === String(w.id) ? "opacity-100" : "opacity-0")} />
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium truncate">{w.name}</span>
                      {w.mobile && <span className="text-xs text-muted-foreground">{w.mobile}</span>}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0 border-dashed hover:border-primary hover:text-primary" title="Add new customer" onClick={onAddWorker}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

function AddWorkerDialog({
  open,
  onOpenChange,
  onSuccess,
  createWorkerMutation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (worker: WorkerOption) => void;
  createWorkerMutation: ReturnType<typeof useCreateWorker>;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [mobileError, setMobileError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setMobile("");
      setMobileError("");
      setTimeout(() => nameRef.current?.focus(), 100);
    }
  }, [open]);

  const validate = () => {
    if (!name.trim()) return "Customer name is required.";
    if (!mobile.trim()) return "Mobile number is required.";
    if (!/^\d{10}$/.test(mobile.trim())) return "Enter a valid 10-digit mobile number.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      if (err.includes("mobile") || err.includes("Mobile")) setMobileError(err);
      else toast({ title: err, variant: "destructive" });
      return;
    }
    setMobileError("");
    setSubmitting(true);
    try {
      const newWorker = await createWorkerMutation.mutateAsync({ data: { name: name.trim(), mobile: mobile.trim() } });
      onSuccess({ id: newWorker.id, name: newWorker.name, mobile: newWorker.mobile });
      onOpenChange(false);
      toast({ title: `Customer "${newWorker.name}" added and selected.` });
    } catch (error: any) {
      const status = error?.response?.status ?? error?.status;
      if (status === 409) {
        const data = error?.data as { error: string; existingWorker: { id: number; name: string; mobile?: string } };
        if (data?.existingWorker) {
          onSuccess(data.existingWorker);
          onOpenChange(false);
          toast({
            title: "Customer already exists",
            description: `"${data.existingWorker.name}" (${data.existingWorker.mobile}) has been selected.`,
          });
        } else {
          setMobileError("A customer with this mobile number already exists.");
        }
      } else {
        toast({ title: "Failed to create customer", variant: "destructive" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Add New Customer
          </DialogTitle>
          <DialogDescription>
            Enter the customer's name and mobile number. Mobile number is used as a unique identifier.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="add-worker-name">Customer Name <span className="text-destructive">*</span></Label>
            <Input
              id="add-worker-name"
              ref={nameRef}
              placeholder="e.g. Ravi Kumar"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-worker-mobile">Mobile Number <span className="text-destructive">*</span></Label>
            <Input
              id="add-worker-mobile"
              placeholder="10-digit mobile number"
              value={mobile}
              maxLength={10}
              inputMode="numeric"
              onChange={(e) => {
                setMobile(e.target.value.replace(/\D/g, ""));
                setMobileError("");
              }}
              className={mobileError ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {mobileError && <p className="text-xs text-destructive">{mobileError}</p>}
            <p className="text-xs text-muted-foreground">Used as a unique identifier for payment tracking.</p>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting ? "Adding..." : <><Plus className="h-4 w-4" />Add Customer</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Track() {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: workers = [] } = useListWorkers();
  const { data: rateData } = useGetRate();

  const createWorkerMutation = useCreateWorker();
  const createWorkLogMutation = useCreateWorkLog({
    mutation: {
      onSuccess: (data) => {
        clearSession();
        queryClient.invalidateQueries({ queryKey: getGetActiveWorkLogQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListWorkersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        setReviewMode(false);
        setSessionEndData(null);
        toast({ title: "Work session saved!" });
        const wid = data?.workerId ?? savedWorkerId.current;
        if (wid) navigate(`/workers/${wid}`);
      },
      onError: () => {
        toast({ title: "Failed to save work session", variant: "destructive" });
      },
    },
  });

  const [workerId, setWorkerId] = useState("");
  const [fieldName, setFieldName] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [reviewMode, setReviewMode] = useState(false);
  const [sessionEndData, setSessionEndData] = useState<{ startTime: string; endTime: string; totalHours: number; amount: string } | null>(null);
  const [activeSession, setActiveSession] = useState(() => loadSession());
  const savedWorkerId = React.useRef<number | null>(null);

  const [manualWorkerId, setManualWorkerId] = useState("");
  const [manualField, setManualField] = useState("");
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [manualStart, setManualStart] = useState("08:00");
  const [manualEnd, setManualEnd] = useState("17:00");
  const [manualAmount, setManualAmount] = useState("");

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDialogTarget, setAddDialogTarget] = useState<"timer" | "manual">("timer");

  useEffect(() => {
    const [sh, sm] = manualStart.split(":").map(Number);
    const [eh, em] = manualEnd.split(":").map(Number);
    const diffHours = Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
    setManualAmount((diffHours * (rateData?.amountPerHour || 0)).toFixed(2));
  }, [manualStart, manualEnd, rateData?.amountPerHour]);

  useEffect(() => {
    if (!activeSession || reviewMode) return;
    const start = new Date(activeSession.startTime).getTime();
    setElapsedMs(Date.now() - start);
    const interval = setInterval(() => setElapsedMs(Date.now() - start), 1000);
    return () => clearInterval(interval);
  }, [activeSession?.startTime, reviewMode]);

  const handleAddWorkerSuccess = (worker: WorkerOption) => {
    queryClient.invalidateQueries({ queryKey: getListWorkersQueryKey() });
    if (addDialogTarget === "timer") setWorkerId(String(worker.id));
    else setManualWorkerId(String(worker.id));
  };

  const handleStart = () => {
    if (!fieldName.trim()) { toast({ title: "Field name is required", variant: "destructive" }); return; }
    if (!workerId) { toast({ title: "Please select a customer", variant: "destructive" }); return; }
    const finalWorkerId = parseInt(workerId);
    const finalWorkerName = workers.find(w => w.id === finalWorkerId)?.name || "";
    const session = { workerId: finalWorkerId, workerName: finalWorkerName, fieldName, startTime: new Date().toISOString() };
    saveSession(session);
    setActiveSession(session);
    setElapsedMs(0);
    savedWorkerId.current = finalWorkerId;
    queryClient.invalidateQueries({ queryKey: getGetActiveWorkLogQueryKey() });
  };

  const handleEnd = () => {
    if (!activeSession) return;
    const end = new Date();
    const start = new Date(activeSession.startTime);
    const ms = end.getTime() - start.getTime();
    const hours = ms / (1000 * 60 * 60);
    const rate = rateData?.amountPerHour || 0;
    savedWorkerId.current = activeSession.workerId;
    setSessionEndData({ startTime: start.toISOString(), endTime: end.toISOString(), totalHours: hours, amount: (hours * rate).toFixed(2) });
    setReviewMode(true);
  };

  const handleSave = () => {
    if (!activeSession || !sessionEndData) return;
    const amountVal = parseFloat(sessionEndData.amount);
    if (isNaN(amountVal) || amountVal < 0) { toast({ title: "Invalid amount", variant: "destructive" }); return; }
    createWorkLogMutation.mutate({
      data: { workerId: activeSession.workerId, fieldName: activeSession.fieldName, startTime: sessionEndData.startTime, endTime: sessionEndData.endTime, totalHours: sessionEndData.totalHours, amount: amountVal },
    });
  };

  const handleDiscard = () => {
    clearSession();
    setActiveSession(null);
    setReviewMode(false);
    setSessionEndData(null);
    setElapsedMs(0);
    queryClient.invalidateQueries({ queryKey: getGetActiveWorkLogQueryKey() });
  };

  const handleManualSave = () => {
    if (!manualField.trim()) { toast({ title: "Field name is required", variant: "destructive" }); return; }
    if (!manualWorkerId) { toast({ title: "Please select a customer", variant: "destructive" }); return; }
    const amt = parseFloat(manualAmount);
    if (isNaN(amt) || amt < 0) { toast({ title: "Invalid amount", variant: "destructive" }); return; }
    const [sh, sm] = manualStart.split(":").map(Number);
    const [eh, em] = manualEnd.split(":").map(Number);
    const startDate = new Date(`${manualDate}T${manualStart}:00`);
    const endDate = new Date(`${manualDate}T${manualEnd}:00`);
    if (endDate <= startDate) { toast({ title: "End time must be after start time", variant: "destructive" }); return; }
    const totalHours = (eh * 60 + em - (sh * 60 + sm)) / 60;
    savedWorkerId.current = parseInt(manualWorkerId);
    createWorkLogMutation.mutate({
      data: { workerId: parseInt(manualWorkerId), fieldName: manualField, startTime: startDate.toISOString(), endTime: endDate.toISOString(), totalHours, amount: amt },
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Time Tracker</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Log field work sessions</p>
      </div>

      <AddWorkerDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={handleAddWorkerSuccess}
        createWorkerMutation={createWorkerMutation}
      />

      <Tabs defaultValue="timer">
        <TabsList className="w-full">
          <TabsTrigger value="timer" className="flex-1 gap-2"><Clock className="w-4 h-4" />Live Timer</TabsTrigger>
          <TabsTrigger value="manual" className="flex-1 gap-2"><PenLine className="w-4 h-4" />Manual Entry</TabsTrigger>
        </TabsList>

        {/* Live timer tab */}
        <TabsContent value="timer" className="mt-4">
          <Card className="border-2 shadow-sm">
            {activeSession && !reviewMode ? (
              <div className="flex flex-col items-center justify-center p-12 text-center space-y-8">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4 animate-pulse text-primary" />
                    Session Active
                  </div>
                  <div className="text-6xl md:text-8xl font-mono font-light tracking-tight tabular-nums">
                    {formatDuration(elapsedMs)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-8 w-full max-w-md bg-muted/50 p-6 rounded-lg">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground uppercase">Customer</span>
                    <p className="font-medium truncate">{activeSession.workerName}</p>
                  </div>
                  <div className="space-y-1 border-l pl-8 border-border/50">
                    <span className="text-xs text-muted-foreground uppercase">Field</span>
                    <p className="font-medium truncate">{activeSession.fieldName}</p>
                  </div>
                </div>
                <Button size="lg" variant="destructive" className="w-48 h-16 text-lg rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105" onClick={handleEnd}>
                  <Square className="w-6 h-6 mr-2 fill-current" />
                  END SESSION
                </Button>
              </div>
            ) : reviewMode && sessionEndData ? (
              <>
                <CardHeader className="bg-muted/30 border-b">
                  <CardTitle>Review Session</CardTitle>
                  <CardDescription>Confirm hours and calculated payment amount</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div><div className="text-sm text-muted-foreground">Customer</div><div className="font-medium">{activeSession?.workerName}</div></div>
                    <div><div className="text-sm text-muted-foreground">Field</div><div className="font-medium">{activeSession?.fieldName}</div></div>
                    <div><div className="text-sm text-muted-foreground">Time Worked</div><div className="font-medium">{sessionEndData.totalHours.toFixed(2)} hours</div></div>
                    <div><div className="text-sm text-muted-foreground">Current Rate</div><div className="font-medium">₹{rateData?.amountPerHour || 0}/hr</div></div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-lg">Payment Amount (₹)</Label>
                    <div className="flex items-center gap-2">
                      <Input id="amount" type="number" step="0.01" className="text-2xl h-14 font-semibold max-w-[200px]" value={sessionEndData.amount} onChange={(e) => setSessionEndData({ ...sessionEndData, amount: e.target.value })} />
                      <span className="text-muted-foreground text-sm">auto-calculated</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between bg-muted/10 border-t p-6">
                  <Button variant="ghost" onClick={handleDiscard}>Discard</Button>
                  <Button size="lg" className="gap-2" onClick={handleSave} disabled={createWorkLogMutation.isPending}>
                    <Save className="w-5 h-5" />
                    {createWorkLogMutation.isPending ? "Saving..." : "Save & View Customer"}
                  </Button>
                </CardFooter>
              </>
            ) : (
              <>
                <CardHeader>
                  <CardTitle>Start New Session</CardTitle>
                  <CardDescription>Select a customer and field to begin tracking time</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Customer</Label>
                      <WorkerCombobox
                        workers={workers}
                        workerId={workerId}
                        onWorkerChange={setWorkerId}
                        onAddWorker={() => { setAddDialogTarget("timer"); setAddDialogOpen(true); }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Field Name</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="e.g. North Pasture" className="pl-9" value={fieldName} onChange={(e) => setFieldName(e.target.value)} />
                      </div>
                    </div>
                  </div>
                  <div className="pt-4">
                    <Button size="lg" className="w-full h-16 text-lg rounded-full shadow-md transition-transform hover:scale-[1.02]" onClick={handleStart}>
                      <Play className="w-6 h-6 mr-2 fill-current" />
                      START TRACKING
                    </Button>
                  </div>
                </CardContent>
              </>
            )}
          </Card>
        </TabsContent>

        {/* Manual entry tab */}
        <TabsContent value="manual" className="mt-4">
          <Card className="border-2 shadow-sm">
            <CardHeader>
              <CardTitle>Add Manual Entry</CardTitle>
              <CardDescription>Log a past work session with specific date and times</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Customer</Label>
                <WorkerCombobox
                  workers={workers}
                  workerId={manualWorkerId}
                  onWorkerChange={setManualWorkerId}
                  onAddWorker={() => { setAddDialogTarget("manual"); setAddDialogOpen(true); }}
                />
              </div>
              <div className="space-y-2">
                <Label>Field Name</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="e.g. North Pasture" className="pl-9" value={manualField} onChange={(e) => setManualField(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <TimePicker value={manualStart} onChange={setManualStart} />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <TimePicker value={manualEnd} onChange={setManualEnd} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Payment Amount (₹)</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" step="0.01" className="max-w-[180px] font-semibold" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} />
                  <span className="text-muted-foreground text-sm">auto-calculated · editable</span>
                </div>
                {rateData && (
                  <p className="text-xs text-muted-foreground">
                    Rate: ₹{rateData.amountPerHour}/hr ·{" "}
                    {(() => {
                      const [sh, sm] = manualStart.split(":").map(Number);
                      const [eh, em] = manualEnd.split(":").map(Number);
                      const h = Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
                      return `${h.toFixed(2)} hrs`;
                    })()}
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter className="bg-muted/10 border-t p-6">
              <Button size="lg" className="w-full gap-2" onClick={handleManualSave} disabled={createWorkLogMutation.isPending}>
                <Save className="w-5 h-5" />
                {createWorkLogMutation.isPending ? "Saving..." : "Save Work Entry"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
