import { Switch, Route, Router as WouterRouter } from "wouter";
import { Suspense, lazy } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { queryClient } from "@/lib/query-client";
import { Layout } from "@/components/layout";
import { ProtectedRoute } from "@/components/protected-route";

// Login is on the critical path for every first-time visitor, so it stays
// in the main bundle. Every other page is loaded on demand — this keeps the
// initial JS payload small and makes first load noticeably faster.
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";

const Dashboard = lazy(() => import("@/pages/dashboard"));
const Track = lazy(() => import("@/pages/track"));
const WorkerDetail = lazy(() => import("@/pages/worker-detail"));
const Admin = lazy(() => import("@/pages/admin"));
const HistoryPage = lazy(() => import("@/pages/history"));
const ExpensesPage = lazy(() => import("@/pages/expenses"));
const SupervisorOverview = lazy(() => import("@/pages/supervisor-overview"));
const InvoicesPage = lazy(() => import("@/pages/invoices"));
const JcbReportPage = lazy(() => import("@/pages/jcb-report"));

function PageLoading() {
  return (
    <div className="flex items-center justify-center p-16">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Switch>
        <Route path="/login" component={Login} />

        <Route path="/">
          <ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>
        </Route>

        <Route path="/track">
          <ProtectedRoute><Layout><Track /></Layout></ProtectedRoute>
        </Route>

        <Route path="/workers/:id">
          <ProtectedRoute><Layout><WorkerDetail /></Layout></ProtectedRoute>
        </Route>

        <Route path="/admin">
          <ProtectedRoute><Layout><Admin /></Layout></ProtectedRoute>
        </Route>

        <Route path="/history">
          <ProtectedRoute><Layout><HistoryPage /></Layout></ProtectedRoute>
        </Route>

        <Route path="/expenses">
          <ProtectedRoute><Layout><ExpensesPage /></Layout></ProtectedRoute>
        </Route>

        <Route path="/supervisor-overview">
          <ProtectedRoute><Layout><SupervisorOverview /></Layout></ProtectedRoute>
        </Route>

        <Route path="/invoices">
          <ProtectedRoute><Layout><InvoicesPage /></Layout></ProtectedRoute>
        </Route>

        <Route path="/jcb-report">
          <ProtectedRoute><Layout><JcbReportPage /></Layout></ProtectedRoute>
        </Route>

        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
