"use client";

import { inputClass } from "@/components/ui/styles";

/** Strips +91 prefix for display; stores/emits 10-digit value; prepends +91 on blur/change. */
export function stripPrefix(phone: string) {
  return phone.replace(/^\+91/, "");
}

/** Always returns "+91XXXXXXXXXX" from a raw 10-digit or already-prefixed value. */
export function withPrefix(phone: string) {
  const digits = phone.replace(/^\+91/, "").trim();
  return digits ? "+91" + digits : "";
}

interface Props {
  value: string;           // 10-digit display value (no +91)
  onChange: (val: string) => void;
  required?: boolean;
  className?: string;
  placeholder?: string;
}

export function PhoneInput({ value, onChange, required, className, placeholder = "9876543210" }: Props) {
  return (
    <div className="flex">
      <span className="flex items-center rounded-l-lg border border-r-0 border-slate-300 bg-slate-100 px-3 text-sm text-slate-500 select-none">
        +91
      </span>
      <input
        type="tel"
        required={required}
        maxLength={10}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
        className={(className ?? inputClass) + " rounded-l-none"}
      />
    </div>
  );
}
