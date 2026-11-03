/** Undo / redo stack of the editor. Pure, so it can be tested without a canvas. */
export type Historique<T> = {
  passe: T[];
  present: T;
  futur: T[];
  /** Consecutive changes with the same key (typing in one field) count as a single undo step. */
  cle?: string;
};

export type ActionHistorique<T> =
  | { type: "appliquer"; valeur: T; cle?: string }
  | { type: "annuler" }
  | { type: "retablir" };

const LIMITE = 100;

export const debutHistorique = <T>(present: T): Historique<T> => ({ passe: [], present, futur: [] });

export function historiqueReducer<T>(etat: Historique<T>, action: ActionHistorique<T>): Historique<T> {
  switch (action.type) {
    case "appliquer":
      if (action.valeur === etat.present) return etat;
      if (action.cle && action.cle === etat.cle) return { ...etat, present: action.valeur, futur: [] };
      return {
        passe: [...etat.passe, etat.present].slice(-LIMITE),
        present: action.valeur,
        futur: [],
        cle: action.cle,
      };
    case "annuler": {
      const precedent = etat.passe.at(-1);
      if (precedent === undefined) return etat;
      return { passe: etat.passe.slice(0, -1), present: precedent, futur: [etat.present, ...etat.futur] };
    }
    case "retablir": {
      const [suivant, ...reste] = etat.futur;
      if (suivant === undefined) return etat;
      return { passe: [...etat.passe, etat.present], present: suivant, futur: reste };
    }
  }
}
