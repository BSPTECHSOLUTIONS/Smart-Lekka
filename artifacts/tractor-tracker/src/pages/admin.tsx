import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Shield, Trash2, Plus, Building2, Pencil, UserCircle2, Tractor, AlertTriangle, KeyRound,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type TabId = "clients" | "users";

interface Client { id: number; name: string; mobile: string | null; createdAt: string; }
interface ClientUser {
  id: number; name: string; mobile: string; role: string;
  supervisorId: number | null; createdAt: string;
}

function useApiWithAuth() {
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  return { headers };
}

// ─── Clients Tab ─────────────────────────────────────────────────────────────
function ClientsTab() {
  const { headers } = useApiWithAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/clients", { headers });
      setClients(await res.json());
    } catch { toast({ title: "Failed to load clients", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { void fetchClients(); }, []);

  const handleCreate = async () => {
    if (!name) return;
    setSaving(true);
    try {
      const res = await fetch("/api/clients", { method: "POST", headers, body: JSON.stringify({ name, mobile }) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      await fetchClients();
      setCreateOpen(false); setName(""); setMobile("");
      toast({ title: "Client created" });
    } catch (e: any) { toast({ title: e.message || "Failed", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleEdit = async () => {
    if (!editClient || !name) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${editClient.id}`, { method: "PUT", headers, body: JSON.stringify({ name, mobile }) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      await fetchClients();
      setEditClient(null); setName(""); setMobile("");
      toast({ title: "Client updated" });
    } catch (e: any) { toast({ title: e.message || "Failed", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/clients/${id}`, { method: "DELETE", headers });
      await fetchClients();
      toast({ title: "Client deleted" });
    } catch { toast({ title: "Failed to delete", variant: "destructive" }); }
  };

  const openEdit = (c: Client) => { setEditClient(c); setName(c.name); setMobile(c.mobile ?? ""); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Clients</h2>
        <Button size="sm" onClick={() => { setCreateOpen(true); setName(""); setMobile(""); }}>
          <Plus className="w-4 h-4 mr-1" /> Add Client
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : clients.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No clients yet</div>
      ) : (
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Name</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-slate-500">{c.mobile || "—"}</TableCell>
                  <TableCell className="text-slate-400 text-sm">{new Date(c.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{c.name}"?</AlertDialogTitle>
                          <AlertDialogDescription>This will delete the client and all associated data. This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(c.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Client</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Client Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Farm name" /></div>
            <div><Label>Mobile (optional)</Label><Input value={mobile} onChange={e => setMobile(e.target.value)} placeholder="10-digit mobile" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!name || saving}>{saving ? "Saving…" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editClient} onOpenChange={v => !v && setEditClient(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Client</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Client Name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
            <div><Label>Mobile</Label><Input value={mobile} onChange={e => setMobile(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditClient(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={!name || saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── User & JCB Management Tab ────────────────────────────────────────────────
function UserManagementTab() {
  const { headers } = useApiWithAuth();
  const { toast } = useToast();

  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [allUsers, setAllUsers] = useState<ClientUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Selection
  const [selectedSupervisor, setSelectedSupervisor] = useState<ClientUser | null>(null);

  // Modal state
  type ModalMode = "add-supervisor" | "edit-supervisor" | "add-jcb" | "edit-jcb" | null;
  const [modal, setModal] = useState<ModalMode>(null);
  const [editTarget, setEditTarget] = useState<ClientUser | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [fName, setFName] = useState("");
  const [fMobile, setFMobile] = useState("");
  const [fPassword, setFPassword] = useState("");

  // Load clients on mount
  useEffect(() => {
    fetch("/api/clients", { headers }).then(r => r.json()).then(setClients).catch(() => {});
  }, []);

  // Load users when client changes
  useEffect(() => {
    if (!selectedClientId) { setAllUsers([]); setSelectedSupervisor(null); return; }
    setLoadingUsers(true);
    setSelectedSupervisor(null);
    fetch(`/api/clients/${selectedClientId}/jcbs`, { headers })
      .then(r => r.json())
      .then(setAllUsers)
      .catch(() => toast({ title: "Failed to load users", variant: "destructive" }))
      .finally(() => setLoadingUsers(false));
  }, [selectedClientId]);

  const reload = async () => {
    if (!selectedClientId) return;
    const data = await fetch(`/api/clients/${selectedClientId}/jcbs`, { headers }).then(r => r.json());
    setAllUsers(data);
    // Refresh selected supervisor reference
    if (selectedSupervisor) {
      const updated = (data as ClientUser[]).find(u => u.id === selectedSupervisor.id);
      setSelectedSupervisor(updated ?? null);
    }
  };

  const supervisors = allUsers.filter(u => u.role === "supervisor");
  const jcbsForSupervisor = selectedSupervisor
    ? allUsers.filter(u => u.role === "user" && u.supervisorId === selectedSupervisor.id)
    : [];

  // Form helpers
  const openModal = (mode: ModalMode, target?: ClientUser) => {
    setModal(mode);
    setEditTarget(target ?? null);
    setFName(target?.name ?? "");
    setFMobile(target?.mobile ?? "");
    setFPassword("");
  };
  const closeModal = () => { setModal(null); setEditTarget(null); };

  const handleSaveSupervisor = async () => {
    if (!fName || !fMobile) return;
    setSaving(true);
    try {
      if (modal === "add-supervisor") {
        if (!fPassword) { toast({ title: "Password required", variant: "destructive" }); return; }
        const res = await fetch("/api/users/jcb", {
          method: "POST", headers,
          body: JSON.stringify({ name: fName, mobile: fMobile, password: fPassword, clientId: selectedClientId, role: "supervisor" }),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
        toast({ title: "Supervisor added" });
      } else if (modal === "edit-supervisor" && editTarget) {
        const body: any = { name: fName, mobile: fMobile };
        if (fPassword) body.password = fPassword;
        const res = await fetch(`/api/users/${editTarget.id}`, { method: "PUT", headers, body: JSON.stringify(body) });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
        toast({ title: "Supervisor updated" });
      }
      await reload();
      closeModal();
    } catch (e: any) { toast({ title: e.message || "Failed", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleSaveJcb = async () => {
    if (!fName || !fMobile) return;
    setSaving(true);
    try {
      if (modal === "add-jcb") {
        if (!fPassword) { toast({ title: "Password required", variant: "destructive" }); return; }
        const res = await fetch("/api/users/jcb", {
          method: "POST", headers,
          body: JSON.stringify({
            name: fName, mobile: fMobile, password: fPassword,
            clientId: selectedClientId, role: "user",
            supervisorId: selectedSupervisor?.id ?? null,
          }),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
        toast({ title: "Vehicle user added" });
      } else if (modal === "edit-jcb" && editTarget) {
        const body: any = { name: fName, mobile: fMobile };
        if (fPassword) body.password = fPassword;
        const res = await fetch(`/api/users/${editTarget.id}`, { method: "PUT", headers, body: JSON.stringify(body) });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
        toast({ title: "Vehicle user updated" });
      }
      await reload();
      closeModal();
    } catch (e: any) { toast({ title: e.message || "Failed", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleDeleteUser = async (id: number) => {
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE", headers });
      if (!res.ok) throw new Error("Failed to delete");
      if (selectedSupervisor?.id === id) setSelectedSupervisor(null);
      await reload();
      toast({ title: "User deleted" });
    } catch { toast({ title: "Failed to delete", variant: "destructive" }); }
  };

  const isSupervisorModal = modal === "add-supervisor" || modal === "edit-supervisor";
  const isJcbModal = modal === "add-jcb" || modal === "edit-jcb";

  return (
    <div className="space-y-6">

      {/* ── Section 1: Client Selection ─────────────────────────────── */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-slate-700">
            <Building2 className="w-4 h-4" /> Step 1: Select Client
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedClientId ? String(selectedClientId) : ""}
            onValueChange={v => setSelectedClientId(Number(v))}
          >
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue placeholder="— Choose a client —" />
            </SelectTrigger>
            <SelectContent>
              {clients.map(c => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedClientId && (
        <>
          {/* ── Section 2: Supervisors ─────────────────────────────────── */}
          <Card className="border-blue-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2 text-blue-700">
                  <UserCircle2 className="w-4 h-4" /> Step 2: Supervisors
                  {supervisors.length > 0 && (
                    <Badge variant="secondary" className="ml-1">{supervisors.length}</Badge>
                  )}
                </CardTitle>
                <Button size="sm" onClick={() => openModal("add-supervisor")} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-1" /> Add Supervisor
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="text-center py-8 text-slate-400">Loading…</div>
              ) : supervisors.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  No supervisors yet — click "Add Supervisor" to get started.
                </div>
              ) : (
                <div className="rounded-lg border border-blue-100 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-blue-50">
                        <TableHead className="text-blue-700">Name</TableHead>
                        <TableHead className="text-blue-700">Mobile</TableHead>
                        <TableHead className="text-blue-700">Vehicles</TableHead>
                        <TableHead className="text-blue-700 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supervisors.map(sup => {
                        const jcbCount = allUsers.filter(u => u.role === "user" && u.supervisorId === sup.id).length;
                        const isSelected = selectedSupervisor?.id === sup.id;
                        return (
                          <TableRow
                            key={sup.id}
                            className={`cursor-pointer transition-colors ${isSelected ? "bg-blue-50 border-l-4 border-l-blue-500" : "hover:bg-slate-50"}`}
                            onClick={() => setSelectedSupervisor(isSelected ? null : sup)}
                          >
                            <TableCell className="font-medium">
                              {isSelected && <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2 align-middle" />}
                              {sup.name}
                            </TableCell>
                            <TableCell className="text-slate-500">{sup.mobile}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-blue-600 border-blue-200">
                                {jcbCount} {jcbCount === 1 ? "Vehicle" : "Vehicles"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" onClick={() => openModal("edit-supervisor", sup)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="flex items-center gap-2">
                                      <AlertTriangle className="w-5 h-5 text-red-500" />
                                      Delete Supervisor "{sup.name}"?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete this supervisor. Their Vehicle users will become unassigned.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteUser(sup.id)} className="bg-red-600 hover:bg-red-700">
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Section 3: JCB Users ───────────────────────────────────── */}
          <Card className={`border-2 transition-colors ${selectedSupervisor ? "border-amber-300" : "border-slate-200"}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2 text-amber-700">
                  <Tractor className="w-4 h-4" />
                  Step 3: Vehicle Users
                  {selectedSupervisor ? (
                    <span className="text-sm font-normal text-slate-500">
                      — under <span className="font-semibold text-amber-700">{selectedSupervisor.name}</span>
                    </span>
                  ) : (
                    <span className="text-sm font-normal text-slate-400">— select a supervisor above</span>
                  )}
                  {selectedSupervisor && jcbsForSupervisor.length > 0 && (
                    <Badge variant="secondary" className="ml-1">{jcbsForSupervisor.length}</Badge>
                  )}
                </CardTitle>
                {selectedSupervisor && (
                  <Button size="sm" onClick={() => openModal("add-jcb")} className="bg-amber-600 hover:bg-amber-700">
                    <Plus className="w-4 h-4 mr-1" /> Add Vehicle
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedSupervisor ? (
                <div className="text-center py-10 text-slate-400">
                  <Tractor className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Click a supervisor above to see their Vehicle users.
                </div>
              ) : jcbsForSupervisor.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  No Vehicle users under {selectedSupervisor.name} yet.
                  <br />
                  <Button variant="link" className="text-amber-600" onClick={() => openModal("add-jcb")}>
                    Add the first Vehicle user
                  </Button>
                </div>
              ) : (
                <div className="rounded-lg border border-amber-100 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-amber-50">
                        <TableHead className="text-amber-700">Vehicle Number</TableHead>
                        <TableHead className="text-amber-700">Operator Name</TableHead>
                        <TableHead className="text-amber-700">Mobile</TableHead>
                        <TableHead className="text-amber-700">Status</TableHead>
                        <TableHead className="text-amber-700 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jcbsForSupervisor.map(jcb => (
                        <TableRow key={jcb.id} className="hover:bg-amber-50/50">
                          <TableCell>
                            <code className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-sm font-mono">
                              {jcb.mobile}
                            </code>
                          </TableCell>
                          <TableCell className="font-medium">{jcb.name}</TableCell>
                          <TableCell className="text-slate-500">{jcb.mobile}</TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => openModal("edit-jcb", jcb)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Vehicle "{jcb.mobile}"?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete this Vehicle user and all their work records.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteUser(jcb.id)} className="bg-red-600 hover:bg-red-700">
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Add/Edit Supervisor Modal ────────────────────────────────── */}
      <Dialog open={isSupervisorModal} onOpenChange={v => !v && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCircle2 className="w-5 h-5 text-blue-500" />
              {modal === "add-supervisor" ? "Add Supervisor" : "Edit Supervisor"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input value={fName} onChange={e => setFName(e.target.value)} placeholder="Supervisor name" />
            </div>
            <div>
              <Label>Mobile Number</Label>
              <Input value={fMobile} onChange={e => setFMobile(e.target.value)} placeholder="10-digit mobile (used as login ID)" />
            </div>
            <div>
              <Label>{modal === "add-supervisor" ? "Password" : "New Password (leave blank to keep)"}</Label>
              <Input
                type="password"
                value={fPassword}
                onChange={e => setFPassword(e.target.value)}
                placeholder={modal === "add-supervisor" ? "Set password" : "Leave blank to keep current"}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSaveSupervisor} disabled={!fName || !fMobile || saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? "Saving…" : modal === "add-supervisor" ? "Add Supervisor" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add/Edit JCB Modal ───────────────────────────────────────── */}
      <Dialog open={isJcbModal} onOpenChange={v => !v && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tractor className="w-5 h-5 text-amber-500" />
              {modal === "add-jcb" ? `Add Vehicle under ${selectedSupervisor?.name}` : "Edit Vehicle User"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Vehicle Number / Mobile (Login ID)</Label>
              <Input value={fMobile} onChange={e => setFMobile(e.target.value)} placeholder="e.g. VEH001 or 9876543210" />
            </div>
            <div>
              <Label>Operator Name</Label>
              <Input value={fName} onChange={e => setFName(e.target.value)} placeholder="Operator / machine name" />
            </div>
            <div>
              <Label>{modal === "add-jcb" ? "Password" : "New Password (leave blank to keep)"}</Label>
              <Input
                type="password"
                value={fPassword}
                onChange={e => setFPassword(e.target.value)}
                placeholder={modal === "add-jcb" ? "Set password" : "Leave blank to keep current"}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSaveJcb} disabled={!fName || !fMobile || saving} className="bg-amber-600 hover:bg-amber-700">
              {saving ? "Saving…" : modal === "add-jcb" ? "Add Vehicle" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Admin Page Shell ─────────────────────────────────────────────────────────
export default function AdminPage() {
  const [tab, setTab] = useState<TabId>("clients");

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Admin Panel</h1>
            <p className="text-sm text-slate-500">Manage clients, supervisors and vehicles</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm w-fit">
          {(["clients", "users"] as TabId[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              {t === "clients" ? (
                <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4" /> Clients</span>
              ) : (
                <span className="flex items-center gap-1.5"><Tractor className="w-4 h-4" /> User Management</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === "clients" ? <ClientsTab /> : <UserManagementTab />}
      </div>
    </div>
  );
}
