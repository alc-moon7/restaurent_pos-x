"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "info";

export type ToastPayload = {
  id?: string;
  variant: ToastVariant;
  title?: string;
  message: string;
  durationMs?: number; // default: 3000
};

type ToastInternal = Required<Pick<ToastPayload, "variant" | "message">> &
  Pick<ToastPayload, "title"> & {
    id: string;
    durationMs: number;
  };

type ToastContextValue = {
  pushToast: (payload: ToastPayload) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider.");
  }
  return ctx;
}

function iconFor(variant: ToastVariant) {
  switch (variant) {
    case "success":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M20 7L10 17L4 11"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "error":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 9V13"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M12 17H12.01"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <path
            d="M10.2 4.8L3.6 18.6C3.2 19.4 3.8 20.4 4.7 20.4H19.3C20.2 20.4 20.8 19.4 20.4 18.6L13.8 4.8C13.4 4 12.6 4 12.2 4C11.4 4 10.6 4 10.2 4.8Z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      );
    default:
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 16V12"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M12 8H12.01"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <path
            d="M10.2 4.8L3.6 18.6C3.2 19.4 3.8 20.4 4.7 20.4H19.3C20.2 20.4 20.8 19.4 20.4 18.6L13.8 4.8C13.4 4 12.6 4 12.2 4C11.4 4 10.6 4 10.2 4.8Z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}

function stylesFor(variant: ToastVariant) {
  switch (variant) {
    case "success":
      return {
        wrap: "bg-success/10 border-success/20 text-success",
        icon: "text-success",
      };
    case "error":
      return {
        wrap: "bg-danger/10 border-danger/20 text-danger",
        icon: "text-danger",
      };
    default:
      return {
        wrap: "bg-info/10 border-info/20 text-info",
        icon: "text-info",
      };
  }
}

function ToastViewport({ toasts, onDismiss }: { toasts: ToastInternal[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 w-[min(420px,calc(100vw-2rem))] pointer-events-none">
      {toasts.map((t) => {
        const s = stylesFor(t.variant);
        return (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto rounded-2xl border px-4 py-3 shadow-lg bg-white/90 backdrop-blur-sm",
              s.wrap
            )}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              <div className={cn("mt-0.5", s.icon)} aria-hidden="true">
                {iconFor(t.variant)}
              </div>
              <div className="min-w-0 flex-1">
                {t.title ? (
                  <div className="font-semibold text-sm">{t.title}</div>
                ) : null}
                <div className={cn("text-sm", t.title ? "mt-0.5" : "")}>{t.message}</div>
              </div>
              <button
                type="button"
                onClick={() => onDismiss(t.id)}
                className="ml-2 h-8 w-8 rounded-xl border border-secondary/15 bg-background/50 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 text-secondary/70"
                aria-label="Dismiss toast"
              >
                <span aria-hidden="true" className="text-lg leading-none">
                  ×
                </span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastInternal[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = React.useCallback((payload: ToastPayload) => {
    const id =
      payload.id ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    const durationMs = payload.durationMs ?? 3000;

    const toast: ToastInternal = {
      id,
      variant: payload.variant,
      title: payload.title,
      message: payload.message,
      durationMs,
    };

    setToasts((prev) => [...prev, toast]);

    window.setTimeout(() => {
      dismiss(id);
    }, durationMs);
  }, [dismiss]);

  const contextValue = React.useMemo(
    () => ({ pushToast }),
    [pushToast]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}
