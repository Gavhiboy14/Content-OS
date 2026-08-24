"use server";

import * as blocks from "@/lib/blocks";
import type { BlockOwner } from "@/lib/blocks";
import { requireAuth } from "@/lib/require-auth";
import { isBlockType, type Block, type BlockContent, type BlockType } from "@/lib/types";

/**
 * El editor es optimista: aplica los cambios en pantalla al instante y
 * persiste en segundo plano. Por eso estas acciones no revalidan la ruta en
 * cada tecla — eso volvería a renderizar la página y pisaría lo que el
 * usuario está escribiendo.
 */

export async function createBlockAction(
  owner: BlockOwner,
  type: BlockType = "text",
  afterBlockId?: string | null,
  content?: BlockContent
): Promise<Block> {
  await requireAuth();
  if (!isBlockType(type)) throw new Error(`Tipo de bloque desconocido: ${type}`);
  return blocks.createBlock(owner, type, afterBlockId, content);
}

export async function updateBlockAction(
  id: string,
  patch: { type?: BlockType; content?: BlockContent }
): Promise<void> {
  await requireAuth();
  if (patch.type !== undefined && !isBlockType(patch.type)) {
    throw new Error(`Tipo de bloque desconocido: ${patch.type}`);
  }
  await blocks.updateBlock(id, patch);
}

export async function deleteBlockAction(id: string): Promise<void> {
  await requireAuth();
  await blocks.deleteBlock(id);
}

export async function moveBlockAction(
  owner: BlockOwner,
  id: string,
  targetIndex: number
): Promise<void> {
  await requireAuth();
  await blocks.moveBlock(owner, id, targetIndex);
}
