import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { SidebarContent } from "./Sidebar";

// ─── Hamburger button ─────────────────────────────────────────────────────────

interface HamburgerProps {
  onClick: () => void;
}

export function MobileMenuButton({ onClick }: HamburgerProps) {
  return (
    <button
      onClick={onClick}
      className="md:hidden w-8 h-8 flex items-center justify-center rounded-xl text-[#94A3B8] hover:text-[#94A3B8] hover:bg-[rgba(255,255,255,0.04)] transition-colors mr-1 flex-shrink-0"
      aria-label="Open navigation menu"
    >
      <svg className="w-4.5 h-4.5 w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
      </svg>
    </button>
  );
}

// ─── Mobile nav drawer ─────────────────────────────────────────────────────────

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <MobileMenuButton onClick={() => setOpen(true)} />

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="p-0 w-[240px] bg-[#070C18] border-r border-[rgba(255,255,255,0.06)] [&>button]:hidden"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent onNavClick={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
