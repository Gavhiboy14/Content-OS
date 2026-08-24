import { notFound } from "next/navigation";
import { ContentList } from "@/components/content/content-list";
import {
  getContentTypeDefinition,
  isKnownContentType,
} from "@/lib/content-types";
import { getContentByType } from "@/lib/content";
import { getAllPages } from "@/lib/pages";

/**
 * La vista global de un tipo: todas las tareas, todas las ideas, sin importar
 * de qué cliente sean. Es la contracara de la página de gestión de un
 * cliente — sirve para arrancar el día mirando todo junto.
 */
export default async function GlobalTypeView({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  if (!isKnownContentType(type)) notFound();

  const [items, pages] = await Promise.all([
    getContentByType(type),
    getAllPages(),
  ]);

  const definition = getContentTypeDefinition(type);
  const paginas = pages.map((p) => ({
    id: p.id,
    title: p.title,
    icon: p.icon,
  }));

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-4xl px-6 pt-20 pb-24 sm:px-10 lg:px-12 lg:pt-12">
        <header className="mb-8">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
            General
          </p>

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
                  : definition.labelPlural.toLowerCase()}{" "}
                en todos los clientes
              </p>
            </div>
          </div>
        </header>

        {/* Las tareas se ordenan por cuándo vencen; el resto, por dónde viven.
            Acá no hay botón de crear: una tarea siempre pertenece a alguien,
            así que se crea desde su cliente. */}
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
