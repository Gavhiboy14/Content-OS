"use server";

import { requireAuth } from "@/lib/require-auth";
import { getBlocksForContentItem } from "@/lib/blocks";
import { getContentForPages } from "@/lib/content";
import { getAllPages, pageContextFrom, subtreeIds } from "@/lib/pages";
import { buildIdeasPrompt, type IdeaObjective } from "@/lib/prompts";
import { textOf } from "@/lib/types";
import type { ContentItem } from "@/lib/types";

/**
 * Arma el prompt del generador de ideas. El único motivo por el que esto es
 * una acción de servidor y no una función que corre en la pantalla: los
 * textos del banco viven en bloques, y para leerlos hay que ir a la base.
 */
export async function buildIdeasPromptAction(
  clientId: string,
  objetivo: IdeaObjective,
  pilar: string,
  tema: string
): Promise<string> {
  await requireAuth();

  const pages = await getAllPages();
  const context = pageContextFrom(pages, clientId);
  if (!context) throw new Error("Cliente no encontrado");

  const ids = subtreeIds(pages, clientId);
  const items = await getContentForPages(ids);

  const contenidos = items.filter((i) => i.type === "contenido");
  const banco = items.filter((i) => i.type === "banco");

  // Sólo hooks (hasta 8) y una muestra de guion/transcripción (hasta 2):
  // los mismos topes que traía el prototipo, para no inflar el prompt.
  const hooks = banco.filter((b) => b.properties.entryType === "hook").slice(0, 8);
  const muestra = banco
    .filter((b) => b.properties.entryType === "guion" || b.properties.entryType === "transcripcion")
    .slice(0, 2);

  async function textoDe(item: ContentItem): Promise<string> {
    const blocks = await getBlocksForContentItem(item.id);
    const texto = blocks.map(textOf).filter(Boolean).join(" ");
    return texto || item.title;
  }

  const [bancoHooks, bancoMuestra] = await Promise.all([
    Promise.all(hooks.map(textoDe)),
    Promise.all(
      muestra.map(async (item) => {
        const blocks = await getBlocksForContentItem(item.id);
        return blocks.map(textOf).filter(Boolean).join("\n").slice(0, 900);
      })
    ),
  ]);

  return buildIdeasPrompt(
    context.page,
    objetivo,
    pilar,
    tema,
    contenidos,
    bancoHooks,
    bancoMuestra
  );
}
