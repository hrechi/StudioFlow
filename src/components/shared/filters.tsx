"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const ALL = "TOUS";

/** Search field with icon (controlled). */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="h-9 bg-card pl-9"
      />
    </div>
  );
}

/** Select with an "All" option; `options` maps value → label. */
export function FilterSelect<T extends string>({
  value,
  onChange,
  options,
  allLabel,
  label,
  className,
}: {
  value: T | typeof ALL;
  onChange: (value: T | typeof ALL) => void;
  options: Record<T, string>;
  allLabel: string;
  label: string;
  className?: string;
}) {
  const entries = Object.entries(options) as [T, string][];
  return (
    <Select value={value} onValueChange={(next) => onChange(next as T | typeof ALL)}>
      <SelectTrigger className={cn("h-9 w-44 bg-card", className)} aria-label={label}>
        <SelectValue>{value === ALL ? allLabel : options[value as T]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {entries.map(([key, text]) => (
          <SelectItem key={key} value={key}>
            {text}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Turns a StatusConfig into the value → label map FilterSelect expects. */
export function labelsOf<T extends string>(
  config: Record<T, { label: string }>,
): Record<T, string> {
  return Object.fromEntries(
    Object.entries(config).map(([key, entry]) => [key, (entry as { label: string }).label]),
  ) as Record<T, string>;
}
