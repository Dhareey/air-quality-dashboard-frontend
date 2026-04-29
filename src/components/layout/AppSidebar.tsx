"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Bot, Wind, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/agent", label: "Agent", icon: Bot },
] as const;

export function AppSidebar({ collapsed, onToggle }: Props) {
  const pathname = usePathname();
  return (
    <aside
      className={cn(
        "sticky top-0 h-screen shrink-0 border-r border-border bg-card transition-[width] duration-300 ease-out",
        collapsed ? "w-[68px]" : "w-[232px]"
      )}
    >
      <div className="flex h-16 items-center gap-2 border-b border-border px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Wind className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">AirSight</p>
            <p className="truncate text-xs text-muted-foreground">Air Quality Intel</p>
          </div>
        )}
      </div>

      <nav className="flex flex-col gap-1 p-3">
        {items.map((item) => {
          const active = pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              href={item.to}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={onToggle}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition hover:text-foreground"
        aria-label="Toggle sidebar"
      >
        {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
      </button>
    </aside>
  );
}
