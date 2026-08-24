import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  emptyContentFor,
  isBlockType,
  type Block,
  type BlockContent,
  type BlockType,
} from "@/lib/types";

/**
 * Un conjunto de bloques pertenece a una página o al cuerpo de un contenido.
 * `BlockOwner` es esa referencia: se pasa entera para no confundir los ids.
 */
export interface BlockOwner {
  pageId: string;
  contentItemId: string | null;
}

function mapRow(row: Record<string, unknown>): Block {
  const rawType = row.type as string;
  return {
    id: row.id as string,
    pageId: row.page_id as string,
    contentItemId: (row.content_item_id as string | null) ?? null,
    // Si en la base quedó un tipo que el código ya no conoce, se muestra como
    // texto en lugar de romper la página.
    type: isBlockType(rawType) ? rawType : "text",
    content: row.content as Block["content"],
    position: row.position as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getBlocks(owner: BlockOwner): Promise<Block[]> {
  const supabase = createClient();
  const base = supabase.from("blocks").select("*").eq("page_id", owner.pageId);
  const { data, error } =
    owner.contentItemId === null
      ? await base.is("content_item_id", null).order("position", { ascending: true })
      : await base
          .eq("content_item_id", owner.contentItemId)
          .order("position", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

/**
 * Crea un bloque. Si se pasa `afterBlockId`, queda justo debajo de ese
 * bloque; si no, va al final.
 */
export async function createBlock(
  owner: BlockOwner,
  type: BlockType = "text",
  afterBlockId?: string | null,
  content?: BlockContent
): Promise<Block> {
  const supabase = createClient();
  const siblings = await getBlocks(owner);

  let insertIndex = siblings.length;
  if (afterBlockId) {
    const i = siblings.findIndex((b) => b.id === afterBlockId);
    if (i !== -1) insertIndex = i + 1;
  }

  const { data, error } = await supabase
    .from("blocks")
    .insert({
      page_id: owner.pageId,
      content_item_id: owner.contentItemId,
      type,
      content: content ?? emptyContentFor(type),
      position: insertIndex,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  // Correr una posición a los que quedaron por debajo.
  const toShift = siblings.slice(insertIndex);
  if (toShift.length > 0) {
    await Promise.all(
      toShift.map((b, i) =>
        supabase
          .from("blocks")
          .update({ position: insertIndex + 1 + i })
          .eq("id", b.id)
      )
    );
  }

  return mapRow(data);
}

export async function updateBlock(
  id: string,
  patch: { type?: BlockType; content?: BlockContent }
): Promise<Block> {
  const supabase = createClient();
  const fields: Record<string, unknown> = {};
  if (patch.type !== undefined) fields.type = patch.type;
  if (patch.content !== undefined) fields.content = patch.content;

  const { data, error } = await supabase
    .from("blocks")
    .update(fields)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data);
}

export async function deleteBlock(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("blocks").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Reordena un bloque dentro de su página o contenido. */
export async function moveBlock(
  owner: BlockOwner,
  id: string,
  targetIndex: number
): Promise<void> {
  const supabase = createClient();
  const blocks = await getBlocks(owner);
  const moving = blocks.find((b) => b.id === id);
  if (!moving) throw new Error("Bloque no encontrado");

  const rest = blocks.filter((b) => b.id !== id);
  const clamped = Math.max(0, Math.min(targetIndex, rest.length));
  rest.splice(clamped, 0, moving);

  await Promise.all(
    rest.map((b, i) =>
      supabase.from("blocks").update({ position: i }).eq("id", b.id)
    )
  );
}
