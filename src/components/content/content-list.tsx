"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { ContentRow } from "@/components/content/content-row";
import { groupByDue, type ContentGroup } from "@/lib/dashboard";
import { getContentTypeDefinition } from "@/lib/content-types";
import { findSelectProperty } from "@/lib/page-types";
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
  const [estado, setEstado] = useState<string | null>(null);

  const porId = useMemo(
    () => new Map(pages.map((p) => [p.id, p])),
    [pages]
  );

  // El filtro de estado sale del tipo, no de una lista escrita acá: si un
  // tipo suma un estado, aparece solo.
  const estados = type
    ? findSelectProperty(getContentTypeDefinition(type).properties, "status")
    : undefined;

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return items.filter((i) => {
      if (estado && i.properties.status !== estado) return false;
      if (!texto) return true;
      // Busca en el título y en las notas: muchas veces el dato que uno
      // recuerda quedó anotado al costado, no en el título.
      return (
        i.title.toLowerCase().includes(texto) ||
        (i.properties.notes ?? "").toLowerCase().includes(texto)
      );
    });
  }, [items, busqueda, estado]);

  const grupos = useMemo(
    () => agrupar(filtrados, groupBy, porId),
    [filtrados, groupBy, porId]
  );

  const hayFiltro = busqueda.trim().length > 0 || estado !== null;
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

        {estados && (
          <div className="flex flex-wrap items-center gap-1">
            <FiltroChip
              activo={estado === null}
              onClick={() => setEstado(null)}
              label="Todos"
            />
            {estados.options.map((o) => (
              <FiltroChip
                key={o.value}
                activo={estado === o.value}
                onClick={() => setEstado(estado === o.value ? null : o.value)}
                label={o.label}
                className={o.className}
              />
            ))}
          </div>
        )}
      </div>

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
