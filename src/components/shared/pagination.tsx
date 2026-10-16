import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type PaginationProps = {
  page: number;
  pageCount: number;
  /** Current search params, kept when changing page (filters, search). */
  searchParams?: Record<string, string | undefined>;
  basePath: string;
  total?: number;
  label?: string;
};

function hrefFor(basePath: string, params: Record<string, string | undefined>, page: number) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  if (page > 1) query.set("page", String(page));
  else query.delete("page");
  const qs = query.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/** Server-side pagination with plain links (works without JavaScript). */
export function Pagination({
  page,
  pageCount,
  searchParams = {},
  basePath,
  total,
  label = "results",
}: PaginationProps) {
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1,
  );

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-col items-center justify-between gap-3 text-sm sm:flex-row"
    >
      <p className="text-muted-foreground">
        {total !== undefined && (
          <>
            {total} {label} · page {page} of {pageCount}
          </>
        )}
      </p>
      <div className="flex items-center gap-1">
        <PageLink
          href={hrefFor(basePath, searchParams, page - 1)}
          disabled={page <= 1}
          label="Previous page"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </PageLink>
        {pages.map((p, index) => (
          <span key={p} className="flex items-center gap-1">
            {index > 0 && p - pages[index - 1] > 1 && (
              <span className="px-1 text-muted-foreground" aria-hidden>
                …
              </span>
            )}
            <Link
              href={hrefFor(basePath, searchParams, p)}
              aria-current={p === page ? "page" : undefined}
              className={cn(
                "grid size-8 place-items-center rounded-lg font-medium transition-colors",
                p === page ? "bg-primary text-white" : "text-slate hover:bg-muted",
              )}
            >
              {p}
            </Link>
          </span>
        ))}
        <PageLink
          href={hrefFor(basePath, searchParams, page + 1)}
          disabled={page >= pageCount}
          label="Next page"
        >
          <ChevronRight className="size-4" aria-hidden />
        </PageLink>
      </div>
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span aria-disabled className="grid size-8 place-items-center rounded-lg text-light-gray">
        {children}
        <span className="sr-only">{label}</span>
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="grid size-8 place-items-center rounded-lg text-slate hover:bg-muted"
    >
      {children}
      <span className="sr-only">{label}</span>
    </Link>
  );
}
