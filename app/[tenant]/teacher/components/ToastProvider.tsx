"use client";
import React from "react";

type Toast = {
  id: string;
  title?: string;
  message: string;
  type?: "info" | "success" | "error" | "warning";
  duration?: number;
};

type ToastContextValue = {
  toasts: Toast[];
  addToast: (t: Omit<Toast, "id">) => string;
  removeToast: (id: string) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  function addToast(t: Omit<Toast, "id">) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const toast: Toast = { id, ...t, duration: t.duration ?? 4000 };
    setToasts((s) => [...s, toast]);
    // auto remove
    setTimeout(() => removeToast(id), toast.duration);
    return id;
  }

  function removeToast(id: string) {
    setToasts((s) => s.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div
        style={{
          position: "fixed",
          right: 20,
          top: 20,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxWidth: 360,
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            style={{
              background:
                t.type === "success"
                  ? "#e6ffed"
                  : t.type === "error"
                  ? "#ffe6e6"
                  : t.type === "warning"
                  ? "#fff7e0"
                  : "#eef2ff",
              border: "1px solid rgba(0,0,0,0.08)",
              padding: "12px 14px",
              borderRadius: 8,
              boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ fontWeight: 600 }}>{t.title}</div>
            <div>{t.message}</div>
            <div style={{ marginTop: 6, textAlign: "right" }}>
              <button
                onClick={() => removeToast(t.id)}
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "#666" }}
              >
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export default ToastProvider;

