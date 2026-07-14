import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { queryClient } from "@/lib/query-client";
import { Layout } from "@/components/layout";
import { ProtectedRoute } from "@/components/protected-route";

import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Track from "@/pages/track";
import WorkerDetail from "@/pages/worker-detail";
import Admin from "@/pages/admin";
import HistoryPage from "@/pages/history";
import ExpensesPage from "@/pages/expenses";
import SupervisorOverview from "@/pages/supervisor-overview";
import InvoicesPage from "@/pages/invoices";
import JcbReportPage from "@/pages/jcb-report";


function Router() {
  return (
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
