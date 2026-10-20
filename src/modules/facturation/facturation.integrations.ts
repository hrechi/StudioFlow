import { findUtilisateurById } from "@/modules/utilisateurs/utilisateur.service";
import { listClientRefs } from "@/modules/utilisateurs/utilisateur.service";
import { SEANCES } from "@/modules/seances/mock-data";
import { createHash } from "node:crypto";
import type { LignePrestation } from "./facturation.types";

export const LIGNES_IA: LignePrestation[] = [
  { designation: "Studio portrait coverage (2 h)", quantite: 1, prixUnitaire: 420 },
  { designation: "Beauty retouching", quantite: 15, prixUnitaire: 18 },
  { designation: "Private online gallery (3 months)", quantite: 1, prixUnitaire: 0 },
];

export async function listFacturationClients() {
  return listClientRefs();
}

export function listFacturationSessions() {
  return SEANCES.map((seance) => ({ id: sessionObjectId(seance.id), titre: seance.titre }));
}

export async function getFacturationReferences(clientId: string, seanceId: string) {
  const client = await findUtilisateurById(clientId);
  const seance = SEANCES.find((item) => sessionObjectId(item.id) === seanceId || item.id === seanceId);
  if (!client || !seance) throw new Error("Client or session not found.");
  return {
    client: { id: client.id, nom: `${client.prenom} ${client.nom}`, email: client.email },
    seance: { id: seance.id, titre: seance.titre, type: seance.type, date: new Date(seance.dateDebut) },
  };
}

function sessionObjectId(id: string): string {
  return createHash("sha1").update(id).digest("hex").slice(0, 24);
}

// TODO: replace the mock session lookup above when the Séances module exposes its service/model.
