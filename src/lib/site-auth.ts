import { createHash, timingSafeEqual } from "crypto";

/**
 * Protección mínima para cuando la web queda expuesta en internet (por
 * ejemplo en Netlify): una sola clave para toda la app, guardada en la
 * variable de entorno SITE_PASSWORD. Sin esa variable configurada, la web
 * queda abierta — así el desarrollo local sigue sin fricción.
 */
export const AUTH_COOKIE = "content-os-auth";

export function siteIsProtected(): boolean {
  return Boolean(process.env.SITE_PASSWORD?.trim());
}

export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

/** La cookie guarda el hash de la clave, nunca la clave en sí. */
export function isValidToken(token: string | undefined): boolean {
  const password = process.env.SITE_PASSWORD?.trim();
  if (!password) return true;
  if (!token) return false;

  const expected = Buffer.from(hashPassword(password));
  const received = Buffer.from(token);
  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}
