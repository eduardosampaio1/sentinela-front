import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  Target,
  BarChart3,
  FileText,
  Settings,
  AlertTriangle,
} from "lucide-react";

const navItems = [
  { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
  { title: "Conversations", url: "/dashboard/conversations", icon: MessageSquare },
  { title: "Intents", url: "/dashboard/intents", icon: Target },
  { title: "Metrics", url: "/dashboard/metrics", icon: BarChart3 },
  { title: "Alerts", url: "/dashboard/alerts", icon: AlertTriangle },
  { title: "Reports", url: "/dashboard/reports", icon: FileText },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

const DashboardSidebar = () => {
  const location = useLocation();

  return (
    <aside className="w-60 min-h-screen bg-sidebar border-r border-sidebar-border flex flex-col shrink-0">
      <div className="h-14 flex items-center px-5 border-b border-sidebar-border">
        <span className="text-base font-bold text-sidebar-accent-foreground">Sentinela</span>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.url === "/dashboard"
              ? location.pathname === "/dashboard"
              : location.pathname.startsWith(item.url);

          return (
            <RouterNavLink
              key={item.url}
              to={item.url}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.title}
            </RouterNavLink>
          );
        })}
      </nav>
    </aside>
  );
};

export default DashboardSidebar;
