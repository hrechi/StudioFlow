import type { DefaultSession } from "next-auth";
import type { Role } from "@/modules/utilisateurs/utilisateur.types";

declare module "next-auth" {
  interface User {
    role?: Role;
    nom?: string;
    prenom?: string;
    photoProfil?: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      nom: string;
      prenom: string;
      photoProfil: string | null;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    nom?: string;
    prenom?: string;
    photoProfil?: string | null;
  }
}
