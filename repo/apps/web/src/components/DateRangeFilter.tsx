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
    <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
      <div className="min-w-0">
        <label className="mb-1.5 block text-sm font-medium text-slate-700">From</label>
        <input type="date" value={from} onChange={(e) => onFrom(e.target.value)} className={inputClass + " min-w-[9.5rem] py-1.5 text-sm"} />
      </div>
      <div className="min-w-0">
        <label className="mb-1.5 block text-sm font-medium text-slate-700">To</label>
        <input type="date" value={to} onChange={(e) => onTo(e.target.value)} className={inputClass + " min-w-[9.5rem] py-1.5 text-sm"} />
      </div>
    </div>
  );
}
