"use client";

import { useEffect, useRef, useState } from "react";
import { Item } from "@/lib/api";
import { useFloatingPosition } from "@/lib/use-floating-position";

interface Props {
  items: Item[];
  value: string;
  onTextChange: (name: string) => void;
  onSelect: (item: Item) => void;
  placeholder?: string;
  className?: string;
}

export function ItemCombobox({ items, value, onTextChange, onSelect, placeholder, className }: Props) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const rect = useFloatingPosition(inputRef, open, 240);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (inputRef.current && inputRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const filtered = value.trim()
    ? items.filter((i) => i.name.toLowerCase().includes(value.toLowerCase()))
    : items;

  return (
    <div className="relative">
      <input
        ref={inputRef}
        required
        value={value}
        placeholder={placeholder ?? "Item"}
        autoComplete="off"
        className={className}
        onChange={(e) => { onTextChange(e.target.value); setOpen(true); }}
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
          {filtered.map((it) => (
            <li key={it.id}
              onMouseDown={(e) => { e.preventDefault(); onSelect(it); setOpen(false); }}
              className="cursor-pointer px-3 py-2 hover:bg-emerald-50">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-slate-900">{it.name}</span>
                <span className="text-xs text-slate-400">
                  {it.salePrice ? `₹${it.salePrice}` : it.defaultRate ? `₹${it.defaultRate}` : ""} / {it.uom}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Stock: {parseFloat(it.currentStock).toLocaleString("en-IN")}
                {parseFloat(it.gstRate) > 0 && ` · GST ${it.gstRate}%`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
