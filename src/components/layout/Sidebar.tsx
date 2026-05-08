"use client";

import Link from "next/link";
import * as React from "react";
import { Badge, Button } from "@/components/ui";

export type SidebarNavKey =
  | "overview"
  | "orders"
  | "menu"
  | "tables"
  | "qrcodes"
  | "staff"
  | "reports"
  | "settings"
  | "kitchen";

export type SidebarNavItem = {
  key: SidebarNavKey;
  href: string;
  label: string;
  icon: React.ReactNode;
};

export function Sidebar({
  collapsed,
  navItems,
  activeKey,
  restaurantName,
  planLabel,
  onLogout,
  onNavigate,
  className,
}: {
  collapsed: boolean;
  navItems: SidebarNavItem[];
  activeKey: SidebarNavKey;
  restaurantName: string;
  planLabel: string;
  onLogout: () => void;
  onNavigate?: () => void;
  className?: string;
}) {
  const sidebarWidth = collapsed ? 72 : 280;

  return (
    <aside
      className={["h-screen text-foreground border-r border-[color:var(--border-soft)] flex flex-col transition-[width] duration-300 ease-in-out overflow-hidden bg-[linear-gradient(180deg,rgba(248,252,250,0.96),rgba(238,248,244,0.92))] backdrop-blur-xl", className ?? ""].join(" ")}
      style={{ width: sidebarWidth }}
    >
      <div className="flex flex-col h-full">
        <div className="p-4">
          <div className="surface-card flex items-center gap-3 rounded-[1.6rem] p-3">
            <div className="h-11 w-11 rounded-[1.15rem] bg-primary/12 border border-primary/18 flex items-center justify-center">
              <div className="h-8 w-8 rounded-[0.9rem] gradient-mint flex items-center justify-center shadow-[0_12px_24px_rgba(27,91,82,0.18)]">
                <span className="text-white font-black text-[10px] tracking-tight">RP</span>
              </div>
            </div>
            <div className={collapsed ? "hidden" : "min-w-0"}>
              <div className="text-sm font-black tracking-tight">RestoPOS</div>
              <div className="text-xs text-secondary/60 truncate">Cloud workspace</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 pb-3">
          {!collapsed ? <div className="px-3 pb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary/55">Navigation</div> : null}
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = item.key === activeKey;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  onClick={onNavigate}
                  className={[
                    "group flex items-center gap-3 rounded-[1.1rem] px-3 py-3 text-sm transition-all border",
                    isActive
                      ? "gradient-aqua border-primary/18 text-foreground shadow-[0_12px_24px_rgba(27,91,82,0.07)]"
                      : "text-secondary/78 border-transparent hover:text-foreground hover:bg-white/65 hover:border-[color:var(--border-soft)]",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "transition-colors shrink-0",
                      isActive ? "text-primary" : "text-secondary/70 group-hover:text-primary",
                    ].join(" ")}
                  >
                    {item.icon}
                  </span>
                  <span className={collapsed ? "hidden" : "truncate font-medium"}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="px-4 pb-6">
          <div className={collapsed ? "space-y-2" : "space-y-2"}>
            <div className="surface-card rounded-[1.5rem] p-3">
              <div className={collapsed ? "flex items-center justify-center" : "flex items-center justify-between gap-3"}>
                <div className={collapsed ? "text-center" : "min-w-0"}>
                  <div className="text-xs text-secondary/58">Restaurant</div>
                  <div className="font-semibold truncate text-sm">{restaurantName}</div>
                </div>
                <div className={collapsed ? "hidden" : ""}>
                  <Badge variant="info" className="bg-info/10 border-info/15 text-info">
                    {planLabel}
                  </Badge>
                </div>
                <div className={collapsed ? "" : "hidden"}>
                  <Badge
                    variant="info"
                    className="bg-info/10 border-info/15 text-info px-2"
                  >
                    {planLabel.slice(0, 1)}
                  </Badge>
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="md"
              className="w-full justify-center md:justify-start !text-secondary hover:!bg-white"
              onClick={onLogout}
            >
              <span className="inline-flex items-center gap-2">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  className="text-secondary/80"
                >
                  <path
                    d="M10 16L6 12L10 8"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6 12H14"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M14 4H18C19.1046 4 20 4.89543 20 6V18C20 19.1046 19.1046 20 18 20H14"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
                <span className={collapsed ? "hidden" : "text-secondary"}>Logout</span>
              </span>
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
