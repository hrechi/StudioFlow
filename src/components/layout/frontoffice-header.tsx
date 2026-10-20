"use client";

import { ArrowUpRight, Bell, LayoutDashboard, Menu, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/theme/theme";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import type { Role } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { PUBLIC_LINKS } from "./nav-config";
import { UserMenu, type MenuUser } from "./user-menu";

export type HeaderUser = MenuUser & { role: Role };

/**
 * Public site header: transparent at the top of the page (over the dark hero),
 * solid glass once the visitor scrolls. Mobile: full-height menu drawer.
 */
export function FrontofficeHeader({ user }: { user: HeaderUser | null }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Pages that open on a full-bleed photo: the transparent header stays light over it.
  const heroPage = pathname === "/" || pathname.startsWith("/portfolio/");
  const overPhoto = heroPage && !scrolled && !open;
  const isClient = user?.role === "CLIENT";
  const homeHref = isClient ? "/espace-client" : "/dashboard";
  const bookHref = isClient ? "/espace-client/seances/reserver" : user ? "/dashboard" : "/register";

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 text-foreground transition-[background-color,border-color,backdrop-filter] duration-500",
        overPhoto && "dark",
        scrolled
          ? "border-b border-foreground/[0.06] bg-background/80 backdrop-blur-xl"
          : "border-b border-transparent bg-gradient-to-b from-background/70 to-transparent",
      )}
    >
      <div className="container-wide flex h-20 items-center gap-8">
        <Link href="/" aria-label="ReFrame — home" className="shrink-0 rounded-sm py-2">
          <Logo iconClassName="h-4 sm:h-[1.15rem]" />
        </Link>

        <nav aria-label="Main navigation" className="hidden flex-1 justify-center xl:flex">
          <ul className="flex items-center gap-1">
            {PUBLIC_LINKS.map((link) => {
              const active = !link.href.includes("#") && pathname.startsWith(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative px-3.5 py-2 font-heading text-[0.7rem] font-medium tracking-[0.28em] uppercase transition-colors",
                      "after:absolute after:inset-x-3.5 after:bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-gold after:transition-transform after:duration-500 hover:after:scale-x-100",
                      active
                        ? "text-foreground after:scale-x-100"
                        : "text-foreground/70 hover:text-foreground",
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-3 xl:ml-0">
          <ThemeToggle />
          {user ? (
            <>
              <Link
                href={homeHref}
                className="hidden items-center gap-2 font-heading text-[0.7rem] font-medium tracking-[0.24em] text-foreground/80 uppercase transition-colors hover:text-foreground sm:inline-flex"
              >
                <LayoutDashboard className="size-4" aria-hidden />
                {isClient ? "My account" : "Backoffice"}
              </Link>
              <UserMenu
                user={user}
                tone="dark"
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
            <div className="hidden items-center gap-5 sm:flex">
              <Link
                href="/login"
                className="font-heading text-[0.7rem] font-medium tracking-[0.24em] text-foreground/80 uppercase transition-colors hover:text-foreground"
              >
                Sign in
              </Link>
              <Button asChild variant="cinematic" size="cta-sm">
                <Link href={bookHref}>
                  Book a session
                  <ArrowUpRight aria-hidden />
                </Link>
              </Button>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-foreground hover:bg-foreground/10 hover:text-foreground xl:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
          >
            <Menu aria-hidden />
          </Button>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full border-foreground/5 bg-background p-0 sm:max-w-sm"
        >
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">ReFrame website navigation</SheetDescription>
          <div className="flex h-full flex-col">
            <div className="flex h-20 items-center px-6">
              <Logo iconClassName="h-4" />
            </div>
            <nav aria-label="Mobile navigation" className="flex-1 px-6 py-6">
              <ul className="space-y-1">
                {PUBLIC_LINKS.map((link, index) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="flex items-baseline gap-4 border-b border-foreground/5 py-4 font-heading text-lg font-medium tracking-[0.18em] text-foreground uppercase transition-colors hover:text-gold"
                    >
                      <span className="text-[0.65rem] tracking-[0.2em] text-gold">
                        0{index + 1}
                      </span>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="space-y-3 p-6">
              <div className="flex items-center justify-between border-b border-border pb-4 text-sm text-muted-foreground">
                Appearance
                <ThemeToggle />
              </div>
              {user ? (
                <Button asChild variant="cinematic" className="w-full" size="cta">
                  <Link href={homeHref} onClick={() => setOpen(false)}>
                    {isClient ? "My account" : "Backoffice"}
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="cinematic" className="w-full" size="cta">
                    <Link href={bookHref} onClick={() => setOpen(false)}>
                      Book a session
                    </Link>
                  </Button>
                  <Button asChild variant="cinematic-outline" className="w-full" size="cta">
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
