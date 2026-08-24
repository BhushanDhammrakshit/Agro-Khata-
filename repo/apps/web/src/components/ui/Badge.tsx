export type BadgeTone = "slate" | "blue" | "amber" | "purple" | "green" | "red";

const TONE_CLASSES: Record<BadgeTone, string> = {
  slate: "bg-slate-100 text-slate-700",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
  purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  red: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
};

export function Badge({ tone = "slate", children }: { tone?: BadgeTone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONE_CLASSES[tone]}`}>
      {children}
    </span>
  );
}
