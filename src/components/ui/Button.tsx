import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-black transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-foreground hover:brightness-[0.98] border border-black/10 shadow-[0_8px_18px_rgba(0,0,0,0.12)]",
  secondary:
    "bg-white text-foreground hover:bg-neutral border border-black/10 shadow-[0_6px_16px_rgba(0,0,0,0.06)]",
  danger:
    "bg-danger text-white hover:brightness-[1.03] border border-danger/10",
  ghost:
    "bg-white text-foreground hover:bg-neutral border border-[color:var(--border-soft)] shadow-[0_6px_16px_rgba(0,0,0,0.04)]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-xs",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-6 text-sm",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      type = "button",
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(base, variantClasses[variant], sizeClasses[size], className)}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
