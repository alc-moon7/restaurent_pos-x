import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: "bg-success/12 text-primary border border-success/16",
  warning: "bg-warning/20 text-foreground border border-warning/24",
  danger: "bg-danger/14 text-danger border border-danger/18",
  info: "bg-info/14 text-info border border-info/16",
  neutral: "bg-white/82 text-primary border border-primary/10",
};

export function Badge({
  className,
  variant = "neutral",
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] backdrop-blur-sm",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
