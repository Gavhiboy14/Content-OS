import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AddContentButton } from "@/components/content/add-content-button";
import { ContentList } from "@/components/content/content-list";
import {
  getContentTypeDefinition,
  isKnownContentType,
} from "@/lib/content-types";
import { getContentForPages } from "@/lib/content";
import { getAllPages, getPageContext, subtreeIds } from "@/lib/pages";

/**
 * La página de gestión de un tipo dentro de un cliente: todas sus ideas,
 * todas sus tareas. Reúne lo que está suelto en el cliente y lo que está
 * guardado dentro de sus plataformas, agrupado por dónde vive — que es lo
 * que hace las veces de canal.
 */
export default async function ClientTypeView({
  params,
}: {
  params: Promise<{ id: string; type: string }>;
}) {
  const { id, type } = await params;
  if (!isKnownContentType(type)) notFound();

  const [context, pages] = await Promise.all([getPageContext(id), getAllPages()]);
  if (!context) notFound();
  const { page, children } = context;

  const ids = subtreeIds(pages, id);
  const todos = await getContentForPages(ids);
  const items = todos.filter((i) => i.type === type);

  const definition = getContentTypeDefinition(type);

  // Sólo las páginas de este cliente, en el orden del árbol: primero él,
  // después cada plataforma.
  const porId = new Map(pages.map((p) => [p.id, p]));
  const paginas = ids
    .map((pageId) => porId.get(pageId))
    .filter((p) => p !== undefined)
    .map((p) => ({ id: p.id, title: p.title, icon: p.icon }));

  const destinos = children.map((c) => ({
    id: c.id,
    title: c.title,
    icon: c.icon,
  }));

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-4xl px-6 pt-20 pb-24 sm:px-10 lg:px-12 lg:pt-12">
        <header className="mb-8">
          <Link
            href={`/p/${page.id}`}
            className="mb-4 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 transition-colors hover:text-ink-2"
          >
            <ArrowLeft size={12} />
            {page.title}
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <span className="mt-0.5 text-3xl leading-none">
                {definition.icon}
              </span>
              <div>
                <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
                  {definition.labelPlural}
                </h1>
                <p className="mt-1.5 font-mono text-[11px] tracking-wider text-ink-3">
                  {items.length}{" "}
                  {items.length === 1
                    ? definition.label.toLowerCase()
                    : definition.labelPlural.toLowerCase()}
                </p>
              </div>
            </div>

            <AddContentButton
              pageId={page.id}
              pageTitle={page.title}
              destinos={destinos}
              fixedType={type}
            />
          </div>
        </header>

        {/* Las tareas se ordenan por cuándo vencen; el resto, por la página
            donde vive cada una. */}
        <ContentList
          items={items}
          pages={paginas}
          groupBy={type === "tarea" ? "due" : "page"}
          type={type}
          emptyLabel={definition.emptyLabel}
        />
      </div>
    </main>
  );
}
