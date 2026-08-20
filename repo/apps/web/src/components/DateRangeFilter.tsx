"use client";

import { DatePicker } from "@/components/ui/DatePicker";

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
        <DatePicker size="sm" value={from} onChange={onFrom} className="min-w-[9.5rem]" />
      </div>
      <div className="min-w-0">
        <label className="mb-1.5 block text-sm font-medium text-slate-700">To</label>
        <DatePicker size="sm" value={to} onChange={onTo} className="min-w-[9.5rem]" />
      </div>
    </div>
  );
}
