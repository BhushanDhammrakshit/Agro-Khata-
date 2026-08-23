import { redirect } from "next/navigation";
import { serverApi } from "@/lib/server-api";
import { TransactionsClient } from "./TransactionsClient";

export default async function TransactionsPage() {
  const [transactions, parties, drivers] = await Promise.all([
    serverApi.listTransactions().catch((err) => {
      if (err?.status === 401) redirect("/login");
      return [];
    }),
    serverApi.listParties().catch(() => []),
    serverApi.listDrivers().catch(() => []),
  ]);

  const payeeSuggestions = Array.from(
    new Set([...parties.map((p) => p.name), ...drivers.map((d) => d.name)]),
  ).sort((a, b) => a.localeCompare(b));

  const bankSuggestions = Array.from(
    new Set(parties.map((p) => p.bankName).filter((b): b is string => !!b)),
  ).sort((a, b) => a.localeCompare(b));

  return (
    <TransactionsClient
      initialTransactions={transactions}
      payeeSuggestions={payeeSuggestions}
      bankSuggestions={bankSuggestions}
    />
  );
}
