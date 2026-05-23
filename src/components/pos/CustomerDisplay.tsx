"use client";

import { useEffect, useState } from "react";
import { ShoppingCart, Clock, X } from "lucide-react";
import { useCartStore, useUIStore } from "@/store";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function CustomerDisplay() {
  const { items, getTotals } = useCartStore();
  const { customerDisplay, toggleCustomerDisplay } = useUIStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  const totals = getTotals();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!customerDisplay) return null;

  return (
    <div className="fixed inset-0 z-40 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
            <ShoppingCart className="w-6 h-6 text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Customer Display</h1>
            <p className="text-sm text-gray-400">Real-time cart updates</p>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div className="text-right">
            <p className="text-3xl font-mono font-bold text-white">
              {currentTime.toLocaleTimeString("en-KE", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p className="text-sm text-gray-400">
              {currentTime.toLocaleDateString("en-KE", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <button 
            onClick={toggleCustomerDisplay}
            className="w-12 h-12 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors border border-white/10"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Items List */}
        <div className="flex-1 p-8 overflow-y-auto">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <ShoppingCart className="w-24 h-24 mb-6 opacity-20" />
              <p className="text-2xl font-medium">Ready to serve you</p>
              <p className="text-lg mt-2">Items will appear here as they are scanned</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, idx) => (
                <div
                  key={item.product.id}
                  className={cn(
                    "flex items-center gap-6 p-6 rounded-2xl border transition-all animate-in slide-in-from-right",
                    idx === items.length - 1
                      ? "bg-primary-500/10 border-primary-500/30"
                      : "bg-white/5 border-white/10"
                  )}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl font-bold text-white/60">
                      {item.quantity}x
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white">
                      {item.product.name}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">{item.product.barcode}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(item.total)}
                    </p>
                    <p className="text-sm text-gray-400">
                      {formatCurrency(item.product.price)} each
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals Sidebar */}
        <div className="w-96 bg-white/5 border-l border-white/10 p-8 flex flex-col">
          <div className="flex-1">
            <h2 className="text-lg font-medium text-gray-400 mb-6">Order Summary</h2>
            <div className="space-y-4">
              <div className="flex justify-between text-lg">
                <span className="text-gray-400">Items</span>
                <span className="text-white font-medium">{items.length}</span>
              </div>
              <div className="flex justify-between text-lg">
                <span className="text-gray-400">Quantity</span>
                <span className="text-white font-medium">
                  {items.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              </div>
              <div className="border-t border-white/10 my-4" />
              <div className="flex justify-between text-lg">
                <span className="text-gray-400">Subtotal</span>
                <span className="text-white font-medium">
                  {formatCurrency(totals.subtotal)}
                </span>
              </div>
              {totals.discountAmount > 0 && (
                <div className="flex justify-between text-lg">
                  <span className="text-gray-400">Discount</span>
                  <span className="text-green-400 font-medium">
                    -{formatCurrency(totals.discountAmount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-lg">
                <span className="text-gray-400">Tax</span>
                <span className="text-white font-medium">
                  {formatCurrency(totals.taxAmount)}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-xl text-gray-300">Total</span>
              <span className="text-5xl font-bold text-white">
                {formatCurrency(totals.total)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Clock className="w-4 h-4" />
              <span>Waiting for payment...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
