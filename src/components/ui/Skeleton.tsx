import * as React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  variant = "rect",
}: {
  className?: string;
  variant?: "rect" | "circle";
}) {
  return (
    <div
      className={cn(
        "bg-gradient-to-r from-secondary/10 via-white/40 to-secondary/10 bg-[length:200%_100%] animate-shimmer rounded-xl",
        variant === "circle" ? "rounded-full" : "",
        className
      )}
    />
  );
}

