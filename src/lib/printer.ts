import "server-only";

import escpos from "escpos";
import Network from "escpos-network";
import net from "node:net";
import { getPrinterConfig, getRestaurantConfig, type OrderWithDetails } from "@/lib/db-helpers";
import { formatCurrency, padEnd, padStart } from "@/lib/receipt-formatter";

// Attach the device plugin (required by some escpos versions).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(escpos as any).Network = Network;

export type PrintResult = { success: true } | { success: false; error: string };

type PrinterConnectionType = "bluetooth" | "usb" | "network";

function colsForPaperWidth(paperWidth: number) {
  // Common defaults: 58mm ≈ 32 cols, 80mm ≈ 48 cols
  return paperWidth >= 80 ? 48 : 32;
}

function parseHostPort(address: string, defaultPort: number) {
  const trimmed = address.trim();
  const m = trimmed.match(/^(.+):(\d+)$/);
  if (m) return { host: m[1], port: Number(m[2]) };
  return { host: trimmed, port: defaultPort };
}

const ESC = 0x1b;
const GS = 0x1d;

function escposInit() {
  return Buffer.from([ESC, 0x40]); // ESC @
}
function escposBold(on: boolean) {
  return Buffer.from([ESC, 0x45, on ? 1 : 0]); // ESC E n
}
function escposAlign(n: 0 | 1 | 2) {
  return Buffer.from([ESC, 0x61, n]); // ESC a n
}
function escposCut() {
  return Buffer.from([GS, 0x56, 0x00]); // GS V 0
}
function lf(lines = 1) {
  return Buffer.from("\n".repeat(Math.max(1, lines)), "utf8");
}
function text(s: string) {
  return Buffer.from(s, "utf8");
}

function hr(cols: number, ch = "-") {
  return `${ch.repeat(cols)}\n`;
}

function buildKitchenTicket(order: OrderWithDetails, cols: number) {
  const tableName = order.tableName ?? (order.table_id ? `Table ${order.table_id}` : "—");
  const ts = new Date(order.created_at).toLocaleString();

  const parts: Buffer[] = [];
  parts.push(escposInit());
  parts.push(escposAlign(1));
  parts.push(escposBold(true));
  parts.push(text("KITCHEN TICKET"));
  parts.push(escposBold(false));
  parts.push(lf(1));
  parts.push(escposAlign(0));
  parts.push(text(hr(cols)));
  parts.push(escposBold(true));
  parts.push(text(`Table: ${tableName}${" ".repeat(2)}#${order.id}\n`));
  parts.push(escposBold(false));
  parts.push(text(`${ts}\n`));
  parts.push(text(hr(cols)));

  for (const it of order.items) {
    const name = it.itemName ?? `Item ${it.menu_item_id ?? ""}`.trim();
    parts.push(text(`${it.quantity}x ${name}\n`));
    if (it.special_note?.trim()) {
      parts.push(text(`   Note: ${it.special_note.trim()}\n`));
    }
  }

  parts.push(text(hr(cols)));
  if (order.notes?.trim()) {
    parts.push(text(`Notes: ${order.notes.trim()}\n`));
  }
  parts.push(text("=".repeat(cols) + "\n"));
  parts.push(lf(2));
  parts.push(escposCut());
  return Buffer.concat(parts);
}

