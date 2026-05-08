"use client";

import * as React from "react";
import { Badge, Button, Card } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";

type TabKey = "general" | "menu" | "printer" | "qr" | "notifications" | "billing";

function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onChange(!checked);
      }}
      className={[
        "relative inline-flex h-7 w-12 items-center rounded-full border transition-colors",
        checked
          ? "bg-success/20 border-success/30"
          : "bg-secondary/10 border-secondary/20",
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:opacity-95",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-5 w-5 transform rounded-full border bg-white shadow-sm transition-transform",
          checked ? "translate-x-5 border-success/20" : "translate-x-1 border-secondary/20",
        ].join(" ")}
      />
    </button>
  );
}

export default function SettingsPage() {
  const toast = useToast();

  const [tab, setTab] = React.useState<TabKey>("general");

  const [general, setGeneral] = React.useState({
    name: "",
    logoFileName: "",
    address: "",
    phone: "",
    email: "hello@bistroaurora.com",
    timezone: "America/New_York",
    currency: "USD",
  });

  const [menuSettings, setMenuSettings] = React.useState({
    taxRate: 10,
    serviceCharge: 2.0,
    currencySymbol: "$",
    allowSpecialInstructions: true,
  });

  const [printer, setPrinter] = React.useState({
    connection_type: "bluetooth",
    address: "",
    paper_width: 58,
  });

  const [serverAddress, setServerAddress] = React.useState<string>("");
  const [platformMeta, setPlatformMeta] = React.useState({
    restaurantId: "",
    restaurantStatus: "trial",
    outletId: "",
    outletName: "",
    subscriptionStatus: "trial",
    planName: "Starter",
    syncStatus: "pending",
    lastSyncedAt: "",
  });

  const [loadingConfig, setLoadingConfig] = React.useState(false);
  const [loadingPrinter, setLoadingPrinter] = React.useState(false);

  const adminPin = React.useMemo(
    () => (typeof window !== "undefined" ? window.localStorage.getItem("restopos:adminPin") || "1234" : "1234"),
    []
  );

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoadingConfig(true);
      try {
        const res = await fetch("/api/config", { cache: "no-store" });
        const data = (await res.json()) as null | {
          name: string | null;
          address: string | null;
          phone: string | null;
          tax_rate: number;
          currency: string;
          logo: string | null;
          restaurantId?: string;
          restaurantStatus?: string;
          outletId?: string;
          outletName?: string;
          subscriptionStatus?: string;
          planName?: string;
          syncStatus?: string;
          lastSyncedAt?: string | null;
          prepTimeMinutes?: number;
          tableOrderingEnabled?: boolean;
          customerOrderingEnabled?: boolean;
          gpsLatitude?: number | null;
          gpsLongitude?: number | null;
          gpsRadiusMeters?: number | null;
          gpsEnforcementEnabled?: boolean;
        };
        if (cancelled) return;
        if (data) {
          setGeneral((p) => ({
            ...p,
            name: data.name ?? "My Restaurant",
            address: data.address ?? "",
            phone: data.phone ?? "",
            currency: data.currency ?? "USD",
            logoFileName: data.logo ?? "",
          }));
          setMenuSettings((p) => ({
            ...p,
            taxRate: Number.isFinite(data.tax_rate) ? data.tax_rate : p.taxRate,
          }));
          setPlatformMeta({
            restaurantId: data.restaurantId ?? "",
            restaurantStatus: data.restaurantStatus ?? "trial",
            outletId: data.outletId ?? "",
            outletName: data.outletName ?? "",
            subscriptionStatus: data.subscriptionStatus ?? "trial",
            planName: data.planName ?? "Starter",
            syncStatus: data.syncStatus ?? "pending",
            lastSyncedAt: data.lastSyncedAt ?? "",
          });
          setQrSettings((p) => ({
            ...p,
            onlineOrderingEnabled: data.customerOrderingEnabled ?? p.onlineOrderingEnabled,
            tableWiseOrdering: data.tableOrderingEnabled ?? p.tableWiseOrdering,
            prepTimeMin: data.prepTimeMinutes ?? p.prepTimeMin,
            gpsEnforcementEnabled: data.gpsEnforcementEnabled ?? p.gpsEnforcementEnabled,
            gpsLatitude: data.gpsLatitude == null ? "" : String(data.gpsLatitude),
            gpsLongitude: data.gpsLongitude == null ? "" : String(data.gpsLongitude),
            gpsRadiusMeters: data.gpsRadiusMeters == null ? "" : String(data.gpsRadiusMeters),
          }));
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoadingConfig(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch("/api/server-info", { cache: "no-store" });
        const data = (await res.json()) as { ip: string; port: string | number; baseUrl?: string };
        if (cancelled) return;
        setServerAddress(data.baseUrl ?? `http://${data.ip}:${data.port}`);
      } catch {
        // ignore
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (tab !== "printer") return;
    let cancelled = false;
    const run = async () => {
      setLoadingPrinter(true);
      try {
        const res = await fetch("/api/printer", { cache: "no-store" });
        const data = (await res.json()) as null | {
          connection_type: string;
          address: string | null;
          paper_width: number;
        };
        if (cancelled) return;
        if (data) {
          setPrinter({
            connection_type: data.connection_type ?? "bluetooth",
            address: data.address ?? "",
            paper_width: data.paper_width ?? 58,
          });
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoadingPrinter(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  const [qrSettings, setQrSettings] = React.useState({
    onlineOrderingEnabled: true,
    tableWiseOrdering: true,
    autoAcceptOrders: true,
    prepTimeMin: 25,
    gpsEnforcementEnabled: false,
    gpsLatitude: "",
    gpsLongitude: "",
    gpsRadiusMeters: "",
  });

  const [notifSettings, setNotifSettings] = React.useState({
    emailAlerts: true,
    soundAlerts: false,
  });

  const currentPlan = platformMeta.planName;
  const geofenceConfigured =
    qrSettings.gpsLatitude.trim() !== "" &&
    qrSettings.gpsLongitude.trim() !== "" &&
    qrSettings.gpsRadiusMeters.trim() !== "" &&
    Number(qrSettings.gpsRadiusMeters) > 0;

  const requestCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast.pushToast({
        variant: "error",
        title: "Location unavailable",
        message: "This browser does not support geolocation.",
      });
      return;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        });
      });
      setQrSettings((p) => ({
        ...p,
        gpsLatitude: position.coords.latitude.toFixed(6),
        gpsLongitude: position.coords.longitude.toFixed(6),
      }));
      toast.pushToast({
        variant: "success",
        title: "Location captured",
        message: "Outlet center coordinates filled from this device.",
      });
    } catch (error) {
      toast.pushToast({
        variant: "error",
        title: "Location failed",
        message: error instanceof Error ? error.message : "Unable to read your current location.",
      });
    }
  };

  const save = async () => {
    try {
      if (tab === "general") {
        const res = await fetch("/api/config", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminPin}` },
          body: JSON.stringify({
            name: general.name,
            address: general.address,
            phone: general.phone,
            currency: general.currency,
            logo: general.logoFileName || null,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);
        toast.pushToast({ variant: "success", title: "Saved", message: "General settings updated." });
        return;
      }
      if (tab === "menu") {
        const res = await fetch("/api/config", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminPin}` },
          body: JSON.stringify({
            tax_rate: menuSettings.taxRate,
            currency: general.currency,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);
        toast.pushToast({ variant: "success", title: "Saved", message: "Menu settings updated." });
        return;
      }
      if (tab === "printer") {
        const res = await fetch("/api/printer", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminPin}` },
          body: JSON.stringify({
            connection_type: printer.connection_type,
            address: printer.address || null,
            paper_width: printer.paper_width,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);
        toast.pushToast({ variant: "success", title: "Saved", message: "Printer settings updated." });
        return;
      }
      if (tab === "qr") {
        const parseNullableNumber = (value: string) => {
          const trimmed = value.trim();
          if (!trimmed) return null;
          const parsed = Number(trimmed);
          if (!Number.isFinite(parsed)) throw new Error("GPS coordinates and radius must be valid numbers.");
          return parsed;
        };

        const gpsLatitude = parseNullableNumber(qrSettings.gpsLatitude);
        const gpsLongitude = parseNullableNumber(qrSettings.gpsLongitude);
        const gpsRadiusMeters = parseNullableNumber(qrSettings.gpsRadiusMeters);
        if (gpsRadiusMeters != null && gpsRadiusMeters <= 0) {
          throw new Error("GPS radius must be greater than zero.");
        }

        const res = await fetch("/api/config", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminPin}` },
          body: JSON.stringify({
            prep_time_minutes: qrSettings.prepTimeMin,
            table_ordering_enabled: qrSettings.tableWiseOrdering,
            customer_ordering_enabled: qrSettings.onlineOrderingEnabled,
            gps_latitude: gpsLatitude,
            gps_longitude: gpsLongitude,
            gps_radius_meters: gpsRadiusMeters,
            gps_enforcement_enabled: qrSettings.gpsEnforcementEnabled,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);
        toast.pushToast({ variant: "success", title: "Saved", message: "QR and geofence settings updated." });
        return;
      }

      const label = tab === "notifications" ? "Notifications" : "Billing";
      toast.pushToast({ variant: "success", title: "Saved", message: `${label} settings updated.` });
    } catch (e) {
      toast.pushToast({ variant: "error", title: "Save failed", message: (e as Error).message });
    }
  };

  const tabDefs: Array<{ key: TabKey; label: string }> = [
    { key: "general", label: "General" },
    { key: "menu", label: "Menu" },
    { key: "printer", label: "Printer" },
    { key: "qr", label: "QR & Ordering" },
    { key: "notifications", label: "Notifications" },
    { key: "billing", label: "Billing" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xl font-bold tracking-tight text-foreground">Restaurant Settings</div>
          <div className="mt-1 text-sm text-secondary/70">Update branding, ordering, notifications, and billing.</div>
        </div>
      </div>

      <div className="rounded-3xl border border-secondary/10 bg-white/70 shadow-sm p-3">
        <div className="flex items-center gap-2 overflow-x-auto px-2">
          {tabDefs.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={[
                  "whitespace-nowrap px-4 py-2 rounded-2xl text-sm font-semibold border transition-colors",
                  active
                    ? "bg-primary/15 border-primary/35 text-primary"
                    : "bg-white/60 border-secondary/15 text-secondary/80 hover:bg-white border-secondary/20",
                ].join(" ")}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "general" ? (
        <Card className="p-0 overflow-hidden">
          <div className="px-6 pt-6">
            <div className="text-base font-bold tracking-tight text-foreground">General</div>
            <div className="mt-1 text-sm text-secondary/60">Your restaurant profile used across the app.</div>
          </div>
          <div className="p-6 pt-4 space-y-6">
            <div className="rounded-2xl border border-secondary/10 bg-background p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-secondary/70">Customer Menu Base URL</div>
                  <div className="mt-1 text-sm font-bold tracking-tight text-foreground truncate">
                    {serverAddress || "Loading…"}
                  </div>
                  <div className="mt-2 text-xs text-secondary/60">
                    Public menu domain used for restaurant/outlet QR links.
                  </div>
                </div>
                {serverAddress ? (
                  <div className="rounded-2xl border border-secondary/10 bg-white p-2">
                    <img
                      alt="Server address QR"
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                        serverAddress
                      )}`}
                      width={120}
                      height={120}
                      className="h-[96px] w-[96px]"
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-secondary/10 bg-white px-4 py-4">
                <div className="text-sm font-semibold text-secondary/70">Restaurant ID</div>
                <div className="mt-1 break-all text-sm font-bold tracking-tight text-foreground">
                  {platformMeta.restaurantId || "Not connected"}
                </div>
                <div className="mt-2 text-xs text-secondary/60">Lifecycle: {platformMeta.restaurantStatus}</div>
              </div>
              <div className="rounded-2xl border border-secondary/10 bg-white px-4 py-4">
                <div className="text-sm font-semibold text-secondary/70">Outlet ID</div>
                <div className="mt-1 break-all text-sm font-bold tracking-tight text-foreground">
                  {platformMeta.outletId || "Not connected"}
                </div>
                <div className="mt-2 text-xs text-secondary/60">Outlet: {platformMeta.outletName || "Unknown"}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-secondary/10 bg-background p-4">
                <div className="text-sm font-semibold text-secondary/70">Subscription</div>
                <div className="mt-1 text-lg font-black tracking-tight text-foreground">
                  {platformMeta.planName}
                </div>
                <div className="mt-2 text-xs text-secondary/60">Status: {platformMeta.subscriptionStatus}</div>
              </div>
              <div className="rounded-2xl border border-secondary/10 bg-background p-4">
                <div className="text-sm font-semibold text-secondary/70">Outlet Sync Health</div>
                <div className="mt-1 text-lg font-black tracking-tight text-foreground">
                  {platformMeta.syncStatus}
                </div>
                <div className="mt-2 text-xs text-secondary/60">Last sync: {platformMeta.lastSyncedAt || "Not reported yet"}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-semibold text-secondary/70">Restaurant name</div>
                <input
                  value={general.name}
                  onChange={(e) => setGeneral((p) => ({ ...p, name: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-secondary/20 bg-background px-3 text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-semibold text-secondary/70">Phone</div>
                <input
                  value={general.phone}
                  onChange={(e) => setGeneral((p) => ({ ...p, phone: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-secondary/20 bg-background px-3 text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-semibold text-secondary/70">Email</div>
                <input
                  value={general.email}
                  onChange={(e) => setGeneral((p) => ({ ...p, email: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-secondary/20 bg-background px-3 text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-semibold text-secondary/70">Timezone</div>
                <select
                  value={general.timezone}
                  onChange={(e) => setGeneral((p) => ({ ...p, timezone: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-secondary/20 bg-background px-3 text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  <option value="America/New_York">America/New_York</option>
                  <option value="America/Chicago">America/Chicago</option>
                  <option value="America/Los_Angeles">America/Los_Angeles</option>
                  <option value="Europe/London">Europe/London</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div className="space-y-2">
                <div className="text-sm font-semibold text-secondary/70">Logo</div>
                <div
                  className="rounded-2xl border border-dashed border-secondary/25 bg-secondary/5 p-5"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files?.[0];
                    if (f) setGeneral((p) => ({ ...p, logoFileName: f.name }));
                  }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">Drag & drop logo</div>
                      <div className="mt-1 text-xs text-secondary/60">
                        UI only (no real upload).
                      </div>
                      {general.logoFileName ? (
                        <div className="mt-2 text-xs text-secondary/80 font-semibold truncate">
                          Selected: {general.logoFileName}
                        </div>
                      ) : null}
                    </div>
                    <label className="shrink-0 inline-flex items-center justify-center h-10 px-4 rounded-xl bg-primary/10 border border-primary/20 text-primary font-semibold cursor-pointer hover:opacity-95">
                      Choose file
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) setGeneral((p) => ({ ...p, logoFileName: f.name }));
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-semibold text-secondary/70">Address</div>
                <textarea
                  value={general.address}
                  onChange={(e) => setGeneral((p) => ({ ...p, address: e.target.value }))}
                  className="min-h-[100px] w-full rounded-2xl border border-secondary/20 bg-background px-3 py-2 text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                />
                <div className="text-xs text-secondary/60">Used for invoices & receipts (demo).</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-semibold text-secondary/70">Currency</div>
                <select
                  value={general.currency}
                  onChange={(e) => setGeneral((p) => ({ ...p, currency: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-secondary/20 bg-background px-3 text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-semibold text-secondary/70">Preview</div>
                <div className="rounded-2xl border border-secondary/10 bg-white px-4 py-3">
                  <div className="text-sm font-bold tracking-tight">{general.name}</div>
                  <div className="mt-1 text-xs text-secondary/60 truncate">{general.address}</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="ghost" type="button" onClick={() => toast.pushToast({ variant: "info", title: "Tip", message: "Changes are mocked. Click Save to see feedback." })}>
                Preview tip
              </Button>
              <Button variant="primary" type="button" onClick={save}>
                {loadingConfig ? "Loading..." : "Save General"}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {tab === "menu" ? (
        <Card className="p-6 space-y-6">
          <div>
            <div className="text-base font-bold tracking-tight text-foreground">Menu</div>
            <div className="mt-1 text-sm text-secondary/60">Tax, service charges, and instructions.</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-secondary/10 bg-background p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-secondary/70">Default tax rate</div>
                  <div className="mt-1 text-2xl font-black tracking-tight text-foreground">{menuSettings.taxRate.toFixed(2)}%</div>
                </div>
                <Badge variant="neutral">Tax</Badge>
              </div>
              <input
                type="range"
                min={0}
                max={20}
                step={0.25}
                value={menuSettings.taxRate}
                onChange={(e) => setMenuSettings((p) => ({ ...p, taxRate: Number(e.target.value) }))}
                className="mt-4 w-full"
              />
              <div className="mt-2 text-xs text-secondary/60">Used for totals across QR ordering.</div>
            </div>

            <div className="rounded-2xl border border-secondary/10 bg-background p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-secondary/70">Service charge</div>
                  <div className="mt-1 text-2xl font-black tracking-tight text-foreground">{menuSettings.serviceCharge.toFixed(2)}%</div>
                </div>
                <Badge variant="neutral">Service</Badge>
              </div>
              <input
                type="range"
                min={0}
                max={15}
                step={0.25}
                value={menuSettings.serviceCharge}
                onChange={(e) => setMenuSettings((p) => ({ ...p, serviceCharge: Number(e.target.value) }))}
                className="mt-4 w-full"
              />
              <div className="mt-2 text-xs text-secondary/60">Optional percentage applied to orders.</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <div className="text-sm font-semibold text-secondary/70">Currency symbol</div>
              <input
                value={menuSettings.currencySymbol}
                onChange={(e) => setMenuSettings((p) => ({ ...p, currencySymbol: e.target.value }))}
                className="h-10 w-full rounded-lg border border-secondary/20 bg-background px-3 text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              />
            </div>

            <div className="rounded-2xl border border-secondary/10 bg-white px-4 py-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">Allow special instructions</div>
                <div className="mt-1 text-xs text-secondary/60">Let customers add notes per item.</div>
              </div>
              <Switch
                checked={menuSettings.allowSpecialInstructions}
                onChange={(n) => setMenuSettings((p) => ({ ...p, allowSpecialInstructions: n }))}
                label="Allow special instructions"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="primary" type="button" onClick={save}>
              Save Menu
            </Button>
          </div>
        </Card>
      ) : null}

      {tab === "printer" ? (
        <Card className="p-6 space-y-6">
          <div>
            <div className="text-base font-bold tracking-tight text-foreground">Printer</div>
            <div className="mt-1 text-sm text-secondary/60">Configure receipt printer connection.</div>
          </div>

          <div className="rounded-2xl border border-secondary/10 bg-background p-4 text-sm text-secondary/70">
            <div className="font-semibold text-secondary/80">Help</div>
            <div className="mt-1">
              For <span className="font-semibold">Bluetooth</span>: pair the printer with this computer&apos;s OS Bluetooth settings first, then enter the MAC address here (format: <span className="font-semibold">XX:XX:XX:XX:XX:XX</span>).
              {" "}For <span className="font-semibold">Network</span>: enter the printer&apos;s IP address (optionally with port like <span className="font-semibold">192.168.1.50:9100</span>).
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <div className="text-sm font-semibold text-secondary/70">Connection type</div>
              <select
                value={printer.connection_type}
                onChange={(e) => setPrinter((p) => ({ ...p, connection_type: e.target.value }))}
                className="h-10 w-full rounded-lg border border-secondary/20 bg-background px-3 text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                <option value="bluetooth">Bluetooth</option>
                <option value="network">Network</option>
                <option value="usb">USB</option>
              </select>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold text-secondary/70">Address</div>
              <input
                value={printer.address}
                onChange={(e) => setPrinter((p) => ({ ...p, address: e.target.value }))}
                placeholder="e.g. 192.168.1.50:9100 or XX:XX:XX:XX:XX:XX"
                className="h-10 w-full rounded-lg border border-secondary/20 bg-background px-3 text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold text-secondary/70">Paper width</div>
            <select
              value={printer.paper_width}
              onChange={(e) => setPrinter((p) => ({ ...p, paper_width: Number(e.target.value) }))}
              className="h-10 w-full rounded-lg border border-secondary/20 bg-background px-3 text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <option value={58}>58mm</option>
              <option value={80}>80mm</option>
            </select>
            <div className="text-xs text-secondary/60">
              {loadingPrinter ? "Loading printer config…" : "Used by the ESC/POS receipt formatter."}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              type="button"
              onClick={async () => {
                try {
                  const res = await fetch("/api/print/test", { method: "POST" });
                  const data = (await res.json()) as { success: boolean; error?: string };
                  if (!res.ok || !data.success) throw new Error(data.error ?? `Failed (${res.status})`);
                  toast.pushToast({ variant: "success", title: "Test print sent", message: "Check the printer output." });
                } catch (e) {
                  toast.pushToast({ variant: "error", title: "Test print failed", message: (e as Error).message });
                }
              }}
            >
              Test Print
            </Button>
            <Button variant="primary" type="button" onClick={save}>
              Save Printer
            </Button>
          </div>
        </Card>
      ) : null}

      {tab === "qr" ? (
        <Card className="p-6 space-y-6">
          <div>
            <div className="text-base font-bold tracking-tight text-foreground">QR & Ordering</div>
            <div className="mt-1 text-sm text-secondary/60">Control online ordering and table flow.</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-secondary/10 bg-white px-4 py-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">Online ordering</div>
                <div className="mt-1 text-xs text-secondary/60">Enable checkout via web/QR.</div>
              </div>
              <Switch
                checked={qrSettings.onlineOrderingEnabled}
                onChange={(n) => setQrSettings((p) => ({ ...p, onlineOrderingEnabled: n }))}
                label="Online ordering"
              />
            </div>

            <div className="rounded-2xl border border-secondary/10 bg-white px-4 py-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">Table-wise ordering</div>
                <div className="mt-1 text-xs text-secondary/60">Group orders by table number.</div>
              </div>
              <Switch
                checked={qrSettings.tableWiseOrdering}
                onChange={(n) => setQrSettings((p) => ({ ...p, tableWiseOrdering: n }))}
                label="Table-wise ordering"
              />
            </div>

            <div className="rounded-2xl border border-secondary/10 bg-white px-4 py-4 flex items-center justify-between gap-3 md:col-span-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">Auto-accept orders</div>
                <div className="mt-1 text-xs text-secondary/60">Kitchen automatically confirms incoming orders.</div>
              </div>
              <Switch
                checked={qrSettings.autoAcceptOrders}
                onChange={(n) => setQrSettings((p) => ({ ...p, autoAcceptOrders: n }))}
                label="Auto accept orders"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-secondary/10 bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-secondary/70">Estimated prep time</div>
                <div className="mt-1 text-2xl font-black tracking-tight text-foreground">{qrSettings.prepTimeMin} min</div>
              </div>
              <Badge variant="neutral">ETA</Badge>
            </div>
            <input
              type="range"
              min={5}
              max={60}
              step={1}
              value={qrSettings.prepTimeMin}
              onChange={(e) => setQrSettings((p) => ({ ...p, prepTimeMin: Number(e.target.value) }))}
              className="mt-4 w-full"
            />
            <div className="mt-2 text-xs text-secondary/60">Affects the customer confirmation screen.</div>
          </div>

          <div className="space-y-4 rounded-[2rem] border border-secondary/10 bg-white/78 p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="text-sm font-semibold text-foreground">GPS geofence enforcement</div>
                <div className="mt-1 text-xs text-secondary/60">
                  Block QR access and ordering unless the customer is physically inside your configured restaurant range.
                </div>
              </div>
              <Switch
                checked={qrSettings.gpsEnforcementEnabled}
                onChange={(n) => setQrSettings((p) => ({ ...p, gpsEnforcementEnabled: n }))}
                label="GPS geofence enforcement"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant={
                  qrSettings.gpsEnforcementEnabled && geofenceConfigured
                    ? "success"
                    : qrSettings.gpsEnforcementEnabled
                    ? "warning"
                    : "neutral"
                }
              >
                {qrSettings.gpsEnforcementEnabled && geofenceConfigured
                  ? "Configured and active"
                  : qrSettings.gpsEnforcementEnabled
                  ? "Enabled but incomplete"
                  : "Not enforcing"}
              </Badge>
              <span className="text-xs text-secondary/60">
                {qrSettings.gpsEnforcementEnabled && geofenceConfigured
                  ? "Customers must allow location access and stay inside the configured radius."
                  : qrSettings.gpsEnforcementEnabled
                  ? "Add latitude, longitude, and radius before GPS blocking starts."
                  : "Public QR ordering stays open until you enable this."}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <div className="text-sm font-semibold text-secondary/70">Latitude</div>
                <input
                  value={qrSettings.gpsLatitude}
                  onChange={(e) => setQrSettings((p) => ({ ...p, gpsLatitude: e.target.value }))}
                  placeholder="23.810332"
                  className="h-10 w-full rounded-lg border border-secondary/20 bg-background px-3 text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-semibold text-secondary/70">Longitude</div>
                <input
                  value={qrSettings.gpsLongitude}
                  onChange={(e) => setQrSettings((p) => ({ ...p, gpsLongitude: e.target.value }))}
                  placeholder="90.412518"
                  className="h-10 w-full rounded-lg border border-secondary/20 bg-background px-3 text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-semibold text-secondary/70">Radius in meters</div>
                <input
                  value={qrSettings.gpsRadiusMeters}
                  onChange={(e) => setQrSettings((p) => ({ ...p, gpsRadiusMeters: e.target.value }))}
                  placeholder="75"
                  className="h-10 w-full rounded-lg border border-secondary/20 bg-background px-3 text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap rounded-2xl border border-secondary/10 bg-background p-4">
              <div>
                <div className="text-sm font-semibold text-secondary/75">Set outlet center from this device</div>
                <div className="mt-1 text-xs text-secondary/60">
                  Stand near the middle of the restaurant and capture the current coordinates.
                </div>
              </div>
              <Button variant="secondary" type="button" onClick={() => void requestCurrentLocation()}>
                Use Current Location
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="primary" type="button" onClick={save}>
              Save QR & Ordering
            </Button>
          </div>
        </Card>
      ) : null}

      {tab === "notifications" ? (
        <Card className="p-6 space-y-6">
          <div>
            <div className="text-base font-bold tracking-tight text-foreground">Notifications</div>
            <div className="mt-1 text-sm text-secondary/60">Keep staff in the loop with alerts.</div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-secondary/10 bg-white px-4 py-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-foreground">Email alerts</div>
                <div className="mt-1 text-xs text-secondary/60">Send order status emails to managers.</div>
              </div>
              <Switch
                checked={notifSettings.emailAlerts}
                onChange={(n) => setNotifSettings((p) => ({ ...p, emailAlerts: n }))}
                label="Email alerts"
              />
            </div>

            <div className="rounded-2xl border border-secondary/10 bg-white px-4 py-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-foreground">Sound alerts</div>
                <div className="mt-1 text-xs text-secondary/60">Play a short sound on new orders.</div>
              </div>
              <Switch
                checked={notifSettings.soundAlerts}
                onChange={(n) => setNotifSettings((p) => ({ ...p, soundAlerts: n }))}
                label="Sound alerts"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="primary" type="button" onClick={save}>
              Save Notifications
            </Button>
          </div>
        </Card>
      ) : null}

      {tab === "billing" ? (
        <Card className="p-6 space-y-6">
          <div>
            <div className="text-base font-bold tracking-tight text-foreground">Billing</div>
            <div className="mt-1 text-sm text-secondary/60">Choose the plan that fits your restaurant.</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: "Free", price: "$0", features: ["Basic dashboard", "QR menu (limited)", "Email notifications"] , variant: "neutral" as const},
              { name: "Pro", price: "$49", features: ["Full QR menus", "Live staff Kanban", "Exports + analytics", "Priority support"], variant: "primary" as const},
              { name: "Enterprise", price: "Let’s talk", features: ["Multi-location controls", "Custom roles + SSO", "Dedicated onboarding"], variant: "neutral" as const},
            ].map((p) => {
              const isCurrent = p.name === currentPlan;
              return (
                <div
                  key={p.name}
                  className={[
                    "rounded-3xl border p-5 space-y-4",
                    isCurrent ? "border-primary/40 bg-primary/5" : "border-secondary/10 bg-white/70",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-secondary/70">{p.name}</div>
                      <div className="mt-1 text-3xl font-black tracking-tight text-foreground">{p.price}</div>
                    </div>
                    {isCurrent ? <Badge variant="info">Current</Badge> : <Badge variant="neutral">Tier</Badge>}
                  </div>
                  <ul className="space-y-2 text-sm text-secondary/70">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                        <span className="leading-6">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={isCurrent ? "secondary" : "primary"}
                    type="button"
                    className="w-full"
                    onClick={() => toast.pushToast({ variant: "info", title: "Upgrade flow (demo)", message: `Upgrade CTA clicked for ${p.name}.` })}
                  >
                    {isCurrent ? "Manage plan" : "Upgrade"}
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => toast.pushToast({ variant: "success", title: "Billing updated", message: "Mock billing changes saved." })}>
              Save Billing
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
