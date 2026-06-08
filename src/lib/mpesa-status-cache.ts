type CachedMpesaStatus = {
  status: string;
  result: Record<string, unknown>;
  ts: number;
};

const statusCache = new Map<string, CachedMpesaStatus>();

export function setMpesaStatusCache(
  checkoutRequestId: string,
  status: string,
  result: Record<string, unknown>
) {
  statusCache.set(checkoutRequestId, { status, result, ts: Date.now() });
}

export function getMpesaStatusCache(checkoutRequestId: string) {
  const cached = statusCache.get(checkoutRequestId);
  if (cached && cached.status !== "pending" && Date.now() - cached.ts < 300_000) {
    return cached.result;
  }
  return null;
}
