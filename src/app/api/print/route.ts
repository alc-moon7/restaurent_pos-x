import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getOrderById } from "@/lib/db-helpers";
import { printCustomerInvoice, printKitchenTicket } from "@/lib/printer";

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { type?: "kitchen" | "invoice"; orderId?: number };
  const type = body.type;
  const orderId = Number(body.orderId ?? NaN);

  if (!type || (type !== "kitchen" && type !== "invoice")) {
    return NextResponse.json({ success: false, error: "Invalid type" }, { status: 400 });
  }
  if (!Number.isFinite(orderId)) {
    return NextResponse.json({ success: false, error: "Invalid orderId" }, { status: 400 });
  }

  const order = getOrderById(orderId);
  if (!order) return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });

  const result =
    type === "kitchen" ? await printKitchenTicket(order) : await printCustomerInvoice(order);

  return NextResponse.json(result);
}
