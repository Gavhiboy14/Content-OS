import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentHeader } from "@/components/content/content-header";
import { MarkActivePage } from "@/components/content/mark-active-page";
import { BlockEditor } from "@/components/editor/block-editor";
import { createBlock, getBlocksForContentItem } from "@/lib/blocks";
import { getContentItem } from "@/lib/content";
import { getContentTypeDefinition } from "@/lib/content-types";
import { getAllPages, pageContextFrom } from "@/lib/pages";

export default async function ContentItemView({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Las tres cosas se piden a la vez. Antes se esperaba el contenido para
  // recién entonces saber su página y pedir el resto: eran dos viajes a la
  // base uno detrás del otro, y cada uno cuesta.
  const [item, existingBlocks, pages] = await Promise.all([
    getContentItem(id),
    getBlocksForContentItem(id),
    getAllPages(),
  ]);
  if (!item) notFound();

  const definition = getContentTypeDefinition(item.type);

  const context = pageContextFrom(pages, item.pageId);
  if (!context) notFound();
  const { page, ancestors } = context;

  // Siempre tiene que haber dónde escribir.
  const blocks =
    existingBlocks.length > 0
      ? existingBlocks
      : [await createBlock({ pageId: item.pageId, contentItemId: id }, "text")];

  const ruta = [...ancestors, page];

  return (
    <main className="flex-1">
      <MarkActivePage pageId={item.pageId} />
      <div className="mx-auto max-w-3xl px-6 pt-20 pb-24 sm:px-10 lg:px-12 lg:pt-12">
        <nav
          aria-label="Ruta"
          className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3"
        >
          {ruta.map((p, i) => (
            <span key={p.id} className="flex items-center gap-2">
              <Link href={`/p/${p.id}`} className="transition-colors hover:text-ink-2">
                {p.title}
              </Link>
              <span>/</span>
              {i === ruta.length - 1 && <span>{definition.labelPlural}</span>}
            </span>
          ))}
        </nav>

        <ContentHeader item={item} />

        <BlockEditor
          owner={{ pageId: item.pageId, contentItemId: id }}
          initialBlocks={blocks}
        />
      </div>
    </main>
  );
}
