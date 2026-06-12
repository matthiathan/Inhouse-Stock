/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import DashboardLayout from './components/layout/DashboardLayout';
import { StockPage, AssetsPage, ScannerPage, SettingsPage, LoginPage, AssetDetailsPage, CustomerDetailsPage, AnalyticsPage } from './pages';
import { useAuth } from './hooks/useAuth';

export default function App() {
  const { user } = useAuth();

  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
        
        <Route 
          path="/*" 
          element={user ? <DashboardLayout /> : <Navigate to="/login" replace />}
        >
          <Route index element={<Navigate to="/stock" replace />} />
          <Route path="stock" element={<StockPage />} />
          <Route path="assets" element={<AssetsPage />} />
          <Route path="assets/:id" element={<AssetDetailsPage />} />
          <Route path="customers/:code" element={<CustomerDetailsPage />} />
          <Route path="scanner" element={<ScannerPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
