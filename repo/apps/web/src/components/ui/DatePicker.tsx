"use client";

import { useEffect, useRef, useState } from "react";
import { useFloatingPosition } from "@/lib/use-floating-position";

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  /** Use a smaller footprint for inline filter bars (e.g. date-range filters). */
  size?: "md" | "sm";
  className?: string;
}

const weekDays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const monthFormatter = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" });
const dateFormatter = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });

function fromIso(value: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toIso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

export function DatePicker({ value, onChange, required = false, size = "md", className = "" }: DatePickerProps) {
  const selectedDate = fromIso(value);
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => selectedDate ?? new Date());
  const containerRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const rect = useFloatingPosition(btnRef, isOpen, 304);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDayOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays = Array.from({ length: firstDayOffset + daysInMonth }, (_, index) => (
    index < firstDayOffset ? null : new Date(year, month, index - firstDayOffset + 1)
  ));

  function moveMonth(offset: number) {
    setVisibleMonth(new Date(year, month + offset, 1));
  }

  function selectDate(date: Date) {
    onChange(toIso(date));
    setVisibleMonth(date);
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-required={required}
        onClick={() => {
          setVisibleMonth(selectedDate ?? new Date());
          setIsOpen((open) => !open);
        }}
        className={`flex w-full cursor-pointer items-center justify-between rounded-lg border border-slate-300 bg-white text-left text-slate-900 transition-colors hover:border-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${size === "sm" ? "px-2.5 py-1.5 text-sm" : "px-3 py-2 text-sm"} ${className}`}
      >
        <span className={selectedDate ? "" : "text-slate-400"}>
          {selectedDate ? dateFormatter.format(selectedDate) : "Select date"}
        </span>
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z" />
        </svg>
      </button>

      {isOpen && rect && (
        <div
          role="dialog"
          aria-label="Choose date"
          style={{
            position: "fixed",
            top: rect.placement === "bottom" ? rect.top : undefined,
            bottom: rect.placement === "top" ? rect.bottom : undefined,
            left: rect.left,
            width: rect.width,
            zIndex: 9999,
          }}
          className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10"
        >
          <div className="flex items-center justify-between bg-emerald-600 px-3 py-2.5">
            <button type="button" aria-label="Previous month" onClick={() => moveMonth(-1)} className="grid h-7 w-7 cursor-pointer place-items-center rounded-md text-white/90 transition-colors hover:bg-white/20">‹</button>
            <p className="text-sm font-semibold text-white">{monthFormatter.format(visibleMonth)}</p>
            <button type="button" aria-label="Next month" onClick={() => moveMonth(1)} className="grid h-7 w-7 cursor-pointer place-items-center rounded-md text-white/90 transition-colors hover:bg-white/20">›</button>
          </div>

          <div className="p-3">
            <div className="grid grid-cols-7 gap-1 text-center">
              {weekDays.map((day) => <span key={day} className="py-1 text-[11px] font-semibold text-slate-400">{day}</span>)}
              {calendarDays.map((date, index) => date ? (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => selectDate(date)}
                  className={`h-8 cursor-pointer rounded-full text-xs font-medium transition-colors ${
                    selectedDate && isSameDay(date, selectedDate)
                      ? "bg-emerald-600 text-white shadow-sm"
                      : isSameDay(date, new Date())
                        ? "border border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                        : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {date.getDate()}
                </button>
              ) : <span key={`empty-${index}`} />)}
            </div>

            <div className="mt-3 flex justify-end border-t border-slate-100 pt-2">
              <button type="button" onClick={() => selectDate(new Date())} className="cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">Today</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}