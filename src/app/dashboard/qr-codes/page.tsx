"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Badge, Button, Card } from "@/components/ui";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useTableStore } from "@/store/tableStore";

function qrImageUrl(url: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`;
}

function qrImageUrlLarge(url: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
}

type QrUrlMap = Record<string, string>;

export default function QrCodesPage() {
  const toast = useToast();
  const tables = useTableStore((state) => state.tables);
  const loading = useTableStore((state) => state.loading);
  const storeError = useTableStore((state) => state.error);
  const fetchTables = useTableStore((state) => state.fetchTables);

  const [urlByTableId, setUrlByTableId] = React.useState<QrUrlMap>({});
  const [loadingUrls, setLoadingUrls] = React.useState(false);
  const [viewer, setViewer] = React.useState<{
    tableId: string;
    tableName: string;
    url: string;
  } | null>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

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

  React.useEffect(() => {
    if (sortedTables.length === 0) return;

    let cancelled = false;

    const run = async () => {
      setLoadingUrls(true);
      try {
        const entries = await Promise.all(
          sortedTables.map(async (table) => {
            const res = await fetch(`/api/qr/${table.id}?tableName=${encodeURIComponent(table.name)}`, {
              cache: "no-store",
              credentials: "include",
            });
            const data = (await res.json()) as { url?: string; error?: string };
            if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);
            if (!data.url) throw new Error("Missing QR URL");
            return [String(table.id), data.url] as const;
          })
        );

        if (cancelled) return;
        setUrlByTableId(
          Object.fromEntries(entries) as QrUrlMap
        );
      } catch (e) {
        if (cancelled) return;
        toast.pushToast({
          variant: "error",
          title: "QR load failed",
          message: (e as Error).message,
        });
      } finally {
        if (!cancelled) setLoadingUrls(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [sortedTables, toast]);

  async function handleCopyLink(tableName: string, url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.pushToast({
        variant: "success",
        title: "Link copied",
        message: `${tableName} link copied to clipboard.`,
      });
    } catch {
      toast.pushToast({
        variant: "error",
        title: "Copy failed",
        message: "Clipboard access was denied.",
      });
    }
  }

  async function handleDownload(tableName: string, url: string) {
    try {
      const res = await fetch(qrImageUrl(url));
      if (!res.ok) throw new Error("Could not fetch QR image");
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = `${tableName.replace(/\s+/g, "-")}-qr.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(href);
      toast.pushToast({
        variant: "success",
        title: "Download started",
        message: `${tableName} QR is downloading.`,
      });
    } catch (e) {
      toast.pushToast({
        variant: "error",
        title: "Download failed",
        message: (e as Error).message,
      });
    }
  }

  async function handleViewerDownload(tableName: string, url: string) {
    try {
      const res = await fetch(qrImageUrlLarge(url));
      if (!res.ok) throw new Error("Could not fetch QR image");
      const blob = await res.blob();
      const bitmap = await createImageBitmap(blob);

      const labelHeight = 66;
      const canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 300 + labelHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");

      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, 300, 300);

      ctx.fillStyle = "#111827"; // slate-900
      ctx.font = "700 22px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(tableName, 150, 300 + 30);

      const pngBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (!b) reject(new Error("Could not generate PNG"));
          else resolve(b);
        }, "image/png");
      });

      const href = URL.createObjectURL(pngBlob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = `${tableName.replace(/\s+/g, "-")}-qr.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(href);
      toast.pushToast({
        variant: "success",
        title: "Download started",
        message: `${tableName} QR is downloading.`,
      });
    } catch (e) {
      toast.pushToast({
        variant: "error",
        title: "Download failed",
        message: (e as Error).message,
      });
    }
  }

  async function handleViewerPrint(tableName: string, url: string) {
    try {
      const w = window.open("", "_blank", "noopener,noreferrer,width=600,height=700");
      if (!w) throw new Error("Popup was blocked.");
      const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${tableName} QR</title>
    <style>
      @media print {
        body { margin: 0; }
      }
      html, body { height: 100%; }
      body {
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
        background: #fff;
      }
      .wrap { text-align: center; }
      img { width: 300px; height: 300px; }
      .name { font-size: 24px; font-weight: 800; margin-top: 18px; }
      @media screen { .hint { margin-top: 10px; color: #6B7280; font-size: 12px; } }
      @media print { .hint { display: none; } }
    </style>
  </head>
  <body>
    <div class="wrap">
      <img src="${qrImageUrlLarge(url)}" alt="QR code" />
      <div class="name">${tableName}</div>
      <div class="hint">Printing…</div>
    </div>
    <script>
      window.onload = () => { window.print(); };
    </script>
  </body>
</html>`;
      w.document.open();
      w.document.write(html);
      w.document.close();
    } catch (e) {
      toast.pushToast({
        variant: "error",
        title: "Print failed",
        message: (e as Error).message,
      });
    }
  }

  React.useEffect(() => {
    if (!viewer) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setViewer(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [viewer]);

  React.useEffect(() => {
    if (!viewer) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow || "";
    };
  }, [viewer]);

  const pageLoading = loading || loadingUrls;

  return (
    <div className="space-y-6">
      <PageHeader
        title="QR Codes"
        subtitle="Each table QR points to the public restaurant/outlet menu URL."
      />

      {pageLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="p-5">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="mt-4 h-44 w-full rounded-2xl" />
              <Skeleton className="mt-4 h-4 w-full" />
              <Skeleton className="mt-4 h-10 w-full" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedTables.map((table) => {
            const url = urlByTableId[table.id] ?? "";
            return (
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
                  <Badge variant="success">Live</Badge>
                </div>

                <div className="mt-4 flex justify-center rounded-2xl border border-secondary/10 bg-background p-4">
                  {url ? (
                    <button
                      type="button"
                      className="group relative h-[180px] w-[180px] overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      onClick={() => setViewer({ tableId: table.id, tableName: table.name, url })}
                      aria-label={`Open QR viewer for ${table.name}`}
                    >
                      <img
                        src={qrImageUrl(url)}
                        alt={`QR code for ${table.name}`}
                        width={180}
                        height={180}
                        className="h-[180px] w-[180px]"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-lg opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                          🔍
                        </div>
                      </div>
                    </button>
                  ) : (
                    <div className="flex h-[180px] w-[180px] items-center justify-center text-sm text-secondary/60">
                      Missing QR URL
                    </div>
                  )}
                </div>

                <div className="mt-4 rounded-2xl border border-secondary/10 bg-background px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-secondary/60">
                    Menu URL
                  </div>
                  <div className="mt-1 break-all text-sm text-foreground">{url}</div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    disabled={!url}
                    onClick={() => void handleCopyLink(table.name, url)}
                  >
                    Copy Link
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1"
                    disabled={!url}
                    onClick={() => void handleDownload(table.name, url)}
                  >
                    Download
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {viewer && mounted
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-4"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setViewer(null);
              }}
            >
              <div className="relative w-[90vw] max-w-[400px] max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-10">
                <button
                  type="button"
                  onClick={() => setViewer(null)}
                  className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-secondary/15 text-secondary hover:bg-secondary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  aria-label="Close QR viewer"
                >
                  <span aria-hidden="true" className="text-lg leading-none">
                    ×
                  </span>
                </button>

                <div className="flex flex-col items-center text-center">
                  <img
                    src={qrImageUrlLarge(viewer.url)}
                    alt={`QR code for ${viewer.tableName}`}
                    width={300}
                    height={300}
                    className="h-[300px] w-[300px] max-w-full"
                  />
                  <div className="mt-6 text-2xl font-black tracking-tight text-foreground">
                    {viewer.tableName}
                  </div>
                  <div className="mt-2 max-w-full break-all font-mono text-xs text-secondary/60">
                    {viewer.url}
                  </div>

                  <div className="mt-8 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() => void handleViewerDownload(viewer.tableName, viewer.url)}
                    >
                      Download PNG
                    </Button>
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() => void handleCopyLink(viewer.tableName, viewer.url)}
                    >
                      Copy Link
                    </Button>
                    <Button
                      variant="primary"
                      type="button"
                      onClick={() => void handleViewerPrint(viewer.tableName, viewer.url)}
                    >
                      Print
                    </Button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
