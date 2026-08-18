import { redirect } from "next/navigation";
import { serverApi } from "@/lib/server-api";
import { DriversClient } from "./DriversClient";

export default async function DriversPage() {
  const drivers = await serverApi.listDrivers().catch((err) => {
    if (err?.status === 401) redirect("/login");
    return [];
  });
  return <DriversClient initialDrivers={drivers} />;
}
