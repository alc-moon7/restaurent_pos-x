"use client";

import * as React from "react";
import { Badge, Button, Modal } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { Card, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";

type StaffRole = "manager" | "waiter" | "kitchen";

type StaffRecord = {
  id: string;
  displayName: string;
  role: StaffRole;
  email: string;
  phone: string;
  isActive: boolean;
  lastActiveAt: string; // ISO
  pinCode: string;
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function roleLabel(role: StaffRole) {
  switch (role) {
    case "manager":
      return "Manager";
    case "waiter":
      return "Waiter";
    case "kitchen":
      return "Kitchen";
  }
}

function roleBadgeVariant(role: StaffRole): "success" | "warning" | "danger" | "info" | "neutral" {
  switch (role) {
    case "manager":
      return "info";
    case "waiter":
      return "success";
    case "kitchen":
      return "warning";
  }
}

export default function StaffPage() {
  const toast = useToast();

  const [staff, setStaff] = React.useState<StaffRecord[]>(() => {
    const now = Date.now();
    return [
      {
        id: "st-1",
        displayName: "Ava Martinez",
        role: "manager",
        email: "ava@bistroaurora.com",
        phone: "(555) 013-2041",
        isActive: true,
        lastActiveAt: new Date(now - 1000 * 60 * 12).toISOString(),
        pinCode: "4812",
      },
      {
        id: "st-2",
        displayName: "Noah Johnson",
        role: "waiter",
        email: "noah@bistroaurora.com",
        phone: "(555) 017-3302",
        isActive: true,
        lastActiveAt: new Date(now - 1000 * 60 * 38).toISOString(),
        pinCode: "2198",
      },
      {
        id: "st-3",
        displayName: "Mia Chen",
        role: "kitchen",
        email: "mia@bistroaurora.com",
        phone: "(555) 010-7781",
        isActive: true,
        lastActiveAt: new Date(now - 1000 * 60 * 65).toISOString(),
        pinCode: "7720",
      },
      {
        id: "st-4",
        displayName: "Liam Thompson",
        role: "waiter",
        email: "liam@bistroaurora.com",
        phone: "(555) 011-9920",
        isActive: false,
        lastActiveAt: new Date(now - 1000 * 60 * 60 * 36).toISOString(),
        pinCode: "1056",
      },
    ];
  });

  const [modalOpen, setModalOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"add" | "edit">("add");
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const [formName, setFormName] = React.useState("");
  const [formRole, setFormRole] = React.useState<StaffRole>("waiter");
  const [formEmail, setFormEmail] = React.useState("");
  const [formPhone, setFormPhone] = React.useState("");
  const [formActive, setFormActive] = React.useState(true);
  const [formLastActiveAt, setFormLastActiveAt] = React.useState("");
  const [formPin, setFormPin] = React.useState("");

  const openAdd = () => {
    setMode("add");
    setActiveId(null);
    setFormName("");
    setFormRole("waiter");
    setFormEmail("");
    setFormPhone("");
    setFormActive(true);
    setFormLastActiveAt(new Date().toISOString());
    setFormPin("");
    setModalOpen(true);
  };

  const openEdit = (s: StaffRecord) => {
    setMode("edit");
    setActiveId(s.id);
    setFormName(s.displayName);
    setFormRole(s.role);
    setFormEmail(s.email);
    setFormPhone(s.phone);
    setFormActive(s.isActive);
    setFormLastActiveAt(s.lastActiveAt);
    setFormPin(s.pinCode);
    setModalOpen(true);
  };

  const saveStaff = () => {
    const name = formName.trim();
    if (!name) {
      toast.pushToast({ variant: "error", title: "Missing name", message: "Staff name is required." });
      return;
    }
    if (!formEmail.trim() || !formEmail.includes("@")) {
      toast.pushToast({ variant: "error", title: "Invalid email", message: "Enter a valid email address." });
      return;
    }
    if (!/^\d{4,8}$/.test(formPin.trim())) {
      toast.pushToast({ variant: "error", title: "Invalid PIN", message: "PIN must be 4–8 digits." });
      return;
    }

    const now = new Date().toISOString();
    if (mode === "add") {
      const id = `st-${Date.now()}`;
      const rec: StaffRecord = {
        id,
        displayName: name,
        role: formRole,
        email: formEmail.trim(),
        phone: formPhone.trim(),
        isActive: formActive,
        lastActiveAt: formLastActiveAt || now,
        pinCode: formPin.trim(),
      };
      setStaff((prev) => [rec, ...prev]);
      toast.pushToast({ variant: "success", title: "Staff added", message: `${rec.displayName} is ready for POS access.` });
    } else if (activeId) {
      setStaff((prev) =>
        prev.map((s) =>
          s.id === activeId
            ? {
                ...s,
                displayName: name,
                role: formRole,
                email: formEmail.trim(),
                phone: formPhone.trim(),
                isActive: formActive,
                lastActiveAt: formLastActiveAt || now,
                pinCode: formPin.trim(),
              }
            : s
        )
      );
      toast.pushToast({ variant: "success", title: "Staff updated", message: "Changes saved successfully." });
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xl font-bold tracking-tight text-foreground">Staff Management</div>
          <div className="mt-1 text-sm text-secondary/70">Roles, POS access, and activity.</div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={openAdd}>
            Add Staff
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="px-6 pt-6">
          <div className="text-base font-bold tracking-tight text-foreground">Team</div>
          <div className="mt-1 text-sm text-secondary/60">Manage staff accounts and permissions.</div>
        </div>

        <div className="p-6 pt-4">
          {staff.length === 0 ? (
            <EmptyState
              title="No staff accounts"
              description="Add team members to enable POS operations."
              cta={{ label: "Add Staff", variant: "primary" }}
              onCta={openAdd}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                          <div className="font-black text-xs text-primary">{initials(s.displayName)}</div>
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground truncate">{s.displayName}</div>
                          <div className="text-xs text-secondary/60">{s.id}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant(s.role)}>{roleLabel(s.role)}</Badge>
                    </TableCell>
                    <TableCell className="text-secondary/70">{s.email}</TableCell>
                    <TableCell className="text-secondary/70">{s.phone}</TableCell>
                    <TableCell>
                      <Badge variant={s.isActive ? "success" : "neutral"}>{s.isActive ? "Active" : "Disabled"}</Badge>
                    </TableCell>
                    <TableCell className="text-secondary/70">
                      {new Date(s.lastActiveAt).toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="secondary" size="sm" type="button" onClick={() => openEdit(s)}>
                          Edit
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>

      <Modal
        open={modalOpen}
        title={mode === "add" ? "Add Staff" : "Edit Staff"}
        onClose={() => setModalOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="button" onClick={saveStaff}>
              Save
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-semibold text-secondary/70">Name</div>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="h-10 w-full rounded-lg border border-secondary/20 bg-background px-3 text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                placeholder="e.g. Sarah Patel"
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-semibold text-secondary/70">Role</div>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as StaffRole)}
                className="h-10 w-full rounded-lg border border-secondary/20 bg-background px-3 text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                <option value="manager">Manager</option>
                <option value="waiter">Waiter</option>
                <option value="kitchen">Kitchen</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-semibold text-secondary/70">Email</div>
              <input
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="h-10 w-full rounded-lg border border-secondary/20 bg-background px-3 text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                placeholder="name@restaurant.com"
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-semibold text-secondary/70">Phone</div>
              <input
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                className="h-10 w-full rounded-lg border border-secondary/20 bg-background px-3 text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                placeholder="(555) 010-1234"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-semibold text-secondary/70">PIN code</div>
              <input
                value={formPin}
                onChange={(e) => setFormPin(e.target.value)}
                inputMode="numeric"
                className="h-10 w-full rounded-lg border border-secondary/20 bg-background px-3 text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                placeholder="4–8 digits"
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-semibold text-secondary/70">Status</div>
              <select
                value={formActive ? "active" : "inactive"}
                onChange={(e) => setFormActive(e.target.value === "active")}
                className="h-10 w-full rounded-lg border border-secondary/20 bg-background px-3 text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                <option value="active">Active</option>
                <option value="inactive">Disabled</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold text-secondary/70">Last active (demo)</div>
            <input
              type="datetime-local"
              value={(() => {
                const d = formLastActiveAt ? new Date(formLastActiveAt) : new Date();
                const pad = (n: number) => String(n).padStart(2, "0");
                return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
              })()}
              onChange={(e) => setFormLastActiveAt(new Date(e.target.value).toISOString())}
              className="h-10 w-full rounded-lg border border-secondary/20 bg-background px-3 text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

