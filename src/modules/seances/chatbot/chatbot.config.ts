/**
 * Module : Chatbot IA · Responsable : Yosser Rafrafi
 * Identité du chatbot. Pour le renommer, modifier UNIQUEMENT CHATBOT_NAME :
 * le widget, le message d'accueil et le prompt système le reprennent automatiquement.
 * (Fichier sans "server-only" : il est aussi importé par le widget côté navigateur.)
 */
export const CHATBOT_NAME = "Lumi";
export const CHATBOT_ROLE = "Assistant IA de ReFrame";

/** Pack tel que le widget l'affiche : toujours construit depuis le catalogue réel, jamais par le modèle. */
export type ChatPackCard = {
  id: string;
  nom: string;
  typeEvenement: string;
  /** null = le studio n'affiche pas ce prix. */
  prix: number | null;
  dureeMinutes: number | null;
  miseEnAvant: boolean;
  prestations: { libelle: string; conditions: string | null }[];
};
