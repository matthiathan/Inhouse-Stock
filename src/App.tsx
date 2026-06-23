import React, { Component, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Toaster } from 'sonner';
import DashboardLayout from './components/layout/DashboardLayout';
import {
  WarehousePage,
  AssetsPage,
  NewAssetPage,
  ScannerPage,
  SettingsPage,
  AssetDetailsPage,
  CustomerDetailsPage,
  AnalyticsPage,
  OrdersPage,
  OrderFulfillmentPage,
  TechRoutePage,
  TechTicketPage,
  ServiceTasksPage,
  DispatchRoutingHub,
} from './pages';
import LoginPage from './pages/LoginPage';
import { useAuth } from './hooks/useAuth';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

function RoleProtectedRoute({ children, allowedRoles }: RoleProtectedRouteProps) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-base font-mono text-brand-gold">
        <div className="animate-pulse">Verifying security parameters...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = role || 'user';

  if (!allowedRoles.includes(userRole)) {
    const redirectTarget = (userRole === 'tech' || userRole === 'road_tech' || userRole === 'user') ? '/scanner' : '/warehouse';
    return <Navigate to={redirectTarget} replace />;
  }

  return <>{children}</>;
}

function IndexRedirect() {
  const { role } = useAuth();
  const target = (role === 'tech' || role === 'road_tech') ? '/my-route' : (role === 'user' ? '/scanner' : '/warehouse');
  return <Navigate to={target} replace />;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };
  public props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Core Application Error Boundary caught:', error, errorInfo);
  }

  handleReset = () => {
    localStorage.removeItem('demo_user_role');
    localStorage.removeItem('demo_user_email');
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-bg-base p-6 font-sans text-text-primary">
          <div className="enterprise-panel flex w-full max-w-md flex-col items-center rounded-lg p-8 text-center">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300">
              <AlertTriangle size={24} strokeWidth={2.4} />
            </div>
            <h1 className="mb-2 text-xl font-bold text-text-primary">System Interruption</h1>
            <p className="mb-6 text-sm leading-relaxed text-text-secondary">
              The operations portal encountered an unhandled exception. Reset the current session or reload the portal.
            </p>
            {this.state.error && (
              <pre className="mb-6 max-h-32 w-full overflow-auto rounded-md border border-brand-border bg-bg-base p-4 text-left font-mono text-[11px] text-red-500">
                {this.state.error.message || String(this.state.error)}
              </pre>
            )}
            <div className="flex w-full gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 rounded-md bg-dallmayr-blue p-3 text-xs font-semibold text-white transition-colors hover:bg-dallmayr-blue-light"
              >
                Reload Portal
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 rounded-md border border-brand-border bg-bg-elevated p-3 text-xs font-semibold text-text-primary transition-colors hover:bg-bg-muted"
              >
                Reset Session
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-base font-mono text-brand-gold">
        <div className="animate-pulse">Loading Dallmayr SA system...</div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Toaster position="top-right" richColors closeButton />
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />

          <Route
            path="/*"
            element={user ? <DashboardLayout /> : <Navigate to="/login" replace />}
          >
            <Route index element={<IndexRedirect />} />
            <Route
              path="warehouse"
              element={
                <RoleProtectedRoute allowedRoles={['admin', 'ops_manager', 'warehouse']}>
                  <WarehousePage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="orders"
              element={
                <RoleProtectedRoute allowedRoles={['admin', 'ops_manager', 'warehouse']}>
                  <OrdersPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="fulfillment"
              element={
                <RoleProtectedRoute allowedRoles={['warehouse']}>
                  <OrderFulfillmentPage />
                </RoleProtectedRoute>
              }
            />
            <Route path="assets" element={<AssetsPage />} />
            <Route path="assets/new" element={<NewAssetPage />} />
            <Route path="assets/:id" element={<AssetDetailsPage />} />
            <Route path="customers/:code" element={<CustomerDetailsPage />} />
            <Route path="scan" element={<ScannerPage />} />
            <Route path="scanner" element={<ScannerPage />} />
            <Route
              path="analytics"
              element={
                <RoleProtectedRoute allowedRoles={['admin', 'ops_manager']}>
                  <AnalyticsPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="dispatch"
              element={
                <RoleProtectedRoute allowedRoles={['admin', 'ops_manager']}>
                  <DispatchRoutingHub />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="my-route"
              element={
                <RoleProtectedRoute allowedRoles={['tech', 'road_tech']}>
                  <TechRoutePage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="tech-ticket/:id"
              element={
                <RoleProtectedRoute allowedRoles={['tech', 'road_tech']}>
                  <TechTicketPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="tech-route"
              element={
                <RoleProtectedRoute allowedRoles={['tech', 'road_tech']}>
                  <TechRoutePage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="tasks"
              element={
                <RoleProtectedRoute allowedRoles={['admin', 'finance']}>
                  <ServiceTasksPage />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="settings"
              element={
                <RoleProtectedRoute allowedRoles={['admin', 'ops_manager']}>
                  <SettingsPage />
                </RoleProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
