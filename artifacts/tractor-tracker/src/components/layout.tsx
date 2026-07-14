import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  LogOut, Home, Clock, Users, User as UserIcon, History, Timer, Receipt,
  LayoutDashboard, FileText, BarChart3, ChevronRight,
} from "lucide-react";
import { loadSession, formatDuration, type ActiveSession } from "@/lib/active-session";
import logoUrl from "/smart-lekka-logo.png";

function ActiveSessionBar() {
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const refresh = () => setSession(loadSession());
    refresh();
    const poll = setInterval(refresh, 2000);
    return () => clearInterval(poll);
  }, []);

  useEffect(() => {
    if (!session) return;
    const start = new Date(session.startTime).getTime();
    setElapsedMs(Date.now() - start);
    const iv = setInterval(() => setElapsedMs(Date.now() - start), 1000);
    return () => clearInterval(iv);
  }, [session?.startTime]);

  if (!session) return null;

  return (
    <div className="bg-emerald-600 text-white px-3 py-2 flex items-center justify-between gap-2 shrink-0 z-50">
      <div className="flex items-center gap-2 min-w-0">
        <Timer className="w-3.5 h-3.5 animate-pulse shrink-0" />
        <span className="text-xs font-medium truncate">
          {session.workerName} · {session.fieldName}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="font-mono font-semibold text-xs tabular-nums">{formatDuration(elapsedMs)}</span>
        <Link href="/track">
          <span className="bg-white/20 hover:bg-white/30 transition-colors text-white text-xs font-medium px-2.5 py-1 rounded-full cursor-pointer whitespace-nowrap">
            Go →
          </span>
        </Link>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();

  if (!user) return <>{children}</>;

  const isSupervisor = user.role === "supervisor";

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    ...(!isSupervisor ? [{ href: "/track", label: "Track", icon: Clock }] : []),
    { href: "/history", label: "History", icon: History },
    { href: "/expenses", label: "Expenses", icon: Receipt },
    ...(isSupervisor ? [
      { href: "/supervisor-overview", label: "Overview", icon: LayoutDashboard },
      { href: "/jcb-report", label: "Vehicle Report", icon: BarChart3 },
      { href: "/invoices", label: "Invoices", icon: FileText },
    ] : []),
    ...(user.role === "admin" ? [{ href: "/admin", label: "Admin", icon: Users }] : []),
  ];

  const roleLabel = isSupervisor ? "Supervisor" : user.role === "admin" ? "Admin" : "Vehicle";
  const initials = (user.name || roleLabel).slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {!isSupervisor && <ActiveSessionBar />}

      <div className="flex flex-1 min-h-0">
        {/* Desktop Sidebar — always dark */}
        <aside className="hidden md:flex w-60 bg-sidebar border-r border-sidebar-border flex-col shrink-0">
          {/* Logo */}
          <div className="px-4 py-5 border-b border-sidebar-border shrink-0">
            <Link href="/">
              <span className="flex items-center gap-2 cursor-pointer">
                <img src={logoUrl} alt="Smart Lekka" className="h-9 w-auto object-contain" />
              </span>
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex flex-col gap-0.5 flex-1 px-3 py-4 overflow-y-auto">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30 px-3 mb-2">
              {isSupervisor ? "Supervisor" : "Vehicle Menu"}
            </p>
            {navItems.map((item) => {
              const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href}>
                  <span className={`flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all cursor-pointer group ${
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}>
                    <item.icon className={`w-4 h-4 mr-3 shrink-0 transition-transform ${active ? "" : "group-hover:scale-110"}`} />
                    {item.label}
                    {active && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* User footer */}
          <div className="px-3 pb-4 shrink-0 border-t border-sidebar-border pt-3">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-accent mb-2">
              <div className="w-8 h-8 rounded-full bg-sidebar-primary/20 border border-sidebar-primary/40 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-sidebar-primary">{initials}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-sidebar-accent-foreground truncate">{user.name}</p>
                <p className="text-[11px] text-sidebar-foreground/40">{roleLabel}</p>
              </div>
            </div>
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-sidebar-foreground/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              onClick={() => { logout(); setLocation("/login"); }}
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </aside>

        {/* Mobile top bar */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-sidebar border-b border-sidebar-border px-3 h-12 flex items-center justify-between">
          <Link href="/">
            <span className="flex items-center cursor-pointer">
              <img src={logoUrl} alt="Smart Lekka" className="h-8 w-auto object-contain" />
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-sidebar-foreground/40 px-2 py-1 rounded-md bg-sidebar-accent">
              {roleLabel}
            </span>
            <button
              className="text-sidebar-foreground/50 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
              onClick={() => { logout(); setLocation("/login"); }}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto md:pb-0 pb-16 min-w-0">
          <div className="md:hidden h-12" />
          <div className="p-3 sm:p-5 md:p-8 max-w-6xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border flex safe-area-inset-bottom">
        {navItems.map((item) => {
          const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className="flex-1">
              <span className={`flex flex-col items-center justify-center py-2 gap-0.5 w-full min-h-[56px] transition-colors relative ${
                active ? "text-primary" : "text-muted-foreground"
              }`}>
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                )}
                <item.icon className={`w-5 h-5 transition-all ${active ? "text-primary scale-110" : "text-muted-foreground"}`} />
                <span className={`text-[9px] font-medium leading-none mt-0.5 transition-all ${active ? "opacity-100" : "opacity-50"}`}>
                  {item.label}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
