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
        "bg-gradient-to-r from-black/5 via-black/10 to-black/5 bg-[length:200%_100%] animate-shimmer rounded-xl",
        variant === "circle" ? "rounded-full" : "",
        className
      )}
    />
  );
}
