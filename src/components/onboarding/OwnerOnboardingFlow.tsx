"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";

type Plan = {
  code: string;
  name: string;
  currency: string;
  monthlyPrice: number;
  annualPrice: number;
  annualSavings: number;
  paymentMethods: string[];
};

type Notice = {
  tone: "neutral" | "danger" | "success";
  message: string;
};

const billingLabels = {
  monthly: "Monthly",
  annual: "Annual",
} as const;

const fallbackPlan: Plan = {
  code: "cloud-starter",
  name: "Cloud Starter",
  currency: "BDT",
  monthlyPrice: 800,
  annualPrice: 8000,
  annualSavings: 1600,
  paymentMethods: ["bkash", "nagad", "bank", "card"],
};

function isPlan(value: unknown): value is Plan {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Plan>;
  return (
    typeof candidate.code === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.currency === "string" &&
    typeof candidate.monthlyPrice === "number" &&
    typeof candidate.annualPrice === "number" &&
    typeof candidate.annualSavings === "number" &&
    Array.isArray(candidate.paymentMethods)
  );
}

export function OwnerOnboardingFlow() {
  const router = useRouter();
  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<Notice | null>(null);

  const [phone, setPhone] = React.useState("+8801");
  const [otp, setOtp] = React.useState("");
  const [devOtp, setDevOtp] = React.useState<string | null>(null);
  const [otpVerified, setOtpVerified] = React.useState(false);

  const [billingCycle, setBillingCycle] = React.useState<"monthly" | "annual">("monthly");
  const [paymentMethod, setPaymentMethod] = React.useState("bkash");
  const [selectedPlanCode, setSelectedPlanCode] = React.useState("cloud-starter");
  const [paymentSessionId, setPaymentSessionId] = React.useState<string | null>(null);
  const [paymentSucceeded, setPaymentSucceeded] = React.useState(false);

  const [restaurantName, setRestaurantName] = React.useState("");
  const [firstOutletName, setFirstOutletName] = React.useState("");
  const [ownerPassword, setOwnerPassword] = React.useState("");
  const [adminPin, setAdminPin] = React.useState("");

  React.useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const res = await fetch("/api/owner/plans", { cache: "no-store" });
        const data = (await res.json()) as unknown;
        if (!mounted) return;
        const rawPlans =
          Array.isArray(data)
            ? data
            : typeof data === "object" && data && "plans" in data && Array.isArray(data.plans)
              ? data.plans
              : [];
        const nextPlans = rawPlans.filter(isPlan);
        const safePlans = nextPlans.length > 0 ? nextPlans : [fallbackPlan];
        setPlans(safePlans);
        const warning =
          typeof data === "object" && data && "warning" in data && typeof data.warning === "string"
            ? data.warning
            : null;
        if (!res.ok || warning) {
          const detail =
            warning ??
            (typeof data === "object" && data && "detail" in data && typeof data.detail === "string"
              ? data.detail
              : "Unable to load plans from the backend. Showing fallback pricing.");
          setNotice({
            tone: "danger",
            message: detail,
          });
        }
        if (safePlans[0]) {
          setSelectedPlanCode(safePlans[0].code);
          setPaymentMethod(safePlans[0].paymentMethods[0] ?? "bkash");
        }
      } catch (error) {
        if (!mounted) return;
        setPlans([fallbackPlan]);
        setSelectedPlanCode(fallbackPlan.code);
        setPaymentMethod(fallbackPlan.paymentMethods[0]);
        setNotice({
          tone: "danger",
          message: error instanceof Error ? `${error.message} Showing fallback pricing.` : "Unable to load plans. Showing fallback pricing.",
        });
      } finally {
        if (mounted) setLoadingPlans(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const safePlans = Array.isArray(plans) ? plans : [fallbackPlan];
  const plan = safePlans.find((entry) => entry.code === selectedPlanCode) ?? safePlans[0] ?? fallbackPlan;
  const amount = billingCycle === "annual" ? plan?.annualPrice ?? 0 : plan?.monthlyPrice ?? 0;

  const runStep = React.useCallback(async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    setNotice(null);
    try {
      await action();
    } catch (error) {
      setNotice({
        tone: "danger",
        message: error instanceof Error ? error.message : "Something went wrong.",
      });
    } finally {
      setBusy(null);
    }
  }, []);

  const requestOtp = React.useCallback(() => {
    return runStep("otp", async () => {
      const res = await fetch("/api/owner/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = (await res.json()) as { detail?: string; devOtpCode?: string };
      if (!res.ok) throw new Error(data.detail ?? "Failed to send OTP.");
      setDevOtp(data.devOtpCode ?? null);
      setOtp("");
      setOtpVerified(false);
      setNotice({
        tone: "success",
        message: data.devOtpCode
          ? `OTP sent. Local dev code: ${data.devOtpCode}`
          : "OTP sent to the owner's phone.",
      });
    });
  }, [phone, runStep]);

  const verifyOtp = React.useCallback(() => {
    return runStep("verify", async () => {
      const res = await fetch("/api/owner/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      });
      const data = (await res.json()) as { detail?: string };
      if (!res.ok) throw new Error(data.detail ?? "OTP verification failed.");
      setOtpVerified(true);
      setNotice({
        tone: "success",
        message: "Phone verified. You can continue to subscription payment.",
      });
    });
  }, [otp, phone, runStep]);

  const startPayment = React.useCallback(() => {
    return runStep("payment", async () => {
      const res = await fetch("/api/owner/payments/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          planCode: selectedPlanCode,
          billingCycle,
          paymentMethod,
        }),
      });
      const data = (await res.json()) as {
        detail?: string;
        paymentSessionId?: string;
        amount?: number;
        currency?: string;
      };
      if (!res.ok || !data.paymentSessionId) throw new Error(data.detail ?? "Unable to start payment.");
      setPaymentSessionId(data.paymentSessionId);
      setPaymentSucceeded(false);
      setNotice({
        tone: "success",
        message: `Payment session created for ${data.amount} ${data.currency}. Confirm the callback to continue.`,
      });
    });
  }, [billingCycle, paymentMethod, phone, runStep, selectedPlanCode]);

  const confirmPayment = React.useCallback(() => {
    return runStep("confirm-payment", async () => {
      if (!paymentSessionId) throw new Error("Start the payment session first.");
      const res = await fetch("/api/owner/payments/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentSessionId,
          status: "succeeded",
        }),
      });
      const data = (await res.json()) as { detail?: string; status?: string };
      if (!res.ok || data.status !== "succeeded") throw new Error(data.detail ?? "Payment confirmation failed.");
      setPaymentSucceeded(true);
      setNotice({
        tone: "success",
        message: "Payment confirmed. Finish the cloud restaurant setup below.",
      });
    });
  }, [paymentSessionId, runStep]);

  const finishSetup = React.useCallback(() => {
    return runStep("setup", async () => {
      const res = await fetch("/api/owner/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          paymentSessionId,
          restaurantName,
          firstOutletName,
          ownerPassword,
          adminPin,
        }),
      });
      const data = (await res.json()) as { success?: boolean; message?: string };
      if (!res.ok || !data.success) throw new Error(data.message ?? "Restaurant setup failed.");
      router.push("/admin/orders");
    });
  }, [adminPin, firstOutletName, ownerPassword, paymentSessionId, phone, restaurantName, router, runStep]);

  return (
    <div className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-7xl flex-col overflow-hidden rounded-[2.25rem] border border-[color:var(--border-soft)] bg-white/62 shadow-[0_24px_60px_rgba(27,91,82,0.1)] backdrop-blur-xl lg:flex-row">
        <section className="lg:w-[46%]">
          <div className="h-full bg-[linear-gradient(180deg,rgba(248,252,250,0.96),rgba(233,247,241,0.88))] px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
            <div className="pill-label">Subscription-first cloud POS</div>
            <h1 className="mt-6 max-w-xl text-4xl font-black tracking-tight text-foreground sm:text-5xl">
              Launch a restaurant workspace with one calm, guided cloud setup.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-secondary/80">
              Restaurant owners verify their phone, choose a billing cycle, complete payment, then create the
              restaurant name, first outlet, owner password, and admin PIN in one flow.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="gradient-aqua rounded-[1.8rem] border border-white/45 p-5 shadow-[0_16px_30px_rgba(27,91,82,0.06)]">
                <div className="text-sm font-bold text-secondary/70">Base plan</div>
                <div className="mt-2 text-3xl font-black">
                  {loadingPlans ? "..." : `${plan?.currency ?? "BDT"} ${plan?.monthlyPrice ?? 800}`}
                </div>
                <div className="mt-1 text-sm text-secondary/65">Per month, per restaurant</div>
              </div>
              <div className="gradient-butter rounded-[1.8rem] border border-white/45 p-5 shadow-[0_16px_30px_rgba(27,91,82,0.06)]">
                <div className="text-sm font-bold text-secondary/70">Annual option</div>
                <div className="mt-2 text-3xl font-black">
                  {loadingPlans ? "..." : `${plan?.currency ?? "BDT"} ${plan?.annualPrice ?? 8000}`}
                </div>
                <div className="mt-1 text-sm text-secondary/65">
                  Save {plan?.currency ?? "BDT"} {plan?.annualSavings ?? 1600} with yearly billing
                </div>
              </div>
            </div>

            <div className="mt-10 rounded-[2rem] gradient-mint p-6 text-white shadow-[0_24px_50px_rgba(27,91,82,0.18)]">
              <div className="inline-flex rounded-full border border-white/16 bg-white/12 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/78">
                How it runs
              </div>
              <div className="mt-5 space-y-4 text-sm leading-7 text-white/84">
                <p>1. Owner pays for the subscription on the cloud platform.</p>
                <p>2. Django activates a setup-ready subscription after payment confirmation.</p>
                <p>3. Owner creates the restaurant, first outlet, password, and admin PIN.</p>
                <p>4. Web and mobile apps both use the same central Django backend on your EC2 server.</p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3 text-xs font-semibold text-white/78">
                {["EC2", "Django", "PostgreSQL", "bKash", "Nagad", "Card", "Bank"].map((label) => (
                  <span key={label} className="rounded-full border border-white/14 bg-white/10 px-3 py-2">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-0 lg:flex-1">
          <div className="h-full bg-white/64 p-6 backdrop-blur sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-bold uppercase tracking-[0.18em] text-secondary/60">Create cloud restaurant</div>
                <h2 className="mt-2 text-3xl font-black tracking-tight">Owner onboarding</h2>
              </div>
              <Link href="/login" className="text-sm font-semibold text-primary hover:underline">
                Owner login
              </Link>
            </div>

            {notice ? (
              <div
                className={[
                  "mt-5 rounded-2xl border px-4 py-3 text-sm",
                  notice.tone === "danger"
                    ? "border-danger/25 bg-danger/5 text-danger"
                    : notice.tone === "success"
                      ? "border-primary/20 bg-primary/5 text-primary"
                      : "border-secondary/15 bg-secondary/5 text-secondary/80",
                ].join(" ")}
              >
                {notice.message}
              </div>
            ) : null}

            <div className="mt-6 space-y-8">
              <div className="gradient-aqua rounded-[1.9rem] border border-white/45 p-5 shadow-[0_14px_28px_rgba(27,91,82,0.05)]">
                <div className="text-sm font-bold text-secondary/75">Step 1: Verify owner phone</div>
                <div className="mt-4 grid gap-4 sm:grid-cols-[1.4fr,0.9fr]">
                  <Input
                    label="Phone number"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+8801XXXXXXXXX"
                  />
                  <div className="flex items-end">
                    <Button className="w-full" size="lg" onClick={requestOtp} disabled={busy === "otp"}>
                      {busy === "otp" ? "Sending..." : "Send OTP"}
                    </Button>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-[1.2fr,1fr]">
                  <Input
                    label="OTP code"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value)}
                    placeholder="6-digit code"
                  />
                  <div className="flex items-end">
                    <Button
                      variant={otpVerified ? "secondary" : "primary"}
                      className="w-full"
                      size="lg"
                      onClick={verifyOtp}
                      disabled={busy === "verify" || !otp}
                    >
                      {busy === "verify" ? "Checking..." : otpVerified ? "Verified" : "Verify OTP"}
                    </Button>
                  </div>
                </div>
                {devOtp ? (
                  <div className="mt-3 text-xs font-semibold text-secondary/60">
                    Local development OTP: <span className="text-foreground">{devOtp}</span>
                  </div>
                ) : null}
              </div>

              <div className="gradient-periwinkle rounded-[1.9rem] border border-white/45 p-5 shadow-[0_14px_28px_rgba(27,91,82,0.05)]">
                <div className="text-sm font-bold text-secondary/75">Step 2: Choose subscription and payment</div>
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  <div>
                    <div className="mb-2 text-sm font-medium text-foreground">Plan</div>
                    <div className="rounded-[1.4rem] border border-[color:var(--border-soft)] bg-white/76 p-4">
                      <div className="text-lg font-black">{plan?.name ?? "Cloud Starter"}</div>
                      <div className="mt-1 text-sm text-secondary/70">
                        {plan?.currency ?? "BDT"} {amount} / {billingLabels[billingCycle]}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 text-sm font-medium text-foreground">Billing cycle</div>
                    <div className="grid grid-cols-2 gap-2">
                      {(["monthly", "annual"] as const).map((cycle) => (
                        <button
                          key={cycle}
                          type="button"
                          onClick={() => setBillingCycle(cycle)}
                          className={[
                            "rounded-full border px-4 py-3 text-sm font-bold transition-colors",
                            billingCycle === cycle
                              ? "border-primary bg-primary text-white"
                              : "border-[color:var(--border-soft)] bg-white/76 text-secondary/80 hover:bg-white",
                          ].join(" ")}
                        >
                          {billingLabels[cycle]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 text-sm font-medium text-foreground">Payment method</div>
                    <div className="grid grid-cols-2 gap-2">
                      {(plan?.paymentMethods ?? ["bkash", "nagad", "bank", "card"]).map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentMethod(method)}
                          className={[
                            "rounded-full border px-4 py-3 text-sm font-bold capitalize transition-colors",
                            paymentMethod === method
                              ? "border-primary bg-primary text-white"
                              : "border-[color:var(--border-soft)] bg-white/76 text-secondary/80 hover:bg-white",
                          ].join(" ")}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Button size="lg" onClick={startPayment} disabled={!otpVerified || busy === "payment"}>
                    {busy === "payment" ? "Starting payment..." : "Create payment session"}
                  </Button>
                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={confirmPayment}
                    disabled={!paymentSessionId || busy === "confirm-payment"}
                  >
                    {busy === "confirm-payment" ? "Confirming..." : "Confirm payment callback"}
                  </Button>
                </div>
                <div className="mt-3 text-xs text-secondary/60">
                  The gateway adapter is ready for bKash, Nagad, bank, and card. In local development,
                  payment confirmation is simulated through the callback button.
                </div>
              </div>

              <div className="gradient-lime rounded-[1.9rem] border border-white/45 p-5 shadow-[0_14px_28px_rgba(27,91,82,0.05)]">
                <div className="text-sm font-bold text-secondary/75">Step 3: Create cloud restaurant</div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Restaurant name"
                    value={restaurantName}
                    onChange={(event) => setRestaurantName(event.target.value)}
                    placeholder="Aurora Kitchen"
                  />
                  <Input
                    label="First outlet name"
                    value={firstOutletName}
                    onChange={(event) => setFirstOutletName(event.target.value)}
                    placeholder="Banani Outlet"
                  />
                  <Input
                    label="Owner password"
                    type="password"
                    value={ownerPassword}
                    onChange={(event) => setOwnerPassword(event.target.value)}
                    placeholder="At least 8 characters"
                  />
                  <Input
                    label="Admin panel PIN"
                    value={adminPin}
                    onChange={(event) => setAdminPin(event.target.value)}
                    placeholder="4-digit PIN"
                    maxLength={8}
                  />
                </div>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button
                    size="lg"
                    className="sm:min-w-[220px]"
                    onClick={finishSetup}
                    disabled={!paymentSucceeded || busy === "setup"}
                  >
                    {busy === "setup" ? "Creating restaurant..." : "Create cloud restaurant"}
                  </Button>
                  <div className="text-sm text-secondary/65">
                    After setup, the owner is signed in and redirected to the admin workspace.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
