import { Users } from "lucide-react";
import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { formatDate, formatDateTime } from "@/lib/utils";
import { roleConfig, statutCompteConfig, type UtilisateurDTO } from "../utilisateur.types";
import { UserRowMenu } from "./user-row-menu";

export function UsersTable({
  users,
  currentUserId,
  filtered,
}: {
  users: UtilisateurDTO[];
  currentUserId: string;
  filtered: boolean;
}) {
  const columns: DataTableColumn<UtilisateurDTO>[] = [
    {
      key: "utilisateur",
      header: "User",
      cell: (user) => (
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar prenom={user.prenom} nom={user.nom} photoProfil={user.photoProfil} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-charcoal">
              <Link
                href={`/dashboard/utilisateurs/${user.id}`}
                className="hover:text-primary-text hover:underline"
              >
                {user.prenom} {user.nom}
              </Link>
              {user.id === currentUserId && (
                <span className="ml-1.5 text-xs font-medium text-muted-foreground">(you)</span>
              )}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      cell: (user) => <StatusBadge value={user.role} config={roleConfig} dot={false} />,
    },
    {
      key: "statut",
      header: "Status",
      cell: (user) => <StatusBadge value={user.statut} config={statutCompteConfig} />,
    },
    {
      key: "derniereConnexion",
      header: "Last sign-in",
      cell: (user) => (
        <span className="text-sm whitespace-nowrap text-slate">
          {user.derniereConnexion ? formatDateTime(user.derniereConnexion) : "Never"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      hideOnMobile: true,
      cell: (user) => (
        <span className="text-sm whitespace-nowrap text-slate">{formatDate(user.createdAt)}</span>
      ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "w-12 text-right",
      cell: (user) => <UserRowMenu user={user} isSelf={user.id === currentUserId} />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={users}
      getRowKey={(user) => user.id}
      caption="User list"
      empty={
        <EmptyState
          icon={Users}
          title={filtered ? "No matching users" : "No users yet"}
          description={
            filtered
              ? "Change the search or the filters."
              : "Create the first studio staff account."
          }
          className="m-4"
        />
      }
    />
  );
}
