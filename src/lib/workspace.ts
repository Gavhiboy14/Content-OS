import { parseNumber, parseDateKey } from "@/lib/page-types";
import { isPublished, readMetrics } from "@/lib/metrics";
import type { ContentItem, Page } from "@/lib/types";

/**
 * EL PULSO DEL WORKSPACE
 *
 * Junta lo de todos los clientes en unos pocos números. Todo sale de los
 * contenidos y de las mediciones cargadas a mano: no hay ningún dato
 * guardado aparte que pueda quedar desactualizado.
 */

export interface WorkspaceStats {
  /** Suma de la última medición de cada plataforma. Null si no hay ninguna. */
  followers: number | null;
  /** Cuánto creció respecto de la medición más vieja del período mirado. */
  growth: number | null;
  published: number;
  /** Lo que está en el horno: idea, guión o grabado, pero sin salir. */
  inProgress: number;
  views: number | null;
  /** Interacciones sobre visualizaciones, de todo lo publicado junto. */
  engagementRate: number | null;
  newFollowers: number | null;
}

export interface FollowerPoint {
  date: string;
  total: number;
}

/**
 * La última medición de cada plataforma hasta una fecha dada. Se mira por
 * plataforma y no en bloque porque cada una se anota cuando se puede: si
 * Instagram se midió ayer y TikTok hace una semana, el total de hoy son las
 * dos últimas que haya, no sólo la de ayer.
 */
function ultimasPorPagina(
  mediciones: ContentItem[],
  hasta?: string
): Map<string, number> {
  const porPagina = new Map<string, { date: string; value: number }>();

  for (const m of mediciones) {
    const date = m.properties.date;
    const value = parseNumber(m.properties.followers);
    if (!date || value === null) continue;
    if (hasta && date > hasta) continue;

    const actual = porPagina.get(m.pageId);
    if (!actual || date > actual.date) porPagina.set(m.pageId, { date, value });
  }

  return new Map([...porPagina].map(([k, v]) => [k, v.value]));
}

function sumar(valores: Iterable<number>): number {
  let total = 0;
  for (const v of valores) total += v;
  return total;
}

/**
 * La evolución del total de seguidores. En cada fecha en la que se midió
 * algo, se suma lo último conocido de cada plataforma hasta ese día — así la
 * curva no se desploma cuando una plataforma no se midió esa fecha.
 */
export function followerSeries(mediciones: ContentItem[]): FollowerPoint[] {
  const fechas = [
    ...new Set(mediciones.map((m) => m.properties.date).filter(Boolean)),
  ].sort() as string[];

  return fechas.map((date) => ({
    date,
    total: sumar(ultimasPorPagina(mediciones, date).values()),
  }));
}

export function workspaceStats(
  contenidos: ContentItem[],
  mediciones: ContentItem[]
): WorkspaceStats {
  const publicados = contenidos.filter(isPublished);
  const metricas = publicados.map(readMetrics);

  const conVistas = metricas
    .map((m) => m.views)
    .filter((v): v is number => v !== null);
  const views = conVistas.length > 0 ? sumar(conVistas) : null;

  const interacciones = metricas
    .map((m) => m.interactions)
    .filter((v): v is number => v !== null);

  const nuevos = metricas
    .map((m) => m.newFollowers)
    .filter((v): v is number => v !== null);

  const serie = followerSeries(mediciones);
  const followers = serie.length > 0 ? serie[serie.length - 1].total : null;
  // Se compara contra la primera medición que haya: con dos puntos ya se
  // puede decir algo, y no hace falta esperar un mes entero.
  const growth =
    serie.length > 1 ? serie[serie.length - 1].total - serie[0].total : null;

  return {
    followers,
    growth,
    published: publicados.length,
    inProgress: contenidos.length - publicados.length,
    views,
    engagementRate:
      views !== null && views > 0 && interacciones.length > 0
        ? (sumar(interacciones) / views) * 100
        : null,
    newFollowers: nuevos.length > 0 ? sumar(nuevos) : null,
  };
}

/** Lo publicado que mejor rindió, de mayor a menor engagement. */
export function topContent(
  contenidos: ContentItem[],
  cuantos = 4
): ContentItem[] {
  return contenidos
    .filter(isPublished)
    .filter((c) => readMetrics(c).engagementRate !== null)
    .sort(
      (a, b) =>
        (readMetrics(b).engagementRate ?? 0) - (readMetrics(a).engagementRate ?? 0)
    )
    .slice(0, cuantos);
}

/**
 * Lo último que tocaste. Las mediciones quedan afuera: anotar seguidores es
 * cargar un dato, no trabajar en algo, y cada tanda de mediciones tapaba
 * toda la lista con filas a las que nadie vuelve.
 */
export function recentActivity(
  items: ContentItem[],
  cuantos = 6
): ContentItem[] {
  return items
    .filter((i) => i.type !== "medicion")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, cuantos);
}

/** "hace 2 días", "hoy" — para la actividad reciente. */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const dias = Math.floor(
    (now.getTime() - new Date(iso).getTime()) / 86_400_000
  );
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  if (dias < 30) return `hace ${dias} días`;
  const meses = Math.floor(dias / 30);
  return meses === 1 ? "hace un mes" : `hace ${meses} meses`;
}

/** El cliente al que pertenece una página, subiendo por el árbol. */
export function ownerClient(pages: Page[], pageId: string): Page | null {
  const byId = new Map(pages.map((p) => [p.id, p]));
  let actual = byId.get(pageId) ?? null;
  while (actual?.parentId) actual = byId.get(actual.parentId) ?? null;
  return actual;
}

/** Convierte la serie en la línea de un gráfico chico, sin librerías. */
export function sparklinePath(
  points: FollowerPoint[],
  width: number,
  height: number
): string {
  if (points.length < 2) return "";
  const valores = points.map((p) => p.total);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  // Si no hubo cambios, una línea al medio en vez de una división por cero.
  const rango = max - min || 1;

  return points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - ((p.total - min) / rango) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export { parseDateKey };
