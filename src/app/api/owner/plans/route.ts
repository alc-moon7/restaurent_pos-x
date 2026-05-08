import { NextResponse } from "next/server";
import { platformFetch, readPlatformJson } from "@/lib/platform-api";

const fallbackPlans = [
  {
    code: "cloud-starter",
    name: "Cloud Starter",
    currency: "BDT",
    monthlyPrice: 800,
    annualPrice: 8000,
    annualSavings: 1600,
    billingProvider: "sslcommerz",
    paymentMethods: ["bkash", "nagad", "bank", "card"],
    fallback: true,
  },
];

export async function GET() {
  try {
    const upstream = await platformFetch("/owner/plans", { auth: "none" });
    const data = await readPlatformJson<unknown>(upstream);
    if (!upstream.ok || !Array.isArray(data)) {
      return NextResponse.json(
        {
          plans: fallbackPlans,
          warning: "Platform backend unavailable. Serving fallback pricing.",
        },
        { status: 200 }
      );
    }
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        plans: fallbackPlans,
        warning: error instanceof Error ? error.message : "Unable to load plans",
      },
      { status: 200 }
    );
  }
}
