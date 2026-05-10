import * as React from "react";
import { cn } from "@/lib/utils";

export type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "surface-card rounded-3xl overflow-hidden",
        className
      )}
      {...props}
    />
  );
}

export type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>;

export function CardHeader({
  className,
  ...props
}: CardHeaderProps) {
  return (
    <div className={cn("px-6 py-5 border-b border-[color:var(--border-soft)]", className)} {...props} />
  );
}

export type CardBodyProps = React.HTMLAttributes<HTMLDivElement>;

export function CardBody({
  className,
  ...props
}: CardBodyProps) {
  return (
    <div className={cn("px-6 py-5", className)} {...props} />
  );
}

export type CardFooterProps = React.HTMLAttributes<HTMLDivElement>;

export function CardFooter({
  className,
  ...props
}: CardFooterProps) {
  return (
    <div
      className={cn("px-6 py-5 border-t border-[color:var(--border-soft)]", className)}
      {...props}
    />
  );
}
