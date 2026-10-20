"use client";

import { Bell, ExternalLink, Menu, Search, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { NotificationBell } from "@/modules/utilisateurs/components/notification-bell";
import type { NotificationDTO } from "@/modules/utilisateurs/utilisateur.types";
import { Breadcrumb } from "./breadcrumb";
import { Sidebar, type SidebarUser } from "./sidebar";
import { UserMenu } from "./user-menu";

type BackofficeShellProps = {
  user: SidebarUser & { email: string };
  notifications: { latest: NotificationDTO[]; unread: number };
  children: ReactNode;
};

/**
 * Backoffice layout: dark sidebar (full on desktop, icon rail on tablet,
 * drawer on mobile) + top bar (breadcrumb, search, bell, user menu).
 */
export function BackofficeShell({ user, notifications, children }: BackofficeShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-dvh bg-surface">
      {/* Desktop: full sidebar · Tablet: icon rail */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[4.5rem] md:block lg:w-64">
        <div className="h-full lg:hidden">
          <Sidebar user={user} variant="rail" />
        </div>
        <div className="hidden h-full lg:block">
          <Sidebar user={user} />
        </div>
      </aside>

      {/* Mobile / tablet drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="left"
          className="w-72 border-none bg-sidebar p-0 sm:max-w-72"
          showCloseButton={false}
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">ReFrame backoffice modules</SheetDescription>
          <Sidebar key={pathname} user={user} onNavigate={() => setDrawerOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="md:pl-[4.5rem] lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-white/[0.06] bg-surface/85 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-surface/70 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            <Menu aria-hidden />
          </Button>
          <Breadcrumb className="flex-1" />
          <div className="relative hidden w-72 md:block">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              placeholder="Search sessions, clients, photos…"
              aria-label="Global search (coming soon)"
              className="h-9 rounded-md border-border bg-card pl-9 dark:bg-card"
            />
          </div>
          <NotificationBell
            latest={notifications.latest}
            unread={notifications.unread}
            listHref="/dashboard/notifications"
          />
          <UserMenu
            tone="dark"
            user={user}
            links={[
              { label: "My profile", href: "/dashboard/profil", icon: UserRound },
              { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
              { label: "View website", href: "/", icon: ExternalLink },
            ]}
          />
        </header>
        <main id="contenu" className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
