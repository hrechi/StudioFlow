"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SEGMENT_LABELS } from "./nav-config";

/** Breadcrumb built from the URL (unknown segments such as ids show as "Details"). */
export function Breadcrumb({ className }: { className?: string }) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const crumbs = segments.map((segment, index) => ({
    href: `/${segments.slice(0, index + 1).join("/")}`,
    label: SEGMENT_LABELS[segment] ?? "Details",
  }));
  // "/dashboard/facturation" has no page: skip it as a link.
  const linkable = (href: string) => href !== "/dashboard/facturation";

  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
      <ol className="flex min-w-0 items-center gap-1 text-sm">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li
              key={crumb.href}
              className={cn("flex min-w-0 items-center gap-1", !last && "hidden sm:flex")}
            >
              {index > 0 && (
                <ChevronRight
                  className={cn(
                    "size-3.5 shrink-0 text-muted-foreground",
                    last && "hidden sm:block",
                  )}
                  aria-hidden
                />
              )}
              {last || !linkable(crumb.href) ? (
                <span
                  aria-current={last ? "page" : undefined}
                  className={cn(
                    "truncate",
                    last ? "font-semibold text-charcoal" : "text-muted-foreground",
                  )}
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="truncate text-muted-foreground hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
