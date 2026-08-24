import Link from "next/link";
import { notFound } from "next/navigation";
import { AddContentButton } from "@/components/content/add-content-button";
import { ContentList } from "@/components/content/content-list";
import type { Destino } from "@/components/content/content-form-modal";
import { ClientDashboard } from "@/components/dashboard/client-dashboard";
import { BlockEditor } from "@/components/editor/block-editor";
import { getBlocks } from "@/lib/blocks";
import { getContentForPage, getContentForPages } from "@/lib/content";
import {
  CONTENT_TYPE_ORDER,
  getContentTypeDefinition,
  isPendingContent,
} from "@/lib/content-types";
import { getAllPages, getPageContext, subtreeIds } from "@/lib/pages";
import type { Page } from "@/lib/types";

/**
 * Una página se muestra de dos maneras, según lo que tenga colgando:
 *
 *   con subpáginas → es un cliente: dashboard de resumen y accesos
 *   sin subpáginas → es una plataforma o un recurso: su contenido, listado
 *
 * La regla sale de los datos, no de una lista de páginas escrita en el
 * código: si mañana le colgás una subpágina a Instagram, pasa a dashboard sin
 * que haya que tocar nada.
 */
export default async function PageView({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [context, pages] = await Promise.all([getPageContext(id), getAllPages()]);
  if (!context) notFound();
  const { page, ancestors, children } = context;

  const destinos: Destino[] = children.map((c) => ({
    id: c.id,
    title: c.title,
    icon: c.icon,
  }));

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-4xl px-6 pt-20 pb-24 sm:px-10 lg:px-12 lg:pt-12">
        <Ruta page={page} ancestors={ancestors} />

        {children.length > 0 ? (
          <DashboardDeCliente
            page={page}
            subpages={children}
            pages={pages}
            destinos={destinos}
          />
        ) : (
          <PaginaSimple page={page} destinos={destinos} />
        )}
      </div>
    </main>
  );
}

function Ruta({ page, ancestors }: { page: Page; ancestors: Page[] }) {
  if (ancestors.length === 0 && !page.section) return null;

  return (
    <nav
      aria-label="Ruta"
      className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3"
    >
      {page.section && <span>{page.section}</span>}
      {page.section && ancestors.length > 0 && <span>/</span>}
      {ancestors.map((ancestor, i) => (
        <span key={ancestor.id} className="flex items-center gap-2">
          <Link
            href={`/p/${ancestor.id}`}
            className="transition-colors hover:text-ink-2"
          >
            {ancestor.title}
          </Link>
          {i < ancestors.length - 1 && <span>/</span>}
        </span>
      ))}
    </nav>
  );
}

/** Portada de cliente: resumen de todo lo suyo, incluidas sus plataformas. */
async function DashboardDeCliente({
  page,
  subpages,
  pages,
  destinos,
}: {
  page: Page;
  subpages: Page[];
  pages: Page[];
  destinos: Destino[];
}) {
  const items = await getContentForPages(subtreeIds(pages, page.id));

  // Cada plataforma cuenta lo suyo y lo de sus propias subpáginas, así el
  // número de la tarjeta coincide con lo que se ve al entrar.
  const childCounts = new Map<string, number>();
  for (const child of subpages) {
    const propios = new Set(subtreeIds(pages, child.id));
    childCounts.set(
      child.id,
      items.filter((i) => propios.has(i.pageId)).length
    );
  }

  return (
    <ClientDashboard
      page={page}
      subpages={subpages}
      childCounts={childCounts}
      items={items}
      destinos={destinos}
    />
  );
}

/**
 * Página sin subpáginas: su contenido agrupado por tipo, y debajo su
 * documento libre. Ese documento es lo que sostiene páginas como el Banco de
 * Hooks, donde el valor está en los bloques y no en fichas sueltas.
 */
async function PaginaSimple({
  page,
  destinos,
}: {
  page: Page;
  destinos: Destino[];
}) {
  const [content, blocks] = await Promise.all([
    getContentForPage(page.id),
    getBlocks({ pageId: page.id, contentItemId: null }),
  ]);

  // Lo terminado baja al final, y los tipos salen en el orden del registro.
  // Se ordena en el servidor a propósito: si se hiciera al marcar, el ítem
  // saltaría de lugar justo debajo del cursor.
  const ordenados = [...content].sort((a, b) => {
    const porTipo =
      CONTENT_TYPE_ORDER.indexOf(a.type) - CONTENT_TYPE_ORDER.indexOf(b.type);
    if (porTipo !== 0) return porTipo;
    const aPending = isPendingContent(a.type, a.properties) ? 0 : 1;
    const bPending = isPendingContent(b.type, b.properties) ? 0 : 1;
    return aPending - bPending || a.position - b.position;
  });

  const pending = content.filter((i) =>
    isPendingContent(i.type, i.properties)
  ).length;
  const isEmpty = content.length === 0 && blocks.length === 0;

  return (
    <>
      <header className="mb-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <span className="mt-0.5 text-3xl leading-none">{page.icon}</span>
            <div>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
                {page.title}
              </h1>
              {content.length > 0 && (
                <p className="mt-1.5 font-mono text-[11px] tracking-wider text-ink-3">
                  {content.length}{" "}
                  {content.length === 1 ? "contenido" : "contenidos"}
                  {pending > 0 && ` · ${pending} sin terminar`}
                </p>
              )}
            </div>
          </div>

          {!isEmpty && (
            <AddContentButton
              pageId={page.id}
              pageTitle={page.title}
              destinos={destinos}
            />
          )}
        </div>
      </header>

      {isEmpty ? (
        <EmptyPage pageId={page.id} title={page.title} destinos={destinos} />
      ) : (
        <>
          {content.length > 0 && (
            <ContentList
              items={ordenados}
              pages={[{ id: page.id, title: page.title, icon: page.icon }]}
              groupBy="type"
              emptyLabel="Nada guardado todavía"
            />
          )}

          <section className="mt-12 border-t border-line pt-8">
            <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
              Notas de la página
            </h2>
            <BlockEditor
              owner={{ pageId: page.id, contentItemId: null }}
              initialBlocks={blocks}
            />
          </section>
        </>
      )}
    </>
  );
}

/** Primera vez que se entra a una página: en vez de un vacío, qué se puede hacer. */
function EmptyPage({
  pageId,
  title,
  destinos,
}: {
  pageId: string;
  title: string;
  destinos: Destino[];
}) {
  const destacados = ["guion", "idea", "hook"];

  return (
    <div className="panel rounded-2xl px-6 py-9 text-center">
      <h2 className="font-display text-lg font-medium tracking-tight text-ink">
        {title} está en blanco
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-2">
        Empezá por lo que tengas a mano: un guión para escribir, una idea que no
        querés perder, o un gancho que te funcionó.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {destacados.map((type, i) => {
          const definition = getContentTypeDefinition(type);
          return (
            <AddContentButton
              key={type}
              pageId={pageId}
              pageTitle={title}
              destinos={destinos}
              fixedType={type}
              label={`${definition.icon} ${definition.newLabel}`}
              variant={i === 0 ? "solid" : "soft"}
            />
          );
        })}
      </div>

      <p className="mt-6 text-[12px] text-ink-3">
        También podés crear una subpágina desde el sidebar para organizar por
        red o por tema.
      </p>
    </div>
  );
}
