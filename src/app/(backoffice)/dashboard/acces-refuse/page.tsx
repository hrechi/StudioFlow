/* Module : Gestion des Utilisateurs (core) · Responsable : Louay Herichi + équipe */
import { ArrowLeft, ShieldX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireArea } from "@/lib/guards";
import { roleConfig } from "@/modules/utilisateurs/utilisateur.types";
import { SEGMENT_LABELS } from "@/components/layout/nav-config";

export const metadata: Metadata = { title: "Access denied" };

/** Where staff land when their role does not allow a module (see lib/rbac.ts). */
export default async function AccesRefusePage({
  searchParams,
}: PageProps<"/dashboard/acces-refuse">) {
  const user = await requireArea("dashboard");
  const { page } = await searchParams;
  const moduleLabel =
    typeof page === "string" ? SEGMENT_LABELS[page.split("/").filter(Boolean)[1] ?? ""] : undefined;

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-5 py-16 text-center">
      <span className="grid size-16 place-items-center rounded-2xl bg-destructive/10 text-destructive-text">
        <ShieldX className="size-8" aria-hidden />
      </span>
      <div className="space-y-2">
        <h1 className="text-2xl font-medium tracking-[0.08em] text-foreground uppercase">
          Access denied
        </h1>
        <p className="text-sm text-muted-foreground">
          Your role ({roleConfig[user.role].label.toLowerCase()}) doesn&apos;t give access to
          {moduleLabel ? ` the "${moduleLabel}" module` : " this page"}. If you think this is a
          mistake, contact the studio administrator.
        </p>
      </div>
      <Button asChild>
        <Link href="/dashboard">
          <ArrowLeft aria-hidden />
          Back to dashboard
        </Link>
      </Button>
    </div>
  );
}
