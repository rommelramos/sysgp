"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[var(--bg-primary)]">
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar onMobileMenuToggle={() => setMobileOpen((o) => !o)} />
        <main className="flex-1 overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
          <div className="p-6 md:p-8 mx-auto w-full" style={{ maxWidth: 1600 }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
