/**
 * Module : Gestion des Invitations. Which music tracks are installed: a track is offered only if
 * its file is in public/invitations/musique (the files are provided by the studio, not shipped).
 */
import "server-only";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { PISTES_MUSIQUE, type PisteMusique } from "./invitation.schema";
import { MUSIQUES } from "./invitation.types";

export function musiquesDisponibles(): PisteMusique[] {
  return PISTES_MUSIQUE.filter((piste) => existsSync(join(process.cwd(), "public", MUSIQUES[piste].fichier)));
}
