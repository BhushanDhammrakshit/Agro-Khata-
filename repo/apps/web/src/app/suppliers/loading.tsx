import { AppShell } from "@/components/AppShell";
import { PageLoading } from "@/components/ui/PageLoading";

export default function Loading() {
  return (
    <AppShell title="Suppliers">
      <PageLoading />
    </AppShell>
  );
}
