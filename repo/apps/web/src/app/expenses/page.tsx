import { redirect } from "next/navigation";
import { serverApi } from "@/lib/server-api";
import { ExpensesClient } from "./ExpensesClient";

export default async function ExpensesPage() {
  const expenses = await serverApi.listExpenses().catch((err) => {
    if (err?.status === 401) redirect("/login");
    return [];
  });
  return <ExpensesClient initialExpenses={expenses} />;
}
