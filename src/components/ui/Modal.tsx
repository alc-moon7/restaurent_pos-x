"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  className,
}: ModalProps) {
  const titleId = React.useId();

  React.useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-modal="true"
      role="dialog"
      aria-labelledby={titleId}
    >
      <div
        className="fixed inset-0 bg-black/50"
        onMouseDown={() => {
          onClose();
        }}
      />

      <div
        className="relative mx-auto my-8 w-[calc(100%-2rem)] max-w-none sm:max-w-[520px]"
        onMouseDown={(e) => {
          // Only close if the user clicks outside the card.
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className={cn(
            "relative w-full rounded-2xl bg-white shadow-lg border border-secondary/10 flex flex-col max-h-[calc(100vh-4rem)]",
            className
          )}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-secondary/10 bg-white px-6 py-4">
            <h2 id={titleId} className="text-base font-semibold text-foreground">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-secondary/15 text-secondary hover:bg-secondary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label="Close modal"
            >
              <span aria-hidden="true" className="text-lg leading-none">
                ×
              </span>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">{children}</div>

          {footer ? (
            <div className="sticky bottom-0 z-10 border-t border-secondary/10 bg-white px-6 py-4">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}

