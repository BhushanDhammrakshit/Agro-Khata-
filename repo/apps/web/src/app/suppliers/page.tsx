import { redirect } from "next/navigation";
import { serverApi } from "@/lib/server-api";
import { SuppliersClient } from "./SuppliersClient";

export default async function SuppliersPage() {
  const parties = await serverApi.listParties("supplier").catch((err) => {
    if (err?.status === 401) redirect("/login");
    return [];
  });
  return <SuppliersClient initialParties={parties} />;
}
