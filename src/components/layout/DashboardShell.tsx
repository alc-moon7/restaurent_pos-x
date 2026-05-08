"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar, type SidebarNavItem, type SidebarNavKey } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { ToastProvider } from "@/components/ui/Toast";

function IconOverview() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 13V6C4 4.89543 4.89543 4 6 4H10C11.1046 4 12 4.89543 12 6V13C12 14.1046 11.1046 15 10 15H6C4.89543 15 4 14.1046 4 13Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M12 19V11C12 9.89543 12.8954 9 14 9H18C19.1046 9 20 9.89543 20 11V19C20 20.1046 19.1046 21 18 21H14C12.8954 21 12 20.1046 12 19Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function IconOrders() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 7H17"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M7 12H17"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M7 17H13"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M6 3H18C19.1046 3 20 3.89543 20 5V19C20 20.1046 19.1046 21 18 21H6C4.89543 21 4 20.1046 4 19V5C4 3.89543 4.89543 3 6 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 7H19"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M5 12H14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M5 17H19"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconTables() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7H20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M6 7V19C6 20.1046 6.89543 21 8 21H16C17.1046 21 18 20.1046 18 19V7"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M9 11H15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M9 15H15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconQr() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 3H11V11H3V3Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M13 3H21V11H13V3Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M3 13H11V21H3V13Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M13 13H17V17H13V13Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M19 13H21V21H19V13Z"
        fill="currentColor"
      />
      <path
        d="M17 19H21"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconStaff() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M16 20V19C16 17.8954 15.1046 17 14 17H6C4.89543 17 4 17.8954 4 19V20"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M10 13C12.2091 13 14 11.2091 14 9C14 6.79086 12.2091 5 10 5C7.79086 5 6 6.79086 6 9C6 11.2091 7.79086 13 10 13Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M20 20V18.5C20 17.6716 19.3284 17 18.5 17H18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M16.5 13C17.8807 12.825 19 11.6307 19 10.2C19 8.65685 17.6569 7.4 16.1 7.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconReports() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 19V5C4 3.89543 4.89543 3 6 3H20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M8 17H10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 14H14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M16 11H18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M4 19H20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 15.5C13.933 15.5 15.5 13.933 15.5 12C15.5 10.067 13.933 8.5 12 8.5C10.067 8.5 8.5 10.067 8.5 12C8.5 13.933 10.067 15.5 12 15.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M19.4 15C19.7 14.4 20 13.7 20 13C20 12.3 19.7 11.6 19.4 11L21 9.4L19.6 8L18 9.6C17.4 9.3 16.7 9 16 9C15.3 9 14.6 9.3 14 9.6L12.4 8L11 9.4L12.6 11C12.3 11.6 12 12.3 12 13C12 13.7 12.3 14.4 12.6 15L11 16.6L12.4 18L14 16.4C14.6 16.7 15.3 17 16 17C16.7 17 17.4 16.7 18 16.4L19.6 18L21 16.6L19.4 15Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconKitchen() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 4V20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M7 12H14C16.7614 12 19 9.76142 19 7V4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M14 20V12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const navMap: Array<{ key: SidebarNavKey; label: string; href: string; icon: React.ReactNode }> = [
  { key: "overview", label: "Overview", href: "/dashboard", icon: <IconOverview /> },
  { key: "orders", label: "Orders", href: "/dashboard/orders", icon: <IconOrders /> },
  { key: "menu", label: "Menu Management", href: "/dashboard/menu", icon: <IconMenu /> },
  { key: "tables", label: "Tables", href: "/dashboard/tables", icon: <IconTables /> },
  { key: "qrcodes", label: "QR Codes", href: "/dashboard/qr-codes", icon: <IconQr /> },
  { key: "kitchen", label: "Kitchen Display", href: "/admin/kitchen", icon: <IconKitchen /> },
  { key: "staff", label: "Staff", href: "/dashboard/staff", icon: <IconStaff /> },
  { key: "reports", label: "Reports", href: "/dashboard/reports", icon: <IconReports /> },
  { key: "settings", label: "Settings", href: "/dashboard/settings", icon: <IconSettings /> },
];

