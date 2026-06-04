"use client";

import { useRef } from "react";
import { Printer, FileDown, X, CheckCircle2 } from "lucide-react";
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

  /* ── date formatter ───────────────────────────────────────── */
  const formatReceiptDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const day = date.getDate().toString().padStart(2, "0");
      const months = [
        "JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE",
        "JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER",
      ];
      const month = months[date.getMonth()];
      const year  = date.getFullYear();
      let hours   = date.getHours();
      const mins  = date.getMinutes().toString().padStart(2, "0");
      const ampm  = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      return `${day} ${month} ${year} ${hours.toString().padStart(2,"0")}:${mins} ${ampm}`;
    } catch { return dateStr; }
  };

  const getTaxCategory = (taxRate: number) => {
    if (taxRate === 16) return "A";
    if (taxRate ===  8) return "B";
    if (taxRate ===  0) return "D";
    return "C";
  };

  /* ── tax calculations ─────────────────────────────────────── */
  let vatableInclusive = 0, exempted = 0, zeroRated = 0;
  sale.items.forEach((item) => {
    const r = item.product.tax_rate;
    if (r === 16) vatableInclusive += item.total;
    else if (r === 0) exempted += item.total;
    else zeroRated += item.total;
  });
  const vatRatePercent  = 16.0;
  const vatAmount       = vatableInclusive - vatableInclusive / (1 + vatRatePercent / 100);
  const vatableExclusive = vatableInclusive - vatAmount;

  /* ── payment split ────────────────────────────────────────── */
  let mpesaAmount = 0, cashAmount = 0;
  let mpesaRef = sale.mpesa_transaction_id || "";
  // Filter out internal Safaricom CheckoutRequestIDs — only keep real receipt codes (e.g. QDK1A2B3C)
  if (mpesaRef.startsWith("ws_CO_") || mpesaRef.startsWith("ws_co_")) {
    mpesaRef = "";
  }
  if (sale.payment_method === "mpesa") {
    mpesaAmount = sale.total;
  } else if (sale.payment_method === "cash") {
    cashAmount = sale.total;
  } else if (sale.payment_method === "split" && sale.split_payments) {
    sale.split_payments.forEach((p) => {
      if (p.method === "mpesa") { mpesaAmount = p.amount; if (p.reference) mpesaRef = p.reference; }
      else if (p.method === "cash") cashAmount = p.amount;
    });
  }

  /* ── shared receipt HTML (used by both Print & PDF) ──────── */
  const buildReceiptHTML = () => {
    if (!receiptRef.current) return "";
    return receiptRef.current.outerHTML;
  };

  const receiptStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      color: #000;
      background: #fff;
      width: 80mm;
      margin: 0 auto;
      padding: 8px 4px;
      line-height: 1.35;
    }
    .receipt-root { width: 100%; }
    .text-center { text-align: center; }
    .font-bold   { font-weight: bold; }
    .text-xs     { font-size: 9px; }
    .text-sm     { font-size: 10px; }
    .text-base   { font-size: 11px; }
    .text-lg     { font-size: 13px; }
    .divider     { border-top: 1px dashed #000; margin: 5px 0; }
    .flex-row    { display: flex; justify-content: space-between; align-items: baseline; }
    .item-name   { font-weight: bold; font-size: 10px; }
    .item-row    { display: flex; font-size: 9px; color: #333; }
    .col-desc    { flex: 0 0 40%; text-align: left; }
    .col-qty     { flex: 0 0 10%; text-align: center; }
    .col-price   { flex: 0 0 22%; text-align: right; }
    .col-total   { flex: 0 0 28%; text-align: right; font-weight: bold; }
    .section-label { font-weight: bold; font-size: 10px; margin-bottom: 3px; }
    .tax-row     { display: flex; justify-content: space-between; font-size: 9px; color: #333; }
    .barcode-wrap { display: flex; justify-content: center; gap: 1px; height: 28px; margin: 6px 0; overflow: hidden; }
    .bar         { background: #000; height: 100%; }
    .qr-wrap     { display: flex; justify-content: center; margin: 8px 0; }
    svg          { display: block; margin: 0 auto; }
    p            { margin: 1px 0; }
    @media print {
      @page { size: 80mm auto; margin: 0; }
      body  { padding: 6px 2px; }
    }
  `;

  /* ── PRINT ────────────────────────────────────────────────── */
  const handlePrint = () => {
    const pw = window.open("", "_blank");
    if (!pw) return;
    pw.document.write(`<!DOCTYPE html><html><head>
      <title>Receipt ${sale.receipt_number}</title>
      <style>${receiptStyles}</style>
    </head><body onload="window.print();window.close();">
      ${buildReceiptHTML()}
    </body></html>`);
    pw.document.close();
  };

  /* ── DOWNLOAD PDF ─────────────────────────────────────────── */
  const handleDownloadPDF = () => {
    const pw = window.open("", "_blank");
    if (!pw) return;
    pw.document.write(`<!DOCTYPE html><html><head>
      <title>Receipt ${sale.receipt_number}</title>
      <style>
        ${receiptStyles}
        /* Trigger save-as-PDF via print dialog */
        @media print {
          @page { size: 80mm auto; margin: 0; }
        }
      </style>
      <script>
        window.onload = function() {
          window.print();
          /* After printing dialog closes, close the window */
          window.onfocus = function() { setTimeout(function(){ window.close(); }, 500); };
        };
      <\/script>
    </head><body>
      ${buildReceiptHTML()}
      <div style="text-align:center;font-size:9px;color:#666;margin-top:8px;font-family:sans-serif;">
        In the print dialog, choose <strong>Save as PDF</strong> to download.
      </div>
    </body></html>`);
    pw.document.close();
  };

  /* ── RENDER ───────────────────────────────────────────────── */
  return (
    /* Overlay — items-end on mobile so it slides up from bottom */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/*
        Mobile  → full-width bottom sheet, max 94vh, rounded top corners
        Desktop → centred card, max 90vh, fully rounded
      */}
      <div className="
        bg-white dark:bg-pos-card
        w-full sm:max-w-sm
        rounded-t-3xl sm:rounded-2xl
        shadow-2xl
        flex flex-col
        max-h-[94vh] sm:max-h-[90vh]
        overflow-hidden
      ">
        {/* ── drag handle (mobile only) ── */}
        <div className="flex justify-center pt-2 pb-0 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

        {/* ── header ── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-pos-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Receipt Preview</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* ── scrollable receipt body ── */}
        <div className="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-800 flex justify-center p-3">
          {/* Paper */}
          <div
            ref={receiptRef}
            className="receipt-root bg-white text-black p-3 shadow-md w-full max-w-[76mm] font-mono leading-snug"
            style={{ fontFamily: "'Courier New', Courier, monospace", fontSize: "11px" }}
          >
            {/* ── Shop Header ── */}
            <div className="text-center">
              <p className="font-bold text-[13px] leading-tight">
                {settings?.shop_name?.toUpperCase() || "ESKAR ENTERPRISES LIMITED"}
              </p>
              <p className="text-[10px] leading-snug whitespace-pre-line">
                {settings?.shop_address || "P.O. BOX NAIROBI\nGITHURAI"}
              </p>
              {settings?.shop_phone && (
                <p className="text-[10px]">{settings.shop_phone}</p>
              )}
              <p className="text-[10px]">PIN: P051774133F</p>
            </div>

            {/* ── Barcode ── */}
            <div className="barcode-wrap">
              {[1,2,1,3,1,4,1,2,3,1,2,1,1,3,2,1,4,1,2,1,3,1,2,1,4,1,2,3,1,2,1,1,3,2,1,4,1,2].map((w,i)=>(
                <div key={i} className="bar bg-black h-full" style={{width:`${w}px`}}/>
              ))}
            </div>
            <p className="text-center text-[9px] font-bold tracking-widest mb-1">
              {sale.receipt_number || "0104050120260601190629"}
            </p>

            <p className="text-center font-bold text-[13px]">CASH SALE</p>
            <p className="text-center font-bold text-[11px] uppercase">
              {sale.customer?.name || "WALK-IN CUSTOMER"}
            </p>
            <p className="text-center text-[10px]">{formatReceiptDate(sale.created_at)}</p>
            <p className="text-center text-[9px] mb-1">
              SALE #{sale.receipt_number.slice(-5)} TILL #4 RECEIPT #{sale.receipt_number.slice(-3)}
            </p>

            <div className="divider border-t border-dashed border-black my-1.5" />

            {/* ── Items header ── */}
            <div className="item-row font-bold text-[10px] mb-1">
              <span className="col-desc">ITEM</span>
              <span className="col-qty">QTY</span>
              <span className="col-price">PRICE</span>
              <span className="col-total">TOTAL</span>
            </div>

            {/* ── Items ── */}
            <div className="space-y-1">
              {sale.items.map((item, idx) => {
                const cat = getTaxCategory(item.product.tax_rate);
                return (
                  <div key={idx} className="text-[10px]">
                    <p className="item-name font-bold truncate">{item.product.name.toUpperCase()}</p>
                    <div className="item-row">
                      <span className="col-desc text-gray-700">{item.product.barcode.substring(0,10)}</span>
                      <span className="col-qty">{item.quantity}</span>
                      <span className="col-price">{item.product.price.toFixed(2)}</span>
                      <span className="col-total font-bold">{item.total.toFixed(2)} {cat}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="divider border-t border-dashed border-black my-1.5" />

            {/* ── Amounts ── */}
            <div className="space-y-0.5 text-[10px]">
              <div className="flex-row flex justify-between font-bold text-[11px]">
                <span>AMOUNT DUE :</span>
                <span>{sale.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>TENDERED</span><span>{sale.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>CHANGE</span><span>0.00</span>
              </div>
            </div>

            <div className="divider border-t border-dashed border-black my-1.5" />

            {/* ── Tax Analysis ── */}
            <div className="space-y-0.5 text-[9px]">
              <p className="section-label font-bold">TAX ANALYSIS</p>
              {[
                ["VATABLE EXCLUSIVE", vatableExclusive.toFixed(2)],
                [`VAT ( ${vatRatePercent.toFixed(2)} % )`, vatAmount.toFixed(2)],
                ["VATABLE INCLUSIVE", vatableInclusive.toFixed(2)],
                ["EXEMPTED", exempted.toFixed(2)],
                ["ZERO RATED", zeroRated.toFixed(2)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span>{label}</span><span>{value}</span>
                </div>
              ))}
            </div>

            <div className="divider border-t border-dashed border-black my-1.5" />

            {/* ── Payment Modes ── */}
            <div className="space-y-0.5 text-[9px]">
              <p className="section-label font-bold">PAYMENT MODES</p>
              {mpesaAmount > 0 && (
                <div className="space-y-0.5">
                  <p className="font-bold">MPESA DETAILS</p>
                  <p>CUSTOMER NAME: {sale.customer?.name?.toUpperCase() || "CUSTOMER"}</p>
                  <p>PHONE NUMBER: {
                    sale.customer?.phone
                      ? sale.customer.phone.substring(0,4) + "***" + sale.customer.phone.slice(-3)
                      : "0700***950"
                  }</p>
                  <p>TRANSACTION CODE: {mpesaRef || "CHECK M-PESA SMS"}</p>
                  <div className="flex justify-between font-bold">
                    <span>MPESA AMOUNT</span><span>{mpesaAmount.toFixed(2)}</span>
                  </div>
                </div>
              )}
              {cashAmount > 0 && (
                <div className="flex justify-between font-bold">
                  <span>CASH AMOUNT</span><span>{cashAmount.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="divider border-t border-dashed border-black my-1.5" />

            {/* ── Footer ── */}
            <div className="text-center text-[9px] space-y-0.5 text-gray-700">
              <p>You were served by {sale.cashier?.full_name || "Cashier"}</p>
              <p>Software details &amp; contacts visit www.finapac.com</p>
              <p className="font-bold text-black">PRICES ARE VAT INCLUSIVE WHERE APPLICABLE</p>
              <p>Goods once sold are not refundable. Thank you!</p>
            </div>

            <div className="divider border-t border-dashed border-black my-1.5" />

            {/* ── Loyalty ── */}
            {sale.customer && (
              <div className="text-center text-[9px] space-y-0.5 text-gray-800">
                <p className="font-bold text-black">LOYALTY POINTS</p>
                <p>
                  Old Bal: {(sale.customer.points_balance||0)+(sale.points_redeemed??0)-(sale.points_earned??0)}{" "}
                  Awarded: {sale.points_earned??0}{" "}
                  New Bal: {sale.customer.points_balance}
                </p>
                <p>Thank you {sale.customer.name}, come again!</p>
                <div className="divider border-t border-dashed border-black my-1.5" />
              </div>
            )}

            {/* ── SCU / QR ── */}
            <div className="text-center text-[9px] space-y-0.5 text-gray-700">
              <p className="font-bold text-black">SCU INFORMATION</p>

              <div className="qr-wrap flex justify-center my-1">
                <svg width="72" height="72" viewBox="0 0 25 25" shapeRendering="crispEdges">
                  <rect width="25" height="25" fill="white"/>
                  <rect x="0"  y="0"  width="7" height="7" fill="black"/>
                  <rect x="1"  y="1"  width="5" height="5" fill="white"/>
                  <rect x="2"  y="2"  width="3" height="3" fill="black"/>
                  <rect x="18" y="0"  width="7" height="7" fill="black"/>
                  <rect x="19" y="1"  width="5" height="5" fill="white"/>
                  <rect x="20" y="2"  width="3" height="3" fill="black"/>
                  <rect x="0"  y="18" width="7" height="7" fill="black"/>
                  <rect x="1"  y="19" width="5" height="5" fill="white"/>
                  <rect x="2"  y="20" width="3" height="3" fill="black"/>
                  <rect x="9"  y="1"  width="2" height="1" fill="black"/>
                  <rect x="12" y="2"  width="1" height="3" fill="black"/>
                  <rect x="15" y="1"  width="2" height="2" fill="black"/>
                  <rect x="9"  y="5"  width="4" height="2" fill="black"/>
                  <rect x="15" y="6"  width="1" height="3" fill="black"/>
                  <rect x="8"  y="9"  width="2" height="4" fill="black"/>
                  <rect x="11" y="11" width="3" height="1" fill="black"/>
                  <rect x="16" y="9"  width="4" height="2" fill="black"/>
                  <rect x="22" y="11" width="2" height="3" fill="black"/>
                  <rect x="9"  y="15" width="3" height="3" fill="black"/>
                  <rect x="14" y="14" width="2" height="5" fill="black"/>
                  <rect x="19" y="16" width="3" height="2" fill="black"/>
                  <rect x="10" y="20" width="4" height="2" fill="black"/>
                  <rect x="16" y="21" width="2" height="3" fill="black"/>
                  <rect x="20" y="20" width="3" height="1" fill="black"/>
                  <rect x="21" y="23" width="2" height="1" fill="black"/>
                </svg>
              </div>

              <p>DATE: {formatReceiptDate(sale.created_at)}</p>
              <p>SCU INVOICE NO: KRACU0300003050/550152</p>
              <p>SCU ID: KRACU0300003050</p>
              <p>INTERNAL DATA</p>
              <p className="font-bold break-all">OCFL-KBAF-CYOC-J5NC-NHUH-DYMT-4Q</p>
              <p>RECEIPT SIGN</p>
              <p className="font-bold">Y3CZ-IJQ2A-WJTY-QZB3</p>
              <p className="font-bold text-[10px] text-black mt-1">END OF LEGAL RECEIPT</p>
            </div>
          </div>
        </div>

        {/* ── Action buttons — always visible, never scroll away ── */}
        <div className="flex gap-3 px-4 py-3 border-t border-gray-200 dark:border-pos-border bg-white dark:bg-pos-card flex-shrink-0 safe-area-bottom">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.97] text-white rounded-2xl font-semibold text-sm transition-all shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.97] text-white rounded-2xl font-semibold text-sm transition-all shadow-sm"
          >
            <FileDown className="w-4 h-4" />
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
