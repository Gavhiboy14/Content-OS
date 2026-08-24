import "server-only";
import { cookies } from "next/headers";
import { AUTH_COOKIE, isValidToken, siteIsProtected } from "@/lib/site-auth";

/**
 * El proxy tapa las páginas, pero las Server Actions viajan aparte y no
 * pasan por él si algún día un matcher las deja afuera — por eso cada acción
 * que cambia datos también se fija esto por su cuenta.
 */
export async function requireAuth(): Promise<void> {
  if (!siteIsProtected()) return;
  const store = await cookies();
  if (!isValidToken(store.get(AUTH_COOKIE)?.value)) {
    throw new Error("No autorizado");
  }
}
