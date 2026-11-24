import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-[var(--color-ink)] text-[var(--color-paper-light)] hover:bg-[var(--color-ink-soft)] disabled:opacity-50 dark:bg-[var(--color-accent-dark-theme)] dark:text-[var(--color-bg-dark)] dark:hover:bg-[var(--color-accent-strong-dark)]",
  secondary: "bg-[var(--color-paper-light)] text-[var(--color-ink)] border border-[var(--color-border)] hover:bg-[var(--color-paper)] disabled:text-[var(--color-muted)]",
  danger: "bg-[var(--color-danger)] text-white hover:brightness-90 disabled:opacity-50",
  ghost: "bg-transparent text-[var(--color-ink-soft)] hover:bg-[var(--color-paper)]",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-none px-4 py-2 text-sm font-bold transition-colors disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
