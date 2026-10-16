import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PASSWORD_MIN } from "../utilisateur.schemas";

const LEVELS = [
  { label: "Too weak", bar: "bg-destructive", text: "text-destructive-text" },
  { label: "Weak", bar: "bg-destructive", text: "text-destructive-text" },
  { label: "Fair", bar: "bg-warning", text: "text-warning-text" },
  { label: "Good", bar: "bg-primary", text: "text-primary-text" },
  { label: "Excellent", bar: "bg-success", text: "text-success-text" },
] as const;

function scorePassword(value: string): number {
  if (!value) return 0;
  let score = 0;
  if (value.length >= PASSWORD_MIN) score++;
  if (value.length >= 12) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score++;
  const meetsRules = value.length >= PASSWORD_MIN && /[A-Za-zÀ-ÿ]/.test(value) && /\d/.test(value);
  return meetsRules ? Math.max(score, 2) : Math.min(score, 1);
}

/** Strength meter + the three required rules (8 chars, a letter, a digit). */
export function PasswordStrength({ value, id }: { value: string; id?: string }) {
  const score = scorePassword(value);
  const level = LEVELS[score];
  const rules = [
    { ok: value.length >= PASSWORD_MIN, label: `At least ${PASSWORD_MIN} characters` },
    { ok: /[A-Za-zÀ-ÿ]/.test(value), label: "One letter" },
    { ok: /\d/.test(value), label: "One digit" },
  ];

  return (
    <div id={id} className="space-y-2" aria-live="polite">
      <div className="flex items-center gap-2">
        <div className="grid flex-1 grid-cols-4 gap-1" aria-hidden>
          {[1, 2, 3, 4].map((step) => (
            <span
              key={step}
              className={cn(
                "h-1.5 rounded-full transition-colors",
                value && score >= step ? level.bar : "bg-light-gray",
              )}
            />
          ))}
        </div>
        {value && (
          <span className={cn("w-20 text-right text-xs font-semibold", level.text)}>
            {level.label}
          </span>
        )}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {rules.map((rule) => (
          <li
            key={rule.label}
            className={cn(
              "flex items-center gap-1 text-xs",
              rule.ok ? "text-success-text" : "text-muted-foreground",
            )}
          >
            {rule.ok ? (
              <Check className="size-3.5" aria-hidden />
            ) : (
              <X className="size-3.5" aria-hidden />
            )}
            <span>
              {rule.label}
              <span className="sr-only">{rule.ok ? ": met" : ": missing"}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
