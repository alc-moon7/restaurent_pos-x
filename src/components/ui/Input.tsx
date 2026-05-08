import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const hasError = Boolean(error);

    return (
      <div className={cn("w-full", className)}>
        {label ? (
          <label
            htmlFor={inputId}
            className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-secondary/62"
          >
            {label}
          </label>
        ) : null}

        <div className="relative">
          {icon ? (
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary/70">
              {icon}
            </div>
          ) : null}

          <input
            ref={ref}
            id={inputId}
            className={cn(
              "h-12 w-full rounded-[1.2rem] border bg-white/78 px-4 text-foreground shadow-[0_12px_28px_rgba(27,91,82,0.05)] backdrop-blur-sm transition-colors placeholder:text-secondary/45 focus-visible:outline-none focus-visible:ring-2",
              icon ? "pl-10" : "",
              hasError
                ? "border-danger focus-visible:ring-danger/30"
                : "border-[color:var(--border-soft)] focus-visible:ring-primary/25"
            )}
            aria-invalid={hasError}
            {...props}
          />
        </div>

        {hasError ? (
          <p className="mt-1 text-sm text-danger">{error}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
