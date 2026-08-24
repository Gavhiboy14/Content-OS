import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getContentInDateRange } from "@/lib/content";
import { getContentTypeDefinition } from "@/lib/content-types";
import { getAllPages } from "@/lib/pages";
import {
  findSelectProperty,
  getPropertyOption,
  parseDateKey,
  toDateKey,
} from "@/lib/page-types";
import { cn } from "@/lib/utils";
import type { ContentItem, Page } from "@/lib/types";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/** Mes que se está mirando, sacado de ?mes=AAAA-MM. Por defecto, el actual. */
function resolveMonth(raw: string | undefined): { year: number; month: number } {
  const match = raw ? /^(\d{4})-(\d{2})$/.exec(raw) : null;
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    if (month >= 0 && month <= 11) return { year, month };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

/**
 * Las celdas de la grilla, empezando en lunes. Incluye días del mes anterior
 * y siguiente para completar las semanas.
 */
function buildGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  // getDay(): 0 = domingo. Se corre para que la semana arranque el lunes.
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);

  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }
  // La sexta fila sólo se dibuja si el mes realmente la usa.
  const last = cells[35];
  return last.getMonth() === month ? cells : cells.slice(0, 35);
}

export default async function CalendarView({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const { year, month } = resolveMonth(mes);

  const cells = buildGrid(year, month);
  const [items, pages] = await Promise.all([
    getContentInDateRange(toDateKey(cells[0]), toDateKey(cells[cells.length - 1])),
    getAllPages(),
  ]);

  const pageById = new Map(pages.map((p) => [p.id, p]));

  const byDate = new Map<string, ContentItem[]>();
  items.forEach((item) => {
    const key = item.properties.date;
    if (!key) return;
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(item);
  });

  // La grilla arrastra días del mes anterior y siguiente para completar las
  // semanas, pero el resumen habla del mes que se está mirando.
  const mesPrefijo = monthKey(year, month);
  const delMes = items.filter((i) => i.properties.date?.startsWith(mesPrefijo));

  // Para la agenda: sólo los días del mes que tienen algo, en orden.
  const diasConContenido = [...byDate.entries()]
    .filter(([key]) => key.startsWith(mesPrefijo))
    .sort(([a], [b]) => a.localeCompare(b));

  const prev = month === 0 ? monthKey(year - 1, 11) : monthKey(year, month - 1);
  const next = month === 11 ? monthKey(year + 1, 0) : monthKey(year, month + 1);
  const hoyKey = toDateKey(new Date());

  const nombreMes = new Date(year, month, 1).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-6xl px-6 pt-20 pb-16 sm:px-10 lg:px-12 lg:pt-12">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-ink first-letter:uppercase">
              {nombreMes}
            </h1>
            <p className="mt-1.5 font-mono text-[11px] tracking-wider text-ink-3">
              {delMes.length === 0
                ? "Nada agendado este mes"
                : `${delMes.length} ${delMes.length === 1 ? "cosa agendada" : "cosas agendadas"}`}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <Link
              href={`/calendario?mes=${prev}`}
              className="btn-soft rounded-xl p-2"
              aria-label="Mes anterior"
            >
              <ChevronLeft size={15} />
            </Link>
            <Link href="/calendario" className="btn-soft rounded-xl px-3 py-2 text-[13px]">
              Hoy
            </Link>
            <Link
              href={`/calendario?mes=${next}`}
              className="btn-soft rounded-xl p-2"
              aria-label="Mes siguiente"
            >
              <ChevronRight size={15} />
            </Link>
          </div>
        </header>

        {/* Agenda: en pantalla angosta una celda mide ~40px y no entra ni el
            título. Se listan sólo los días que tienen algo, con el detalle
            completo. */}
        <ol className="flex flex-col gap-6 md:hidden">
          {diasConContenido.map(([key, delDia]) => {
            const date = parseDateKey(key);
            if (!date) return null;
            const esHoy = key === hoyKey;

            return (
              <li key={key}>
                <h2
                  className={cn(
                    "mb-2 flex items-baseline gap-2 font-mono text-[11px] uppercase tracking-[0.14em]",
                    esHoy ? "text-accent" : "text-ink-3"
                  )}
                >
                  <span className="font-display text-2xl font-semibold tracking-tight">
                    {date.getDate()}
                  </span>
                  {date.toLocaleDateString("es-AR", { weekday: "long" })}
                  {esHoy && <span className="text-accent">· hoy</span>}
                </h2>

                <div className="flex flex-col gap-1.5">
                  {delDia.map((item) => (
                    <AgendaItem
                      key={item.id}
                      item={item}
                      page={pageById.get(item.pageId)}
                    />
                  ))}
                </div>
              </li>
            );
          })}
        </ol>

        {/* Grilla mensual: desde tablet para arriba, donde el ancho alcanza. */}
        <div className="mb-2 hidden grid-cols-7 gap-1.5 md:grid">
          {DIAS.map((dia) => (
            <div
              key={dia}
              className="px-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3"
            >
              {dia}
            </div>
          ))}
        </div>

        <div className="hidden grid-cols-7 gap-1.5 md:grid">
          {cells.map((date) => {
            const key = toDateKey(date);
            const esDelMes = date.getMonth() === month;
            const esHoy = key === hoyKey;
            const delDia = byDate.get(key) ?? [];

            return (
              <div
                key={key}
                className={cn(
                  "panel min-h-24 rounded-xl p-1.5 transition-colors",
                  !esDelMes && "opacity-40",
                  esHoy && "border-accent/50"
                )}
              >
                <div
                  className={cn(
                    "mb-1 px-1 font-mono text-[11px]",
                    esHoy ? "font-semibold text-accent" : "text-ink-3"
                  )}
                >
                  {date.getDate()}
                </div>

                <div className="flex flex-col gap-1">
                  {delDia.map((item) => (
                    <DayItem
                      key={item.id}
                      item={item}
                      page={pageById.get(item.pageId)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {delMes.length === 0 && (
          <p className="mt-8 text-center text-sm text-ink-2">
            Poné una fecha a un guión, una publicación o una tarea y aparece acá.
          </p>
        )}
      </div>
    </main>
  );
}

/**
 * Fila de la agenda. Acá sí hay ancho, así que muestra todo lo que sirve para
 * decidir sin entrar: qué es, de qué cliente, y en qué estado está.
 */
function AgendaItem({
  item,
  page,
}: {
  item: ContentItem;
  page: Page | undefined;
}) {
  const definition = getContentTypeDefinition(item.type);
  const status = findSelectProperty(definition.properties, "status");
  const option = status
    ? getPropertyOption(status, item.properties.status)
    : null;

  return (
    <Link
      href={`/c/${item.id}`}
      className="panel-interactive flex items-start gap-3 rounded-xl px-3.5 py-3"
    >
      <span className="mt-px text-base leading-none">{definition.icon}</span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm text-ink">
          {item.title || <span className="text-ink-3">Sin título</span>}
        </span>
        {page && (
          <span className="mt-0.5 block font-mono text-[10px] tracking-wider text-ink-3">
            {page.title}
          </span>
        )}
      </span>

      {option && (
        <span
          className={cn(
            "shrink-0 rounded-md px-2 py-0.5 text-[11px]",
            option.className
          )}
        >
          {option.label}
        </span>
      )}
    </Link>
  );
}

function DayItem({ item, page }: { item: ContentItem; page: Page | undefined }) {
  const definition = getContentTypeDefinition(item.type);

  return (
    <Link
      href={`/c/${item.id}`}
      title={`${item.title || "Sin título"}${page ? ` · ${page.title}` : ""}`}
      className="flex items-center gap-1 rounded-lg bg-white/[0.06] px-1.5 py-1 text-[11px] leading-tight text-ink-2 transition-colors hover:bg-white/[0.12] hover:text-ink"
    >
      <span className="shrink-0 text-[10px] leading-none">{definition.icon}</span>
      <span className="min-w-0 flex-1 truncate">
        {item.title || "Sin título"}
      </span>
    </Link>
  );
}
