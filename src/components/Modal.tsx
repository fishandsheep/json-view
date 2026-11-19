import React from "react";
import { create } from "zustand";
import { LuX } from "react-icons/lu";
import { highlight } from "../lib/highlight";
import "../styles/modal.css";

/* ============================================================================
   Toaster — a tiny zustand-driven toast stack (replaces react-hot-toast).
   ========================================================================== */

export interface ToastItem {
  id: number;
  message: string;
  type: "default" | "success" | "error" | "loading";
}

interface ToastStore {
  toasts: ToastItem[];
  push: (message: string, type?: ToastItem["type"]) => number;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToasts = create<ToastStore>()(set => ({
  toasts: [],
  push: (message, type = "default") => {
    const id = nextId++;
    set(state => ({ toasts: [...state.toasts, { id, message, type }] }));
    return id;
  },
  dismiss: id => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),
}));

export const toast = {
  success: (message: string) => useToasts.getState().push(message, "success"),
  error: (message: string) => useToasts.getState().push(message, "error"),
  message: (message: string) => useToasts.getState().push(message, "default"),
  loading: (message: string) => useToasts.getState().push(message, "loading"),
  dismiss: (id: number) => useToasts.getState().dismiss(id),
};

export const Toaster: React.FC = () => {
  const toasts = useToasts(state => state.toasts);
  const dismiss = useToasts(state => state.dismiss);

  React.useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts
      .filter(t => t.type !== "loading")
      .map(t => setTimeout(() => dismiss(t.id), 3500));
    return () => timers.forEach(clearTimeout);
  }, [toasts, dismiss]);

  if (!toasts.length) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 56,
        left: "50%",
        translate: "-50% 0",
        zIndex: 10000,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        pointerEvents: "none",
      }}
    >
      {toasts.map(t => (
        <div
          key={t.id}
          style={{
            pointerEvents: "auto",
            display: "flex",
            alignItems: "center",
            gap: 10,
            maxWidth: "90vw",
            padding: "10px 12px",
            borderRadius: 8,
            background: "#1c1c1e",
            color: "#fff",
            fontSize: 13,
            fontWeight: 500,
            boxShadow: "0 8px 24px rgba(0,0,0,.35)",
            borderLeft: `3px solid ${
              t.type === "error" ? "#fa5252" : t.type === "success" ? "#40c057" : "#4d4d4d"
            }`,
            animation: "toast-in 200ms ease",
          }}
        >
          {t.type === "loading" && (
            <span
              aria-hidden
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                border: "2px solid rgba(255,255,255,.3)",
                borderTopColor: "#fff",
                animation: "spin 700ms linear infinite",
              }}
            />
          )}
          {t.message}
          <button
            type="button"
            aria-label="dismiss notification"
            onClick={() => dismiss(t.id)}
            style={{ color: "rgba(255,255,255,.6)", display: "inline-flex" }}
          >
            <LuX size={13} />
          </button>
        </div>
      ))}
      <style>{`
        @keyframes toast-in { from { opacity: 0; translate: 0 -6px; } }
        @keyframes spin { to { rotate: 360deg; } }
      `}</style>
    </div>
  );
};

/* ============================================================================
   Modal — native <dialog> wrapper (dialog guide: showModal(), Esc, backdrop).
   ========================================================================== */

export const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  size?: "md" | "lg";
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ open, onClose, title, size = "md", children, footer }) => {
  const ref = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`app-modal${size === "lg" ? " lg" : ""}`}
      aria-label={title}
      onClick={e => {
        // Light dismiss: clicks that land on the backdrop close the dialog.
        if (e.target === ref.current) onClose();
      }}
      onClose={onClose}
    >
      <div className="app-modal-header">
        {title}
        <button type="button" className="close-btn" aria-label="close dialog" onClick={onClose}>
          <LuX size={16} />
        </button>
      </div>
      <div className="app-modal-body">{children}</div>
      {footer && <div className="app-modal-footer">{footer}</div>}
    </dialog>
  );
};

/** Code block with copy button + tiny highlighter for modals. */
export const CodeBlock: React.FC<{
  code: string;
  lang?: "json" | "code";
  style?: React.CSSProperties;
}> = ({ code, lang = "json", style }) => {
  const [copied, setCopied] = React.useState(false);
  const onCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <pre className="code-block" style={style}>
      <button
        type="button"
        className="copy-btn"
        aria-label={copied ? "copied" : "copy to clipboard"}
        onClick={onCopy}
      >
        {copied ? "✓" : "⧉"}
      </button>
      <code dangerouslySetInnerHTML={{ __html: highlight(code, lang) }} />
    </pre>
  );
};

/* Native radio segmented control. */
export const SegmentedControl: React.FC<{
  name: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
  vertical?: boolean;
  style?: React.CSSProperties;
}> = ({ name, value, options, onChange, vertical, style }) => (
  <fieldset className={`segmented${vertical ? " vertical" : ""}`} style={style}>
    {options.map(opt => (
      <label key={opt.value}>
        <input
          type="radio"
          name={name}
          value={opt.value}
          checked={value === opt.value}
          onChange={() => onChange(opt.value)}
        />
        <span>{opt.label}</span>
      </label>
    ))}
  </fieldset>
);
