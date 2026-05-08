"use client";

import * as React from "react";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

export function Navbar({
  title,
  onToggleSidebar,
  collapsed,
  isMobile,
  onMobileOpen,
  notificationCount,
  userName,
  onLogout,
}: {
  title: string;
  onToggleSidebar: () => void;
  collapsed: boolean;
  isMobile: boolean;
  onMobileOpen: () => void;
  notificationCount: number;
  userName: string;
  onLogout: () => void;
}) {
  const initials = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <header className="h-[84px] px-4 sm:px-6 bg-white/38 backdrop-blur-xl border-b border-[color:var(--border-soft)] flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0 sm:flex-1">
        {/* Hamburger on <lg */}
        <button
          type="button"
          onClick={() => {
            if (isMobile) onMobileOpen();
            else onToggleSidebar();
          }}
          className={[
            "h-11 w-11 rounded-[1rem] border border-[color:var(--border-soft)] bg-white/70 hover:bg-white text-secondary/80 flex items-center justify-center transition-colors shadow-[0_10px_24px_rgba(27,91,82,0.05)]",
            isMobile ? "" : "hidden",
          ].join(" ")}
          aria-label="Open sidebar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 7H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M4 12H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M4 17H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        {/* Desktop title */}
        <div className="min-w-0 hidden sm:block">
          <div className="text-[11px] text-secondary/58 font-semibold uppercase tracking-[0.16em]">
            Cloud live
          </div>
          <div className="text-xl font-black tracking-tight truncate">{title}</div>
        </div>

        {/* Mobile centered title */}
        <div className="min-w-0 flex-1 sm:hidden text-center">
          <div className="text-[11px] text-secondary/58 font-semibold uppercase tracking-[0.16em]">
            Admin
          </div>
          <div className="text-base font-black tracking-tight truncate">{title}</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="relative hidden sm:inline-flex h-11 w-11 rounded-[1rem] border border-[color:var(--border-soft)] bg-white/75 hover:bg-white text-secondary/80 items-center justify-center transition-colors shadow-[0_10px_24px_rgba(27,91,82,0.05)]"
          aria-label="Notifications"
          onClick={() => alert("Notifications are mocked for this demo.")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M15 17H9"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M18 9V12C18 13.6569 19.3431 15 21 15H3C4.65685 15 6 13.6569 6 12V9C6 6.23858 8.23858 4 11 4H13C15.7614 4 18 6.23858 18 9Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M10 19C10.5 20.2 11.7 21 12.9 21C14.1 21 15.3 20.2 15.8 19"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>

          {notificationCount > 0 ? (
            <span
              className={cn(
                "absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-danger text-white text-[11px] font-bold flex items-center justify-center border border-white/70"
              )}
            >
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          ) : null}
        </button>

        <div className="relative" ref={rootRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-3 rounded-[1.25rem] border border-[color:var(--border-soft)] bg-white/78 hover:bg-white px-3 py-2 transition-colors shadow-[0_10px_24px_rgba(27,91,82,0.05)]"
          >
            <div className="h-9 w-9 rounded-[1rem] gradient-aqua border border-primary/12 flex items-center justify-center">
              <span className="text-primary font-black text-xs">{initials}</span>
            </div>
            {!collapsed ? (
              <div className="text-left hidden md:block">
                <div className="text-sm font-semibold text-secondary/90 leading-none">
                  {userName}
                </div>
                <div className="text-xs text-secondary/60">Admin</div>
              </div>
            ) : null}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="text-secondary/60"
            >
              <path
                d="M7 10L12 15L17 10"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {open ? (
            <div className="absolute right-0 mt-3 w-[240px] rounded-[1.6rem] border border-[color:var(--border-soft)] bg-white/92 shadow-[0_18px_36px_rgba(27,91,82,0.12)] backdrop-blur-xl overflow-hidden">
              <div className="px-4 py-4 border-b border-[color:var(--border-soft)]">
                <div className="text-sm font-semibold text-secondary/90">{userName}</div>
                <div className="text-xs text-secondary/60">admin@demo.com</div>
              </div>
              <div className="py-2">
                <button
                  type="button"
                  className="w-full px-4 py-2 text-left text-sm text-secondary/80 hover:bg-secondary/5 transition-colors"
                  onClick={() => alert("Profile is mocked in this demo.")}
                >
                  Profile
                </button>
                <button
                  type="button"
                  className="w-full px-4 py-2 text-left text-sm text-secondary/80 hover:bg-secondary/5 transition-colors"
                  onClick={() => alert("Settings are mocked in this demo.")}
                >
                  Settings
                </button>
                <div className="px-4 py-2">
                  <Badge variant="neutral" className="w-full justify-center">
                    Plan: Pro
                  </Badge>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full px-4 py-2 text-left text-sm text-danger hover:bg-danger/10 transition-colors"
                >
                  Sign out
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
