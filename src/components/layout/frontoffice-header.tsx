"use client";

import { Bell, LayoutDashboard, Menu, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import type { Role } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { PUBLIC_LINKS } from "./nav-config";
import { UserMenu, type MenuUser } from "./user-menu";

export type HeaderUser = MenuUser & { role: Role };

/**
 * Public site header: transparent over the landing hero, solid once scrolled
 * (and on every other page). Mobile: menu drawer.
 */
export function FrontofficeHeader({ user }: { user: HeaderUser | null }) {
  const pathname = usePathname();
  const overHero = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const transparent = overHero && !scrolled && !open;
  const isClient = user?.role === "CLIENT";
  const homeHref = isClient ? "/espace-client" : "/dashboard";

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-[background-color,box-shadow,color] duration-300",
        transparent
          ? "bg-transparent text-white"
          : "bg-white/90 text-charcoal shadow-[0_1px_0_rgb(11_15_20/0.06)] backdrop-blur-md",
      )}
    >
      <div className="mx-auto flex h-18 max-w-7xl items-center gap-6 px-5 sm:px-8">
        <Link href="/" aria-label="StudioFlow — home" className="shrink-0 rounded-md">
          <Logo tone={transparent ? "onDark" : "onLight"} />
        </Link>

        <nav aria-label="Main navigation" className="hidden flex-1 justify-center lg:flex">
          <ul className="flex items-center gap-1">
            {PUBLIC_LINKS.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href) && !link.href.includes("#");
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                      transparent
                        ? "text-white/85 hover:bg-white/10 hover:text-white"
                        : "text-slate hover:bg-muted",
                      active && (transparent ? "text-white" : "text-primary-text"),
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          {user ? (
            <>
              <Button
                asChild
                variant={transparent ? "outline" : "default"}
                className={cn(
                  "hidden sm:inline-flex",
                  transparent &&
                    "border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white",
                )}
              >
                <Link href={homeHref}>
                  <LayoutDashboard aria-hidden />
                  {isClient ? "My account" : "Backoffice"}
                </Link>
              </Button>
              <UserMenu
                user={user}
                tone={transparent ? "dark" : "light"}
                showName={false}
                links={
                  isClient
                    ? [
                        { label: "My account", href: "/espace-client", icon: LayoutDashboard },
                        { label: "Profile", href: "/espace-client/profil", icon: UserRound },
                        {
                          label: "Notifications",
                          href: "/espace-client/notifications",
                          icon: Bell,
                        },
                      ]
                    : [
                        { label: "Backoffice", href: "/dashboard", icon: LayoutDashboard },
                        { label: "Profile", href: "/dashboard/profil", icon: UserRound },
                      ]
                }
              />
            </>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button
                asChild
                variant="ghost"
                className={cn(transparent && "text-white hover:bg-white/10 hover:text-white")}
              >
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Create an account</Link>
              </Button>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "lg:hidden",
              transparent && "text-white hover:bg-white/10 hover:text-white",
            )}
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu aria-hidden />
          </Button>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-80 p-0 sm:max-w-80">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">StudioFlow website navigation</SheetDescription>
          <div className="flex h-full flex-col">
            <div className="flex h-18 items-center border-b px-6">
              <Logo />
            </div>
            <nav aria-label="Mobile navigation" className="flex-1 px-3 py-4">
              <ul className="space-y-1">
                {PUBLIC_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-lg px-3 py-3 text-base font-medium text-slate hover:bg-muted"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="space-y-2 border-t p-5">
              {user ? (
                <Button asChild className="w-full" size="lg">
                  <Link href={homeHref} onClick={() => setOpen(false)}>
                    {isClient ? "My account" : "Backoffice"}
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild className="w-full" size="lg">
                    <Link href="/register" onClick={() => setOpen(false)}>
                      Create an account
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full" size="lg">
                    <Link href="/login" onClick={() => setOpen(false)}>
                      Sign in
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
