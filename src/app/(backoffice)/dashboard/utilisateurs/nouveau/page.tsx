/* Module : Gestion des Utilisateurs (core) · Responsable : Louay Herichi + équipe */
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { requireArea } from "@/lib/guards";
import { UserForm } from "@/modules/utilisateurs/components/user-form";

export const metadata: Metadata = { title: "New user" };

export default async function NouvelUtilisateurPage() {
  await requireArea("utilisateurs");
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow={<BackLink />}
        title="New user"
        description="Staff accounts (photographers, administrators) are created here, never through public sign-up."
      />
      <UserForm mode="create" />
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/dashboard/utilisateurs"
      className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden />
      Users
    </Link>
  );
}
