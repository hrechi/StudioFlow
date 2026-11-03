/**
 * Module : Gestion du Matériel · Responsable : Amel Mediouni
 *
 * SEUL point d'accès du module Matériel aux séances. Implémenté aujourd'hui avec la
 * collection `seances_demo` (stand-in temporaire, voir seance-demo.model.ts). Pour
 * l'intégration, seul ce fichier sera remplacé par des appels au vrai service Séances
 * (listSeances / findSeanceById), en gardant le même type et les mêmes fonctions.
 *
 * Mapping prévu SeanceDTO (modules/seances/seance.dto.ts) → SeanceReservableDTO :
 * - id, titre, lieu                → mêmes champs ;
 * - dateDebut, dateFin             → mêmes champs (ISO, stockés en UTC) ;
 * - typeEvenement                  → `typeEvenement.nom` (la séance réelle référence la
 *                                    collection `types_evenement`, pas un texte) ;
 * - clientNom                      → `nomClient(seance)` : prénom + nom du client, ou
 *                                    `clientExterne.nom` ;
 * - photographe (seances_demo)     → membre de `equipe[]` dont le rôle est
 *                                    `PHOTOGRAPHE_PRINCIPAL` ;
 * - « réservable »                 → statut hors TERMINEE / ANNULEE et `dateFin` future.
 * Les réservations gardent l'id de séance dans `reservations_materiel.seance` (ObjectId sans
 * ref) : seule la source des ids change.
 */
import "server-only";
import { isValidObjectId, type Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { SeanceDemo, type ISeanceDemo, type StatutSeanceDemo } from "./seance-demo.model";

/** What the Equipment module needs to know about a séance. */
export type SeanceReservableDTO = {
  id: string;
  titre: string;
  typeEvenement: string;
  lieu: string;
  dateDebut: string;
  dateFin: string;
  clientNom: string;
};

export interface SeanceSource {
  /** Séances equipment can still be reserved for (not finished, not cancelled), by date. */
  listSeancesReservables(): Promise<SeanceReservableDTO[]>;
  /** One reservable séance, or null if it does not exist or can no longer be reserved for. */
  getSeanceReservable(id: string): Promise<SeanceReservableDTO | null>;
}

type SeanceDemoLean = ISeanceDemo & { _id: Types.ObjectId };

const STATUTS_FERMES: readonly StatutSeanceDemo[] = ["TERMINEE", "ANNULEE"];

const reservableQuery = () => ({
  statut: { $nin: STATUTS_FERMES },
  dateFin: { $gt: new Date() },
});

function toDTO(doc: SeanceDemoLean): SeanceReservableDTO {
  return {
    id: doc._id.toString(),
    titre: doc.titre,
    typeEvenement: doc.typeEvenement,
    lieu: doc.lieu,
    dateDebut: doc.dateDebut.toISOString(),
    dateFin: doc.dateFin.toISOString(),
    clientNom: doc.clientNom,
  };
}

const demoSource: SeanceSource = {
  async listSeancesReservables() {
    await connectDB();
    const docs = await SeanceDemo.find(reservableQuery())
      .sort({ dateDebut: 1 })
      .lean<SeanceDemoLean[]>();
    return docs.map(toDTO);
  },
  async getSeanceReservable(id) {
    if (!isValidObjectId(id)) return null;
    await connectDB();
    const doc = await SeanceDemo.findOne({ _id: id, ...reservableQuery() }).lean<SeanceDemoLean>();
    return doc ? toDTO(doc) : null;
  },
};

const source: SeanceSource = demoSource;

export const listSeancesReservables = () => source.listSeancesReservables();
export const getSeanceReservable = (id: string) => source.getSeanceReservable(id);
