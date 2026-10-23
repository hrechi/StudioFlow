import { Suspense } from "react";
import { FlashToast } from "@/components/layout/flash-toast";
import { Footer } from "@/components/layout/footer";
import { FrontofficeHeader, type HeaderUser } from "@/components/layout/frontoffice-header";
import { auth } from "@/lib/auth";
import { ChatbotWidget } from "@/modules/seances/components/chatbot-widget";
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

  const bookHref = user?.role === "CLIENT" ? "/espace-client/seances/reserver" : "/register";

  return (
    <div className="film-grain flex min-h-dvh flex-1 flex-col bg-background text-foreground">
      <a
        href="#main"
        className="sr-only z-50 bg-foreground px-4 py-2 text-background focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
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
      <ChatbotWidget bookHref={bookHref} />
    </div>
  );
}
