"use client";

import { useEffect, useRef, useState } from "react";
import { useFloatingPosition } from "@/lib/use-floating-position";

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CustomSelect({ value, onChange, options, placeholder = "Select…", className, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const rect = useFloatingPosition(btnRef, open);
  const selected = options.find((o) => o.value === value);

  function openDropdown() {
    if (disabled || !btnRef.current) return;
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (btnRef.current && btnRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className={className}>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => open ? setOpen(false) : openDropdown()}
        className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-900 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      >
        <span className={`truncate ${!selected ? "text-slate-400" : ""}`}>
          {selected ? selected.label : placeholder}
        </span>
        <svg className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && rect && (
        <ul
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
          {options.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onChange(opt.value); setOpen(false); }}
                className={`flex w-full cursor-pointer items-center gap-2 whitespace-nowrap px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 ${opt.value === value ? "font-semibold text-emerald-700" : "text-slate-700"}`}
              >
                {opt.value === value ? (
                  <svg className="h-3.5 w-3.5 shrink-0 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                ) : <span className="w-3.5 shrink-0" />}
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
