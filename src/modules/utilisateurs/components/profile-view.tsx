import { CalendarDays, Clock, Mail, Phone, type LucideIcon } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/utils";
import { roleConfig, typeClientLabels, type UtilisateurDTO } from "../utilisateur.types";
import { ChangePasswordForm } from "./change-password-form";
import { DeleteAccountCard } from "./delete-account-card";
import { ProfileForm } from "./profile-form";

/** Full profile page body, shared by /dashboard/profil and /espace-client/profil. */
export function ProfileView({ user, isLastAdmin }: { user: UtilisateurDTO; isLastAdmin: boolean }) {
  const subtitle =
    user.role === "CLIENT"
      ? user.typeClient === "ENTREPRISE" && user.entreprise
        ? user.entreprise
        : typeClientLabels[user.typeClient ?? "PARTICULIER"]
      : user.specialite || roleConfig[user.role].label;

  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[20rem_minmax(0,1fr)]">
      <aside className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 pt-2 text-center">
            <UserAvatar
              prenom={user.prenom}
              nom={user.nom}
              photoProfil={user.photoProfil}
              size="xl"
            />
            <div>
              <p className="text-lg font-semibold text-foreground">
                {user.prenom} {user.nom}
              </p>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
            <StatusBadge value={user.role} config={roleConfig} />
            <dl className="mt-2 w-full space-y-2.5 border-t pt-4 text-left text-sm">
              <InfoRow icon={Mail} label="Email" value={user.email} />
              {user.telephone && <InfoRow icon={Phone} label="Phone" value={user.telephone} />}
              <InfoRow
                icon={CalendarDays}
                label="Member since"
                value={formatDate(user.createdAt)}
              />
              <InfoRow
                icon={Clock}
                label="Last sign-in"
                value={formatDateTime(user.derniereConnexion)}
              />
            </dl>
          </CardContent>
        </Card>
      </aside>

      <div className="min-w-0 space-y-6">
        <ProfileForm user={user} />
        <ChangePasswordForm />
        <DeleteAccountCard isLastAdmin={isLastAdmin} />
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="truncate font-medium text-slate">{value}</dd>
      </div>
    </div>
  );
}
