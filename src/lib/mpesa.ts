import { getAdminClient } from "@/lib/server-auth";

type MpesaEnv = "sandbox" | "production";

export type StkCallbackMetadata = {
  Amount?: number;
  MpesaReceiptNumber?: string;
  Balance?: string;
  TransactionDate?: number | string;
  PhoneNumber?: number | string;
};

const BASE_URLS: Record<MpesaEnv, string> = {
  sandbox: "https://sandbox.safaricom.co.ke",
  production: "https://api.safaricom.co.ke",
};

const clean = (val?: string) => val ? val.replace(/^["']|["']$/g, "").trim() : "";

export function getMpesaConfig() {
  const env = clean(process.env.MPESA_ENV || "production").toLowerCase() === "sandbox" ? "sandbox" : "production";
  const consumerKey = clean(process.env.MPESA_CONSUMER_KEY);
  const consumerSecret = clean(process.env.MPESA_CONSUMER_SECRET);
  const shortCode = clean(process.env.MPESA_SHORTCODE);
  const passkey = clean(process.env.MPESA_PASSKEY);
  const appUrl =
    clean(process.env.NEXT_PUBLIC_APP_URL || "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  let callbackUrl = clean(process.env.MPESA_CALLBACK_URL) || (appUrl ? `${appUrl.replace(/\/$/, "")}/api/mpesa/callback` : "https://example.com/api/mpesa/callback");

  // Safaricom's production gateway strictly requires a public HTTPS URL.
  // If running locally, override it to a mock public HTTPS URL so Safaricom accepts it.
  if (env === "production" && (!callbackUrl.startsWith("https://") || callbackUrl.includes("localhost") || callbackUrl.includes("127.0.0.1"))) {
    callbackUrl = "https://example.com/api/mpesa/callback";
  }

  const transactionType =
    clean(process.env.MPESA_TRANSACTION_TYPE) ||
    (clean(process.env.MPESA_TILL_NUMBER) ? "CustomerBuyGoodsOnline" : "CustomerPayBillOnline");
  const partyB = clean(process.env.MPESA_PARTY_B) || clean(process.env.MPESA_TILL_NUMBER) || shortCode;

  if (!consumerKey || !consumerSecret || !shortCode || !passkey || !callbackUrl || !partyB) {
    throw new Error(
      "Missing M-Pesa config. Set MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY, MPESA_CALLBACK_URL or NEXT_PUBLIC_APP_URL, and MPESA_TILL_NUMBER or MPESA_PARTY_B."
    );
  }

  return {
    env,
    baseUrl: BASE_URLS[env],
    consumerKey,
    consumerSecret,
    shortCode,
    passkey,
    callbackUrl,
    transactionType,
    partyB,
  };
}

export function normalizePhone(phone: string) {
  const cleaned = phone.replace(/\D/g, "");

  if (/^254(7|1)\d{8}$/.test(cleaned)) return cleaned;
  if (/^0(7|1)\d{8}$/.test(cleaned)) return `254${cleaned.slice(1)}`;
  if (/^(7|1)\d{8}$/.test(cleaned)) return `254${cleaned}`;

  throw new Error("Enter a valid Safaricom phone number, e.g. 0712345678.");
}

export function mpesaTimestamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}${get("month")}${get("day")}${get("hour")}${get("minute")}${get("second")}`;
}

export function stkPassword(shortCode: string, passkey: string, timestamp: string) {
  return Buffer.from(`${shortCode}${passkey}${timestamp}`).toString("base64");
}

export async function getMpesaAccessToken() {
  const config = getMpesaConfig();
  const credentials = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString("base64");

  const response = await fetch(`${config.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${credentials}`,
    },
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    throw new Error(data.errorMessage || data.error || "Could not get M-Pesa access token.");
  }

  return data.access_token as string;
}

export function extractCallbackMetadata(items?: { Name: string; Value?: string | number }[]) {
  return (items || []).reduce<StkCallbackMetadata>((metadata, item) => {
    metadata[item.Name as keyof StkCallbackMetadata] = item.Value as never;
    return metadata;
  }, {});
}

export async function updateMpesaTransaction(input: {
  checkoutRequestId: string;
  status: "pending" | "success" | "failed";
  resultCode?: number | null;
  resultDesc?: string | null;
  mpesaReceiptNumber?: string | null;
  transactionDate?: string | null;
}) {
  const supabase = getAdminClient();
  await supabase
    .from("mpesa_transactions")
    .update({
      status: input.status,
      result_code: input.resultCode ?? null,
      result_desc: input.resultDesc ?? null,
      mpesa_receipt_number: input.mpesaReceiptNumber ?? null,
      transaction_date: input.transactionDate ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("checkout_request_id", input.checkoutRequestId);
}
