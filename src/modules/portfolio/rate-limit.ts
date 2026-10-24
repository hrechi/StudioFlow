type RateLimitEntry = { count: number; expiresAt: number };

const entries = new Map<string, RateLimitEntry>();

/** Small per-process guard for public endpoints; use a shared store at multi-instance scale. */
export function allowPortfolioRequest(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  if (entries.size > 5_000) {
    for (const [entryKey, entry] of entries) {
      if (entry.expiresAt <= now) entries.delete(entryKey);
    }
    if (entries.size > 10_000 && !entries.has(key)) return false;
  }
  const current = entries.get(key);
  if (!current || current.expiresAt <= now) {
    entries.set(key, { count: 1, expiresAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

export function getRequestAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}
