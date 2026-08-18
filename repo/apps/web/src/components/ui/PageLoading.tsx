// Shown instantly on navigation (via Next.js loading.tsx) while a route's
// server-fetched data is still in flight, so tab switches never feel blocked.
export function PageLoading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-slate-500">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />
      <p className="text-sm font-medium">Loading…</p>
    </div>
  );
}
