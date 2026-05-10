 "use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import type { ButtonProps } from "@/components/ui/Button";

export function EmptyState({
  title,
  description,
  cta,
  onCta,
}: {
  title: string;
  description?: string;
  cta?: { label: string } & Pick<ButtonProps, "variant">;
  onCta?: () => void;
}) {
  return (
    <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-[0_8px_20px_rgba(0,0,0,0.06)]">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-black/10 bg-primary">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-foreground">
            <path
              d="M9 10L11 12L15 8"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z"
              stroke="currentColor"
              strokeWidth="1.2"
            />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-base font-black tracking-tight text-foreground">{title}</div>
          {description ? (
            <div className="mt-1 text-sm font-medium text-secondary">{description}</div>
          ) : null}

          {cta ? (
            <div className="mt-5">
              <Button
                variant={cta.variant ?? "primary"}
                size="md"
                type="button"
                onClick={() => {
                  if (onCta) onCta();
                }}
              >
                {cta.label}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
