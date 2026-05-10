import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: "bg-success/10 text-foreground border border-success/20",
  warning: "bg-warning/20 text-foreground border border-warning/24",
  danger: "bg-danger/10 text-foreground border border-danger/18",
  info: "bg-primary text-foreground border border-black/10",
  neutral: "bg-white text-foreground border border-black/10",
};

export function Badge({
  className,
  variant = "neutral",
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em]",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
