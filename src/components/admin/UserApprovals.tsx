"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { User } from "@/types";

interface UserApprovalsProps {
  user: User;
}

export default function UserApprovals({ user }: UserApprovalsProps) {
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [actionUserId, setActionUserId] = useState("");

  const loadPending = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/users/pending?actorId=${user.id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load approvals.");
      setPendingUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load approvals.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const decide = async (targetId: string, decision: "approve" | "reject") => {
    setActionUserId(targetId);
    setError("");
    try {
      const response = await fetch("/api/users/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorId: user.id, targetId, decision }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update account.");
      await loadPending();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update account.");
    } finally {
      setActionUserId("");
    }
  };

  const targetRole = user.role === "admin" ? "manager" : "cashier";

  return (
    <div className="p-4 sm:p-6 space-y-5 overflow-y-auto h-full">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Approvals</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Pending {targetRole} accounts</p>
      </div>

      <div className="bg-white dark:bg-pos-card border border-gray-200 dark:border-pos-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-pos-border flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Review Queue</h2>
        </div>

        {error && <div className="m-5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}

        {isLoading ? (
          <div className="p-12 flex flex-col items-center text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary-500" />
            Loading approvals...
          </div>
        ) : pendingUsers.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">No pending {targetRole} accounts.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  {["Name", "Email", "Role", "Requested", "Actions"].map((header) => (
                    <th key={header} className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-pos-border">
                {pendingUsers.map((pendingUser) => (
                  <tr key={pendingUser.id}>
                    <td className="px-5 py-4 text-sm font-medium text-gray-900 dark:text-white">{pendingUser.full_name}</td>
                    <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{pendingUser.email}</td>
                    <td className="px-5 py-4 text-sm capitalize text-gray-700 dark:text-gray-300">{pendingUser.role}</td>
                    <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{formatDate(pendingUser.created_at)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => decide(pendingUser.id, "approve")}
                          disabled={actionUserId === pendingUser.id}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-sm font-medium"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => decide(pendingUser.id, "reject")}
                          disabled={actionUserId === pendingUser.id}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white text-sm font-medium"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
