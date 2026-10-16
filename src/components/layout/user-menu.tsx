"use client";

import { ChevronDown, Loader2, LogOut, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { UserAvatar } from "@/components/shared/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/modules/utilisateurs/utilisateur.actions";

export type MenuUser = {
  prenom: string;
  nom: string;
  email?: string | null;
  photoProfil?: string | null;
  roleLabel: string;
};

export type MenuLink = { label: string; href: string; icon: LucideIcon };

/** Avatar dropdown with links and a one-click "Sign out" (front office and backoffice). */
export function UserMenu({
  user,
  links,
  tone = "light",
  showName = true,
}: {
  user: MenuUser;
  links: MenuLink[];
  tone?: "light" | "dark";
  showName?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-2 rounded-full p-0.5 pr-1.5 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          tone === "dark" ? "text-white hover:bg-white/10" : "hover:bg-muted",
        )}
        aria-label="Account menu"
      >
        <UserAvatar prenom={user.prenom} nom={user.nom} photoProfil={user.photoProfil} />
        {showName && (
          <span className="hidden text-left leading-tight md:block">
            <span className="block text-sm font-semibold">{user.prenom}</span>
            <span
              className={cn(
                "block text-[0.7rem]",
                tone === "dark" ? "text-white/70" : "text-muted-foreground",
              )}
            >
              {user.roleLabel}
            </span>
          </span>
        )}
        <ChevronDown className="hidden size-4 opacity-60 md:block" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-semibold text-charcoal">
            {user.prenom} {user.nom}
          </p>
          {user.email && <p className="truncate text-xs text-muted-foreground">{user.email}</p>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {links.map(({ label, href, icon: Icon }) => (
          <DropdownMenuItem key={href} asChild>
            <Link href={href}>
              <Icon aria-hidden />
              {label}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={pending}
          onSelect={(event) => {
            event.preventDefault();
            startTransition(() => logoutAction());
          }}
          className="text-destructive-text focus:bg-destructive/10 focus:text-destructive-text"
        >
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <LogOut aria-hidden />}
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
