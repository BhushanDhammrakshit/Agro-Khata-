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
  fetchSuggestions?: (query: string) => Promise<NameSuggestion[]>;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

// Plain-text input with a filtered dropdown of suggested names (no fixed
// list of valid values — any freeform name can still be typed/submitted).
// Suggestions may carry a small "tag" (e.g. Customer/Supplier/Driver) shown
// next to the name so the user knows who each suggestion refers to.
export function NameSuggestInput({ value, onChange, suggestions, fetchSuggestions, placeholder, className, required }: Props) {
  const [open, setOpen] = useState(false);
  const [remoteState, setRemoteState] = useState<{
    query: string;
    suggestions: NameSuggestion[];
    loading: boolean;
    error: boolean;
  } | null>(null);
  const requestId = useRef(0);
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

  useEffect(() => {
    const query = value.trim();
    if (!open || !fetchSuggestions || query.length < 2) return;

    const currentRequestId = ++requestId.current;
    const timeout = window.setTimeout(() => {
      setRemoteState({ query, suggestions: [], loading: true, error: false });
      fetchSuggestions(query)
        .then((results) => {
          if (requestId.current === currentRequestId) {
            setRemoteState({ query, suggestions: results, loading: false, error: false });
          }
        })
        .catch(() => {
          if (requestId.current === currentRequestId) {
            setRemoteState({ query, suggestions: [], loading: false, error: true });
          }
        });
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      requestId.current += 1;
    };
  }, [fetchSuggestions, open, value]);

  const currentRemoteState = remoteState?.query === value.trim() ? remoteState : null;
  const localSuggestions: NameSuggestion[] = suggestions.map((s) => (typeof s === "string" ? { name: s } : s));
  const byName = new Map<string, NameSuggestion>();
  for (const item of [...(currentRemoteState?.suggestions ?? []), ...localSuggestions]) {
    const key = item.name.toLowerCase();
    const existing = byName.get(key);
    if (!existing || (!existing.tag && item.tag)) byName.set(key, item);
  }
  const normalized = Array.from(byName.values());

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
      {open && rect && (filtered.length > 0 || currentRemoteState?.loading || currentRemoteState?.error) && (
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
              className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/40">
              <span className="text-slate-800">{s.name}</span>
              {s.tag && <span className="shrink-0 text-xs lowercase text-slate-400">{s.tag}</span>}
            </li>
          ))}
          {currentRemoteState?.loading && (
            <li className="px-3 py-2 text-slate-500">Searching…</li>
          )}
          {currentRemoteState?.error && (
            <li role="alert" className="px-3 py-2 text-red-600">Could not load all suggestions.</li>
          )}
        </ul>
      )}
    </div>
  );
}
