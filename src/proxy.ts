import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE, isValidToken, siteIsProtected } from "@/lib/site-auth";

export function proxy(request: NextRequest) {
  if (!siteIsProtected()) return NextResponse.next();

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (isValidToken(token)) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set(
    "next",
    request.nextUrl.pathname + request.nextUrl.search
  );
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico).*)"],
};
