import { Suspense } from "react";
import { FlashToast } from "@/components/layout/flash-toast";
import { Footer } from "@/components/layout/footer";
import { FrontofficeHeader, type HeaderUser } from "@/components/layout/frontoffice-header";
import { auth } from "@/lib/auth";
import { roleConfig } from "@/modules/utilisateurs/utilisateur.types";

/** Public front office (visitors). Reads the JWT only, so it never blocks or redirects. */
export default async function PublicLayout({ children }: LayoutProps<"/">) {
  const session = await auth();
  const user: HeaderUser | null = session?.user?.role
    ? {
        prenom: session.user.prenom,
        nom: session.user.nom,
        email: session.user.email,
        photoProfil: session.user.photoProfil,
        role: session.user.role,
        roleLabel: roleConfig[session.user.role].label,
      }
    : null;

  return (
    <div className="film-grain flex min-h-dvh flex-1 flex-col bg-ink text-bone">
      <a
        href="#main"
        className="sr-only z-50 bg-bone px-4 py-2 text-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <FrontofficeHeader user={user} />
      <div id="main" className="flex flex-1 flex-col">
        {children}
      </div>
      <Footer />
      <Suspense>
        <FlashToast />
      </Suspense>
    </div>
  );
}
