"use client";

import { Loader2, RotateCcw, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLES, STATUTS_COMPTE, roleConfig, statutCompteConfig } from "../utilisateur.types";

const ALL = "TOUS";

/** Search + role/statut filters, stored in the URL so the server does the filtering. */
export function UsersToolbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const role = searchParams.get("role") ?? ALL;
  const statut = searchParams.get("statut") ?? ALL;
  const hasFilters = !!(
    searchParams.get("q") ||
    searchParams.get("role") ||
    searchParams.get("statut")
  );

  const update = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value && value !== ALL) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  const onSearchChange = (value: string) => {
    setSearch(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => update({ q: value.trim() || null }), 300);
  };

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <div className="relative flex-1">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by name or email…"
          aria-label="Search users"
          className="h-9 bg-card pl-9"
        />
        {pending && (
          <Loader2
            aria-hidden
            className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
          />
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Select value={role} onValueChange={(value) => update({ role: value })}>
          <SelectTrigger className="h-9 w-44 bg-card" aria-label="Filter by role">
            <SelectValue>
              {role === ALL ? "All roles" : roleConfig[role as keyof typeof roleConfig]?.label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All roles</SelectItem>
            {ROLES.map((value) => (
              <SelectItem key={value} value={value}>
                {roleConfig[value].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statut} onValueChange={(value) => update({ statut: value })}>
          <SelectTrigger className="h-9 w-40 bg-card" aria-label="Filter by status">
            <SelectValue>
              {statut === ALL
                ? "All statuses"
                : statutCompteConfig[statut as keyof typeof statutCompteConfig]?.label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {STATUTS_COMPTE.map((value) => (
              <SelectItem key={value} value={value}>
                {statutCompteConfig[value].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearch("");
              update({ q: null, role: null, statut: null });
            }}
          >
            <RotateCcw aria-hidden />
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}
