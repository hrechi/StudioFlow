import type { Metadata } from "next";
import { ForcedSignOut } from "@/modules/utilisateurs/components/forced-sign-out";

export const metadata: Metadata = { title: "Signing out" };

/** Reached when the guards find a blocked, deleted or changed account: signs out, then /login. */
export default async function DeconnexionPage({ searchParams }: PageProps<"/deconnexion">) {
  const { raison } = await searchParams;
  return <ForcedSignOut raison={typeof raison === "string" ? raison : "session"} />;
}
