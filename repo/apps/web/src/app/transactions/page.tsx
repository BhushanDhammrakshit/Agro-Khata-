import { redirect } from "next/navigation";
import { serverApi } from "@/lib/server-api";
import type { NameSuggestion } from "@/components/NameSuggestInput";
import { TransactionsClient } from "./TransactionsClient";

function partyTag(partyType: "customer" | "supplier" | "both") {
  if (partyType === "customer") return "customer";
  if (partyType === "supplier") return "supplier";
  return "customer & supplier";
}

export default async function TransactionsPage() {
  const [transactions, parties, drivers] = await Promise.all([
    serverApi.listTransactions().catch((err) => {
      if (err?.status === 401) redirect("/login");
      return [];
    }),
    serverApi.listParties().catch(() => []),
    serverApi.listDrivers().catch(() => []),
  ]);

  const payeeSuggestions: NameSuggestion[] = [
    ...parties.map((p) => ({ name: p.name, tag: partyTag(p.partyType) })),
    ...drivers.map((d) => ({ name: d.name, tag: "driver" })),
  ];

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
