import "server-only";
/**
 * Module : Contrats & Blockchain · Responsable : Yosser Rafrafi
 * Service principal : CRUD + workflow + ancrage blockchain.
 */
import { createHash } from "node:crypto";
import { Types, type HydratedDocument } from "mongoose";
import { ServiceError } from "@/lib/action-result";
import { connectDB } from "@/lib/db";
import { findUtilisateurById } from "@/modules/utilisateurs/utilisateur.service";
import type { Role } from "@/modules/utilisateurs/utilisateur.types";
import { anchorHash, revokeHash, verifyHash } from "./contrat.chain";
import { Contrat, type IContrat } from "./contrat.model";
import { renderContratPdf } from "./contrat.pdf";
import { deleteContratPdf, readContratPdf, saveContratPdf } from "./contrat.storage";
import type {
  ContratBlockchainInfo,
  ContratDTO,
  ContratListItem,
  VerificationResult,
} from "./contrat.types";

type ContratDoc = HydratedDocument<IContrat>;

// ── Erreurs métier ────────────────────────────────────────────────────────────

export class NotFoundError extends ServiceError {}
export class ForbiddenError extends ServiceError {}
export class ValidationError extends ServiceError {}
export class BusinessRuleError extends ServiceError {}

// ── Types internes ────────────────────────────────────────────────────────────

export type Actor = { id: string; role: Role };

type ContratInput = {
  modeCreation: "CHAMPS" | "LIBRE" | "UPLOAD";
  titre: string;
  clientId: string;
  texteLibre?: string;
  champs?: Record<string, unknown>;
  fichierPdf?: Buffer;
};

// ── Helpers DB (cast explicite pour éviter l'union Mongoose) ─────────────────

const sha256 = (data: Buffer) => createHash("sha256").update(data).digest("hex");

function objectId(id: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw new ValidationError("Invalid identifier.");
  return new Types.ObjectId(id);
}

function assertAdmin(actor: Actor) {
  if (actor.role !== "ADMIN") throw new ForbiddenError("Only administrators can manage contracts.");
}

/** findById avec type explicite — évite l'union ambiguë retournée par Mongoose */
async function findById(id: Types.ObjectId): Promise<ContratDoc | null> {
  return (await Contrat.findById(id)) as ContratDoc | null;
}

/** findOne avec type explicite */
async function findOne(filter: Record<string, unknown>): Promise<ContratDoc | null> {
  return (await Contrat.findOne(filter)) as ContratDoc | null;
}

/** find avec type explicite */
async function findMany(filter: Record<string, unknown>): Promise<ContratDoc[]> {
  return (await Contrat.find(filter).sort({ createdAt: -1 })) as unknown as ContratDoc[];
}

function visibleFilter(actor: Actor): Record<string, unknown> {
  if (actor.role === "ADMIN") return {};
  if (actor.role === "CLIENT")
    return { client: objectId(actor.id), statut: { $ne: "BROUILLON" } };
  throw new ForbiddenError("Access denied.");
}

async function nextReference(): Promise<string> {
  const year = new Date().getFullYear();
  const last = await Contrat.findOne({ reference: new RegExp(`^CTR-${year}-`) })
    .sort({ reference: -1 })
    .select("reference")
    .lean<{ reference: string }>();
  const seq = last ? parseInt(last.reference.split("-")[2] ?? "0", 10) + 1 : 1;
  return `CTR-${year}-${String(seq).padStart(4, "0")}`;
}

// ── DTO mapper ────────────────────────────────────────────────────────────────

