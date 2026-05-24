import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "KES"): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-KE").format(num);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function generateReceiptNumber(): string {
  const prefix = "RCP";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export function generateBarcode(): string {
  const prefix = "890";
  const random = Math.floor(Math.random() * 1000000000).toString().padStart(9, "0");
  const checkDigit = calculateEAN13CheckDigit(prefix + random);
  return prefix + random + checkDigit;
}

function calculateEAN13CheckDigit(barcode: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(barcode[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit.toString();
}

export function calculateCartTotals(
  items: { product: { price: number; tax_rate: number; discount_percent: number }; quantity: number }[]
) {
  let subtotal = 0;
  let taxAmount = 0;
  let discountAmount = 0;

  items.forEach((item) => {
    const itemTotal = item.product.price * item.quantity;
    const itemDiscount = itemTotal * (item.product.discount_percent / 100);
    const itemTaxable = itemTotal - itemDiscount;
    const itemTax = itemTaxable * (item.product.tax_rate / 100);

    subtotal += itemTotal;
    discountAmount += itemDiscount;
    taxAmount += itemTax;
  });

  return {
    subtotal: Math.round(subtotal),
    taxAmount: Math.round(taxAmount),
    discountAmount: Math.round(discountAmount),
    total: Math.round(subtotal - discountAmount + taxAmount),
  };
}

export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}
