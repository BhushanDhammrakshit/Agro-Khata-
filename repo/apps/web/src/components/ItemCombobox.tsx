"use client";

import { useEffect, useRef, useState } from "react";
import { Item } from "@/lib/api";

interface Props {
  items: Item[];
  value: string;
  onTextChange: (name: string) => void;
  onSelect: (item: Item) => void;
  placeholder?: string;
  className?: string;
}

interface Rect { top: number; left: number; width: number; }

export function ItemCombobox({ items, value, onTextChange, onSelect, placeholder, className }: Props) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function updateRect() {
    if (inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setRect({ top: r.bottom, left: r.left, width: r.width });
    }
  }

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (inputRef.current && inputRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    function reposition() { updateRect(); }
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
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
        onChange={(e) => { onTextChange(e.target.value); updateRect(); setOpen(true); }}
        onFocus={() => { updateRect(); setOpen(true); }}
      />
      {open && filtered.length > 0 && rect && (
        <ul
          style={{ position: "fixed", top: rect.top + 4, left: rect.left, width: Math.max(rect.width, 240), zIndex: 9999 }}
          className="max-h-52 overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg text-sm"
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
