import { redirect } from "next/navigation";
import { serverApi } from "@/lib/server-api";
import { ItemsClient } from "./ItemsClient";

export default async function ItemsPage() {
  const items = await serverApi.listItems().catch((err) => {
    if (err?.status === 401) redirect("/login");
    return [];
  });
  return <ItemsClient initialItems={items} />;
}
