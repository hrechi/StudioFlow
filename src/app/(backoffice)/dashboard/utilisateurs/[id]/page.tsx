/* Module : Gestion des Utilisateurs (core) · Responsable : Louay Herichi + équipe */
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { requireArea } from "@/lib/guards";
import { formatDate, formatDateTime } from "@/lib/utils";
import { UserForm } from "@/modules/utilisateurs/components/user-form";
import { findUtilisateurById } from "@/modules/utilisateurs/utilisateur.service";
import { roleConfig, statutCompteConfig } from "@/modules/utilisateurs/utilisateur.types";

export const metadata: Metadata = { title: "Edit user" };

export default async function ModifierUtilisateurPage({
  params,
}: PageProps<"/dashboard/utilisateurs/[id]">) {
  const admin = await requireArea("utilisateurs");
  const { id } = await params;
  const user = await findUtilisateurById(id);
  if (!user) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow={
          <Link
            href="/dashboard/utilisateurs"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Users
          </Link>
        }
        title={`${user.prenom} ${user.nom}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge value={user.role} config={roleConfig} dot={false} />
            <StatusBadge value={user.statut} config={statutCompteConfig} />
            <span>
              Created {formatDate(user.createdAt)} · Last sign-in{" "}
              {user.derniereConnexion ? formatDateTime(user.derniereConnexion) : "never"}
            </span>
          </span>
        }
      />
      <UserForm mode="edit" user={user} isSelf={user.id === admin.id} />
    </div>
  );
}
