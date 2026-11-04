import "server-only";
import { z } from "zod";
import { generateJson, LlmUnavailableError } from "@/lib/llm-gemini";
import { ETATS_MATERIEL, type EtatMateriel, type Materiel } from "./materiel.types";

const TIMEOUT_MS = 15_000;

const gravites = ["MINEURE", "MAJEURE", "CRITIQUE"] as const;
export type GravitePanne = (typeof gravites)[number];

const analyseSchema = z.object({
  gravite: z.enum(gravites),
  causeProbable: z.string().trim().min(1).max(500),
  actionRecommandee: z.string().trim().min(1).max(500),
  etat: z.enum(ETATS_MATERIEL),
});

const GEMINI_SCHEMA = {
  type: "OBJECT",
  properties: {
    gravite: { type: "STRING", enum: [...gravites] },
    causeProbable: { type: "STRING" },
    actionRecommandee: { type: "STRING" },
    etat: { type: "STRING", enum: [...ETATS_MATERIEL] },
  },
  required: ["gravite", "causeProbable", "actionRecommandee", "etat"],
};

const SYSTEM = `You triage photography equipment breakdown reports.
Return only the requested JSON fields. Use only the allowed enum values.
Assess the report conservatively: CRITIQUE means a safety risk, liquid, smoke, fire,
impact damage, or equipment that will not power on; MAJEURE means the equipment cannot
be used normally; MINEURE means a limited defect or cosmetic issue.
The recommended action must be practical and safe.`;

export type AnalysePanne = {
  gravite: GravitePanne;
  causeProbable: string;
  actionRecommandee: string;
  etat: EtatMateriel;
  source: "IA" | "REGLES";
};

type DonneesPanne = Pick<Materiel, "nom" | "categorie" | "marque" | "etat" | "dateAchat"> & {
  description: string;
};

function ageAnnees(dateAchat: string): number {
  return Math.max(
    0,
    Math.round(((Date.now() - new Date(dateAchat).getTime()) / 31_557_600_000) * 10) / 10,
  );
}

function mots(description: string, expressions: RegExp): boolean {
  return expressions.test(description.normalize("NFD").replace(/\p{Diacritic}/gu, ""));
}

function analyseParRegles(description: string): AnalysePanne {
  const critique = mots(
    description,
    /casse|tombe|tombe|liquide|eau|fume|brule|ne s'allume plus|ne demarre plus|explos|court.?circuit|danger/i,
  );
  const majeure = mots(
    description,
    /ne fonctionne pas|panne|bloque|surchauff|bruit|noise|fuite|defectueux|erreur|rayure importante/i,
  );
  const gravite: GravitePanne = critique ? "CRITIQUE" : majeure ? "MAJEURE" : "MINEURE";
  const etat: EtatMateriel = gravite === "MINEURE" ? "USE" : "EN_PANNE";
  return {
    gravite,
    causeProbable: critique
      ? "Impact, liquid damage or an electrical fault is possible."
      : majeure
        ? "A component or power system may be malfunctioning."
        : "Wear or a limited component fault is possible.",
    actionRecommandee: critique
      ? "Stop using it, disconnect it if safe, and send it for technical inspection."
      : majeure
        ? "Remove it from service and arrange a technical inspection."
        : "Keep it out of active use until the issue is checked and documented.",
    etat,
    source: "REGLES",
  };
}

export async function analyserPanne(
  materiel: Pick<Materiel, "nom" | "categorie" | "marque" | "etat" | "dateAchat">,
  description: string,
): Promise<AnalysePanne> {
  const fallback = analyseParRegles(description);
  const donnees: DonneesPanne = { ...materiel, description };
  const prompt = `Analyze this equipment report. Do not infer or mention any person or client.
Equipment data:
${JSON.stringify({
  nom: donnees.nom,
  categorie: donnees.categorie,
  marque: donnees.marque,
  etat: donnees.etat,
  ageAnnees: ageAnnees(donnees.dateAchat),
  description: donnees.description,
})}`;

  let brut: unknown;
  try {
    brut = await generateJson<unknown>({
      system: SYSTEM,
      prompt,
      schema: GEMINI_SCHEMA,
      timeoutMs: TIMEOUT_MS,
    });
  } catch (error) {
    if (!(error instanceof LlmUnavailableError)) console.error(error);
    return fallback;
  }

  const parsed = analyseSchema.safeParse(brut);
  return parsed.success ? { ...parsed.data, source: "IA" } : fallback;
}

export { analyseParRegles };
