"use client";

import { useEffect, useRef, useState } from "react";
import { api, Party, PartyType } from "@/lib/api";

interface Props {
  partyType: PartyType;
  parties: Party[];
  value: string; // selected partyId
  onChange: (partyId: string) => void;
  onPartyCreated: (party: Party) => void;
  placeholder?: string;
}

export function PartyCombobox({ partyType, parties, value, onChange, onPartyCreated, placeholder }: Props) {
  const selectedParty = parties.find((p) => p.id === value);
  const [query, setQuery] = useState(selectedParty?.name ?? "");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync display text when selection changes externally
  useEffect(() => {
    if (value) {
      const p = parties.find((p) => p.id === value);
      if (p) setQuery(p.name);
    }
  }, [value, parties]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = query.trim()
    ? parties.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    : parties;

  const exactMatch = parties.some((p) => p.name.toLowerCase() === query.trim().toLowerCase());
  const showCreate = query.trim().length > 0 && !exactMatch;

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const party = await api.createParty({ name: query.trim(), partyType });
      onPartyCreated(party);
      onChange(party.id);
      setQuery(party.name);
      setOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create.");
    } finally {
      setCreating(false);
    }
  }

  function select(party: Party) {
    onChange(party.id);
    setQuery(party.name);
    setOpen(false);
  }

  const label = partyType === "customer" ? "customer" : "supplier";

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        placeholder={placeholder ?? `Search or create ${label}…`}
        autoComplete="off"
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(""); // clear selection while typing
          setOpen(true);
          setError(null);
        }}
        onFocus={() => setOpen(true)}
      />

      {open && (filtered.length > 0 || showCreate) && (
        <ul className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg text-sm">
          {filtered.map((p) => (
            <li key={p.id}
              onMouseDown={(e) => { e.preventDefault(); select(p); }}
              className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-emerald-50">
              <span className="font-medium text-slate-900">{p.name}</span>
              {p.phone && <span className="text-xs text-slate-400">{p.phone}</span>}
            </li>
          ))}
          {showCreate && (
            <li onMouseDown={(e) => { e.preventDefault(); handleCreate(); }}
              className="flex cursor-pointer items-center gap-2 border-t border-slate-100 px-3 py-2 hover:bg-emerald-50 text-emerald-700 font-medium">
              {creating ? "Creating…" : `+ Create "${query.trim()}"`}
            </li>
          )}
        </ul>
      )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

