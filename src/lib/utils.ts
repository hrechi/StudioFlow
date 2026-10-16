export { cn } from "cn";

/** Initials for avatars: "Louay Herichi" -> "LH". */
export function initials(prenom?: string | null, nom?: string | null): string {
  return `${prenom?.[0] ?? ""}${nom?.[0] ?? ""}`.toUpperCase() || "?";
}

// English UI: "16 Oct 2026", "16 Oct 2026, 14:00".
const LOCALE = "en-GB";

const dateFormatter = new Intl.DateTimeFormat(LOCALE, { dateStyle: "medium" });
const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  dateStyle: "medium",
  timeStyle: "short",
});
const timeFormatter = new Intl.DateTimeFormat(LOCALE, { timeStyle: "short" });
const numberFormatter = new Intl.NumberFormat(LOCALE);
const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "TND",
  maximumFractionDigits: 0,
});

export function formatDate(value: Date | string | null | undefined): string {
  return value ? dateFormatter.format(new Date(value)) : "—";
}

export function formatDateTime(value: Date | string | null | undefined): string {
  return value ? dateTimeFormatter.format(new Date(value)) : "—";
}

export function formatTime(value: Date | string | null | undefined): string {
  return value ? timeFormatter.format(new Date(value)) : "—";
}

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/** "5 min ago", "2 d ago" — short relative time for notifications. */
export function formatRelative(value: Date | string, now: Date = new Date()): string {
  const diff = Math.round((now.getTime() - new Date(value).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)} d ago`;
  return formatDate(value);
}
