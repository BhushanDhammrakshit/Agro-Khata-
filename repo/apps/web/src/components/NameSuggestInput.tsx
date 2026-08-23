"use client";

import { useEffect, useRef, useState } from "react";
import { useFloatingPosition } from "@/lib/use-floating-position";

interface Props {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
  required?: boolean;
}

// Plain-text input with a filtered dropdown of suggested names (no fixed
// list of valid values — any freeform name can still be typed/submitted).
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

  const filtered = (value.trim()
    ? suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase()))
    : suggestions
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
          {filtered.map((name) => (
            <li key={name}
              onMouseDown={(e) => { e.preventDefault(); onChange(name); setOpen(false); }}
              className="cursor-pointer px-3 py-2 text-slate-800 hover:bg-emerald-50">
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
