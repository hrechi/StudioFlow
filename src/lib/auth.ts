import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authenticate } from "@/modules/utilisateurs/utilisateur.service";
import { loginSchema } from "@/modules/utilisateurs/utilisateur.schemas";
import { authConfig } from "./auth.config";

/** Thrown when the password is right but the account is BLOQUE. */
export class CompteBloqueError extends CredentialsSignin {
  code = "compte_bloque";
}

export const {
  handlers,
  auth,
  signIn,
  signOut,
  unstable_update: updateSession,
} = NextAuth({
  ...authConfig,
  logger: {
    // A wrong password or a blocked account is expected: don't log it as a server error.
    error(error) {
      if (error instanceof CredentialsSignin) return;
      console.error(error);
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        motDePasse: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;

        const result = await authenticate(parsed.data.email, parsed.data.motDePasse);
        if (result.status === "bloque") throw new CompteBloqueError();
        if (result.status !== "ok") return null;

        const { user } = result;
        return {
          id: user.id,
          email: user.email,
          name: `${user.prenom} ${user.nom}`,
          role: user.role,
          nom: user.nom,
          prenom: user.prenom,
          photoProfil: user.photoProfil ?? null,
        };
      },
    }),
  ],
});
