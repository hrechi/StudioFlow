/* Module : Gestion des Utilisateurs (core) · Responsable : Louay Herichi + équipe */
import { Ban, Camera, UserPlus, Users, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireArea } from "@/lib/guards";
import { UsersTable } from "@/modules/utilisateurs/components/users-table";
import { UsersToolbar } from "@/modules/utilisateurs/components/users-toolbar";
import { userListQuerySchema } from "@/modules/utilisateurs/utilisateur.schemas";
import { getUserStats, listUtilisateurs } from "@/modules/utilisateurs/utilisateur.service";

export const metadata: Metadata = { title: "Users" };

export default async function UtilisateursPage({
  searchParams,
}: PageProps<"/dashboard/utilisateurs">) {
  const admin = await requireArea("utilisateurs");
  const raw = await searchParams;
  const query = userListQuerySchema.parse({
    q: raw.q,
    role: raw.role,
    statut: raw.statut,
    page: raw.page,
  });
  const [result, stats] = await Promise.all([listUtilisateurs(query), getUserStats()]);
  const filtered = !!(query.q || query.role || query.statut);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users and roles"
        description="Create staff accounts, assign roles and manage client access."
        actions={
          <Button asChild>
            <Link href="/dashboard/utilisateurs/nouveau">
              <UserPlus aria-hidden />
              New user
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Total accounts" value={stats.TOTAL} icon={Users} />
        <StatCard
          label="Studio staff"
          value={stats.ADMIN + stats.PHOTOGRAPHE + stats.RETOUCHEUR}
          icon={Camera}
          tone="green"
          hint={`${stats.ADMIN} admin · ${stats.PHOTOGRAPHE} photo · ${stats.RETOUCHEUR} retouch`}
        />
        <StatCard label="Clients" value={stats.CLIENT} icon={UsersRound} tone="amber" />
        <StatCard label="Blocked accounts" value={stats.BLOQUE} icon={Ban} tone="red" />
      </div>

      <Card className="gap-0 py-0">
        <div className="border-b p-4">
          <UsersToolbar />
        </div>
        <UsersTable users={result.items} currentUserId={admin.id} filtered={filtered} />
        {result.total > 0 && (
          <div className="border-t px-4 py-3">
            <Pagination
              basePath="/dashboard/utilisateurs"
              page={result.page}
              pageCount={result.pageCount}
              total={result.total}
              label={result.total > 1 ? "users" : "user"}
              searchParams={{ q: query.q || undefined, role: query.role, statut: query.statut }}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
