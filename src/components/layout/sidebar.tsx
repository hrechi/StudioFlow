"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/shared/logo";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Role } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { activeHref, navForRole } from "./nav-config";

export type SidebarUser = {
  prenom: string;
  nom: string;
  photoProfil?: string | null;
  role: Role;
  roleLabel: string;
};

type SidebarProps = {
  user: SidebarUser;
  /** "rail" = icons only (tablet), "full" = labels (desktop and mobile drawer). */
  variant?: "full" | "rail";
  onNavigate?: () => void;
};

/** Dark, permission-aware backoffice sidebar (charter §8, dashboard screenshot). */
export function Sidebar({ user, variant = "full", onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const groups = navForRole(user.role);
  const current = activeHref(
    pathname,
    groups.flatMap((group) => group.items.map((item) => item.href)),
  );
  const rail = variant === "rail";

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className={cn("flex h-20 shrink-0 items-center", rail ? "justify-center" : "px-6")}>
        <Link
          href="/dashboard"
          onClick={onNavigate}
          aria-label="ReFrame — dashboard"
          className="rounded-sm py-2"
        >
          <Logo showWordmark={!rail} iconClassName={rail ? "h-[0.95rem]" : "h-[0.9rem]"} />
        </Link>
      </div>

      <nav
        aria-label="Backoffice navigation"
        className="flex-1 [scrollbar-width:thin] [scrollbar-color:#262626_transparent] overflow-y-auto px-3 pb-4"
      >
        {groups.map((group) => (
          <div key={group.label} className="mt-3 first:mt-1">
            {rail ? (
              <div className="mx-auto my-2 h-px w-8 bg-sidebar-border" aria-hidden />
            ) : (
              <p className="px-3 pt-3 pb-2 font-heading text-[0.6rem] font-medium tracking-[0.3em] text-sidebar-muted uppercase">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.href === current;
                const Icon = item.icon;
                const link = (
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    aria-label={rail ? item.label : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-md text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                      rail ? "size-10 justify-center" : "h-9 px-3",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-gold"
                        : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-[1.1rem] shrink-0",
                        active ? "text-gold" : item.ai && "text-ai-text",
                      )}
                      aria-hidden
                    />
                    {!rail && <span className="flex-1 truncate">{item.label}</span>}
                    {!rail && item.ai && (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[0.6rem] font-bold",
                          "bg-ai/20 text-ai-text",
                        )}
                      >
                        AI
                      </span>
                    )}
                  </Link>
                );
                return (
                  <li key={item.href} className={cn(rail && "flex justify-center")}>
                    {rail ? (
                      <Tooltip>
                        <TooltipTrigger asChild>{link}</TooltipTrigger>
                        <TooltipContent side="right">{item.label}</TooltipContent>
                      </Tooltip>
                    ) : (
                      link
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-sidebar-border p-3">
        <Link
          href="/dashboard/profil"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-sidebar-accent",
            rail && "justify-center",
          )}
          aria-label={rail ? "My profile" : undefined}
        >
          <UserAvatar prenom={user.prenom} nom={user.nom} photoProfil={user.photoProfil} />
          {!rail && (
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-semibold text-white">
                {user.prenom} {user.nom}
              </span>
              <span className="block truncate text-xs text-sidebar-muted">{user.roleLabel}</span>
            </span>
          )}
        </Link>
      </div>
    </div>
  );
}
