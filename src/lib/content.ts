import "server-only";
import { createClient } from "@/lib/supabase/server";
import { defaultContentProperties } from "@/lib/content-types";
import type {
  ContentItem,
  CreateContentInput,
  UpdateContentInput,
} from "@/lib/types";

function mapRow(row: Record<string, unknown>): ContentItem {
  return {
    id: row.id as string,
    pageId: row.page_id as string,
    type: row.type as string,
    title: (row.title as string) ?? "",
    properties: (row.properties as Record<string, string> | null) ?? {},
    position: row.position as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/** Todo el contenido de una página, en orden. */
export async function getContentForPage(pageId: string): Promise<ContentItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .eq("page_id", pageId)
    .order("position", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

/**
 * El contenido de varias páginas de una sola consulta. Con los ids de un
 * cliente y sus subpáginas, devuelve todo lo suyo — que es lo que cuentan
 * las tarjetas del dashboard y lo que listan sus páginas de gestión.
 */
export async function getContentForPages(
  pageIds: string[]
): Promise<ContentItem[]> {
  if (pageIds.length === 0) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .in("page_id", pageIds)
    .order("position", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

/**
 * Todo el contenido del workspace, de cualquier tipo y cualquier página.
 * Es lo que mira la portada de Inicio para cruzar clientes.
 */
export async function getAllContent(): Promise<ContentItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

/**
 * Todo el contenido de un tipo, de cualquier página. Alimenta las vistas
 * globales del sidebar: todas las tareas, todas las ideas.
 */
export async function getContentByType(type: string): Promise<ContentItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .eq("type", type)
    .order("position", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

export async function getContentItem(id: string): Promise<ContentItem | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapRow(data) : null;
}

/**
 * Cuenta el contenido de varias páginas de una sola consulta, para no pedir
 * una por página al armar el resumen.
 */
export async function countContentByPage(
  pageIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (pageIds.length === 0) return counts;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("content_items")
    .select("page_id")
    .in("page_id", pageIds);

  if (error) throw new Error(error.message);
  (data ?? []).forEach((row) => {
    const id = row.page_id as string;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  });
  return counts;
}

/**
 * Todo el contenido que cae dentro de un rango de fechas, de cualquier
 * página. Es lo que alimenta el calendario global.
 *
 * El filtro se hace por la clave `date` dentro de `properties`, así que
 * cualquier tipo que lleve fecha entra solo — sin listar tipos acá.
 */
export async function getContentInDateRange(
  fromKey: string,
  toKey: string
): Promise<ContentItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .gte("properties->>date", fromKey)
    .lte("properties->>date", toKey)
    .order("properties->>date", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

export async function createContentItem(
  input: CreateContentInput
): Promise<ContentItem> {
  const supabase = createClient();

  // La posición se cuenta dentro del mismo tipo, así cada sección mantiene
  // su propio orden.
  const { count, error: countError } = await supabase
    .from("content_items")
    .select("id", { count: "exact", head: true })
    .eq("page_id", input.pageId)
    .eq("type", input.type);
  if (countError) throw new Error(countError.message);

  const { data, error } = await supabase
    .from("content_items")
    .insert({
      page_id: input.pageId,
      type: input.type,
      title: input.title ?? "",
      properties: input.properties ?? defaultContentProperties(input.type),
      position: count ?? 0,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data);
}

export async function updateContentItem(
  id: string,
  input: UpdateContentInput
): Promise<ContentItem> {
  const supabase = createClient();

  // El llamador ya tiene las propiedades completas en memoria (las trae
  // desde su propio estado), así que acá se pisan tal cual: sin leer primero
  // el registro para fusionarlo, que era un viaje de más a la base por cada
  // guardado.
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.properties !== undefined) {
    patch.properties = input.properties;
  }

  const { data, error } = await supabase
    .from("content_items")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data);
}

export async function deleteContentItem(id: string): Promise<void> {
  const supabase = createClient();
  // Los bloques del cuerpo se borran solos por la clave foránea en cascada.
  const { error } = await supabase.from("content_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
