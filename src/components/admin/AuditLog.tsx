"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { User } from "@/types";

type AuditLogRow = {
  id: string;
  actor_email: string | null;
  actor_name: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

interface AuditLogProps {
  user: User;
}

export default function AuditLog({ user }: AuditLogProps) {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const loadLogs = async () => {
      setIsLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/audit-logs?actorId=${user.id}&page=${page}&limit=20`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load audit logs.");
        setLogs(data.logs || []);
        if (data.pagination) setTotalPages(data.pagination.totalPages);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load audit logs.");
      } finally {
        setIsLoading(false);
      }
    };

    loadLogs();
  }, [user.id, page]);

  return (
    <div className="p-4 sm:p-6 space-y-5 overflow-y-auto h-full">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Log</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">System activity for admins</p>
      </div>

      <div className="bg-white dark:bg-pos-card border border-gray-200 dark:border-pos-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-pos-border flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Recent Events</h2>
        </div>

        {error && <div className="m-5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}

        {isLoading ? (
          <div className="p-12 flex flex-col items-center text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary-500" />
            Loading audit log...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">No audit events yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  {["Time", "Actor", "Action", "Entity", "Details"].map((header) => (
                    <th key={header} className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-pos-border">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(log.created_at)}</td>
                    <td className="px-5 py-4 text-sm text-gray-900 dark:text-white">
                      <div>{log.actor_name || "System"}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{log.actor_email || log.actor_role || ""}</div>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-gray-900 dark:text-white">{log.action.replaceAll("_", " ")}</td>
                    <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{log.entity_type}</td>
                    <td className="px-5 py-4 text-xs font-mono text-gray-500 dark:text-gray-400 max-w-md truncate">
                      {log.details ? JSON.stringify(log.details) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {totalPages > 1 && (
              <div className="px-5 py-4 border-t border-gray-200 dark:border-pos-border flex items-center justify-between">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || isLoading}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Page <span className="font-semibold text-gray-900 dark:text-white">{page}</span> of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || isLoading}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