function getActiveKey(pathname: string): SidebarNavKey {
  if (pathname === "/dashboard") return "overview";
  if (pathname.startsWith("/dashboard/orders")) return "orders";
  if (pathname.startsWith("/dashboard/menu")) return "menu";
  if (pathname.startsWith("/dashboard/tables")) return "tables";
  if (pathname.startsWith("/dashboard/qr-codes")) return "qrcodes";
  if (pathname.startsWith("/dashboard/staff")) return "staff";
  if (pathname.startsWith("/dashboard/reports")) return "reports";
  if (pathname.startsWith("/dashboard/settings")) return "settings";
  return "overview";
}

function getActiveTitle(pathname: string) {
  const k = getActiveKey(pathname);
  return navMap.find((x) => x.key === k)?.label ?? "Overview";
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const activeKey = getActiveKey(pathname ?? "/dashboard");

  const [isMobile, setIsMobile] = React.useState(() => {
    if (typeof window === "undefined") return false;
    return !window.matchMedia("(min-width: 768px)").matches;
  });

  const [collapsed, setCollapsed] = React.useState(true);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [authState, setAuthState] = React.useState<"checking" | "authed" | "unauth">("checking");

  const authKey = "restopos:auth";

  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => {
      const desktop = mq.matches;
      setIsMobile(!desktop);
      setCollapsed(!desktop);
      if (desktop) setMobileOpen(false);
    };
    apply();

    // Safari fallback
    if ("addEventListener" in mq) mq.addEventListener("change", apply);
    else (mq as unknown as { addListener: (cb: () => void) => void }).addListener(apply);

    return () => {
      if ("removeEventListener" in mq) mq.removeEventListener("change", apply);
      else (mq as unknown as { removeListener: (cb: () => void) => void }).removeListener(apply);
    };
  }, []);

  React.useEffect(() => {
    const authed = sessionStorage.getItem(authKey) === "1";
    if (!authed) {
      setTimeout(() => setAuthState("unauth"), 0);
      router.replace("/login");
      return;
    }
    setTimeout(() => setAuthState("authed"), 0);
  }, [router]);

  const navItems: SidebarNavItem[] = navMap;

  const handleLogout = () => {
    sessionStorage.removeItem(authKey);
    router.replace("/login");
  };

  if (authState !== "authed") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-secondary/70 text-sm font-medium">Loading…</div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-background">
        <div className="min-h-screen flex">
          {!isMobile ? (
            <div className="sticky top-0 h-screen">
              <Sidebar
                collapsed={collapsed}
                navItems={navItems}
                activeKey={activeKey}
                restaurantName="Bistro Aurora"
                planLabel="Pro Plan"
                onLogout={handleLogout}
              />
            </div>
          ) : null}

          <div className="flex-1 flex flex-col bg-transparent">
            <Navbar
              title={getActiveTitle(pathname ?? "/dashboard")}
              collapsed={collapsed}
              isMobile={isMobile}
              onMobileOpen={() => setMobileOpen(true)}
              onToggleSidebar={() => setCollapsed((v) => !v)}
              notificationCount={3}
              userName="Admin User"
              onLogout={handleLogout}
            />
            <div className="p-4 md:p-6 xl:p-8 flex-1 overflow-auto">
              <div className="mx-auto max-w-[1440px]">{children}</div>
            </div>
          </div>
        </div>

        {isMobile ? (
          <div className="fixed inset-0 z-[60] md:hidden" aria-hidden={!mobileOpen}>
            <div
              className={[
                "absolute inset-0 bg-secondary/55 backdrop-blur-sm transition-opacity",
                mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none",
              ].join(" ")}
              onMouseDown={() => setMobileOpen(false)}
            />
            <div
              className={[
                "absolute left-0 top-0 h-screen transition-transform duration-300 ease-out",
                mobileOpen ? "translate-x-0" : "-translate-x-full",
              ].join(" ")}
            >
              <Sidebar
                collapsed={false}
                navItems={navItems}
                activeKey={activeKey}
                restaurantName="Bistro Aurora"
                planLabel="Pro Plan"
                onLogout={handleLogout}
                onNavigate={() => setMobileOpen(false)}
              />
            </div>
          </div>
        ) : null}
      </div>
    </ToastProvider>
  );
}
