import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  CreatePageInput,
  Page,
  PageNode,
  UpdatePageInput,
} from "@/lib/types";

type SupabaseServerClient = ReturnType<typeof createClient>;

function mapRow(row: Record<string, unknown>): Page {
  return {
    id: row.id as string,
    title: row.title as string,
    slug: row.slug as string,
    icon: (row.icon as string | null) ?? null,
    parentId: (row.parent_id as string | null) ?? null,
    type: row.type as string,
    section: (row.section as string | null) ?? null,
    position: row.position as number,
    properties: (row.properties as Record<string, string> | null) ?? {},
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// Rango Unicode de marcas diacriticas combinantes (acentos sueltos tras NFD).
const DIACRITICS_REGEX = /[̀-ͯ]/g;

function slugify(title: string): string {
  return title
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Todas las páginas del workspace.
 *
 * Va envuelta en `cache` porque una misma pantalla la pide varias veces: el
 * sidebar la necesita para el árbol, y la página para su ruta y sus
 * subpáginas. Sin esto se consultaba lo mismo hasta tres veces por
 * navegación, y cada viaje a la base cuesta cientos de milisegundos.
 *
 * El memo dura lo que dura un pedido: no se comparte entre visitantes ni
 * queda viejo tras una edición.
 */
export const getAllPages = cache(async function getAllPages(): Promise<Page[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pages")
    .select("*")
    .order("position", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
});

export function buildPageTree(pages: Page[]): PageNode[] {
  const byId = new Map<string, PageNode>();
  pages.forEach((p) => byId.set(p.id, { ...p, children: [] }));

  const roots: PageNode[] = [];
  byId.forEach((node) => {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

export async function getPageTree(): Promise<PageNode[]> {
  const pages = await getAllPages();
  return buildPageTree(pages);
}

export async function getPageById(id: string): Promise<Page | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pages")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapRow(data) : null;
}

/** Subpáginas directas, en su orden del sidebar. */
export async function getChildren(parentId: string): Promise<Page[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pages")
    .select("*")
    .eq("parent_id", parentId)
    .order("position", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

/** Cadena de páginas padre, de la raíz hacia abajo (sin incluir la página misma). */
export async function getAncestors(id: string): Promise<Page[]> {
  const chain: Page[] = [];
  let current = await getPageById(id);
  while (current?.parentId) {
    const parent = await getPageById(current.parentId);
    if (!parent) break;
    chain.unshift(parent);
    current = parent;
  }
  return chain;
}

/**
 * Los ids de una página y de todo lo que cuelga de ella, a cualquier
 * profundidad. Es lo que permite que el resumen de un cliente cuente también
 * lo que está guardado dentro de sus plataformas.
 *
 * Trabaja sobre la lista de páginas ya leída, sin volver a la base.
 */
export function subtreeIds(pages: Page[], rootId: string): string[] {
  const hijosDe = new Map<string, string[]>();
  pages.forEach((p) => {
    if (!p.parentId) return;
    const lista = hijosDe.get(p.parentId);
    if (lista) lista.push(p.id);
    else hijosDe.set(p.parentId, [p.id]);
  });

  const ids: string[] = [];
  const pendientes = [rootId];
  const vistos = new Set<string>();
  while (pendientes.length > 0) {
    const id = pendientes.pop()!;
    // Un ciclo en los datos colgaría el bucle; con esto sólo se ignora.
    if (vistos.has(id)) continue;
    vistos.add(id);
    ids.push(id);
    const hijos = hijosDe.get(id);
    if (hijos) pendientes.push(...hijos);
  }
  return ids;
}

/**
 * La página, su cadena de padres y sus subpáginas directas, en una sola
 * lectura de todas las páginas. Es lo que arma la vista de una página: pedir
 * cada nivel de la ruta por separado hacía un viaje a la base por cada
 * subpágina anidada.
 */
export interface PageContext {
  page: Page;
  ancestors: Page[];
  children: Page[];
}

/**
 * La misma armada, pero sobre una lista de páginas que ya se tiene en la
 * mano. Sirve cuando la pantalla las pidió por su cuenta para poder hacerlo
 * en paralelo con otra consulta.
 */
export function pageContextFrom(
  pages: Page[],
  id: string
): PageContext | null {
  const byId = new Map(pages.map((p) => [p.id, p]));

  const page = byId.get(id);
  if (!page) return null;

  const ancestors: Page[] = [];
  let parentId = page.parentId;
  while (parentId) {
    const parent = byId.get(parentId);
    if (!parent) break;
    ancestors.unshift(parent);
    parentId = parent.parentId;
  }

  const children = pages
    .filter((p) => p.parentId === id)
    .sort((a, b) => a.position - b.position);

  return { page, ancestors, children };
}

export async function getPageContext(id: string): Promise<PageContext | null> {
  return pageContextFrom(await getAllPages(), id);
}

async function nextPosition(
  supabase: SupabaseServerClient,
  parentId: string | null,
  section: string | null
): Promise<number> {
  const base = supabase.from("pages").select("id", { count: "exact", head: true });
  const withParent = parentId === null ? base.is("parent_id", null) : base.eq("parent_id", parentId);
  const { count, error } =
    section === null ? await withParent.is("section", null) : await withParent.eq("section", section);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function createPage(input: CreatePageInput): Promise<Page> {
  const supabase = createClient();
  const parentId = input.parentId ?? null;
  const section = parentId === null ? input.section ?? null : null;
  const position = await nextPosition(supabase, parentId, section);
  const type = input.type ?? "page";

  const { data, error } = await supabase
    .from("pages")
    .insert({
      title: input.title,
      slug: slugify(input.title),
      icon: input.icon ?? "📄",
      parent_id: parentId,
      type,
      section,
      position,
      properties: input.properties ?? {},
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data);
}

export async function updatePage(
  id: string,
  input: UpdatePageInput
): Promise<Page> {
  const supabase = createClient();
  const current = await getPageById(id);
  if (!current) throw new Error("Página no encontrada");

  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) {
    patch.title = input.title;
    patch.slug = slugify(input.title);
  }
  if (input.icon !== undefined) patch.icon = input.icon;
  if (input.type !== undefined) patch.type = input.type;
  // Las propiedades se combinan con las que ya había, para poder cambiar
  // una sola sin tener que reenviar todas.
  if (input.properties !== undefined) {
    patch.properties = { ...current.properties, ...input.properties };
  }

  // Section sólo aplica a páginas raíz. Si cambia, la página pasa al final
  // de su nuevo grupo (misma lógica que crear una página ahí).
  if (input.section !== undefined && current.parentId === null) {
    const newSection = input.section ?? null;
    if (newSection !== current.section) {
      patch.section = newSection;
      patch.position = await nextPosition(supabase, current.parentId, newSection);
    }
  }

  const { data, error } = await supabase
    .from("pages")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data);
}

export async function deletePage(id: string): Promise<void> {
  const supabase = createClient();
  // parent_id tiene ON DELETE CASCADE: borrar un padre borra sus hijos.
  const { error } = await supabase.from("pages").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Reordena una página dentro de su grupo de hermanos (mismo parent_id +
 * section). `targetIndex` es la posición deseada dentro de ese grupo.
 */
export async function movePage(
  id: string,
  parentId: string | null,
  section: string | null,
  targetIndex: number
): Promise<void> {
  const supabase = createClient();
  const page = await getPageById(id);
  if (!page) throw new Error("Página no encontrada");

  const base = supabase.from("pages").select("*");
  const withParent = parentId === null ? base.is("parent_id", null) : base.eq("parent_id", parentId);
  const { data: siblingRows, error } =
    section === null
      ? await withParent.is("section", null).order("position", { ascending: true })
      : await withParent.eq("section", section).order("position", { ascending: true });
  if (error) throw new Error(error.message);

  const siblings = (siblingRows ?? []).map(mapRow).filter((p) => p.id !== id);
  const clampedIndex = Math.max(0, Math.min(targetIndex, siblings.length));
  siblings.splice(clampedIndex, 0, page);

  await Promise.all(
    siblings.map((sibling, index) =>
      supabase
        .from("pages")
        .update({ position: index, parent_id: parentId, section })
        .eq("id", sibling.id)
    )
  );
}
