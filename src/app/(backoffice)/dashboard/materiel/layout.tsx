/* Module : Gestion du Matériel · Responsable : Amel Mediouni */
import type { ReactNode } from "react";
import { requireArea } from "@/lib/guards";
import { BadgeMateriel } from "@/modules/materiel/components/badge-materiel";

/** Equipment section: adds the app-icon badge updater to every Equipment page. */
export default async function MaterielLayout({ children }: { children: ReactNode }) {
  const user = await requireArea("materiel");
  return (
    <>
      <BadgeMateriel utilisateurId={user.id} />
      {children}
    </>
  );
}
