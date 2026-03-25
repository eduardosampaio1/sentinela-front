import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useAnalysis } from "@/hooks/useAnalysis";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  requiresAnalysis?: boolean;
  exact?: boolean;
}

function NavIcon({ path }: { path: string }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

const NAV_ITEMS: NavItem[] = [
  {
    to: "/home",
    label: "Launchpad",
    icon: <NavIcon path="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />,
    exact: true,
  },
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: <NavIcon path="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />,
    requiresAnalysis: true,
  },
  {
    to: "/dashboard/history",
    label: "History",
    icon: <NavIcon path="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
  },
  {
    to: "/workspaces",
    label: "Workspaces",
    icon: <NavIcon path="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v8.25m19.5 0v3.75a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6m13.5 8.25h3m-3 3h3m-3-6h3m-6 3h.008v.008H12v-.008Zm0 3h.008v.008H12v-.008Zm0-6h.008v.008H12v-.008Z" />,
  },
];

const BOTTOM_NAV: NavItem[] = [
  {
    to: "/dashboard/settings",
    label: "Settings",
    icon: <NavIcon path="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />,
  },
];

interface SidebarNavItemProps {
  item: NavItem;
  analysisCompleted: boolean;
}

function SidebarNavItem({ item, analysisCompleted }: SidebarNavItemProps) {
  const location = useLocation();
  const isDisabled = item.requiresAnalysis && !analysisCompleted;

  const isActive = item.exact
    ? location.pathname === item.to
    : location.pathname.startsWith(item.to);

  if (isDisabled) {
    return (
      <div
        className="flex items-center gap-3 px-3 py-2 rounded-xl text-[#2D3748] cursor-not-allowed"
        title="Run an analysis first to access this section"
      >
        <span className="flex-shrink-0">{item.icon}</span>
        <span className="text-sm font-medium truncate">{item.label}</span>
      </div>
    );
  }

  return (
    <NavLink
      to={item.to}
      end={item.exact}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150 group",
        isActive
          ? "bg-[rgba(34,211,238,0.12)] text-[#22D3EE]"
          : "text-[#475569] hover:text-[#94A3B8] hover:bg-[rgba(255,255,255,0.04)]"
      )}
    >
      <span
        className={cn(
          "flex-shrink-0 transition-colors",
          isActive ? "text-[#22D3EE]" : "text-current"
        )}
      >
        {item.icon}
      </span>
      <span className="text-sm font-medium truncate">{item.label}</span>
      {isActive && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#22D3EE]" aria-hidden="true" />
      )}
    </NavLink>
  );
}

export function Sidebar() {
  const { workspace, project, environment } = useAuth();
  const { analysisCompleted } = useAnalysis();

  return (
    <aside className="w-[240px] flex-shrink-0 h-screen sticky top-0 flex flex-col bg-[#070C18] border-r border-[rgba(255,255,255,0.06)]">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[rgba(34,211,238,0.12)] border border-[rgba(34,211,238,0.2)] flex items-center justify-center flex-shrink-0">
            <svg className="w-3.5 h-3.5 text-[#22D3EE]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-tight text-[#F1F5F9]">Sentinela</span>
        </div>
      </div>

      {/* Context indicator */}
      {(workspace || project || environment) && (
        <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.04)]">
          <p className="section-label mb-1.5">Active context</p>
          {workspace && (
            <p className="text-xs text-[#94A3B8] truncate font-medium">{workspace.name}</p>
          )}
          {project && (
            <p className="text-xs text-[#475569] truncate">{project.name}</p>
          )}
          {environment && (
            <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-full bg-[rgba(34,211,238,0.08)] border border-[rgba(34,211,238,0.12)]">
              <span className="w-1 h-1 rounded-full bg-[#22D3EE]" aria-hidden="true" />
              <span className="text-[10px] text-[#22D3EE] font-medium">{environment.name}</span>
            </span>
          )}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <SidebarNavItem
            key={item.to}
            item={item}
            analysisCompleted={analysisCompleted}
          />
        ))}
      </nav>

      {/* Bottom nav */}
      <div className="px-3 py-4 border-t border-[rgba(255,255,255,0.06)] space-y-0.5">
        {BOTTOM_NAV.map((item) => (
          <SidebarNavItem
            key={item.to}
            item={item}
            analysisCompleted={true}
          />
        ))}
      </div>
    </aside>
  );
}
