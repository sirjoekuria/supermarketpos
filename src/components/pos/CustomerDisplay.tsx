"use client";

import { useEffect, useState } from "react";
import { ShoppingCart, Clock, X, Tag } from "lucide-react";
import { useCartStore, useUIStore } from "@/store";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

function ProductImage({
  imageUrl,
  name,
  size = "md",
}: {
  imageUrl?: string;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "lg"
      ? "w-28 h-28 sm:w-36 sm:h-36 rounded-2xl"
      : size === "sm"
      ? "w-12 h-12 sm:w-14 sm:h-14 rounded-xl"
      : "w-16 h-16 sm:w-20 sm:h-20 rounded-xl";

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={cn(sizeClass, "object-cover border border-white/10 flex-shrink-0")}
      />
    );
  }

  return (
    <div
      className={cn(
        sizeClass,
        "bg-white/10 flex items-center justify-center flex-shrink-0 border border-white/10"
      )}
    >
      <Tag className={cn(size === "lg" ? "w-10 h-10" : "w-6 h-6", "text-white/40")} />
    </div>
  );
}

export default function CustomerDisplay() {
  const { items, getTotals, lastScannedProduct } = useCartStore();
  const { customerDisplay, toggleCustomerDisplay } = useUIStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  const totals = getTotals();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "pos-cart") {
        useCartStore.persist.rehydrate();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  if (!customerDisplay) return null;

  return (
    <div className="fixed inset-0 z-40 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-6 border-b border-white/10">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-primary-400" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-white">Customer Display</h1>
            <p className="text-xs sm:text-sm text-gray-400 hidden sm:block">Real-time cart updates</p>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:gap-8">
          <div className="text-right hidden sm:block">
            <p className="text-2xl sm:text-3xl font-mono font-bold text-white">
              {currentTime.toLocaleTimeString("en-KE", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p className="text-xs sm:text-sm text-gray-400">
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
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors border border-white/10"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Last scanned item — prominent for customer */}
      {lastScannedProduct && (
        <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-primary-500/20 bg-primary-500/10">
          <p className="text-xs sm:text-sm font-semibold text-primary-300 uppercase tracking-wider mb-3">
            Just Scanned
          </p>
          <div className="flex items-center gap-4 sm:gap-6">
            <ProductImage
              imageUrl={lastScannedProduct.image_url}
              name={lastScannedProduct.name}
              size="lg"
            />
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-3xl font-bold text-white truncate">
                {lastScannedProduct.name}
              </h2>
              <p className="text-sm sm:text-lg text-primary-300 font-semibold mt-1">
                {formatCurrency(lastScannedProduct.price)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Items List */}
        <div className="flex-1 p-4 sm:p-8 overflow-y-auto">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <ShoppingCart className="w-16 h-16 sm:w-24 sm:h-24 mb-4 sm:mb-6 opacity-20" />
              <p className="text-xl sm:text-2xl font-medium">Ready to serve you</p>
              <p className="text-base sm:text-lg mt-2 text-center">Items will appear here as they are scanned</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {items.map((item, idx) => {
                const isLatest = lastScannedProduct?.id === item.product.id;
                return (
                  <div
                    key={item.product.id}
                    className={cn(
                      "flex items-center gap-3 sm:gap-6 p-3 sm:p-6 rounded-2xl border transition-all animate-in slide-in-from-right",
                      isLatest
                        ? "bg-primary-500/15 border-primary-500/40 ring-1 ring-primary-500/30"
                        : idx === items.length - 1
                        ? "bg-primary-500/10 border-primary-500/30"
                        : "bg-white/5 border-white/10"
                    )}
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <ProductImage
                      imageUrl={item.product.image_url}
                      name={item.product.name}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-xl font-semibold text-white truncate">
                        {item.product.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-400 mt-0.5 sm:mt-1">
                        {item.quantity}x @ {formatCurrency(item.product.price)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg sm:text-2xl font-bold text-white">
                        {formatCurrency(item.total)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Totals Panel */}
        <div className="w-full lg:w-80 xl:w-96 bg-white/5 border-t lg:border-t-0 lg:border-l border-white/10 p-4 sm:p-6 lg:p-8 flex flex-col">
          <div className="flex-1">
            <h2 className="text-sm sm:text-lg font-medium text-gray-400 mb-3 sm:mb-6">Order Summary</h2>
            <div className="space-y-2 sm:space-y-4">
              <div className="flex justify-between text-base sm:text-lg">
                <span className="text-gray-400">Items</span>
                <span className="text-white font-medium">{items.length}</span>
              </div>
              <div className="flex justify-between text-base sm:text-lg">
                <span className="text-gray-400">Quantity</span>
                <span className="text-white font-medium">
                  {items.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              </div>
              <div className="border-t border-white/10 my-2 sm:my-4" />
              <div className="flex justify-between text-base sm:text-lg">
                <span className="text-gray-400">Subtotal</span>
                <span className="text-white font-medium">
                  {formatCurrency(totals.subtotal)}
                </span>
              </div>
              {totals.discountAmount > 0 && (
                <div className="flex justify-between text-base sm:text-lg">
                  <span className="text-gray-400">Discount</span>
                  <span className="text-green-400 font-medium">
                    -{formatCurrency(totals.discountAmount)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-white/10 pt-4 sm:pt-6">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-lg sm:text-xl text-gray-300">Total</span>
              <span className="text-3xl sm:text-5xl font-bold text-white">
                {formatCurrency(totals.total)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-400">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Waiting for payment...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
