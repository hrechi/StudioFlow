/* Module : Gestion du Portfolio · Responsable : Anas Ben Ibrahim */
import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { Galerie } from "@/modules/photos-galeries/galerie.model";
import { listSeances } from "@/modules/seances/seance.service";
import { findUtilisateurById } from "@/modules/utilisateurs/utilisateur.service";

/**
 * Which photos of the Photos & Galleries module (collection `photos`) a staff member may
 * use in a portfolio — the relation between the two modules, in one place:
 * - ADMIN: every photo of the studio;
 * - PHOTOGRAPHE: the photos they uploaded, plus the photos of every gallery whose session
 *   they work on (team of the séance in the Séances module);
 * - nobody else (null).
 * Photos rejected during culling are never offered.
 */
export async function photoLibraryFilter(userId: string): Promise<Record<string, unknown> | null> {
  if (!Types.ObjectId.isValid(userId)) return null;
  const user = await findUtilisateurById(userId);
  if (!user || user.statut !== "ACTIF") return null;

  const notRejected = { statutCulling: { $ne: "REJETEE" } };
  if (user.role === "ADMIN") return notRejected;
  if (user.role !== "PHOTOGRAPHE") return null;

  const seanceIds = (await listSeances({ employeId: userId })).map((s) => new Types.ObjectId(s.id));
  await connectDB();
  const galerieIds = seanceIds.length
    ? await Galerie.find({ seance: { $in: seanceIds } }).distinct("_id")
    : [];
  return {
    ...notRejected,
    $or: [{ uploadePar: new Types.ObjectId(userId) }, { galerie: { $in: galerieIds } }],
  };
}
