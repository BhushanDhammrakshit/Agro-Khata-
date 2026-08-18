import { redirect } from "next/navigation";
import { serverApi } from "@/lib/server-api";
import { CustomersClient } from "./CustomersClient";

export default async function CustomersPage() {
  const parties = await serverApi.listParties("customer").catch((err) => {
    if (err?.status === 401) redirect("/login");
    return [];
  });
  return <CustomersClient initialParties={parties} />;
}
