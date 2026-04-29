"use client";

import { useState, type ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(true);
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
