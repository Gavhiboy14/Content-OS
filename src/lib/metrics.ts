import { parseNumber } from "@/lib/page-types";
import type { ContentItem } from "@/lib/types";

/**
 * MÉTRICAS DE UN CONTENIDO
 *
 * Los números crudos se cargan a mano; las tasas se calculan siempre a
 * partir de ellos y nunca se guardan. Guardar un porcentaje sería tener el
 * mismo dato en dos lados, y tarde o temprano uno de los dos queda viejo.
 *
 * Todo devuelve `null` cuando falta el dato, que no es lo mismo que cero:
 * un contenido sin visualizaciones cargadas no tiene 0% de engagement, no
 * tiene engagement medido.
 */

export interface ContentMetrics {
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  newFollowers: number | null;
  retention: number | null;
  /** Likes + comentarios + compartidos + guardados. */
  interactions: number | null;
  /** Interacciones sobre visualizaciones, en porcentaje. */
  engagementRate: number | null;
  shareRate: number | null;
  saveRate: number | null;
}

/** Está publicado, así que sus números tienen sentido. */
export function isPublished(item: ContentItem): boolean {
  return item.properties.status === "publicado";
}

function tasa(parte: number | null, total: number | null): number | null {
  if (parte === null || total === null || total <= 0) return null;
  return (parte / total) * 100;
}

export function readMetrics(item: ContentItem): ContentMetrics {
  const n = (key: string) => parseNumber(item.properties[key]);

  const views = n("views");
  const likes = n("likes");
  const comments = n("comments");
  const shares = n("shares");
  const saves = n("saves");

  // Suma lo que haya: si cargaste likes y comentarios pero todavía no
  // guardados, igual sirve tener el parcial.
  const partes = [likes, comments, shares, saves].filter(
    (x): x is number => x !== null
  );
  const interactions = partes.length > 0 ? partes.reduce((a, b) => a + b, 0) : null;

  return {
    views,
    likes,
    comments,
    shares,
    saves,
    newFollowers: n("newFollowers"),
    retention: n("retention"),
    interactions,
    engagementRate: tasa(interactions, views),
    shareRate: tasa(shares, views),
    saveRate: tasa(saves, views),
  };
}

/** "4,2%" — una tasa lista para mostrar, o null si no hay dato. */
export function formatRate(value: number | null): string | null {
  if (value === null) return null;
  return `${value.toLocaleString("es-AR", { maximumFractionDigits: 1 })}%`;
}

/* ------------------------------------------------------------------ */
/* Ordenar                                                             */
/* ------------------------------------------------------------------ */

export type SortKey = "date" | "views" | "engagement" | "followers";

// Etiquetas cortas a propósito: con "Visualizaciones" la fila se partía en
// dos renglones en el teléfono y empujaba la lista fuera de la pantalla.
export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "date", label: "Fecha" },
  { value: "views", label: "Vistas" },
  { value: "engagement", label: "Engagement" },
  { value: "followers", label: "Seguidores" },
];

function valorPara(item: ContentItem, key: SortKey): number | null {
  const m = readMetrics(item);
  if (key === "views") return m.views;
  if (key === "engagement") return m.engagementRate;
  if (key === "followers") return m.newFollowers;
  return null;
}

/**
 * Ordena de mayor a menor por la métrica elegida. Lo que no tiene ese dato
 * cargado cae al final: no compite con un cero que nadie midió.
 */
export function sortByMetric(items: ContentItem[], key: SortKey): ContentItem[] {
  if (key === "date") {
    return [...items].sort((a, b) =>
      (b.properties.date ?? "").localeCompare(a.properties.date ?? "")
    );
  }
  return [...items].sort((a, b) => {
    const va = valorPara(a, key);
    const vb = valorPara(b, key);
    if (va === null && vb === null) return 0;
    if (va === null) return 1;
    if (vb === null) return -1;
    return vb - va;
  });
}

/**
 * El id del contenido que mejor rindió según esa métrica, para poder
 * destacarlo. Null si ninguno tiene el dato o si hay uno solo — señalar al
 * único que hay no dice nada.
 */
export function bestBy(items: ContentItem[], key: SortKey): string | null {
  if (key === "date") return null;
  const conDato = items.filter((i) => valorPara(i, key) !== null);
  if (conDato.length < 2) return null;
  return sortByMetric(conDato, key)[0].id;
}
