import "server-only";
import { ServiceError } from "@/lib/action-result";
import type { PackDTO } from "@/modules/seances/catalogue.types";
import { listPacks } from "@/modules/seances/pack.service";
import type { SeanceDTO, StatutSeanceReel } from "@/modules/seances/seance.dto";
import { findSeanceById, listSeances } from "@/modules/seances/seance.service";
import { findUtilisateurById } from "@/modules/utilisateurs/utilisateur.service";
import type { LignePrestation } from "./facturation.types";

/** A quote can only be issued once the session is approved (same rule as the séance final price). */
export const STATUTS_SEANCE_FACTURABLES: readonly StatutSeanceReel[] = [
  "CONFIRMEE",
  "EN_COURS",
  "TERMINEE",
  "REPORTEE",
];

export type SeanceFacturable = {
  id: string;
  titre: string;
  dateDebut: string;
  typeEvenement: string;
  client: { id: string; nom: string };
  pack: { nom: string; prix: number } | null;
  prestationPersonnalisee?: string;
  prixFinal?: number;
  /** Quote lines pre-filled from the session: the pack at the session price, then its included services. */
  lignes: LignePrestation[];
};

function isFacturable(seance: SeanceDTO): seance is SeanceDTO & { client: NonNullable<SeanceDTO["client"]> } {
  // The client portal needs an account: sessions booked for an external client cannot be quoted online.
  return STATUTS_SEANCE_FACTURABLES.includes(seance.statut) && seance.client !== null;
}

/**
 * Packs only price the whole bundle, not each service: the pack line carries the session price
 * (agreed final price, else pack price) and the included services are listed at 0.
 */
function lignesFromSeance(seance: SeanceDTO, pack: PackDTO | undefined): LignePrestation[] {
  const prix = seance.prixFinal ?? seance.pack?.prix ?? 0;
  const titre = seance.pack?.nom ?? seance.prestationPersonnalisee ?? seance.typeEvenement.nom;
  const lignes: LignePrestation[] = [
    { designation: `${seance.pack ? "Pack " : ""}${titre} — ${seance.typeEvenement.nom}`.slice(0, 200), quantite: 1, prixUnitaire: prix },
  ];
  for (const ligne of pack?.prestations ?? []) {
    const details = [ligne.unite, ligne.conditions].filter(Boolean).join(", ");
    lignes.push({
      designation: `${ligne.nom}${details ? ` (${details})` : ""} — included`.slice(0, 200),
      quantite: ligne.quantite,
      prixUnitaire: 0,
    });
  }
  return lignes;
}

function toFacturable(
  seance: SeanceDTO & { client: NonNullable<SeanceDTO["client"]> },
  packs: Map<string, PackDTO>,
): SeanceFacturable {
  return {
    id: seance.id,
    titre: seance.titre,
    dateDebut: seance.dateDebut,
    typeEvenement: seance.typeEvenement.nom,
    client: { id: seance.client.id, nom: `${seance.client.prenom} ${seance.client.nom}`.trim() },
    pack: seance.pack ? { nom: seance.pack.nom, prix: seance.pack.prix } : null,
    prestationPersonnalisee: seance.prestationPersonnalisee,
    prixFinal: seance.prixFinal,
    lignes: lignesFromSeance(seance, seance.pack ? packs.get(seance.pack.id) : undefined),
  };
}

async function packsById(): Promise<Map<string, PackDTO>> {
  return new Map((await listPacks()).map((p) => [p.id, p]));
}

export async function listFacturationSessions(): Promise<SeanceFacturable[]> {
  const [seances, packs] = await Promise.all([listSeances(), packsById()]);
  return seances.filter(isFacturable).map((s) => toFacturable(s, packs));
}

export async function getFacturationSession(seanceId: string): Promise<SeanceFacturable> {
  const seance = await findSeanceById(seanceId);
  if (!seance) throw new ServiceError("Session not found.", "seance");
  if (!STATUTS_SEANCE_FACTURABLES.includes(seance.statut)) {
    throw new ServiceError("A quote can only be created for a confirmed session.", "seance");
  }
  if (!isFacturable(seance)) {
    throw new ServiceError("This session has no client account: it cannot be quoted online.", "seance");
  }
  return toFacturable(seance, await packsById());
}

export async function getFacturationReferences(clientId: string, seanceId: string) {
  const seance = await getFacturationSession(seanceId);
  if (seance.client.id !== clientId) throw new ServiceError("The client does not match the session.", "client");
  const client = await findUtilisateurById(clientId);
  if (!client) throw new ServiceError("Client not found.", "client");
  return {
    client: { id: client.id, nom: `${client.prenom} ${client.nom}`.trim(), email: client.email },
    seance: { id: seance.id, titre: seance.titre, type: seance.typeEvenement, date: new Date(seance.dateDebut) },
  };
}
