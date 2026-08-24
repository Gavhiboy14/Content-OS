"use server";

import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/require-auth";

const BUCKET = "media";
const MAX_BYTES = 10 * 1024 * 1024;

const TIPOS_PERMITIDOS = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/svg+xml",
];

const EXTENSIONES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/svg+xml": "svg",
};

/**
 * Sube una imagen y devuelve su dirección pública.
 *
 * El nombre del archivo es un identificador al azar, no el original: además
 * de evitar choques entre dos archivos que se llamen igual, hace que la
 * dirección no se pueda adivinar. Es lo que protege de un vistazo a un
 * material de cliente en un bucket abierto.
 */
export async function uploadImageAction(formData: FormData): Promise<string> {
  await requireAuth();

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("No llegó ningún archivo");

  if (!TIPOS_PERMITIDOS.includes(file.type)) {
    throw new Error("Ese tipo de archivo no se puede subir. Probá con PNG, JPG, WEBP o GIF.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("La imagen pesa más de 10 MB. Probá con una más liviana.");
  }

  const ruta = `${randomUUID()}.${EXTENSIONES[file.type] ?? "bin"}`;
  const supabase = createClient();

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(ruta, file, { contentType: file.type, upsert: false });

  if (error) throw new Error(`No se pudo subir: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(ruta);
  return data.publicUrl;
}
