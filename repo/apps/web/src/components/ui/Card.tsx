export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`border border-[var(--color-border)] bg-[var(--color-paper-light)] p-5 ${className}`}>{children}</div>;
}
