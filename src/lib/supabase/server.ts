import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase para uso exclusivo en el servidor (Server Components,
 * Server Actions, Route Handlers). Usa la service_role key, que salteà RLS,
 * así que este archivo nunca debe importarse desde código de cliente.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Faltan las variables de entorno de Supabase. Copiá .env.example a .env.local y completá NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createSupabaseClient(url, key, {
    auth: { persistSession: false },
  });
}
