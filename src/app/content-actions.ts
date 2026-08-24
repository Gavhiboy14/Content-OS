"use server";

import { revalidatePath } from "next/cache";
import * as content from "@/lib/content";
import { createBlock, getBlocks } from "@/lib/blocks";
import { textOf } from "@/lib/types";
import { getContentTypeDefinition, isKnownContentType } from "@/lib/content-types";
import { emptyContentFor } from "@/lib/types";
import { requireAuth } from "@/lib/require-auth";
import type { ContentItem, UpdateContentInput } from "@/lib/types";

export interface CreateContentFields {
  title?: string;
  /** Estado, fecha, enlace, notas: lo que declare el tipo en el registro. */
  properties?: Record<string, string>;
  /** Cuerpo inicial. Cada línea en blanco separa un párrafo. */
  body?: string;
}

export async function createContentAction(
  pageId: string,
  type: string,
  fields: CreateContentFields = {}
): Promise<ContentItem> {
  await requireAuth();
  if (!isKnownContentType(type)) {
    throw new Error(`Tipo de contenido desconocido: ${type}`);
  }

  const item = await content.createContentItem({
    pageId,
    type,
    title: fields.title?.trim() ?? "",
    properties: fields.properties,
  });

  const definition = getContentTypeDefinition(type);
  const owner = { pageId, contentItemId: item.id };
  const cuerpo = fields.body?.trim();

  if (cuerpo) {
    // Si se escribió algo al crear, ese texto ES el cuerpo: no tiene sentido
    // sumarle encima la plantilla vacía de Gancho/Desarrollo/CTA.
    for (const parrafo of cuerpo.split(/\n{2,}/)) {
      await createBlock(owner, "text", null, emptyContentFor("text", parrafo.trim()));
    }
  } else {
    for (const block of definition.template) {
      await createBlock(
        owner,
        block.type,
        null,
        emptyContentFor(block.type, block.text)
      );
    }
  }

  revalidatePath(`/p/${pageId}`);
  return item;
}

export async function updateContentAction(
  id: string,
  input: UpdateContentInput
): Promise<void> {
  await requireAuth();
  await content.updateContentItem(id, input);
}

export async function deleteContentAction(
  id: string,
  pageId: string
): Promise<void> {
  await requireAuth();
  await content.deleteContentItem(id);
  revalidatePath(`/p/${pageId}`);
}

/**
 * El cuerpo de un contenido como texto plano, para mostrarlo de un vistazo
 * en el detalle. Se pide sólo cuando se abre, para no cargar el cuerpo de
 * todos los contenidos de una página que quizás nunca se miran.
 */
export async function getContentBodyAction(
  pageId: string,
  contentItemId: string
): Promise<{ heading: boolean; text: string }[]> {
  await requireAuth();
  const blocks = await getBlocks({ pageId, contentItemId });
  return blocks
    .map((b) => ({ heading: b.type === "heading", text: textOf(b) }))
    .filter((b) => b.text.trim().length > 0);
}
