"use client";

import { inputClass } from "@/components/ui/styles";

interface Props {
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
}

export function DateRangeFilter({ from, to, onFrom, onTo }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <label className="text-sm text-slate-500">From</label>
        <input type="date" value={from} onChange={(e) => onFrom(e.target.value)} className={inputClass + " py-1.5 text-sm"} />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-slate-500">To</label>
        <input type="date" value={to} onChange={(e) => onTo(e.target.value)} className={inputClass + " py-1.5 text-sm"} />
      </div>
    </div>
  );
}
