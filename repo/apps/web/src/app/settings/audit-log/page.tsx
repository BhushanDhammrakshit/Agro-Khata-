"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, AuditLogEntry } from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { AppShell } from "@/components/AppShell";
import { tableWrapClass, tdClass, thClass } from "@/components/ui/styles";

export default function AuditLogPage() {
  const router = useRouter();
  const { dict } = useLanguage();
  const [entries, setEntries] = useState<AuditLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getAuditLogs()
      .then(setEntries)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
          return;
        }
        setError(err instanceof ApiError ? err.message : "Failed to load audit log.");
      });
  }, [router]);

  return (
    <AppShell title={dict.auditLog.heading}>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {entries && entries.length === 0 && <p className="text-sm text-slate-500">{dict.auditLog.empty}</p>}

      {entries && entries.length > 0 && (
        <div className={tableWrapClass}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className={thClass}>{dict.auditLog.columnTime}</th>
                <th className={thClass}>{dict.auditLog.columnAction}</th>
                <th className={thClass}>{dict.auditLog.columnEntity}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50">
                  <td className={`${tdClass} whitespace-nowrap`}>{new Date(entry.createdAt).toLocaleString()}</td>
                  <td className={tdClass}>{entry.action}</td>
                  <td className={tdClass}>{entry.entityType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
