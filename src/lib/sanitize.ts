export function sanitizeString(input: string | undefined | null): string {
  if (!input) return "";
  
  // 1. Trim whitespace
  let clean = input.trim();
  
  // 2. Escape HTML tags to prevent XSS
  clean = clean
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  return clean;
}

export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj };
  for (const key in sanitized) {
    if (typeof sanitized[key] === "string") {
      sanitized[key] = sanitizeString(sanitized[key] as string) as any;
    }
  }
  return sanitized;
}
