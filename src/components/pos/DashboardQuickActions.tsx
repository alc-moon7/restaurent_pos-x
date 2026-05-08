"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";

export function DashboardQuickActions() {
  const router = useRouter();

  return (
    <Card className="gradient-aqua">
      <div className="px-6 pt-6">
        <div className="pill-label">Quick actions</div>
        <div className="mt-4 text-xl font-black tracking-tight text-foreground">Keep the floor running</div>
        <div className="mt-1 text-sm text-secondary/65">Use the most common cloud actions in one tap.</div>
      </div>
      <div className="px-6 py-4">
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="primary"
            className="justify-center"
            type="button"
            onClick={() => router.push("/admin/orders?action=new")}
          >
            New Order
          </Button>
          <Button
            variant="secondary"
            className="justify-center"
            type="button"
            onClick={() => router.push("/admin/menu?action=add")}
          >
            Add Item
          </Button>
          <Button
            variant="ghost"
            className="justify-center"
            type="button"
            onClick={() => router.push("/admin/tables")}
          >
            Generate QR
          </Button>
          <Button
            variant="ghost"
            className="justify-center"
            type="button"
            onClick={() => router.push("/admin/reports")}
          >
            Reports
          </Button>
        </div>
      </div>
    </Card>
  );
}
