"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { ContentRow } from "@/components/content/content-row";
import { groupByDue, type ContentGroup } from "@/lib/dashboard";
import { getContentTypeDefinition } from "@/lib/content-types";
import type { SelectPropertyDefinition } from "@/lib/page-types";
import { cn } from "@/lib/utils";
import type { ContentItem } from "@/lib/types";

/** Los datos de la página donde vive cada contenido, para mostrar el canal. */
export interface PageRef {
  id: string;
  title: string;
  icon: string | null;
}

interface ContentListProps {
  items: ContentItem[];
  pages: PageRef[];
  /**
   * Cómo se ordenan las filas en pantalla:
   *   due  → por cuándo vencen (Hoy, Esta semana, …). Para tareas.
   *   page → por la página donde viven. Para juntar varias plataformas.
   *   type → por tipo de contenido. Para una página con cosas mezcladas.
   */
  groupBy: "due" | "page" | "type";
  /** Si todas las filas son del mismo tipo, sus estados arman el filtro. */
  type?: string;
  emptyLabel: string;
}

/**
 * La lista de gestión: buscar, filtrar y ver. Las filas son las mismas de
 * siempre, así que editar, cambiar estado y borrar siguen funcionando igual
 * desde acá.
 */
export function ContentList({
  items,
  pages,
  groupBy,
  type,
  emptyLabel,
}: ContentListProps) {
  const [busqueda, setBusqueda] = useState("");
  /** Qué valor se eligió en cada filtro. Sin entrada = ese filtro está libre. */
  const [filtros, setFiltros] = useState<Record<string, string>>({});

  const porId = useMemo(
    () => new Map(pages.map((p) => [p.id, p])),
    [pages]
  );

  /**
   * Los filtros salen de las listas que declara el tipo — estado, embudo, y
   * las que se sumen — sin nombrar ninguna acá.
   *
   * Se muestran siempre y con todas sus opciones, aunque por ahora ningún
   * contenido las use: además de filtrar, dejan a la vista el vocabulario
   * disponible. Esconderlas cuando todos comparten el mismo valor hacía que
   * los filtros aparecieran y desaparecieran solos, que desconcierta.
   */
  const filtrosDisponibles = useMemo(() => {
    if (!type) return [];
    return getContentTypeDefinition(type).properties.filter(
      (p): p is SelectPropertyDefinition => p.kind === "select"
    );
  }, [type]);

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    const definition = type ? getContentTypeDefinition(type) : null;

    return items.filter((i) => {
      for (const [key, elegido] of Object.entries(filtros)) {
        const prop = definition?.properties.find(
          (p): p is SelectPropertyDefinition => p.kind === "select" && p.key === key
        );
        // Lo que nunca se tocó cuenta como su valor inicial, así "Sin definir"
        // encuentra justamente lo que falta clasificar.
        const actual = i.properties[key] ?? prop?.defaultValue;
        if (actual !== elegido) return false;
      }
      if (!texto) return true;
      // Busca en el título y en las notas: muchas veces el dato que uno
      // recuerda quedó anotado al costado, no en el título.
      return (
        i.title.toLowerCase().includes(texto) ||
        (i.properties.notes ?? "").toLowerCase().includes(texto)
      );
    });
  }, [items, busqueda, filtros, type]);

  const grupos = useMemo(
    () => agrupar(filtrados, groupBy, porId),
    [filtrados, groupBy, porId]
  );

  function alternarFiltro(key: string, valor: string) {
    setFiltros((prev) => {
      const next = { ...prev };
      if (next[key] === valor) delete next[key];
      else next[key] = valor;
      return next;
    });
  }

  const hayFiltro =
    busqueda.trim().length > 0 || Object.keys(filtros).length > 0;
  // Mostrar canal sólo tiene sentido si las filas vienen de páginas distintas.
  const mostrarCanal = groupBy !== "page" && porId.size > 1;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            size={13}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3"
          />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar…"
            aria-label="Buscar"
            className="w-full rounded-xl border border-line bg-black/20 py-1.5 pr-8 pl-8 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-accent/50"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda("")}
              aria-label="Limpiar búsqueda"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-ink-3 transition-colors hover:text-ink"
            >
              <X size={13} />
            </button>
          )}
        </div>

      </div>

      {/* Un renglón por campo, con su nombre adelante. Con dos filtros
          (estado y embudo) sin etiqueta no se entendería a qué corresponde
          cada grupo de pastillas. */}
      {filtrosDisponibles.map((prop) => (
        <div key={prop.key} className="flex flex-wrap items-center gap-1">
          <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
            {prop.label}
          </span>
          <FiltroChip
            activo={filtros[prop.key] === undefined}
            onClick={() =>
              setFiltros((prev) => {
                const next = { ...prev };
                delete next[prop.key];
                return next;
              })
            }
            label="Todos"
          />
          {prop.options.map((o) => (
            <FiltroChip
              key={o.value}
              activo={filtros[prop.key] === o.value}
              onClick={() => alternarFiltro(prop.key, o.value)}
              label={o.label}
              className={o.className}
            />
          ))}
        </div>
      ))}

      {grupos.length === 0 ? (
        <p className="panel rounded-2xl px-6 py-10 text-center text-sm text-ink-2">
          {hayFiltro ? "Nada coincide con esa búsqueda" : emptyLabel}
        </p>
      ) : (
        <div className="flex flex-col gap-7">
          {grupos.map((g) => (
            <section key={g.key}>
              {/* Con un solo grupo el encabezado no aporta: ya lo dice el
                  título de la página. */}
              {grupos.length > 1 && (
                <h2 className="mb-2.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
                  {g.label}
                  <span className="text-ink-3/60">{g.items.length}</span>
                </h2>
              )}

              <div className="flex flex-col gap-1.5">
                {g.items.map((item) => {
                  const pagina = porId.get(item.pageId);
                  return (
                    <ContentRow
                      key={item.id}
                      item={item}
                      pageId={item.pageId}
                      pageTitle={pagina?.title ?? ""}
                      canal={
                        mostrarCanal && pagina
                          ? { title: pagina.title, icon: pagina.icon }
                          : undefined
                      }
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function agrupar(
  items: ContentItem[],
  groupBy: ContentListProps["groupBy"],
  porId: Map<string, PageRef>
): ContentGroup[] {
  if (groupBy === "due") return groupByDue(items);

  const grupos = new Map<string, ContentGroup>();
  for (const item of items) {
    const key = groupBy === "page" ? item.pageId : item.type;
    let g = grupos.get(key);
    if (!g) {
      const definition = getContentTypeDefinition(item.type);
      const pagina = porId.get(item.pageId);
      g = {
        key,
        label:
          groupBy === "page"
            ? `${pagina?.icon ?? ""} ${pagina?.title ?? ""}`.trim()
            : definition.labelPlural,
        items: [],
      };
      grupos.set(key, g);
    }
    g.items.push(item);
  }
  return [...grupos.values()];
}

function FiltroChip({
  activo,
  onClick,
  label,
  className,
}: {
  activo: boolean;
  onClick: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={activo}
      className={cn(
        "rounded-lg px-2 py-1 text-[12px] transition-colors",
        activo
          ? (className ?? "bg-white/[0.14] text-ink")
          : "text-ink-3 hover:bg-white/[0.06] hover:text-ink-2"
      )}
    >
      {label}
    </button>
  );
}
