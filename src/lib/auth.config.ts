/**
 * Auth.js options without the Credentials provider (no DB, no bcrypt), so the
 * same JWT/session logic can be used by proxy.ts. Full config: lib/auth.ts.
 */
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  trustHost: true,
  providers: [],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.nom = user.nom;
        token.prenom = user.prenom;
        token.photoProfil = user.photoProfil ?? null;
      }
      // Profile edits call `updateSession()` so the top bar shows the new name/photo.
      if (trigger === "update" && session?.user) {
        const next = session.user as Partial<{
          nom: string;
          prenom: string;
          photoProfil: string | null;
        }>;
        if (next.nom !== undefined) token.nom = next.nom;
        if (next.prenom !== undefined) token.prenom = next.prenom;
        if (next.photoProfil !== undefined) token.photoProfil = next.photoProfil;
      }
      return token;
    },
    session({ session, token }) {
      if (token.id && token.role) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.nom = token.nom ?? "";
        session.user.prenom = token.prenom ?? "";
        session.user.photoProfil = token.photoProfil ?? null;
        session.user.name = `${token.prenom ?? ""} ${token.nom ?? ""}`.trim();
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
