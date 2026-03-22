import { useState } from "react";
import { Outlet } from "react-router-dom";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardTopBar from "@/components/dashboard/DashboardTopBar";

const DashboardLayout = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar
        mobileOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_2%,rgba(34,211,238,0.16),transparent_26%),radial-gradient(circle_at_92%_10%,rgba(59,130,246,0.12),transparent_24%),linear-gradient(180deg,rgba(7,12,24,0.22),transparent_28%)]" />
        <div className="dashboard-subtle-grid pointer-events-none absolute inset-0 opacity-35" />
        <DashboardTopBar onOpenSidebar={() => setMobileSidebarOpen(true)} />
        <main className="relative z-10 flex-1 overflow-auto">
          <div className="page-shell py-5 sm:py-8 lg:py-10">
            <div className="page-stack">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
