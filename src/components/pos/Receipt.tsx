"use client";

import { useRef } from "react";
import { Printer, Download, X, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Sale, AppSettings } from "@/types";

interface ReceiptProps {
  sale: Sale;
  settings: AppSettings;
  onClose: () => void;
  onPrint: () => void;
}

export default function Receipt({ sale, settings, onClose }: ReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  // Custom receipt date formatter: DD MONTH YYYY HH:MM AM/PM
  const formatReceiptDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const day = date.getDate().toString().padStart(2, "0");
      const monthsFixed = [
        "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
        "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
      ];
      const month = monthsFixed[date.getMonth()];
      const year = date.getFullYear();
      let hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      const strTime = hours.toString().padStart(2, "0") + ":" + minutes + " " + ampm;
      return `${day} ${month} ${year} ${strTime}`;
    } catch {
      return dateStr;
    }
  };

  const getTaxCategory = (taxRate: number) => {
    if (taxRate === 16) return "A";
    if (taxRate === 8) return "B";
    if (taxRate === 0) return "D"; // Exempted
    return "C"; // Zero-rated
  };

  // Calculations for Tax Analysis
  let vatableInclusive = 0;
  let exempted = 0;
  let zeroRated = 0;

  sale.items.forEach((item) => {
    const rate = item.product.tax_rate;
    if (rate === 16) {
      vatableInclusive += item.total;
    } else if (rate === 0) {
      exempted += item.total;
    } else {
      zeroRated += item.total;
    }
  });

  const vatRatePercent = 16.00;
  const vatAmount = vatableInclusive - vatableInclusive / (1 + vatRatePercent / 100);
  const vatableExclusive = vatableInclusive - vatAmount;

  // Extract M-Pesa & Cash Details
  let mpesaAmount = 0;
  let cashAmount = 0;
  let mpesaRef = sale.mpesa_transaction_id || "";

  if (sale.payment_method === "mpesa") {
    mpesaAmount = sale.total;
  } else if (sale.payment_method === "cash") {
    cashAmount = sale.total;
  } else if (sale.payment_method === "split" && sale.split_payments) {
    sale.split_payments.forEach((p) => {
      if (p.method === "mpesa") {
        mpesaAmount = p.amount;
        if (p.reference) mpesaRef = p.reference;
      } else if (p.method === "cash") {
        cashAmount = p.amount;
      }
    });
  }

  // Helper formatting for 42 columns layout
  const formatLRExtreme = (left: string, right: string, width = 42) => {
    const space = Math.max(1, width - left.length - right.length);
    return left + " ".repeat(space) + right;
  };

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
            @media print {
              @page { size: 80mm auto; margin: 0; }
              body { margin: 0; padding: 10px; }
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 11px;
              color: #000;
              width: 76mm;
              margin: 0 auto;
              background-color: #fff;
              line-height: 1.3;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            .barcode-lines { display: flex; justify-content: center; gap: 1px; height: 30px; margin: 6px 0; }
            .barcode-bar { background-color: #000; height: 100%; }
            .scu-qr { display: flex; justify-content: center; margin: 8px 0; }
            svg { display: block; margin: 0 auto; }
            p { margin: 2px 0; }
          </style>
        </head>
        <body onload="window.print(); window.close();">${receiptHTML}</body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownload = () => {
    const width = 42;
    const line = (char = "-") => char.repeat(width);
    const center = (text: string) => {
      const pad = Math.max(0, Math.floor((width - text.length) / 2));
      return " ".repeat(pad) + text;
    };
    const row = (left: string, right: string) => formatLRExtreme(left, right, width);

    let txt = "";
    txt += center(settings?.shop_name?.toUpperCase() || "ESKAR ENTERPRISES LIMITED") + "\n";
    txt += center(settings?.shop_address || "P.O. BOX NAIROBI") + "\n";
    txt += center("GITHURAI") + "\n";
    if (settings?.shop_phone) txt += center(settings.shop_phone) + "\n";
    txt += center("PIN: P051774133F") + "\n";
    txt += line("-") + "\n";
    txt += center("CASH SALE") + "\n";
    txt += center(sale.customer?.name?.toUpperCase() || "CUSTOMER") + "\n";
    txt += center(formatReceiptDate(sale.created_at)) + "\n";
    txt += center(`SALE # ${sale.receipt_number.slice(-5)} TILL # 4 RECEIPT # ${sale.receipt_number.slice(-3)}`) + "\n";
    txt += line("-") + "\n";
    txt += "ITEM             QTY      PRICE        TOTAL\n";

    sale.items.forEach((item) => {
      txt += item.product.name.toUpperCase().substring(0, 42) + "\n";
      const cat = getTaxCategory(item.product.tax_rate);
      const barcodeStr = item.product.barcode.substring(0, 10);
      const rightPart = `${item.product.price.toFixed(2)}       ${item.total.toFixed(2)} ${cat}`;
      txt += formatLRExtreme(`${barcodeStr}     ${item.quantity}`, rightPart, width) + "\n";
    });

    txt += line("-") + "\n";
    txt += row("AMOUNT DUE :", sale.total.toFixed(2)) + "\n";
    txt += row("TENDERED", sale.total.toFixed(2)) + "\n";
    txt += row("CHANGE", "0.00") + "\n";
    txt += line("-") + "\n";
    txt += "TAX ANALYSIS\n";
    txt += row("VATABLE EXCLUSIVE", vatableExclusive.toFixed(2)) + "\n";
    txt += row(`VAT ( ${vatRatePercent.toFixed(2)} % )`, vatAmount.toFixed(2)) + "\n";
    txt += row("VATABLE INCLUSIVE", vatableInclusive.toFixed(2)) + "\n";
    txt += row("EXEMPTED", exempted.toFixed(2)) + "\n";
    txt += row("ZERO RATED", zeroRated.toFixed(2)) + "\n";
    txt += line("-") + "\n";
    txt += "PAYMENT MODES\n";
    if (mpesaAmount > 0) {
      txt += "MPESA DETAILS\n";
      txt += `CUSTOMER NAME: ${sale.customer?.name?.toUpperCase() || "CUSTOMER"}\n`;
      txt += `PHONE NUMBER: ${sale.customer?.phone ? (sale.customer.phone.substring(0, 4) + "***" + sale.customer.phone.slice(-3)) : "0700***950"}\n`;
      txt += `TRANSACTION CODE: ${mpesaRef || "UF1LS5Z55F"}\n`;
      txt += row("MPESA AMOUNT", mpesaAmount.toFixed(2)) + "\n";
    }
    if (cashAmount > 0) {
      txt += row("CASH AMOUNT", cashAmount.toFixed(2)) + "\n";
    }
    txt += line("-") + "\n";
    txt += center(`You were served by ${sale.cashier?.full_name || "Tiffany Njeru"}`) + "\n";
    txt += center("Software details & contacts visit www.finapac.com") + "\n";
    txt += center("PRICES ARE VAT INCLUSIVE WHERE APPLICABLE") + "\n";
    txt += center("Goods once sold are not refundable. Thank you !") + "\n";
    txt += line("-") + "\n";

    if (sale.customer) {
      txt += center("LOYALTY POINTS") + "\n";
      const oldBal = (sale.customer.points_balance || 0) + (sale.points_redeemed ?? 0) - (sale.points_earned ?? 0);
      txt += center(`Old Bal: ${oldBal} Awarded: ${sale.points_earned} New Bal: ${sale.customer.points_balance}`) + "\n";
      txt += center(`Thank you ${sale.customer.name} Come again`) + "\n";
      txt += line("-") + "\n";
    }

    txt += center("SCU INFORMATION") + "\n\n";
    txt += center(`DATE: ${formatReceiptDate(sale.created_at)}`) + "\n";
    txt += center("SCU INVOICE NO: KRACU0300003050/550152") + "\n";
    txt += center("SCU ID: KRACU0300003050") + "\n";
    txt += center("INTERNAL DATA: OCFL-KBAF-CYOC-J5NC-NHUH-DYMT-4Q") + "\n";
    txt += center("RECEIPT SIGN: Y3CZ-IJQ2A-WJTY-QZB3") + "\n";
    txt += center("END OF LEGAL RECEIPT") + "\n";

    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-${sale.receipt_number}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-pos-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col h-[90vh] sm:h-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-pos-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Receipt Preview</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Outer Receipt Paper Container */}
        <div className="p-4 overflow-y-auto flex-1 bg-gray-100 dark:bg-gray-800 flex justify-center">
          <div
            ref={receiptRef}
            className="bg-white text-black p-4 shadow-md w-full max-w-[76mm] text-[11px] font-mono leading-relaxed"
            style={{ fontFamily: "'Courier New', Courier, monospace" }}
          >
            {/* Header info */}
            <div className="text-center">
              <p className="font-bold text-[13px] leading-tight">
                {settings?.shop_name?.toUpperCase() || "ESKAR ENTERPRISES LIMITED"}
              </p>
              <p className="whitespace-pre-line text-[10px] leading-snug">
                {settings?.shop_address || "P.O. BOX NAIROBI\nGITHURAI"}
              </p>
              {settings?.shop_phone && (
                <p className="text-[10px] leading-snug">{settings.shop_phone}</p>
              )}
              <p className="text-[10px] leading-snug">PIN: P051774133F</p>
            </div>

            {/* Barcode representation */}
            <div className="flex justify-center items-center gap-[1px] h-7 my-2 overflow-hidden">
              {[1, 2, 1, 3, 1, 4, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1, 4, 1, 2, 1, 3, 1, 2, 1, 4, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1, 4, 1, 2].map((w, i) => (
                <div key={i} className="bg-black h-7" style={{ width: `${w}px` }} />
              ))}
            </div>
            <p className="text-center text-[10px] font-bold tracking-widest my-1">
              {sale.receipt_number || "0104050120260601190629"}
            </p>

            <div className="text-center font-bold text-[13px] my-1">CASH SALE</div>
            <div className="text-center font-bold text-[11px] uppercase mb-1">
              {sale.customer?.name || "JOSEPH KURIA"}
            </div>
            <div className="text-center text-[10px] mb-1">
              {formatReceiptDate(sale.created_at)}
            </div>
            <div className="text-center text-[9px] mb-2 leading-none">
              SALE # {sale.receipt_number.slice(-5)} TILL # 4 RECEIPT # {sale.receipt_number.slice(-3)}
            </div>

            <div className="border-t border-dashed border-black my-2" />

            {/* Table Header */}
            <div className="flex justify-between font-bold text-[10px] mb-1">
              <span className="w-[45%] text-left">ITEM</span>
              <span className="w-[10%] text-center">QTY</span>
              <span className="w-[20%] text-right">PRICE</span>
              <span className="w-[25%] text-right">TOTAL</span>
            </div>

            {/* Items */}
            <div className="space-y-1.5">
              {sale.items.map((item, idx) => {
                const taxCat = getTaxCategory(item.product.tax_rate);
                return (
                  <div key={idx} className="text-[10px] leading-tight">
                    <p className="font-bold truncate">{item.product.name.toUpperCase()}</p>
                    <div className="flex justify-between text-gray-700">
                      <span className="w-[45%] text-left font-normal">
                        {item.product.barcode.substring(0, 10)}
                      </span>
                      <span className="w-[10%] text-center">
                        {item.quantity}
                      </span>
                      <span className="w-[20%] text-right">
                        {item.product.price.toFixed(2)}
                      </span>
                      <span className="w-[25%] text-right font-bold">
                        {item.total.toFixed(2)} {taxCat}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-dashed border-black my-2" />

            {/* Amounts */}
            <div className="space-y-0.5 text-[10px] font-bold">
              <div className="flex justify-between text-[11px]">
                <span>AMOUNT DUE :</span>
                <span>{sale.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>TENDERED</span>
                <span>{sale.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>CHANGE</span>
                <span>0.00</span>
              </div>
            </div>

            <div className="border-t border-dashed border-black my-2" />

            {/* Tax Analysis */}
            <div className="space-y-0.5 text-[9px] text-gray-800">
              <p className="font-bold text-black mb-1">TAX ANALYSIS</p>
              <div className="flex justify-between">
                <span>VATABLE EXCLUSIVE</span>
                <span>{vatableExclusive.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>VAT ( {vatRatePercent.toFixed(2)} % )</span>
                <span>{vatAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>VATABLE INCLUSIVE</span>
                <span>{vatableInclusive.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>EXEMPTED</span>
                <span>{exempted.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>ZERO RATED</span>
                <span>{zeroRated.toFixed(2)}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-black my-2" />

            {/* Payment Modes */}
            <div className="space-y-1 text-[9px] text-gray-800">
              <p className="font-bold text-black">PAYMENT MODES</p>
              {mpesaAmount > 0 && (
                <div className="space-y-0.5">
                  <p className="font-bold text-black">MPESA DETAILS</p>
                  <p>CUSTOMER NAME: {sale.customer?.name?.toUpperCase() || "JOSEPH GITUA"}</p>
                  <p>PHONE NUMBER: {sale.customer?.phone ? (sale.customer.phone.substring(0, 4) + "***" + sale.customer.phone.slice(-3)) : "0700***950"}</p>
                  <p>TRANSACTION CODE: {mpesaRef || "UF1LS5Z55F"}</p>
                  <div className="flex justify-between font-bold text-black">
                    <span>MPESA AMOUNT</span>
                    <span>{mpesaAmount.toFixed(2)}</span>
                  </div>
                </div>
              )}
              {cashAmount > 0 && (
                <div className="flex justify-between font-bold text-black">
                  <span>CASH AMOUNT</span>
                  <span>{cashAmount.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-black my-2" />

            {/* Served by */}
            <div className="text-center text-[9px] leading-snug text-gray-700">
              <p>You were served by {sale.cashier?.full_name || "Tiffany Njeru"}</p>
              <p className="mt-1">Software details & contacts visit www.finapac.com</p>
              <p className="font-bold text-black">PRICES ARE VAT INCLUSIVE WHERE APPLICABLE</p>
              <p>Goods once sold are not refundable. Thank you !</p>
            </div>

            <div className="border-t border-dashed border-black my-2" />

            {/* Loyalty details */}
            {sale.customer && (
              <div className="text-center text-[9px] leading-relaxed text-gray-800 space-y-0.5">
                <p className="font-bold text-black">LOYALTY POINTS</p>
                <p>
                  Old Bal: {(sale.customer.points_balance || 0) + (sale.points_redeemed ?? 0) - (sale.points_earned ?? 0)} Awarded: {sale.points_earned ?? 0} New Bal: {sale.customer.points_balance}
                </p>
                <p>Thank you {sale.customer.name} Come again</p>
                <div className="border-t border-dashed border-black my-2" />
              </div>
            )}

            {/* SCU Info & QR Code */}
            <div className="text-center text-[9px] leading-tight space-y-0.5 text-gray-700">
              <p className="font-bold text-black mb-1">SCU INFORMATION</p>
              
              <div className="scu-qr flex justify-center py-1">
                <svg width="76" height="76" viewBox="0 0 25 25" shapeRendering="crispEdges">
                  <rect width="25" height="25" fill="white" />
                  <rect x="0" y="0" width="7" height="7" fill="black" />
                  <rect x="1" y="1" width="5" height="5" fill="white" />
                  <rect x="2" y="2" width="3" height="3" fill="black" />
                  <rect x="18" y="0" width="7" height="7" fill="black" />
                  <rect x="19" y="1" width="5" height="5" fill="white" />
                  <rect x="20" y="2" width="3" height="3" fill="black" />
                  <rect x="0" y="18" width="7" height="7" fill="black" />
                  <rect x="1" y="19" width="5" height="5" fill="white" />
                  <rect x="2" y="20" width="3" height="3" fill="black" />
                  <rect x="9" y="1" width="2" height="1" fill="black" />
                  <rect x="12" y="2" width="1" height="3" fill="black" />
                  <rect x="15" y="1" width="2" height="2" fill="black" />
                  <rect x="9" y="5" width="4" height="2" fill="black" />
                  <rect x="15" y="6" width="1" height="3" fill="black" />
                  <rect x="8" y="9" width="2" height="4" fill="black" />
                  <rect x="11" y="11" width="3" height="1" fill="black" />
                  <rect x="16" y="9" width="4" height="2" fill="black" />
                  <rect x="22" y="11" width="2" height="3" fill="black" />
                  <rect x="9" y="15" width="3" height="3" fill="black" />
                  <rect x="14" y="14" width="2" height="5" fill="black" />
                  <rect x="19" y="16" width="3" height="2" fill="black" />
                  <rect x="10" y="20" width="4" height="2" fill="black" />
                  <rect x="16" y="21" width="2" height="3" fill="black" />
                  <rect x="20" y="20" width="3" height="1" fill="black" />
                  <rect x="21" y="23" width="2" height="1" fill="black" />
                </svg>
              </div>

              <p className="mt-1">DATE: {formatReceiptDate(sale.created_at)}</p>
              <p>SCU INVOICE NO: KRACU0300003050/550152</p>
              <p>SCU ID: KRACU0300003050</p>
              <p>INTERNAL DATA</p>
              <p className="break-all font-bold">OCFL-KBAF-CYOC-J5NC-NHUH-DYMT-4Q</p>
              <p>RECEIPT SIGN</p>
              <p className="font-bold">Y3CZ-IJQ2A-WJTY-QZB3</p>
              <p className="font-bold text-[10px] text-black mt-2">END OF LEGAL RECEIPT</p>
            </div>
          </div>
        </div>

        {/* Print & Save Actions */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-200 dark:border-pos-border bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-all active:scale-[0.98]"
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-all"
          >
            <Download className="w-4 h-4" />
            Save Text
          </button>
        </div>
      </div>
    </div>
  );
}
