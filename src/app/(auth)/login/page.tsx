"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";

export default function OwnerLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/owner/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        hasRestaurant?: boolean;
        message?: string;
      };
      if (!res.ok || !data.success) {
        throw new Error(data.message ?? "Owner login failed.");
      }
      router.push(data.hasRestaurant ? "/admin/orders" : "/");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Owner login failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col overflow-hidden rounded-[2.25rem] border border-[color:var(--border-soft)] bg-white/62 shadow-[0_24px_60px_rgba(27,91,82,0.1)] backdrop-blur-xl lg:flex-row">
        <section className="bg-[linear-gradient(180deg,rgba(248,252,250,0.96),rgba(233,247,241,0.88))] px-8 py-10 lg:w-[44%] lg:px-10">
          <div className="pill-label">Owner access</div>
          <h1 className="mt-6 text-4xl font-black tracking-tight text-foreground">Manage your restaurant from one calm cloud account.</h1>
          <p className="mt-5 text-base leading-8 text-secondary/78">
            Owners sign in with phone and password. After setup, the same restaurant can be opened from web or mobile while the admin workspace still supports fast operational PIN access.
          </p>

          <div className="mt-8 space-y-4">
            <div className="gradient-aqua rounded-[1.7rem] border border-white/45 p-5">
              <div className="text-sm font-bold text-secondary/70">Owner credentials</div>
              <div className="mt-2 text-sm text-secondary/68">Use the phone number and password created during onboarding.</div>
            </div>
            <div className="gradient-periwinkle rounded-[1.7rem] border border-white/45 p-5">
              <div className="text-sm font-bold text-secondary/70">Operational access</div>
              <div className="mt-2 text-sm text-secondary/68">Admin PIN login stays available for quick outlet use.</div>
            </div>
          </div>

          <div className="mt-10 rounded-[2rem] gradient-mint p-6 text-white shadow-[0_24px_50px_rgba(27,91,82,0.18)]">
            <div className="inline-flex rounded-full border border-white/16 bg-white/12 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/78">
              Cloud workspace
            </div>
            <div className="mt-4 space-y-3 text-sm leading-7 text-white/84">
              <p>Phone + password for ownership and subscription access.</p>
              <p>Admin PIN for quick operational login inside the outlet workspace.</p>
              <p>One shared backend for web and mobile apps.</p>
            </div>
          </div>
        </section>

        <section className="flex flex-1 items-center bg-white/64 px-6 py-10 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-6">
              <div className="text-sm font-bold uppercase tracking-[0.18em] text-secondary/60">Sign in</div>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground">Owner login</h2>
              <p className="mt-2 text-sm text-secondary/70">
                Open the owner account for subscriptions, outlet setup, and cloud management.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="gradient-aqua rounded-[1.9rem] border border-white/45 p-5">
                <div className="grid gap-4">
                  <Input
                    label="Phone number"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+8801XXXXXXXXX"
                  />
                  <Input
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Owner password"
                  />
                </div>
              </div>

              {error ? (
                <div className="rounded-[1.25rem] border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
                  {error}
                </div>
              ) : null}

              <Button className="w-full" size="lg" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Signing in..." : "Open owner account"}
              </Button>
            </form>

            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-secondary/70">
              <Link href="/" className="font-semibold text-primary hover:underline">
                Create a new cloud restaurant
              </Link>
              <Link href="/admin/login" className="font-semibold text-primary hover:underline">
                Admin PIN login
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
