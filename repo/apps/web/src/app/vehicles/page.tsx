import { redirect } from "next/navigation";
import { serverApi } from "@/lib/server-api";
import { VehiclesClient } from "./VehiclesClient";

export default async function VehiclesPage() {
  const vehicles = await serverApi.listVehicles().catch((err) => {
    if (err?.status === 401) redirect("/login");
    return [];
  });
  return <VehiclesClient initialVehicles={vehicles} />;
}