function buildCustomerInvoice(order: OrderWithDetails, cols: number) {
  const cfg = getRestaurantConfig();
  const restaurantName = cfg?.name ?? "My Restaurant";
  const address = cfg?.address ?? "";
  const currency = cfg?.currency ?? "USD";
  const taxRate = cfg?.tax_rate ?? 10;

  const tableName = order.tableName ?? (order.table_id ? `Table ${order.table_id}` : "—");
  const ts = new Date(order.created_at).toLocaleString();

  const subtotal = order.items.reduce((acc, it) => acc + it.unit_price * it.quantity, 0);
  const tax = Math.round(subtotal * (taxRate / 100) * 100) / 100;
  const total = subtotal + tax;

  const itemCol = Math.max(12, cols - (5 + 2 + 10)); // name + (Qty+spaces) + price

  const parts: Buffer[] = [];
  parts.push(escposInit());
  parts.push(escposAlign(1));
  parts.push(text("=".repeat(cols) + "\n"));
  parts.push(escposBold(true));
  parts.push(text(restaurantName + "\n"));
  parts.push(escposBold(false));
  if (address) parts.push(text(address + "\n"));
  parts.push(text("=".repeat(cols) + "\n"));
  parts.push(escposAlign(0));
  parts.push(text(`Table: ${tableName}    Invoice #${order.id}\n`));
  parts.push(text(`Date: ${ts}\n`));
  parts.push(text(hr(cols)));
  parts.push(escposBold(true));
  parts.push(text(padEnd("Item", itemCol) + "  " + padStart("Qty", 3) + "  " + padStart("Price", 8) + "\n"));
  parts.push(escposBold(false));
  parts.push(text(hr(cols)));

  for (const it of order.items) {
    const name = it.itemName ?? `Item ${it.menu_item_id ?? ""}`.trim();
    const linePrice = formatCurrency(it.unit_price * it.quantity, currency);
    parts.push(
      text(
        padEnd(name, itemCol) +
          "  " +
          padStart(String(it.quantity), 3) +
          "  " +
          padStart(linePrice, 8) +
          "\n"
      )
    );
  }

  parts.push(text(hr(cols)));
  const fmt = (n: number) => formatCurrency(n, currency);
  parts.push(text(padEnd("Subtotal:", cols - 10) + padStart(fmt(subtotal), 10) + "\n"));
  parts.push(text(padEnd(`Tax (${taxRate}%):`, cols - 10) + padStart(fmt(tax), 10) + "\n"));
  parts.push(text("=".repeat(cols) + "\n"));
  parts.push(escposBold(true));
  parts.push(text(padEnd("TOTAL:", cols - 10) + padStart(fmt(total), 10) + "\n"));
  parts.push(escposBold(false));
  parts.push(text("=".repeat(cols) + "\n"));
  parts.push(escposAlign(1));
  parts.push(text("Thank you for dining with us!\n"));
  parts.push(lf(2));
  parts.push(escposCut());
  return Buffer.concat(parts);
}

async function writeToRawSocket(host: string, port: number, payload: Buffer) {
  await new Promise<void>((resolve, reject) => {
    const socket = new net.Socket();
    socket.setTimeout(8000);
    socket.once("error", reject);
    socket.once("timeout", () => reject(new Error("Printer connection timed out.")));
    socket.connect(port, host, () => {
      socket.write(payload, (err) => {
        if (err) return reject(err);
        socket.end();
        resolve();
      });
    });
  });
}

async function sendToPrinter(payload: Buffer): Promise<PrintResult> {
  try {
    const cfg = getPrinterConfig();
    const type = (cfg?.connection_type ?? "bluetooth") as PrinterConnectionType;
    const address = (cfg?.address ?? "").trim();

    if (!address) return { success: false, error: "Printer address is not configured." };

    // For now, we treat bluetooth/usb as a raw TCP endpoint.
    // Many POS printers expose a TCP raw port (usually 9100). If your address is "IP:PORT", we use that.
    // If you enter a Bluetooth MAC here, raw TCP will fail (expected) — the server will return a clear error.
    const { host, port } = parseHostPort(address, 9100);

    if (type === "network") {
      await writeToRawSocket(host, port, payload);
      return { success: true };
    }

    if (type === "bluetooth" || type === "usb") {
      await writeToRawSocket(host, port, payload);
      return { success: true };
    }

    return { success: false, error: `Unsupported connection_type: ${type}` };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function printKitchenTicket(order: OrderWithDetails): Promise<PrintResult> {
  try {
    const cfg = getPrinterConfig();
    const cols = colsForPaperWidth(cfg?.paper_width ?? 58);
    const payload = buildKitchenTicket(order, cols);
    return await sendToPrinter(payload);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function printCustomerInvoice(order: OrderWithDetails): Promise<PrintResult> {
  try {
    const cfg = getPrinterConfig();
    const cols = colsForPaperWidth(cfg?.paper_width ?? 58);
    const payload = buildCustomerInvoice(order, cols);
    return await sendToPrinter(payload);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function testPrint(): Promise<PrintResult> {
  try {
    const cfg = getRestaurantConfig();
    const name = cfg?.name ?? "My Restaurant";
    const now = new Date().toLocaleString();
    const payload = Buffer.concat([
      escposInit(),
      escposAlign(1),
      escposBold(true),
      text("TEST PRINT\n"),
      escposBold(false),
      lf(1),
      text(name + "\n"),
      text(now + "\n"),
      lf(2),
      escposCut(),
    ]);
    return await sendToPrinter(payload);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

