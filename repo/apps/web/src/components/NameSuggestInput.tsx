"use client";

import { useEffect, useRef, useState } from "react";
import { useFloatingPosition } from "@/lib/use-floating-position";

export interface NameSuggestion {
  name: string;
  tag?: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  suggestions: (string | NameSuggestion)[];
  placeholder?: string;
  className?: string;
  required?: boolean;
}

// Plain-text input with a filtered dropdown of suggested names (no fixed
// list of valid values — any freeform name can still be typed/submitted).
// Suggestions may carry a small "tag" (e.g. Customer/Supplier/Driver) shown
// next to the name so the user knows who each suggestion refers to.
export function NameSuggestInput({ value, onChange, suggestions, placeholder, className, required }: Props) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const rect = useFloatingPosition(inputRef, open, 220);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (inputRef.current && inputRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const normalized: NameSuggestion[] = suggestions.map((s) => (typeof s === "string" ? { name: s } : s));

  const filtered = (value.trim()
    ? normalized.filter((s) => s.name.toLowerCase().includes(value.toLowerCase()))
    : normalized
  ).slice(0, 8);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        required={required}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        className={className}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && rect && (
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
          className="overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg text-sm"
        >
          {filtered.map((s, i) => (
            <li key={`${s.name}-${i}`}
              onMouseDown={(e) => { e.preventDefault(); onChange(s.name); setOpen(false); }}
              className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 hover:bg-emerald-50">
              <span className="text-slate-800">{s.name}</span>
              {s.tag && <span className="shrink-0 text-xs lowercase text-slate-400">{s.tag}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