function toDTO(doc: ContratDoc): ContratDTO {
  // toObject() élimine les références circulaires Mongoose avant tout accès
  const raw = doc.toObject({ versionKey: false });

  const blockchain: ContratBlockchainInfo | undefined = raw.blockchain
    ? {
        sha256: raw.blockchain.sha256,
        statut: raw.blockchain.statut,
        txHash: raw.blockchain.txHash,
        blockNumber: raw.blockchain.blockNumber,
        contractAddress: raw.blockchain.contractAddress,
        chainId: raw.blockchain.chainId,
        ancreLe: raw.blockchain.ancreLe?.toISOString(),
        erreur: raw.blockchain.erreur,
      }
    : undefined;

  return {
    id: raw._id.toString(),
    reference: raw.reference,
    titre: raw.titre,
    statut: raw.statut,
    modeCreation: raw.modeCreation,
    client: {
      id: raw.client.toString(),
      prenom: raw.clientSnapshot.nom.split(" ")[0] ?? "",
      nom: raw.clientSnapshot.nom.split(" ").slice(1).join(" "),
      email: raw.clientSnapshot.email,
    },
    contenu: raw.contenu
      ? {
          texteLibre: raw.contenu.texteLibre,
          champs: raw.contenu.champs as NonNullable<ContratDTO["contenu"]>["champs"],
        }
      : undefined,
    blockchain,
    clientWallet: raw.clientWallet,
    clientSignedAt: raw.clientSignedAt?.toISOString(),
    dateEnvoi: raw.dateEnvoi?.toISOString(),
    dateReponse: raw.dateReponse?.toISOString(),
    motifRefus: raw.motifRefus,
    historique: (raw.historique ?? []).map((h: IContrat["historique"][number]) => ({
      action: h.action,
      statutAvant: h.statutAvant,
      statutApres: h.statutApres,
      date: h.date instanceof Date ? h.date.toISOString() : undefined,
    })),
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
  };
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function creerContrat(
  input: ContratInput,
  actor: Actor,
): Promise<{ id: string }> {
  assertAdmin(actor);
  await connectDB();

  const client = await findUtilisateurById(input.clientId);
  if (!client || client.role !== "CLIENT") throw new ValidationError("Client not found.");

  const reference = await nextReference();

  const contrat = await Contrat.create({
    reference,
    titre: input.titre,
    statut: "BROUILLON",
    modeCreation: input.modeCreation,
    client: objectId(input.clientId),
    clientSnapshot: {
      nom: `${client.prenom} ${client.nom}`.trim(),
      email: client.email,
    },
    contenu:
      input.modeCreation === "CHAMPS"
        ? { champs: input.champs }
        : input.modeCreation === "LIBRE"
          ? { texteLibre: input.texteLibre }
          : undefined,
    createdBy: objectId(actor.id),
    historique: [{ action: "CREATE", statutApres: "BROUILLON", par: objectId(actor.id) }],
  });

  if (input.modeCreation === "UPLOAD" && input.fichierPdf) {
    const fileId = await saveContratPdf(input.fichierPdf, `${reference}.pdf`);
    await Contrat.updateOne({ _id: contrat._id }, { $set: { fichierUpload: fileId } });
  }

  return { id: contrat._id.toString() };
}

export async function getContrat(id: string, actor: Actor): Promise<ContratDTO> {
  await connectDB();
  const doc = await findOne({ _id: objectId(id), ...visibleFilter(actor) });
  if (!doc) throw new NotFoundError("Contract not found.");
  return toDTO(doc);
}

export async function listContrats(actor: Actor): Promise<ContratListItem[]> {
  await connectDB();
  const docs = await findMany(visibleFilter(actor));
  return docs.map((doc) => ({
    id: doc._id.toString(),
    reference: doc.reference,
    titre: doc.titre,
    statut: doc.statut,
    modeCreation: doc.modeCreation,
    client: {
      id: doc.client.toString(),
      prenom: doc.clientSnapshot.nom.split(" ")[0] ?? "",
      nom: doc.clientSnapshot.nom.split(" ").slice(1).join(" "),
      email: doc.clientSnapshot.email,
    },
    blockchain: doc.blockchain
      ? { sha256: doc.blockchain.sha256, statut: doc.blockchain.statut }
      : undefined,
    createdAt: doc.createdAt.toISOString(),
  }));
}

export async function supprimerContrat(id: string, actor: Actor): Promise<void> {
  assertAdmin(actor);
  await connectDB();
  const doc = await findById(objectId(id));
  if (!doc) throw new NotFoundError("Contract not found.");
  if (!["BROUILLON", "REFUSE"].includes(doc.statut))
    throw new BusinessRuleError("Only draft or declined contracts can be deleted.");
  if (doc.fichierUpload) await deleteContratPdf(doc.fichierUpload);
  await doc.deleteOne();
}

// ── Workflow ──────────────────────────────────────────────────────────────────

export async function envoyerContrat(id: string, actor: Actor): Promise<void> {
  assertAdmin(actor);
  await connectDB();
  const doc = await findById(objectId(id));
  if (!doc) throw new NotFoundError("Contract not found.");
  if (doc.statut !== "BROUILLON")
    throw new BusinessRuleError("Only draft contracts can be sent.");

  await Contrat.updateOne(
    { _id: doc._id },
    {
      $set: { statut: "ENVOYE", dateEnvoi: new Date() },
      $push: { historique: { action: "SEND", statutAvant: "BROUILLON", statutApres: "ENVOYE", par: objectId(actor.id) } },
    },
  );
}

export async function repondreContrat(
  id: string,
  input: { accepter: boolean; motifRefus?: string; clientWallet?: string },
  actor: Actor,
): Promise<void> {
  await connectDB();
  const doc = await findOne({ _id: objectId(id), client: objectId(actor.id), statut: "ENVOYE" });
  if (!doc) throw new NotFoundError("Contract not found or not available for signature.");

  if (!input.accepter) {
    await Contrat.updateOne(
      { _id: doc._id },
      {
        $set: { statut: "REFUSE", dateReponse: new Date(), motifRefus: input.motifRefus },
        $push: { historique: { action: "DECLINE", statutAvant: "ENVOYE", statutApres: "REFUSE", par: objectId(actor.id) } },
      },
    );
    return;
  }

  await Contrat.updateOne(
    { _id: doc._id },
    {
      $set: {
        statut: "ACCEPTE",
        dateReponse: new Date(),
        ...(input.clientWallet ? { clientWallet: input.clientWallet } : {}),
      },
      $push: { historique: { action: "ACCEPT", statutAvant: "ENVOYE", statutApres: "ACCEPTE", par: objectId(actor.id) } },
    },
  );

  // Ancrage (ne bloque jamais l'acceptation en cas d'erreur blockchain)
  await figerEtAncrer(id, actor, input.clientWallet);
}

export async function figerEtAncrer(
  id: string,
  actor: Actor,
  clientWallet?: string,
): Promise<void> {
  await connectDB();
  const doc = await findById(objectId(id));
  if (!doc) throw new NotFoundError("Contract not found.");
  if (doc.statut !== "ACCEPTE")
    throw new BusinessRuleError("Only accepted contracts can be anchored.");

  // 1. Freeze PDF once
  let state = doc.blockchain;
  if (!state?.sha256) {
    let pdfBuf: Buffer;
    if (doc.modeCreation === "UPLOAD" && doc.fichierUpload) {
      const data = await readContratPdf(doc.fichierUpload);
      if (!data) throw new BusinessRuleError("Uploaded PDF not found.");
      pdfBuf = data;
    } else {
      pdfBuf = Buffer.from(await renderContratPdf(toDTO(doc)));
    }
    const hash = sha256(pdfBuf);
    const fileId =
      doc.modeCreation === "UPLOAD" && doc.fichierUpload
        ? doc.fichierUpload
        : await saveContratPdf(pdfBuf, `${doc.reference}.pdf`);

    await Contrat.updateOne(
      { _id: doc._id, "blockchain.sha256": { $exists: false } },
      { $set: { blockchain: { fichier: fileId, sha256: hash, statut: "EN_ATTENTE" } } },
    );
    const refreshed = await Contrat.findById(doc._id)
      .select("blockchain")
      .lean<{ blockchain?: IContrat["blockchain"] }>();
    state = refreshed?.blockchain;
  }

  if (!state || state.statut === "ANCRE") return;

  // 2. Anchor on-chain
  try {
    const wallet = clientWallet ?? doc.clientWallet;
    const receipt = await anchorHash(state.sha256, doc.reference, wallet);
    await Contrat.updateOne(
      { _id: doc._id },
      {
        $set: {
          "blockchain.statut": "ANCRE",
          "blockchain.ancreLe": new Date(),
          "blockchain.txHash": receipt.txHash,
          "blockchain.blockNumber": receipt.blockNumber,
          "blockchain.contractAddress": receipt.contractAddress,
          "blockchain.chainId": receipt.chainId,
        },
        $unset: { "blockchain.erreur": "" },
      },
    );
  } catch (error) {
    await Contrat.updateOne(
      { _id: doc._id },
      {
        $set: {
          "blockchain.statut": "ECHEC",
          "blockchain.erreur": String((error as Error).message).slice(0, 300),
        },
      },
    );
  }
}

export async function relancerAncrage(id: string, actor: Actor): Promise<void> {
  assertAdmin(actor);
  await figerEtAncrer(id, actor);
}

export async function revoquerContrat(id: string, raison: string, actor: Actor): Promise<void> {
  assertAdmin(actor);
  await connectDB();
  const doc = await findById(objectId(id));
  if (!doc) throw new NotFoundError("Contract not found.");
  if (doc.statut !== "ACCEPTE")
    throw new BusinessRuleError("Only accepted contracts can be revoked.");

  if (doc.blockchain?.statut === "ANCRE" && doc.blockchain.sha256) {
    try { await revokeHash(doc.blockchain.sha256, raison); } catch { /* non-blocking */ }
  }

  await Contrat.updateOne(
    { _id: doc._id },
    {
      $set: { statut: "REVOQUE" },
      $push: { historique: { action: "REVOKE", statutAvant: "ACCEPTE", statutApres: "REVOQUE", par: objectId(actor.id) } },
    },
  );
}

// ── PDF ───────────────────────────────────────────────────────────────────────

export async function readPdfContrat(
  id: string,
  actor: Actor,
): Promise<{ data: Buffer; filename: string }> {
  await connectDB();
  const doc = await findOne({ _id: objectId(id), ...visibleFilter(actor) });
  if (!doc) throw new NotFoundError("Contract not found.");

  const fichierId = doc.blockchain?.fichier ?? doc.fichierUpload;
  if (fichierId) {
    const data = await readContratPdf(fichierId);
    if (data) return { data, filename: `${doc.reference}.pdf` };
  }

  if (doc.modeCreation === "UPLOAD") throw new NotFoundError("Uploaded PDF not found.");
  const bytes = await renderContratPdf(toDTO(doc));
  return { data: Buffer.from(bytes), filename: `${doc.reference}.pdf` };
}

// ── Vérification publique ─────────────────────────────────────────────────────

export async function verifierContrat(sha256Hex: string): Promise<VerificationResult> {
  return verifyHash(sha256Hex);
}
