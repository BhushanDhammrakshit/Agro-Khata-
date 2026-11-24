// Shared Tailwind class strings so every form field/table looks the same across pages.
export const inputClass =
  "w-full rounded-none border border-[var(--color-border)] bg-[var(--color-paper-light)] px-3 py-2.5 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 disabled:bg-[var(--color-paper)] disabled:text-[var(--color-muted)]";

export const selectClass = inputClass;

export const labelClass = "text-sm font-bold text-[var(--color-ink)]";

export const fieldGroupClass = "flex flex-col gap-1.5";

export const tableWrapClass = "overflow-x-auto border-y border-[var(--color-border)] bg-[var(--color-paper-light)]";

export const thClass = "border-b border-[var(--color-border)] bg-[var(--color-paper)] px-4 py-3 text-left text-xs font-bold text-[var(--color-ink-soft)]";

export const tdClass = "border-b border-[var(--color-line)] px-4 py-3 text-sm text-[var(--color-ink)]";

export const linkClass = "font-medium text-emerald-700 hover:text-emerald-800 hover:underline dark:text-emerald-400 dark:hover:text-emerald-300";
