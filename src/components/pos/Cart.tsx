"use client";

import { useState } from "react";
import { Minus, Plus, Trash2, ShoppingCart, Tag, Percent } from "lucide-react";
import { useCartStore } from "@/store";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function Cart() {
  const { items, removeItem, updateQuantity, updateDiscount, getTotals } =
    useCartStore();
  const [discountInput, setDiscountInput] = useState<Record<string, string>>({});
  const totals = getTotals();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-gray-400 dark:text-gray-500">
        <ShoppingCart className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg font-medium">Your cart is empty</p>
        <p className="text-sm mt-1">Scan or search for products to add</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {items.map((item) => (
          <div
            key={item.product.id}
            className="group bg-white dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-pos-border hover:border-primary-200 dark:hover:border-primary-700 transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="w-14 h-14 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                {item.product.image_url ? (
                  <img
                    src={item.product.image_url}
                    alt={item.product.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <Tag className="w-6 h-6 text-gray-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                  {item.product.name}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {item.product.barcode}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                    {formatCurrency(item.product.price)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        updateQuantity(item.product.id, item.quantity - 1)
                      }
                      className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-medium text-gray-900 dark:text-white">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        updateQuantity(item.product.id, item.quantity + 1)
                      }
                      className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <Percent className="w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountInput[item.product.id] ?? item.discount}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDiscountInput((prev) => ({
                        ...prev,
                        [item.product.id]: val,
                      }));
                      const numVal = parseFloat(val);
                      if (!isNaN(numVal) && numVal >= 0 && numVal <= 100) {
                        updateDiscount(item.product.id, numVal);
                      }
                    }}
                    className="w-16 px-2 py-1 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="0%"
                  />
                  <span className="text-xs text-gray-400">discount</span>
                </div>
              </div>

              <button
                onClick={() => removeItem(item.product.id)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Cart Totals */}
      <div className="border-t border-gray-200 dark:border-pos-border bg-gray-50 dark:bg-gray-800/50 p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
          <span className="text-gray-900 dark:text-white font-medium">
            {formatCurrency(totals.subtotal)}
          </span>
        </div>
        {totals.discountAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Discount</span>
            <span className="text-green-600 dark:text-green-400 font-medium">
              -{formatCurrency(totals.discountAmount)}
            </span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Tax (VAT)</span>
          <span className="text-gray-900 dark:text-white font-medium">
            {formatCurrency(totals.taxAmount)}
          </span>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between">
          <span className="text-base font-bold text-gray-900 dark:text-white">Total</span>
          <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
            {formatCurrency(totals.total)}
          </span>
        </div>
      </div>
    </div>
  );
}
