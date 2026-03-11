import { Outlet } from "react-router-dom";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardTopBar from "@/components/dashboard/DashboardTopBar";

const DashboardLayout = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardTopBar />
        <main className="flex-1 p-6 overflow-auto">
          {/* O Outlet renderiza o SentinelaDashboard ou outras sub-rotas */}
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;