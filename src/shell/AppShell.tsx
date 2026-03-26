import { type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { ErrorBoundary } from "@/core/errors/ErrorBoundary";

interface AppShellProps {
  children: ReactNode;
  topBarTitle?: string;
  topBarActions?: ReactNode;
}

export function AppShell({ children, topBarTitle, topBarActions }: AppShellProps) {
  return (
    <div className="flex h-screen bg-[#070C18] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar title={topBarTitle} actions={topBarActions} />
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
