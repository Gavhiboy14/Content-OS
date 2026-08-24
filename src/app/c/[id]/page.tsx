import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentHeader } from "@/components/content/content-header";
import { MarkActivePage } from "@/components/content/mark-active-page";
import { BlockEditor } from "@/components/editor/block-editor";
import { createBlock, getBlocks } from "@/lib/blocks";
import { getContentItem } from "@/lib/content";
import { getContentTypeDefinition } from "@/lib/content-types";
import { getPageContext } from "@/lib/pages";

export default async function ContentItemView({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getContentItem(id);
  if (!item) notFound();

  const definition = getContentTypeDefinition(item.type);

  const [context, existingBlocks] = await Promise.all([
    getPageContext(item.pageId),
    getBlocks({ pageId: item.pageId, contentItemId: id }),
  ]);
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
