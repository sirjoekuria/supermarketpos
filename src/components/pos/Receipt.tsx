"use client";

import { useRef } from "react";
import { Printer, Download, X, CheckCircle2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Sale, AppSettings } from "@/types";

interface ReceiptProps {
  sale: Sale;
  settings: AppSettings;
  onClose: () => void;
  onPrint: () => void;
}

export default function Receipt({ sale, settings, onClose }: ReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow || !receiptRef.current) return;

    const receiptHTML = receiptRef.current.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${sale.receipt_number}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; padding: 8px; }
            .receipt-header { text-align: center; margin-bottom: 12px; }
            .receipt-header h2 { font-size: 16px; margin: 0; }
            .receipt-header p { margin: 2px 0; font-size: 10px; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .item-row { display: flex; justify-content: space-between; margin: 4px 0; }
            .footer { text-align: center; margin-top: 16px; font-size: 10px; }
          </style>
        </head>
        <body>${receiptHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };

  const handleDownload = () => {
    const width = 42; // standard characters width for thermal printer (80mm)
    const line = (char = "-") => char.repeat(width);
    const center = (text: string) => {
      const pad = Math.max(0, Math.floor((width - text.length) / 2));
      return " ".repeat(pad) + text;
    };
    const row = (left: string, right: string) => {
      const space = Math.max(1, width - left.length - right.length);
      return left + " ".repeat(space) + right;
    };

    let text = "";
    text += center(settings?.shop_name || "Supermarket POS") + "\n";
    if (settings?.shop_address) text += center(settings.shop_address) + "\n";
    if (settings?.shop_phone) text += center(settings.shop_phone) + "\n";
    text += line() + "\n";
    text += row("Receipt #:", sale.receipt_number) + "\n";
    text += row("Date:", formatDate(sale.created_at)) + "\n";
    text += row("Cashier:", sale.cashier?.full_name || "Unknown") + "\n";
    if (sale.customer) {
      text += row("Customer:", sale.customer.name) + "\n";
    }
    text += line() + "\n";
    text += row("Item", "Total") + "\n";
    text += line() + "\n";

    sale.items.forEach((item) => {
      const itemDesc = `${item.product.name} x${item.quantity}`;
      const itemPrice = formatCurrency(item.total);
      if (itemDesc.length + itemPrice.length + 1 > width) {
        text += itemDesc + "\n";
        text += row("", itemPrice) + "\n";
      } else {
        text += row(itemDesc, itemPrice) + "\n";
      }
    });

    text += line() + "\n";
    text += row("Subtotal:", formatCurrency(sale.subtotal)) + "\n";
    if (sale.discount_amount > 0) {
      text += row("Discount:", `-${formatCurrency(sale.discount_amount)}`) + "\n";
    }
    text += row("Tax:", formatCurrency(sale.tax_amount)) + "\n";
    text += line() + "\n";
    text += row("TOTAL:", formatCurrency(sale.total)) + "\n";
    text += line() + "\n";

    text += row("Payment Method:", sale.payment_method.toUpperCase()) + "\n";
    if (sale.payment_method === "split" && sale.split_payments) {
      sale.split_payments.forEach((payment) => {
        text += row(`- ${payment.method}:`, formatCurrency(payment.amount)) + "\n";
      });
    }
    if (sale.mpesa_transaction_id) {
      text += row("M-Pesa Ref:", sale.mpesa_transaction_id) + "\n";
    }

    if (sale.customer) {
      text += line() + "\n";
      text += center(`⭐ Loyalty — ${sale.customer.name}`) + "\n";
      if ((sale.points_earned ?? 0) > 0) {
        text += row("  Points Earned:", `+${sale.points_earned} pts`) + "\n";
      }
      if ((sale.points_redeemed ?? 0) > 0) {
        text += row("  Points Redeemed:", `-${sale.points_redeemed} pts`) + "\n";
      }
      if (sale.loyalty?.final_points_balance !== undefined) {
        text += row("  New Balance:", `${sale.loyalty.final_points_balance} pts`) + "\n";
      }
    }

    text += line() + "\n";
    text += center("Thank you for shopping with us!") + "\n";
    if (settings?.receipt_footer) {
      text += center(settings.receipt_footer) + "\n";
    }
    text += line() + "\n";

    const blob = new Blob([text], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-${sale.receipt_number}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-pos-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-pos-border">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Receipt</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <div ref={receiptRef} className="text-sm">
            <div className="text-center mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {settings?.shop_name || "Supermarket POS"}
              </h2>
              {settings?.shop_address && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {settings.shop_address}
                </p>
              )}
              {settings?.shop_phone && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {settings.shop_phone}
                </p>
              )}
            </div>

            <div className="border-t border-dashed border-gray-300 dark:border-gray-600 my-3" />

            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex justify-between">
                <span>Receipt #</span>
                <span className="font-mono">{sale.receipt_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Date</span>
                <span>{formatDate(sale.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier</span>
                <span>{sale.cashier?.full_name || "Unknown"}</span>
              </div>
              {sale.customer && (
                <div className="flex justify-between font-semibold text-gray-900 dark:text-white">
                  <span>Customer</span>
                  <span>{sale.customer.name}</span>
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-gray-300 dark:border-gray-600 my-3" />

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium text-gray-500 dark:text-gray-400">
                <span className="flex-1">Item</span>
                <span className="w-10 text-center">Qty</span>
                <span className="w-16 text-right">Price</span>
              </div>
              {sale.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs">
                  <span className="flex-1 truncate pr-2 text-gray-900 dark:text-white">
                    {item.product.name}
                  </span>
                  <span className="w-10 text-center text-gray-500 dark:text-gray-400">
                    {item.quantity}
                  </span>
                  <span className="w-16 text-right text-gray-900 dark:text-white">
                    {formatCurrency(item.total)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-gray-300 dark:border-gray-600 my-3" />

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                <span className="text-gray-900 dark:text-white">
                  {formatCurrency(sale.subtotal)}
                </span>
              </div>
              {sale.discount_amount > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Discount</span>
                  <span className="text-green-600 dark:text-green-400">
                    -{formatCurrency(sale.discount_amount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">Tax</span>
                <span className="text-gray-900 dark:text-white">
                  {formatCurrency(sale.tax_amount)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-1">
                <span className="text-gray-900 dark:text-white">TOTAL</span>
                <span className="text-gray-900 dark:text-white">
                  {formatCurrency(sale.total)}
                </span>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-300 dark:border-gray-600 my-3" />

            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <div className="flex justify-between">
                <span>Payment Method</span>
                <span className="uppercase font-medium">{sale.payment_method}</span>
              </div>
              {sale.payment_method === "split" &&
                sale.split_payments?.map((payment) => (
                  <div key={payment.method} className="flex justify-between">
                    <span className="capitalize">{payment.method}</span>
                    <span>
                      {formatCurrency(payment.amount)}
                      {payment.reference ? ` (${payment.reference})` : ""}
                    </span>
                  </div>
                ))}
              {sale.mpesa_transaction_id && (
                <div className="flex justify-between">
                  <span>Transaction ID</span>
                  <span className="font-mono">{sale.mpesa_transaction_id}</span>
                </div>
              )}
            </div>

            {/* Loyalty Statement Block */}
            {sale.customer && (
              <>
                <div className="border-t border-dashed border-gray-300 dark:border-gray-600 my-3" />
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-3 space-y-1.5">
                  <div className="flex justify-between font-bold text-amber-700 dark:text-amber-400 text-xs">
                    <span>⭐ Loyalty — {sale.customer.name}</span>
                    <span>{sale.customer.phone}</span>
                  </div>
                  {(sale.points_earned ?? 0) > 0 && (
                    <div className="flex justify-between text-xs text-green-700 dark:text-green-400 font-semibold">
                      <span>Points Earned This Sale</span>
                      <span>+{sale.points_earned} pts</span>
                    </div>
                  )}
                  {(sale.points_redeemed ?? 0) > 0 && (
                    <div className="flex justify-between text-xs text-red-600 dark:text-red-400 font-medium">
                      <span>Points Redeemed (KES {sale.points_redeemed})</span>
                      <span>-{sale.points_redeemed} pts</span>
                    </div>
                  )}
                  {sale.loyalty?.final_points_balance !== undefined && (
                    <div className="flex justify-between text-xs font-black text-amber-800 dark:text-amber-300 border-t border-dashed border-amber-300/50 dark:border-amber-700/30 pt-1.5 mt-1">
                      <span>New Points Balance</span>
                      <span>{sale.loyalty.final_points_balance} pts</span>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="text-center mt-6 text-xs text-gray-400 dark:text-gray-500">
              <p>Thank you for shopping with us!</p>
              {settings?.receipt_footer && (
                <p className="mt-1">{settings.receipt_footer}</p>
              )}
              <p className="mt-2 font-mono text-[10px]">{sale.receipt_number}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-200 dark:border-pos-border bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-all active:scale-[0.98]"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-all"
          >
            <Download className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
