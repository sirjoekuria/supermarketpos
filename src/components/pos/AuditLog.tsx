"use client";

import { useState, useEffect } from "react";
import { Clock, AlertCircle, Trash2, Percent, XCircle, CheckCircle2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface AuditEntry {
  id: string;
  action: "remove_item" | "apply_discount" | "void_transaction";
  description: string;
  itemName?: string;
  amount?: number;
  manager: {
    name: string;
    email: string;
  };
  timestamp: string;
  authorizedAt: string;
}

interface AuditLogProps {
  entries: AuditEntry[];
  isOpen: boolean;
  onClose: () => void;
}

export default function AuditLog({ entries, isOpen, onClose }: AuditLogProps) {
  if (!isOpen) return null;

  const getActionIcon = (action: string) => {
    switch (action) {
      case "remove_item":
        return <Trash2 className="w-5 h-5 text-red-500" />;
      case "apply_discount":
        return <Percent className="w-5 h-5 text-blue-500" />;
      case "void_transaction":
        return <XCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <CheckCircle2 className="w-5 h-5 text-gray-500" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "remove_item":
        return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
      case "apply_discount":
        return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
      case "void_transaction":
        return "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
      default:
        return "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-pos-border";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl mx-4 bg-white dark:bg-pos-card rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-pos-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-primary-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Manager Actions Log</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 py-12">
              <Clock className="w-12 h-12 mb-4 opacity-30" />
              <p className="text-lg font-medium">No actions recorded</p>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    "border rounded-lg p-4 transition-all",
                    getActionColor(entry.action)
                  )}
                >
                  <div className="flex items-start gap-3">
                    {getActionIcon(entry.action)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {entry.description}
                      </p>
                      {entry.itemName && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Item: {entry.itemName}
                        </p>
                      )}
                      {entry.amount !== undefined && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Amount: {formatCurrency(entry.amount)}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-medium">{entry.manager.name}</span>
                        <span>•</span>
                        <span>{formatDate(entry.authorizedAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
