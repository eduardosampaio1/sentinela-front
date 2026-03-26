import { useState } from "react";
import { Outlet } from "react-router-dom";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardTopBar from "@/components/dashboard/DashboardTopBar";

const DashboardLayout = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(34,211,238,0.14),transparent_26%),radial-gradient(circle_at_88%_8%,rgba(251,191,36,0.08),transparent_20%),linear-gradient(180deg,rgba(7,12,24,0.16),transparent_32%)]" />
      <DashboardSidebar
        mobileOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="pointer-events-none absolute inset-0 surface-grid opacity-30" />
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
