/**
 * Route protection (Next.js 16 "proxy" convention, formerly middleware).
 * Fast first line of defense based on the JWT role; pages and Server Actions
 * re-check with lib/guards.ts against MongoDB.
 */
import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";
import { areaForPath, can, homeForRole } from "@/lib/rbac";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const role = req.auth?.user?.role;
  const redirectTo = (path: string) => NextResponse.redirect(new URL(path, req.nextUrl));

  // Signed-in users never see the sign-in / sign-up pages.
  if (pathname === "/login" || pathname === "/register") {
    return role ? redirectTo(homeForRole(role)) : NextResponse.next();
  }

  const area = areaForPath(pathname);
  if (!area) return NextResponse.next();

  if (!role) {
    const login = new URL("/login", req.nextUrl);
    login.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  // Front office (client area) vs backoffice (staff).
  if (area === "espace-client") {
    return role === "CLIENT" ? NextResponse.next() : redirectTo(homeForRole(role));
  }
  if (role === "CLIENT") return redirectTo("/espace-client");

  // Staff without the permission for this module.
  if (!can(role, area)) {
    return redirectTo(`/dashboard/acces-refuse?page=${encodeURIComponent(pathname)}`);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/espace-client/:path*", "/login", "/register"],
};
