"use client";

import { useEffect, useRef, useState } from "react";
import { useFloatingPosition } from "@/lib/use-floating-position";

export interface ActionsMenuItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
}

// Three-dot "more actions" trigger + floating dropdown, used to tuck secondary row actions
// (Print / Share / Edit / Delete) behind one button instead of cluttering the table.
export function ActionsMenu({ items }: { items: ActionsMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const rect = useFloatingPosition(btnRef, open, 180);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      const target = e.target as Node;
      if (btnRef.current && btnRef.current.contains(target)) return;
      if (menuRef.current && menuRef.current.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="inline-block">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        title="More actions"
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
          <path d="M10 5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm0 6.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3ZM10 18a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" />
        </svg>
      </button>

      {open && rect && (
        <ul
          ref={menuRef}
          role="menu"
          style={{
            position: "fixed",
            top: rect.placement === "bottom" ? rect.top : undefined,
            bottom: rect.placement === "top" ? rect.bottom : undefined,
            left: rect.left,
            width: rect.width,
            maxHeight: rect.maxHeight,
            zIndex: 9999,
          }}
          className="overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {items.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { setOpen(false); item.onClick(); }}
                className={`flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 ${
                  item.tone === "danger" ? "text-red-600" : "text-slate-700"
                }`}
              >
                <span className="shrink-0">{item.icon}</span>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
