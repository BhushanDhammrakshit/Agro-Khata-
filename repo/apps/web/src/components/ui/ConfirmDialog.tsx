"use client";

import { createPortal } from "react-dom";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Styled replacement for window.confirm() — rendered via portal so it always sits above
// any local stacking context (table rows, modals, etc.), matching the app's own look.
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl"
      >
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="cursor-pointer rounded-none border border-[var(--color-border)] bg-[var(--color-paper-light)] px-4 py-2 text-sm font-bold text-[var(--color-ink)] hover:border-[var(--color-accent)] hover:bg-[var(--color-paper)] disabled:cursor-not-allowed disabled:opacity-60 dark:hover:border-[var(--color-accent-dark-theme)] dark:hover:bg-[var(--color-elevated-dark)]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            aria-busy={busy}
            className={`cursor-pointer rounded-none px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60 ${
              danger
                ? "border border-[#87382F] bg-[#87382F] text-white hover:bg-[#A74636] dark:border-[#D99080] dark:bg-[#573638] dark:text-[#F0C3BA] dark:hover:bg-[#664144]"
                : "border border-[var(--color-accent)] bg-[var(--color-accent)] text-[#1E1F2B] hover:bg-[var(--color-accent-dark)] dark:border-[var(--color-accent-dark-theme)] dark:bg-[var(--color-accent-dark-theme)] dark:hover:bg-[var(--color-accent-strong-dark)]"
            }`}
          >
            {busy ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
