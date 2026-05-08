"use client";

import * as React from "react";
import { Button, Card, Input, Modal } from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useTableStore, type ApiTable } from "@/store/tableStore";

function statusBadge(status: ApiTable["status"]) {
  switch (status) {
    case "available":
      return "border-success/30 bg-success/15 text-success";
    case "occupied":
      return "border-primary/30 bg-primary/15 text-primary";
    case "reserved":
      return "border-info/30 bg-info/15 text-info";
  }
}

export default function TablesPage() {
  const toast = useToast();
  const tables = useTableStore((state) => state.tables);
  const loading = useTableStore((state) => state.loading);
  const storeError = useTableStore((state) => state.error);
  const fetchTables = useTableStore((state) => state.fetchTables);
  const addTable = useTableStore((state) => state.addTable);
  const deleteTable = useTableStore((state) => state.deleteTable);

  const [tableModalOpen, setTableModalOpen] = React.useState(false);
  const [tableName, setTableName] = React.useState("");
  const [capacity, setCapacity] = React.useState("4");
  const [tableError, setTableError] = React.useState<string | null>(null);
  const [tableSubmitting, setTableSubmitting] = React.useState(false);

  const [deleteTarget, setDeleteTarget] = React.useState<ApiTable | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    void fetchTables();
  }, [fetchTables]);

  React.useEffect(() => {
    if (!storeError) return;
    toast.pushToast({
      variant: "error",
      title: "Table load failed",
      message: storeError,
    });
  }, [storeError, toast]);

  const sortedTables = React.useMemo(
    () => tables.slice().sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
    [tables]
  );

  function openAddTableModal() {
    setTableName(`Table ${tables.length + 1}`);
    setCapacity("4");
    setTableError(null);
    setTableModalOpen(true);
  }

  async function handleAddTable(event: React.FormEvent) {
    event.preventDefault();
    const trimmedName = tableName.trim();
    const parsedCapacity = Number(capacity);

    if (!trimmedName) {
      setTableError("Table name is required.");
      return;
    }

    if (!Number.isFinite(parsedCapacity) || parsedCapacity <= 0) {
      setTableError("Capacity must be at least 1.");
      return;
    }

    setTableSubmitting(true);
    setTableError(null);
    try {
      const created = await addTable({
        name: trimmedName,
        capacity: Math.floor(parsedCapacity),
      });
      toast.pushToast({
        variant: "success",
        title: "Table added",
        message: `${created.name} is ready.`,
      });
      setTableModalOpen(false);
    } catch (e) {
      const message = (e as Error).message;
      setTableError(message);
      toast.pushToast({
        variant: "error",
        title: "Table failed",
        message,
      });
    } finally {
      setTableSubmitting(false);
    }
  }

  async function handleDeleteTable() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTable(deleteTarget.id);
      toast.pushToast({
        variant: "success",
        title: "Table deleted",
        message: `${deleteTarget.name} was removed.`,
      });
      setDeleteTarget(null);
    } catch (e) {
      toast.pushToast({
        variant: "error",
        title: "Delete failed",
        message: (e as Error).message,
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xl font-bold tracking-tight text-foreground">Tables</div>
          <div className="mt-1 text-sm text-secondary/70">
            Real table list and statuses from SQLite.
          </div>
        </div>
        <Button variant="primary" onClick={openAddTableModal}>
          Add Table
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="p-5">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="mt-3 h-8 w-24" />
              <Skeleton className="mt-4 h-10 w-full" />
            </Card>
          ))}
        </div>
      ) : sortedTables.length === 0 ? (
        <EmptyState
          title="No tables yet"
          description="Add your first table to start taking orders."
          cta={{ label: "Add Table", variant: "primary" }}
          onCta={openAddTableModal}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedTables.map((table) => (
            <Card key={table.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-bold tracking-tight text-foreground">
                    {table.name}
                  </div>
                  <div className="mt-1 text-sm text-secondary/60">
                    Capacity: {table.capacity}
                  </div>
                </div>
                <span
                  className={[
                    "inline-flex rounded-full border px-3 py-1 text-xs font-bold",
                    statusBadge(table.status),
                  ].join(" ")}
                >
                  {table.status}
                </span>
              </div>

              <div className="mt-4 rounded-2xl border border-secondary/10 bg-background px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-secondary/60">
                  Current status
                </div>
                <div className="mt-1 text-sm text-secondary/80">
                  {table.status === "available"
                    ? "Ready for guests."
                    : table.status === "occupied"
                    ? "Currently serving guests."
                    : "Reserved for a guest."}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Button
                  variant="danger"
                  size="sm"
                  className="flex-1"
                  onClick={() => setDeleteTarget(table)}
                >
                  Delete Table
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={tableModalOpen}
        title="Add Table"
        onClose={() => {
          if (tableSubmitting) return;
          setTableModalOpen(false);
        }}
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              type="button"
              disabled={tableSubmitting}
              onClick={() => setTableModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="add-table-form"
              disabled={tableSubmitting}
            >
              {tableSubmitting ? "Saving..." : "Save Table"}
            </Button>
          </div>
        }
      >
        <form id="add-table-form" onSubmit={handleAddTable} className="space-y-4">
          <Input
            label="Table Name"
            value={tableName}
            onChange={(event) => {
              setTableName(event.target.value);
              setTableError(null);
            }}
            placeholder="e.g. Table 5"
          />
          <Input
            label="Capacity"
            value={capacity}
            onChange={(event) => {
              setCapacity(event.target.value);
              setTableError(null);
            }}
            inputMode="numeric"
            placeholder="e.g. 4"
          />

          {tableError ? (
            <div className="rounded-2xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger">
              {tableError}
            </div>
          ) : null}
        </form>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        title="Delete Table?"
        onClose={() => {
          if (deleting) return;
          setDeleteTarget(null);
        }}
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              type="button"
              disabled={deleting}
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              type="button"
              disabled={deleting}
              onClick={() => void handleDeleteTable()}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="text-sm text-secondary/70">
            {deleteTarget ? `Delete ${deleteTarget.name}?` : ""}
          </div>
        </div>
      </Modal>
    </div>
  );
}
