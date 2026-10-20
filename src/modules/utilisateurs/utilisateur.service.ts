import "server-only";
import { Types, type UpdateQuery } from "mongoose";
import { ServiceError } from "@/lib/action-result";
import { connectDB } from "@/lib/db";
import { createNotification, deleteNotificationsOf } from "./notification.service";
import { hashPassword, verifyPassword } from "./password";
import { Utilisateur, type IUtilisateur } from "./utilisateur.model";
import type {
  AdminCreateUserInput,
  AdminUpdateUserInput,
  ProfileInput,
  RegisterInput,
  UserListQuery,
} from "./utilisateur.schemas";
import {
  roleConfig,
  statutCompteConfig,
  type Role,
  type StatutCompte,
  type UtilisateurDTO,
  type UtilisateurRef,
} from "./utilisateur.types";

/**
 * Gestion des Utilisateurs — business rules. Only this file (and the
 * notification service) touches the Utilisateur/Notification models.
 */

export const USERS_PAGE_SIZE = 10;

// Used when the email is unknown so a failed login always costs one bcrypt compare.
const DUMMY_HASH = "$2b$12$IbOYG4p2mvbSAxVBlx7sR.uAN39wcW/eBpNvaJteLTmleCVmpzFTW";

type UtilisateurLean = IUtilisateur & { _id: Types.ObjectId };

