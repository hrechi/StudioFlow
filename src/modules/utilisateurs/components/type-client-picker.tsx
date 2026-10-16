"use client";

import { Building2, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { typeClientLabels, type TypeClient } from "../utilisateur.types";

const OPTIONS: { value: TypeClient; icon: typeof UserRound; hint: string }[] = [
  { value: "PARTICULIER", icon: UserRound, hint: "Wedding, portrait, family" },
  { value: "ENTREPRISE", icon: Building2, hint: "Products, events, brand" },
];

/** Two radio cards: Individual / Business (native radios, keyboard accessible). */
export function TypeClientPicker({
  value,
  onChange,
  error,
  name = "typeClient",
}: {
  value: TypeClient | undefined;
  onChange: (value: TypeClient) => void;
  error?: string;
  name?: string;
}) {
  return (
    <fieldset className="space-y-1.5" aria-describedby={error ? `${name}-error` : undefined}>
      <legend className="mb-1.5 text-sm font-medium text-slate">You are</legend>
      <div className="grid grid-cols-2 gap-3">
        {OPTIONS.map(({ value: optionValue, icon: Icon, hint }) => {
          const checked = value === optionValue;
          return (
            <label
              key={optionValue}
              className={cn(
                "relative flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-3 transition-colors",
                "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
                checked ? "border-primary bg-accent/60" : "border-border hover:border-gray/40",
              )}
            >
              <input
                type="radio"
                name={name}
                value={optionValue}
                checked={checked}
                onChange={() => onChange(optionValue)}
                className="sr-only"
              />
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-lg",
                  checked ? "bg-primary text-white" : "bg-muted text-slate",
                )}
              >
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-charcoal">
                  {typeClientLabels[optionValue]}
                </span>
                <span className="block text-xs text-muted-foreground">{hint}</span>
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <p id={`${name}-error`} role="alert" className="text-xs font-medium text-destructive-text">
          {error}
        </p>
      )}
    </fieldset>
  );
}
