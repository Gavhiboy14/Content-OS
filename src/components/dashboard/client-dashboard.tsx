import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AddContentButton } from "@/components/content/add-content-button";
import type { Destino } from "@/components/content/content-form-modal";
import { getContentTypeDefinition } from "@/lib/content-types";
import {
  monthName,
  monthProgress,
  summarizeByType,
  type TypeSummary,
} from "@/lib/dashboard";
import {
  CLIENT_STATUS,
  getPropertyOption,
  parseGoal,
} from "@/lib/page-types";
import { cn } from "@/lib/utils";
import type { ContentItem, Page } from "@/lib/types";

interface ClientDashboardProps {
  page: Page;
  /** Subpáginas directas: las plataformas del cliente. */
  subpages: Page[];
  /** Cuántos contenidos tiene cada subpágina, contando lo suyo y lo de abajo. */
  childCounts: Map<string, number>;
  /** Todo el contenido del cliente, incluido el de sus subpáginas. */
  items: ContentItem[];
  destinos: Destino[];
}

/**
 * La portada de un cliente: un resumen y accesos, nunca las listas completas.
 * Cada bloque lleva a su propia página, que es donde se gestiona.
 */
export function ClientDashboard({
  page,
  subpages,
  childCounts,
  items,
  destinos,
}: ClientDashboardProps) {
  const resumen = summarizeByType(items);
  const subtitle = page.properties.subtitle?.trim();
  const estado = page.properties.clientStatus?.trim();
  const estadoOption = estado
    ? getPropertyOption(CLIENT_STATUS, estado)
    : null;
  const meta = parseGoal(page.properties.goal);
  const publicadas = monthProgress(items);

  return (
    <div className="flex flex-col gap-10">
      <header>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3.5">
            <span className="mt-0.5 text-3xl leading-none">{page.icon}</span>
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
                {page.title}
              </h1>

              {(subtitle || estadoOption) && (
                <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-2">
                  {subtitle && <span>{subtitle}</span>}
                  {subtitle && estadoOption && (
                    <span className="text-ink-3">·</span>
                  )}
                  {estadoOption && (
                    <span
                      className={cn(
                        "chip rounded-md px-2 py-0.5 text-[11px]",
                        estadoOption.className
                      )}
                    >
                      {estadoOption.label}
                    </span>
                  )}
                </p>
              )}

              <p className="mt-2 font-mono text-[11px] tracking-wider text-ink-3">
                <Resumen items={items} resumen={resumen} />
              </p>
            </div>
          </div>

          <AddContentButton
            pageId={page.id}
            pageTitle={page.title}
            destinos={destinos}
          />
        </div>
      </header>

      {subpages.length > 0 && (
        <Grupo titulo="Contenido">
          {subpages.map((child) => (
            <Bloque
              key={child.id}
              href={`/p/${child.id}`}
              icon={child.icon ?? "📄"}
              titulo={child.title}
              detalle={contarTexto(childCounts.get(child.id) ?? 0, "contenido", "contenidos")}
            />
          ))}
        </Grupo>
      )}

      {resumen.length > 0 && (
        <Grupo titulo="Gestión">
          {resumen.map((s) => {
            const definition = getContentTypeDefinition(s.type);
            return (
              <Bloque
                key={s.type}
                href={`/p/${page.id}/t/${s.type}`}
                icon={definition.icon}
                titulo={definition.labelPlural}
                detalle={detalleDeTipo(s)}
              />
            );
          })}
        </Grupo>
      )}

      {meta !== null && (
        <PlanDelMes hechas={publicadas} meta={meta} />
      )}
    </div>
  );
}

/** "5 contenidos · 2 sin terminar" — siempre calculado, nunca escrito a mano. */
function Resumen({
  items,
  resumen,
}: {
  items: ContentItem[];
  resumen: TypeSummary[];
}) {
  const pendientes = resumen.reduce((n, s) => n + s.pending, 0);
  return (
    <>
      {contarTexto(items.length, "contenido", "contenidos")}
      {pendientes > 0 && ` · ${pendientes} sin terminar`}
    </>
  );
}

/**
 * La bajada de cada bloque de gestión. Se arma con lo que declara el tipo en
 * su registro, así un tipo nuevo trae su bajada solo.
 */
function detalleDeTipo(s: TypeSummary): string {
  const definition = getContentTypeDefinition(s.type);
  const partes = [
    contarTexto(
      s.total,
      definition.label.toLowerCase(),
      definition.labelPlural.toLowerCase()
    ),
  ];
  if (s.pending > 0) partes.push(`${s.pending} sin terminar`);
  if (s.today > 0) partes.push(`${s.today} para hoy`);
  return partes.join(" · ");
}

function contarTexto(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

function Grupo({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
        {titulo}
      </h2>
      {/* Una sola columna en el teléfono: nada se comprime ni se sale de la
          pantalla. Recién en pantallas grandes pasa a dos. */}
      <div className="grid gap-2 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Bloque({
  href,
  icon,
  titulo,
  detalle,
}: {
  href: string;
  icon: string;
  titulo: string;
  detalle: string;
}) {
  return (
    <Link
      href={href}
      className="group panel-interactive flex items-center gap-3 rounded-xl px-3.5 py-3"
    >
      <span className="shrink-0 text-base leading-none">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-ink-2 transition-colors group-hover:text-ink">
          {titulo}
        </span>
        <span className="block truncate font-mono text-[10px] tracking-wider text-ink-3">
          {detalle}
        </span>
      </span>
      <ChevronRight
        size={14}
        className="shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}

/** Cuánto del plan del mes ya salió. Sólo aparece si el cliente tiene meta. */
function PlanDelMes({ hechas, meta }: { hechas: number; meta: number }) {
  const porcentaje = Math.min(100, Math.round((hechas / meta) * 100));

  return (
    <section className="panel rounded-2xl px-4 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        {/* En español los meses van en minúscula: "Plan de agosto". */}
        <h2 className="text-sm text-ink-2">📅 Plan de {monthName()}</h2>
        <p className="font-mono text-[11px] tracking-wider text-ink-3">
          {hechas} / {meta} publicados
        </p>
      </div>

      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]"
        role="progressbar"
        aria-valuenow={hechas}
        aria-valuemin={0}
        aria-valuemax={meta}
        aria-label="Avance del plan del mes"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500"
          style={{ width: `${porcentaje}%` }}
        />
      </div>
    </section>
  );
}
