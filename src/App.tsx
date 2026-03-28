import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Dashboard from "@/pages/Dashboard";
import Loans from "@/pages/Loans";
import CreateLoan from "@/pages/CreateLoan";
import LoanLoginDetails from "@/pages/LoanLoginDetails";
import LoanDetail from "@/pages/LoanDetail";
import EditLead from "@/pages/EditLead";
import EditLoan from "@/pages/EditLoan";

import UserManagement from "@/pages/UserManagement";
import BankManagement from "@/pages/BankManagement";
import BrokerManagement from "@/pages/BrokerManagement";
import BranchManagement from "@/pages/BranchManagement";
import Commission from "@/pages/Commission";
import Reports from "@/pages/Reports";
import AddLead from "@/pages/AddLead";
import LeadsList from "@/pages/LeadsList";
import LeadDetail from "@/pages/LeadDetail";
import FieldPermissions from "@/pages/FieldPermissions";
import PayoutManagement from "@/pages/PayoutManagement";
import ExpenseManagement from "@/pages/ExpenseManagement";
import RCLimitModule from "@/pages/RCLimitModule";
import InsuranceModule from "@/pages/InsuranceModule";
import SystemConfig from "@/pages/SystemConfig";
import AuditLogPage from "@/pages/AuditLogPage";
import TeamUsers from "@/pages/TeamUsers";
import LinkLoanFinder from "@/pages/LinkLoanFinder";
import CustomerPortal from "@/pages/CustomerPortal";
import CustomerLogin from "@/pages/CustomerLogin";
import CustomerDashboard from "@/pages/CustomerDashboard";
import AccountantDashboard from "@/pages/AccountantDashboard";
import FolioAccounts from "@/pages/FolioAccounts";
import AccountPayments from "@/pages/AccountPayments";
import BankAccounts from "@/pages/BankAccounts";
import ApplicationStageManagement from "@/pages/ApplicationStageManagement";
import RCTemplatePage from "@/pages/RCTemplatePage";
import RCTemplateViewer from "@/pages/RCTemplateViewer";
import UserProfile from "@/pages/UserProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return <DashboardLayout>{children}</DashboardLayout>;
}

function AppRoutes() {
  const auth = useAuth();
  if (!auth || auth.isLoading) return null;
  const { user } = auth;
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <Signup />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/loans" element={<ProtectedRoute><Loans /></ProtectedRoute>} />
      <Route path="/loans/new" element={<ProtectedRoute><CreateLoan /></ProtectedRoute>} />
      <Route path="/loans/login-details" element={<ProtectedRoute><LoanLoginDetails /></ProtectedRoute>} />
      <Route path="/loans/edit/:id" element={<ProtectedRoute><EditLoan /></ProtectedRoute>} />
      <Route path="/loans/:id" element={<ProtectedRoute><LoanDetail /></ProtectedRoute>} />
      <Route path="/add-lead" element={<ProtectedRoute><AddLead /></ProtectedRoute>} />
      <Route path="/leads-list" element={<ProtectedRoute><LeadsList /></ProtectedRoute>} />
      <Route path="/leads/:id" element={<ProtectedRoute><LeadDetail /></ProtectedRoute>} />

      <Route path="/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
      <Route path="/banks" element={<ProtectedRoute><BankManagement /></ProtectedRoute>} />
      <Route path="/brokers" element={<ProtectedRoute><BrokerManagement /></ProtectedRoute>} />
      <Route path="/branches" element={<ProtectedRoute><BranchManagement /></ProtectedRoute>} />
      <Route path="/commission" element={<ProtectedRoute><Commission /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/permissions" element={<ProtectedRoute><FieldPermissions /></ProtectedRoute>} />

      {/* New PRD Modules */}
      <Route path="/payouts" element={<ProtectedRoute><PayoutManagement /></ProtectedRoute>} />
      <Route path="/expenses" element={<ProtectedRoute><ExpenseManagement /></ProtectedRoute>} />
      <Route path="/rc-limits" element={<ProtectedRoute><RCLimitModule /></ProtectedRoute>} />
      <Route path="/insurance" element={<ProtectedRoute><InsuranceModule /></ProtectedRoute>} />
      <Route path="/link-loan-finder" element={<ProtectedRoute><LinkLoanFinder /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SystemConfig /></ProtectedRoute>} />
      <Route path="/audit-logs" element={<ProtectedRoute><AuditLogPage /></ProtectedRoute>} />
      <Route path="/team" element={<ProtectedRoute><TeamUsers /></ProtectedRoute>} />
      <Route path="/rc-template/:loanId" element={<ProtectedRoute><RCTemplatePage /></ProtectedRoute>} />
      <Route path="/rc-template-viewer" element={<RCTemplateViewer />} />
      <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />

      {/* External Portals */}
      {/* Accountant Portal */}
      <Route path="/accountant/dashboard" element={<ProtectedRoute><AccountantDashboard /></ProtectedRoute>} />
      <Route path="/accountant/folio" element={<ProtectedRoute><FolioAccounts /></ProtectedRoute>} />
      <Route path="/accountant/payments" element={<ProtectedRoute><AccountPayments /></ProtectedRoute>} />
      <Route path="/accountant/bank-accounts" element={<ProtectedRoute><BankAccounts /></ProtectedRoute>} />

      {/* External Portals */}
      <Route path="/customer-login" element={<CustomerLogin />} />
      <Route path="/customer-dashboard" element={<CustomerDashboard />} />
      <Route path="/tracker" element={<CustomerPortal />} />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
