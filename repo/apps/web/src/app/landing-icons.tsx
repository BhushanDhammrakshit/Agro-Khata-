// Inline SVGs for the landing page feature grid, keyed by the `icon` id in the landing dictionary.
const paths: Record<string, string> = {
  invoice:
    "M9 7h6M9 11h6M9 15h4M7 3h10a2 2 0 0 1 2 2v14l-3-2-2 2-2-2-2 2-2-2-3 2V5a2 2 0 0 1 2-2Z",
  ledger:
    "M4 6h16M4 12h16M4 18h10M4 4v16M20 4v8",
  wallet:
    "M3 7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1h1a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm14 6h.01",
  truck:
    "M3 7h10v8H3zM13 10h4l3 3v2h-7zM6.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM17.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
  chart:
    "M4 20V10M10 20V4M16 20v-7M4 20h16",
  building:
    "M4 21V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v17M4 21h16M12 21v-6h4a1 1 0 0 1 1 1v5M7 6h1M7 10h1M7 14h1",
};

export function FeatureIcon({ icon }: { icon: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d={paths[icon] ?? paths.invoice} />
    </svg>
  );
}
