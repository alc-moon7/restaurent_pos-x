"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui";

function PinDot({ filled }: { filled: boolean }) {
  return (
    <div
      className={[
        "h-3.5 w-3.5 rounded-full border transition-colors",
        filled ? "border-primary bg-primary" : "border-[color:var(--border-soft)] bg-white/88",
      ].join(" ")}
      aria-hidden="true"
    />
  );
}

export default function AdminLoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/admin";

  const [pin, setPin] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [shake, setShake] = React.useState(false);

  const submit = React.useCallback(
    async (currentPin: string) => {
      if (currentPin.length !== 4) return;

      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: currentPin }),
        });
        const data = (await res.json()) as { success: boolean; message?: string };

        if (!res.ok || !data.success) {
          throw new Error(data.message ?? "Incorrect PIN");
        }

        router.replace(next);
      } catch (e) {
        setError((e as Error).message || "Incorrect PIN");
        setPin("");
        setShake(true);
        window.setTimeout(() => setShake(false), 420);
      } finally {
        setLoading(false);
      }
    },
    [next, router]
  );

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (loading || event.ctrlKey || event.metaKey || event.altKey) return;

      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        setError(null);
        setPin((current) => (current.length >= 4 ? current : `${current}${event.key}`));
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        setError(null);
        setPin((current) => current.slice(0, -1));
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setError(null);
        setPin("");
        return;
      }

      if (event.key === "Enter" && pin.length === 4) {
        event.preventDefault();
        void submit(pin);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [loading, pin, submit]);

  const press = (digit: string) => {
    if (loading) return;

    if (digit === "del") {
      setError(null);
      setPin((current) => current.slice(0, -1));
      return;
    }

    if (digit === "clr") {
      setError(null);
      setPin("");
      return;
    }

    setError(null);
    setPin((current) => (current.length >= 4 ? current : `${current}${digit}`));
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col overflow-hidden rounded-[2.25rem] border border-[color:var(--border-soft)] bg-white/62 shadow-[0_24px_60px_rgba(27,91,82,0.1)] backdrop-blur-xl lg:flex-row">
        <section className="bg-[linear-gradient(180deg,rgba(248,252,250,0.96),rgba(233,247,241,0.88))] px-8 py-10 lg:w-[44%] lg:px-10">
          <div className="pill-label">Admin access</div>
          <h1 className="mt-6 text-4xl font-black tracking-tight text-foreground">Unlock the outlet workspace with one quick PIN.</h1>
          <p className="mt-5 text-base leading-8 text-secondary/78">
            The admin PIN is for fast restaurant-floor operations. It opens the connected outlet workspace after cloud verification.
          </p>

          <div className="mt-8 space-y-4">
            <div className="gradient-aqua rounded-[1.7rem] border border-white/45 p-5">
              <div className="text-sm font-bold text-secondary/70">Fast operations</div>
              <div className="mt-2 text-sm text-secondary/68">Use the 4-digit operational PIN for orders, tables, kitchen, and settings.</div>
            </div>
            <div className="gradient-butter rounded-[1.7rem] border border-white/45 p-5">
              <div className="text-sm font-bold text-secondary/70">Cloud verified</div>
              <div className="mt-2 text-sm text-secondary/68">PIN is checked against the current platform backend, not a local hardcoded code.</div>
            </div>
          </div>

          <div className="mt-10 rounded-[2rem] gradient-mint p-6 text-white shadow-[0_24px_50px_rgba(27,91,82,0.18)]">
            <div className="inline-flex rounded-full border border-white/16 bg-white/12 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/78">
              Access notes
            </div>
            <div className="mt-4 space-y-3 text-sm leading-7 text-white/84">
              <p>Enter the 4-digit outlet PIN to continue.</p>
              <p>Use owner login for subscription and ownership controls.</p>
              <p>The same backend powers web and mobile access.</p>
            </div>
          </div>
        </section>

        <section className="flex flex-1 items-center bg-white/64 px-6 py-10 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-6">
              <div className="text-sm font-bold uppercase tracking-[0.18em] text-secondary/60">Unlock</div>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground">Admin PIN login</h2>
              <p className="mt-2 text-sm text-secondary/70">
                Enter the operational PIN for this restaurant outlet.
              </p>
            </div>

            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                void submit(pin);
              }}
            >
              <div
                className={[
                  "gradient-periwinkle rounded-[1.9rem] border border-white/45 p-5 transition-transform shadow-[0_14px_28px_rgba(27,91,82,0.05)]",
                  shake ? "pin-pad-shake" : "",
                ].join(" ")}
              >
                <div className="flex items-center justify-center gap-3">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <PinDot key={idx} filled={idx < pin.length} />
                  ))}
                </div>

                <div className="mt-3 text-center text-xs text-secondary/60">
                  Use the keypad or type the PIN with your keyboard.
                </div>
              </div>

              {error ? (
                <div className="rounded-[1.25rem] border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger">
                  {error}
                </div>
              ) : null}

              <div className="grid grid-cols-3 gap-3">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => press(digit)}
                    className="h-16 rounded-[1.35rem] border border-[color:var(--border-soft)] bg-white/78 text-2xl font-black shadow-[0_12px_24px_rgba(27,91,82,0.05)] transition-colors hover:bg-white"
                  >
                    {digit}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => press("clr")}
                  className="h-16 rounded-[1.35rem] border border-[color:var(--border-soft)] bg-white/78 text-sm font-semibold text-secondary/70 shadow-[0_12px_24px_rgba(27,91,82,0.05)] transition-colors hover:bg-white"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => press("0")}
                  className="h-16 rounded-[1.35rem] border border-[color:var(--border-soft)] bg-white/78 text-2xl font-black shadow-[0_12px_24px_rgba(27,91,82,0.05)] transition-colors hover:bg-white"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => press("del")}
                  className="h-16 rounded-[1.35rem] border border-[color:var(--border-soft)] bg-white/78 text-sm font-semibold text-secondary/70 shadow-[0_12px_24px_rgba(27,91,82,0.05)] transition-colors hover:bg-white"
                >
                  Delete
                </button>
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={loading || pin.length !== 4}>
                {loading ? "Checking PIN..." : "Unlock admin"}
              </Button>

              <div className="text-center text-xs text-secondary/60">
                PIN is verified against the active cloud platform and opens the outlet workspace for this restaurant.
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-secondary/70">
                <Link href="/" className="font-semibold text-primary hover:underline">
                  Create cloud restaurant
                </Link>
                <Link href="/login" className="font-semibold text-primary hover:underline">
                  Owner password login
                </Link>
              </div>
            </form>
          </div>
        </section>
      </div>

      <style jsx global>{`
        @keyframes pin-pad-shake {
          0%,
          100% {
            transform: translateX(0);
          }
          20% {
            transform: translateX(-10px);
          }
          40% {
            transform: translateX(10px);
          }
          60% {
            transform: translateX(-8px);
          }
          80% {
            transform: translateX(8px);
          }
        }

        .pin-pad-shake {
          animation: pin-pad-shake 360ms ease-in-out;
        }
      `}</style>
    </div>
  );
}
