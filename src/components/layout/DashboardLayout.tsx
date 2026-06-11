import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function DashboardLayout() {
  return (
    <div className="flex min-h-screen bg-bg-base text-text-primary">
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 pl-64 p-8">
        <Outlet />
      </main>
    </div>
  );
}
