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
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-60 shadow-[0_10px_24px_rgba(27,91,82,0.06)]";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white hover:brightness-[1.03] border border-primary/12 shadow-[0_12px_26px_rgba(23,182,158,0.22)]",
  secondary:
    "bg-white/88 text-primary hover:bg-white border border-primary/12 backdrop-blur-md shadow-[0_10px_22px_rgba(27,91,82,0.05)]",
  danger:
    "bg-danger/92 text-white hover:brightness-[1.03] border border-danger/10",
  ghost:
    "bg-white/64 text-primary hover:bg-white border border-[color:var(--border-soft)] backdrop-blur-md shadow-[0_10px_22px_rgba(27,91,82,0.04)]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-6 text-base",
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
