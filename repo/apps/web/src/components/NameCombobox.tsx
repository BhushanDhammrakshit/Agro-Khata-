"use client";

import { useEffect, useRef, useState } from "react";
import { useFloatingPosition } from "@/lib/use-floating-position";

interface Props<T extends { id: string }> {
  entities: T[];
  value: string; // free-text name typed / selected
  getLabel: (entity: T) => string;
  getSubLabel?: (entity: T) => string | undefined;
  onTextChange: (text: string) => void;
  onSelect: (entity: T) => void;
  onCreate: (name: string) => Promise<T>;
  onCreated: (entity: T) => void;
  placeholder?: string;
  createLabel: string; // e.g. "driver", "vehicle"
  className?: string;
}

export function NameCombobox<T extends { id: string }>({
  entities, value, getLabel, getSubLabel, onTextChange, onSelect, onCreate, onCreated, placeholder, createLabel, className,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rect = useFloatingPosition(inputRef, open);

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
    ? entities.filter((e) => getLabel(e).toLowerCase().includes(value.toLowerCase()))
    : entities;

  const exactMatch = entities.some((e) => getLabel(e).toLowerCase() === value.trim().toLowerCase());
  const showCreate = value.trim().length > 0 && !exactMatch;

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const entity = await onCreate(value.trim());
      onCreated(entity);
      onSelect(entity);
      setOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        placeholder={placeholder ?? `Search or create ${createLabel}…`}
        autoComplete="off"
        className={className ?? "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"}
        onChange={(e) => { onTextChange(e.target.value); setOpen(true); setError(null); }}
        onFocus={() => setOpen(true)}
      />

      {open && (filtered.length > 0 || showCreate) && rect && (
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
          {filtered.map((entity) => (
            <li key={entity.id}
              onMouseDown={(e) => { e.preventDefault(); onSelect(entity); setOpen(false); }}
              className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/40">
              <span className="font-medium text-slate-900">{getLabel(entity)}</span>
              {getSubLabel?.(entity) && <span className="text-xs text-slate-400">{getSubLabel(entity)}</span>}
            </li>
          ))}
          {showCreate && (
            <li onMouseDown={(e) => { e.preventDefault(); handleCreate(); }}
              className="flex cursor-pointer items-center gap-2 border-t border-slate-100 px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 font-medium">
              {creating ? "Creating…" : `+ Create "${value.trim()}"`}
            </li>
          )}
        </ul>
      )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
