"use client";

import {
  CalendarDays,
  ExternalLink,
  Home,
  Images,
  Menu,
  MessageSquareHeart,
  Receipt,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/modules/utilisateurs/components/notification-bell";
import type { NotificationDTO } from "@/modules/utilisateurs/utilisateur.types";
import { activeHref } from "./nav-config";
import { UserMenu, type MenuUser } from "./user-menu";

const CLIENT_NAV = [
  { label: "Overview", href: "/espace-client", icon: Home },
  { label: "My sessions", href: "/espace-client/seances", icon: CalendarDays },
  { label: "My galleries", href: "/espace-client/galeries", icon: Images },
  { label: "Quotes & invoices", href: "/espace-client/factures", icon: Receipt },
  { label: "Reviews & complaints", href: "/espace-client/avis", icon: MessageSquareHeart },
  { label: "Profile", href: "/espace-client/profil", icon: UserRound },
];

/** Client area (front office): same identity as the showcase site, calmer and focused on content. */
export function ClientShell({
  user,
  notifications,
  children,
}: {
  user: MenuUser;
  notifications: { latest: NotificationDTO[]; unread: number };
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const current = activeHref(
    pathname,
    CLIENT_NAV.map((item) => item.href),
  );

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-ink/80 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu aria-hidden />
          </Button>
          <Link href="/espace-client" aria-label="My ReFrame account" className="rounded-sm py-2">
            <Logo iconClassName="h-[0.9rem]" />
          </Link>
          <nav aria-label="Client area" className="hidden flex-1 justify-center lg:flex">
            <ul className="flex items-center gap-1">
              {CLIENT_NAV.filter((item) => item.href !== "/espace-client/profil").map((item) => {
                const active = item.href === current;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative px-3 py-2 font-heading text-[0.66rem] font-medium tracking-[0.22em] uppercase transition-colors",
                        "after:absolute after:inset-x-3 after:bottom-0 after:h-px after:origin-left after:bg-gold after:transition-transform after:duration-500",
                        active
                          ? "text-bone after:scale-x-100"
                          : "text-bone/60 after:scale-x-0 hover:text-bone",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <NotificationBell
              latest={notifications.latest}
              unread={notifications.unread}
              listHref="/espace-client/notifications"
            />
            <UserMenu
              tone="dark"
              user={user}
              links={[
                { label: "My profile", href: "/espace-client/profil", icon: UserRound },
                { label: "Back to website", href: "/", icon: ExternalLink },
              ]}
            />
          </div>
        </div>
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 border-white/5 bg-ink p-0 sm:max-w-72">
          <SheetTitle className="sr-only">Client area menu</SheetTitle>
          <SheetDescription className="sr-only">Pages of your client area</SheetDescription>
          <div className="flex h-18 items-center border-b border-white/[0.06] px-5">
            <Logo iconClassName="h-[0.9rem]" />
          </div>
          <nav aria-label="Client area (mobile)" className="px-3 py-4">
            <ul className="space-y-1">
              {CLIENT_NAV.map(({ label, href, icon: Icon }) => {
                const active = href === current;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium",
                        active ? "bg-accent text-primary-text" : "text-slate hover:bg-muted",
                      )}
                    >
                      <Icon className="size-4.5" aria-hidden />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </SheetContent>
      </Sheet>

      <main id="contenu" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:py-10">
        {children}
      </main>
      <footer className="border-t border-white/[0.06] bg-ink">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} ReFrame · Photography studio</p>
          <p>
            Any questions?{" "}
            <a
              href="mailto:contact@reframe.tn"
              className="font-medium text-primary-text hover:underline"
            >
              contact@reframe.tn
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
