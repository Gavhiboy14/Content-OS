import {
  CONTENT_TYPE_ORDER,
  isPendingContent,
} from "@/lib/content-types";
import { toDateKey } from "@/lib/page-types";
import type { ContentItem } from "@/lib/types";

/**
 * RESUMEN DE UN CLIENTE
 *
 * Lo que alimenta el dashboard: cuánto hay de cada tipo, cuánto quedó sin
 * terminar y qué vence hoy. Se calcula siempre a partir del contenido real,
 * nunca de un número guardado — así no puede quedar desactualizado.
 *
 * Todo lo de acá trabaja sobre una lista ya leída de la base, que incluye el
 * contenido del cliente y el de sus subpáginas.
 */

export interface TypeSummary {
  type: string;
  total: number;
  /** Sin terminar, según la regla que declara cada tipo en su registro. */
  pending: number;
  /** Con fecha de hoy y todavía sin terminar. */
  today: number;
}

export function summarizeByType(
  items: ContentItem[],
  now: Date = new Date()
): TypeSummary[] {
  const hoy = toDateKey(now);
  const porTipo = new Map<string, TypeSummary>();

  for (const item of items) {
    let s = porTipo.get(item.type);
    if (!s) {
      s = { type: item.type, total: 0, pending: 0, today: 0 };
      porTipo.set(item.type, s);
    }
    s.total += 1;
    if (isPendingContent(item.type, item.properties)) {
      s.pending += 1;
      if (item.properties.date === hoy) s.today += 1;
    }
  }

  // Se ordenan como los define el registro, para que las secciones no bailen
  // de posición según qué se cargó primero.
  return CONTENT_TYPE_ORDER.map((t) => porTipo.get(t)).filter(
    (s): s is TypeSummary => s !== undefined
  );
}

/** Cuántos contenidos quedaron sin terminar, de cualquier tipo. */
export function countPending(items: ContentItem[]): number {
  return items.filter((i) => isPendingContent(i.type, i.properties)).length;
}

/**
 * Avance del plan del mes: contenido que ya salió, con fecha dentro del mes
 * que se está mirando. Lo que cuenta es lo publicado, no lo creado.
 *
 * Antes miraba el tipo "publicación", que se retiró: ahora publicar es un
 * estado del contenido, no una ficha aparte.
 */
export function monthProgress(
  items: ContentItem[],
  now: Date = new Date()
): number {
  const prefijo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return items.filter(
    (i) =>
      i.type === "contenido" &&
      i.properties.status === "publicado" &&
      (i.properties.date ?? "").startsWith(prefijo)
  ).length;
}

/** "agosto", "septiembre" — para titular el bloque del plan. */
export function monthName(now: Date = new Date()): string {
  return now.toLocaleDateString("es-AR", { month: "long" });
}

/* ------------------------------------------------------------------ */
/* Agrupado por vencimiento                                            */
/* ------------------------------------------------------------------ */

export interface ContentGroup {
  key: string;
  label: string;
  items: ContentItem[];
}

/**
 * Ordena las tareas por cuándo hay que hacerlas. Lo vencido cae en "Hoy" a
 * propósito: si algo se pasó de fecha, lo último que conviene es esconderlo
 * en un grupo de "atrasadas" que no se mira.
 *
 * Lo que no tiene fecha va a "Próximamente": existe, pero no aprieta.
 */
export function groupByDue(
  items: ContentItem[],
  now: Date = new Date()
): ContentGroup[] {
  const hoy = toDateKey(now);
  const enUnaSemana = new Date(now);
  enUnaSemana.setDate(enUnaSemana.getDate() + 7);
  const limiteSemana = toDateKey(enUnaSemana);

  const grupos: ContentGroup[] = [
    { key: "hoy", label: "Hoy", items: [] },
    { key: "semana", label: "Esta semana", items: [] },
    { key: "proximamente", label: "Próximamente", items: [] },
    { key: "completadas", label: "Completadas", items: [] },
  ];
  const [hoyG, semanaG, proximoG, hechasG] = grupos;

  for (const item of items) {
    if (!isPendingContent(item.type, item.properties)) {
      hechasG.items.push(item);
      continue;
    }
    const fecha = item.properties.date;
    if (!fecha) proximoG.items.push(item);
    else if (fecha <= hoy) hoyG.items.push(item);
    else if (fecha <= limiteSemana) semanaG.items.push(item);
    else proximoG.items.push(item);
  }

  // Dentro de cada grupo, lo que vence antes va primero. Lo que no tiene
  // fecha queda al final.
  grupos.forEach((g) =>
    g.items.sort((a, b) =>
      (a.properties.date ?? "9999").localeCompare(b.properties.date ?? "9999")
    )
  );

  return grupos.filter((g) => g.items.length > 0);
}