function toUtilisateurDTO(doc: UtilisateurLean): UtilisateurDTO {
  return {
    id: doc._id.toString(),
    nom: doc.nom,
    prenom: doc.prenom,
    email: doc.email,
    telephone: doc.telephone,
    adresse: doc.adresse,
    photoProfil: doc.photoProfil,
    role: doc.role,
    typeClient: doc.typeClient,
    entreprise: doc.entreprise,
    specialite: doc.specialite,
    statut: doc.statut,
    derniereConnexion: doc.derniereConnexion?.toISOString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function toObjectId(id: string): Types.ObjectId | null {
  return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

const EMAIL_TAKEN = "An account already exists with this email";

type ProfileFields = Pick<
  IUtilisateur,
  | "nom"
  | "prenom"
  | "telephone"
  | "adresse"
  | "photoProfil"
  | "typeClient"
  | "entreprise"
  | "specialite"
>;

/**
 * Builds a $set/$unset update: "" means "remove the field", and fields that
 * do not apply to the role (client vs staff) are removed.
 */
function buildProfileUpdate(
  role: Role,
  input: Partial<Record<keyof ProfileFields, string | undefined>>,
): UpdateQuery<IUtilisateur> {
  const $set: Record<string, string> = {};
  const $unset: Record<string, ""> = {};
  const put = (key: keyof ProfileFields, value: string | undefined) => {
    if (value === undefined) return;
    const trimmed = value.trim();
    if (trimmed) $set[key] = trimmed;
    else $unset[key] = "";
  };

  put("nom", input.nom);
  put("prenom", input.prenom);
  put("telephone", input.telephone);
  put("adresse", input.adresse);
  put("photoProfil", input.photoProfil);

  if (role === "CLIENT") {
    const typeClient = input.typeClient ?? "PARTICULIER";
    $set.typeClient = typeClient;
    if (typeClient === "ENTREPRISE") put("entreprise", input.entreprise);
    else $unset.entreprise = "";
    $unset.specialite = "";
  } else {
    put("specialite", input.specialite);
    $unset.typeClient = "";
    $unset.entreprise = "";
  }

  return { $set, ...(Object.keys($unset).length ? { $unset } : {}) };
}

// ── Reads ───────────────────────────────────────────────────────────────────

export async function findUtilisateurById(id: string): Promise<UtilisateurDTO | null> {
  const _id = toObjectId(id);
  if (!_id) return null;
  await connectDB();
  const doc = await Utilisateur.findById(_id).lean<UtilisateurLean>();
  return doc ? toUtilisateurDTO(doc) : null;
}

export async function findUtilisateurByEmail(email: string): Promise<UtilisateurDTO | null> {
  await connectDB();
  const doc = await Utilisateur.findOne({ email: email.toLowerCase() }).lean<UtilisateurLean>();
  return doc ? toUtilisateurDTO(doc) : null;
}

const REF_FIELDS = "nom prenom photoProfil";
type UtilisateurRefLean = Pick<IUtilisateur, "nom" | "prenom" | "photoProfil"> & {
  _id: Types.ObjectId;
};

function toUtilisateurRef(doc: UtilisateurRefLean): UtilisateurRef {
  return { id: doc._id.toString(), nom: doc.nom, prenom: doc.prenom, photoProfil: doc.photoProfil };
}

/** Minimal references for other modules (client of a gallery, photographer of a session…). */
export async function findUtilisateurRefs(ids: string[]): Promise<Map<string, UtilisateurRef>> {
  const objectIds = [...new Set(ids)].map(toObjectId).filter((id) => id !== null);
  if (!objectIds.length) return new Map();
  await connectDB();
  const docs = await Utilisateur.find({ _id: { $in: objectIds } })
    .select(REF_FIELDS)
    .lean<UtilisateurRefLean[]>();
  return new Map(docs.map((doc) => [doc._id.toString(), toUtilisateurRef(doc)]));
}

/** Active clients, by name — for the "client" pickers of other modules. */
export async function listClientRefs(): Promise<UtilisateurRef[]> {
  await connectDB();
  const docs = await Utilisateur.find({ role: "CLIENT", statut: "ACTIF" })
    .select(REF_FIELDS)
    .sort({ prenom: 1, nom: 1 })
    .lean<UtilisateurRefLean[]>();
  return docs.map(toUtilisateurRef);
}

export type UserListResult = {
  items: UtilisateurDTO[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
};

export async function listUtilisateurs(query: UserListQuery): Promise<UserListResult> {
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (query.role) filter.role = query.role;
  if (query.statut) filter.statut = query.statut;

  // Every word must match the first name, last name or email ("louay her" works).
  const terms = query.q.split(/\s+/).filter(Boolean).slice(0, 5);
  if (terms.length) {
    filter.$and = terms.map((term) => {
      const regex = new RegExp(escapeRegex(term), "i");
      return { $or: [{ nom: regex }, { prenom: regex }, { email: regex }] };
    });
  }

  const total = await Utilisateur.countDocuments(filter);
  const pageCount = Math.max(1, Math.ceil(total / USERS_PAGE_SIZE));
  const page = Math.min(query.page, pageCount);
  const docs = await Utilisateur.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * USERS_PAGE_SIZE)
    .limit(USERS_PAGE_SIZE)
    .lean<UtilisateurLean[]>();

  return { items: docs.map(toUtilisateurDTO), total, page, pageCount, pageSize: USERS_PAGE_SIZE };
}

export async function getUserStats(): Promise<Record<Role | "BLOQUE" | "TOTAL", number>> {
  await connectDB();
  const [byRole, bloques, total] = await Promise.all([
    Utilisateur.aggregate<{ _id: Role; count: number }>([
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]),
    Utilisateur.countDocuments({ statut: "BLOQUE" }),
    Utilisateur.countDocuments(),
  ]);
  const stats = {
    ADMIN: 0,
    PHOTOGRAPHE: 0,
    CLIENT: 0,
    BLOQUE: bloques,
    TOTAL: total,
  };
  for (const row of byRole) stats[row._id] = row.count;
  return stats;
}

// ── Authentication ──────────────────────────────────────────────────────────

export type AuthenticateResult =
  { status: "ok"; user: UtilisateurDTO } | { status: "invalid" } | { status: "bloque" };

/** Checks credentials. The "blocked" status is only revealed after a correct password. */
export async function authenticate(email: string, password: string): Promise<AuthenticateResult> {
  await connectDB();
  const doc = await Utilisateur.findOne({ email: email.toLowerCase() })
    .select("+motDePasse")
    .lean<UtilisateurLean>();
  const valid = await verifyPassword(password, doc?.motDePasse ?? DUMMY_HASH);
  if (!doc || !valid) return { status: "invalid" };
  if (doc.statut === "BLOQUE") return { status: "bloque" };

  const derniereConnexion = new Date();
  await Utilisateur.updateOne({ _id: doc._id }, { $set: { derniereConnexion } });
  return { status: "ok", user: toUtilisateurDTO({ ...doc, derniereConnexion }) };
}

/** Public sign-up: always creates a CLIENT (the role never comes from the form). */
export async function registerClient(input: RegisterInput): Promise<UtilisateurDTO> {
  await connectDB();
  if (await Utilisateur.exists({ email: input.email })) {
    throw new ServiceError(EMAIL_TAKEN, "email");
  }

  try {
    const doc = await Utilisateur.create({
      email: input.email,
      motDePasse: await hashPassword(input.motDePasse),
      role: "CLIENT",
      statut: "ACTIF",
      ...(buildProfileUpdate("CLIENT", input).$set as Partial<IUtilisateur>),
    });

    await createNotification({
      utilisateurId: doc._id.toString(),
      titre: `Welcome, ${doc.prenom}!`,
      message:
        "Your client area is ready: book a session and follow your galleries, quotes and invoices.",
      type: "COMPTE",
      lienCible: "/espace-client",
    });

    return toUtilisateurDTO(doc.toObject());
  } catch (error) {
    if (isDuplicateKeyError(error)) throw new ServiceError(EMAIL_TAKEN, "email");
    throw error;
  }
}

// ── Profile (current user) ──────────────────────────────────────────────────

export async function updateProfile(userId: string, input: ProfileInput): Promise<UtilisateurDTO> {
  const current = await findUtilisateurById(userId);
  if (!current) throw new ServiceError("Account not found.");

  const doc = await Utilisateur.findByIdAndUpdate(userId, buildProfileUpdate(current.role, input), {
    returnDocument: "after",
    runValidators: true,
  }).lean<UtilisateurLean>();
  if (!doc) throw new ServiceError("Account not found.");
  return toUtilisateurDTO(doc);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await connectDB();
  const doc = await Utilisateur.findById(userId).select("+motDePasse").lean<UtilisateurLean>();
  if (!doc) throw new ServiceError("Account not found.");
  if (!(await verifyPassword(currentPassword, doc.motDePasse))) {
    throw new ServiceError("Current password is incorrect", "motDePasseActuel");
  }
  await Utilisateur.updateOne(
    { _id: doc._id },
    { $set: { motDePasse: await hashPassword(newPassword) } },
  );
}

async function countActiveAdmins(excludeId?: Types.ObjectId): Promise<number> {
  return Utilisateur.countDocuments({
    role: "ADMIN",
    statut: "ACTIF",
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  });
}

const LAST_ADMIN_MESSAGE =
  "This is the studio's last active administrator: appoint another administrator first.";

/** True if this user is the only remaining ACTIF admin. */
export async function isLastActiveAdmin(user: Pick<UtilisateurDTO, "id" | "role" | "statut">) {
  if (user.role !== "ADMIN" || user.statut !== "ACTIF") return false;
  await connectDB();
  return (await countActiveAdmins(new Types.ObjectId(user.id))) === 0;
}

/** Deletes the current user's account after checking their password. */
export async function deleteOwnAccount(userId: string, password: string): Promise<void> {
  await connectDB();
  const doc = await Utilisateur.findById(userId).select("+motDePasse").lean<UtilisateurLean>();
  if (!doc) throw new ServiceError("Account not found.");
  if (!(await verifyPassword(password, doc.motDePasse))) {
    throw new ServiceError("Incorrect password", "motDePasse");
  }
  if (await isLastActiveAdmin({ id: userId, role: doc.role, statut: doc.statut })) {
    throw new ServiceError(LAST_ADMIN_MESSAGE);
  }
  await deleteNotificationsOf(userId);
  await Utilisateur.deleteOne({ _id: doc._id });
}

// ── Administration (ADMIN only — callers must check the role) ───────────────

async function getTargetOrThrow(id: string): Promise<UtilisateurLean> {
  const _id = toObjectId(id);
  if (!_id) throw new ServiceError("User not found.");
  await connectDB();
  const doc = await Utilisateur.findById(_id).lean<UtilisateurLean>();
  if (!doc) throw new ServiceError("User not found.");
  return doc;
}

/**
 * Guards shared by edit / change role / block / delete:
 * an admin cannot demote, block or delete themselves, and the studio
 * always keeps at least one ACTIF admin.
 */
async function assertAdminChangeAllowed(
  actorId: string,
  target: UtilisateurLean,
  next: { role?: Role; statut?: StatutCompte; deleting?: boolean },
): Promise<void> {
  const isSelf = target._id.toString() === actorId;
  const demoting = next.role !== undefined && next.role !== "ADMIN" && target.role === "ADMIN";
  const blocking = next.statut === "BLOQUE" && target.statut !== "BLOQUE";

  if (isSelf && next.deleting) {
    throw new ServiceError("You can't delete your own account here (see Profile).");
  }
  if (isSelf && demoting) throw new ServiceError("You can't remove your own administrator role.");
  if (isSelf && blocking) throw new ServiceError("You can't block your own account.");

  const removesActiveAdmin =
    target.role === "ADMIN" && target.statut === "ACTIF" && (demoting || blocking || next.deleting);
  if (removesActiveAdmin && (await countActiveAdmins(target._id)) === 0) {
    throw new ServiceError(LAST_ADMIN_MESSAGE);
  }
}

async function notifyAccountChanges(
  before: Pick<UtilisateurLean, "_id" | "role" | "statut">,
  after: { role: Role; statut: StatutCompte },
): Promise<void> {
  const utilisateurId = before._id.toString();
  if (before.role !== after.role) {
    await createNotification({
      utilisateurId,
      titre: "Your role has changed",
      message: `Your role is now "${roleConfig[after.role].label}". Sign in again to see your new access.`,
      type: "COMPTE",
    });
  }
  if (before.statut !== after.statut) {
    await createNotification({
      utilisateurId,
      titre: after.statut === "BLOQUE" ? "Account blocked" : "Account reactivated",
      message:
        after.statut === "BLOQUE"
          ? "Your account has been blocked by the studio."
          : `Your account is ${statutCompteConfig.ACTIF.label.toLowerCase()} again.`,
      type: "COMPTE",
    });
  }
}

export async function adminCreateUser(input: AdminCreateUserInput): Promise<UtilisateurDTO> {
  await connectDB();
  if (await Utilisateur.exists({ email: input.email })) {
    throw new ServiceError(EMAIL_TAKEN, "email");
  }
  try {
    const doc = await Utilisateur.create({
      email: input.email,
      motDePasse: await hashPassword(input.motDePasse),
      role: input.role,
      statut: input.statut,
      ...(buildProfileUpdate(input.role, input).$set as Partial<IUtilisateur>),
    });
    await createNotification({
      utilisateurId: doc._id.toString(),
      titre: "Welcome to StudioFlow",
      message: `Your ${roleConfig[input.role].label.toLowerCase()} account has been created by the studio.`,
      type: "COMPTE",
    });
    return toUtilisateurDTO(doc.toObject());
  } catch (error) {
    if (isDuplicateKeyError(error)) throw new ServiceError(EMAIL_TAKEN, "email");
    throw error;
  }
}

export async function adminUpdateUser(
  actorId: string,
  id: string,
  input: AdminUpdateUserInput,
): Promise<UtilisateurDTO> {
  const target = await getTargetOrThrow(id);
  await assertAdminChangeAllowed(actorId, target, { role: input.role, statut: input.statut });

  if (input.email !== target.email && (await Utilisateur.exists({ email: input.email }))) {
    throw new ServiceError(EMAIL_TAKEN, "email");
  }

  const update = buildProfileUpdate(input.role, input);
  update.$set = {
    ...update.$set,
    email: input.email,
    role: input.role,
    statut: input.statut,
    ...(input.motDePasse ? { motDePasse: await hashPassword(input.motDePasse) } : {}),
  };

  try {
    const doc = await Utilisateur.findByIdAndUpdate(target._id, update, {
      returnDocument: "after",
      runValidators: true,
    }).lean<UtilisateurLean>();
    if (!doc) throw new ServiceError("User not found.");
    await notifyAccountChanges(target, doc);
    return toUtilisateurDTO(doc);
  } catch (error) {
    if (isDuplicateKeyError(error)) throw new ServiceError(EMAIL_TAKEN, "email");
    throw error;
  }
}

export async function changeRole(actorId: string, id: string, role: Role): Promise<UtilisateurDTO> {
  const target = await getTargetOrThrow(id);
  if (target.role === role) return toUtilisateurDTO(target);
  await assertAdminChangeAllowed(actorId, target, { role });

  // Client-only / staff-only fields follow the new role.
  const update: UpdateQuery<IUtilisateur> =
    role === "CLIENT"
      ? {
          $set: { role, typeClient: target.typeClient ?? "PARTICULIER" },
          $unset: { specialite: "" },
        }
      : { $set: { role }, $unset: { typeClient: "", entreprise: "" } };
  const doc = await Utilisateur.findByIdAndUpdate(target._id, update, {
    returnDocument: "after",
  }).lean<UtilisateurLean>();
  if (!doc) throw new ServiceError("User not found.");
  await notifyAccountChanges(target, doc);
  return toUtilisateurDTO(doc);
}

export async function changeStatut(
  actorId: string,
  id: string,
  statut: StatutCompte,
): Promise<UtilisateurDTO> {
  const target = await getTargetOrThrow(id);
  if (target.statut === statut) return toUtilisateurDTO(target);
  await assertAdminChangeAllowed(actorId, target, { statut });

  const doc = await Utilisateur.findByIdAndUpdate(
    target._id,
    { $set: { statut } },
    { returnDocument: "after" },
  ).lean<UtilisateurLean>();
  if (!doc) throw new ServiceError("User not found.");
  await notifyAccountChanges(target, doc);
  return toUtilisateurDTO(doc);
}

export async function deleteUser(actorId: string, id: string): Promise<void> {
  const target = await getTargetOrThrow(id);
  await assertAdminChangeAllowed(actorId, target, { deleting: true });
  await deleteNotificationsOf(target._id.toString());
  await Utilisateur.deleteOne({ _id: target._id });
}
