import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { getContentTypeDefinition } from "@/lib/content-types";
import { formatRate, readMetrics } from "@/lib/metrics";
import { formatCount } from "@/lib/page-types";
import {
  followerSeries,
  ownerClient,
  recentActivity,
  relativeTime,
  sparklinePath,
  topContent,
  workspaceStats,
} from "@/lib/workspace";
import { cn } from "@/lib/utils";
import type { ContentItem, Page } from "@/lib/types";

interface WorkspaceDashboardProps {
  pages: Page[];
  /** Todo el contenido del workspace, de todos los clientes. */
  items: ContentItem[];
}

/**
 * La portada del workspace: en qué anda todo, de un vistazo.
 *
 * Deliberadamente corto. La idea es entender el estado en unos segundos, no
 * tener un tablero de control que hay que estudiar: los números que importan
 * arriba, una curva, lo que mejor rindió y lo último que tocaste.
 */
export function WorkspaceDashboard({ pages, items }: WorkspaceDashboardProps) {
  const contenidos = items.filter((i) => i.type === "contenido");
  const mediciones = items.filter((i) => i.type === "medicion");

  const stats = workspaceStats(contenidos, mediciones);
  const serie = followerSeries(mediciones);
  const mejores = topContent(contenidos);
  const reciente = recentActivity(items);

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
          Tu contenido
        </h2>

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
          <Cifra
            label="Seguidores"
            valor={stats.followers !== null ? formatCount(stats.followers) : null}
            pie={
              stats.growth !== null && stats.growth !== 0
                ? `${stats.growth > 0 ? "+" : ""}${formatCount(stats.growth)} desde la primera medición`
                : undefined
            }
            positivo={stats.growth !== null && stats.growth > 0}
            vacio="Anotá seguidores en una plataforma"
          />
          <Cifra
            label="Publicados"
            valor={stats.published > 0 ? String(stats.published) : null}
            vacio="Nada publicado todavía"
          />
          <Cifra
            label="Visualizaciones"
            valor={stats.views !== null ? formatCount(stats.views) : null}
            vacio="Sin métricas cargadas"
          />
          <Cifra
            label="Engagement"
            valor={formatRate(stats.engagementRate)}
            destacada
            vacio="Sin métricas cargadas"
          />
          <Cifra
            label="Seguidores generados"
            valor={
              stats.newFollowers !== null
                ? `+${formatCount(stats.newFollowers)}`
                : null
            }
            vacio="Sin métricas cargadas"
          />
          <Cifra
            label="En proceso"
            valor={stats.inProgress > 0 ? String(stats.inProgress) : null}
            vacio="Nada en el horno"
          />
        </div>
      </section>

      {serie.length > 1 && <Evolucion serie={serie} />}

      <section>
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
          Lo que mejor funcionó
        </h2>

        {mejores.length === 0 ? (
          <Vacio>
            Cuando publiques algo y le cargues las métricas, acá vas a ver qué
            funcionó mejor.
          </Vacio>
        ) : (
          <div className="flex flex-col gap-1.5">
            {mejores.map((c, i) => {
              const m = readMetrics(c);
              const cliente = ownerClient(pages, c.pageId);
              return (
                <Link
                  key={c.id}
                  href={`/c/${c.id}`}
                  className={cn(
                    "group panel-interactive flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-3.5 py-2.5",
                    i === 0 && "border-accent/40 bg-accent/[0.06]"
                  )}
                >
                  {i === 0 && <span className="shrink-0 text-[13px]">🏆</span>}
                  <span className="min-w-0 basis-full truncate text-sm text-ink-2 transition-colors group-hover:text-ink sm:basis-0 sm:flex-1">
                    {c.title || "Sin título"}
                  </span>
                  {cliente && (
                    <span className="shrink-0 rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[11px] text-ink-3">
                      {cliente.title}
                    </span>
                  )}
                  {m.views !== null && (
                    <span className="shrink-0 font-mono text-[11px] text-ink-2">
                      {formatCount(m.views)}
                    </span>
                  )}
                  <span className="shrink-0 font-mono text-[11px] text-accent">
                    {formatRate(m.engagementRate)}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
          Actividad reciente
        </h2>

        {reciente.length === 0 ? (
          <Vacio>Todavía no hay nada cargado en el workspace.</Vacio>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {reciente.map((item) => {
              const definition = getContentTypeDefinition(item.type);
              const cliente = ownerClient(pages, item.pageId);
              return (
                <li key={item.id}>
                  <Link
                    href={definition.hasBody ? `/c/${item.id}` : `/p/${item.pageId}`}
                    className="group flex flex-wrap items-center gap-x-2.5 gap-y-0.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.04]"
                  >
                    <span className="shrink-0 text-[13px] leading-none">
                      {definition.icon}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] text-ink-2 transition-colors group-hover:text-ink">
                      {item.title || `${definition.label} sin título`}
                    </span>
                    {cliente && (
                      <span className="shrink-0 text-[11px] text-ink-3">
                        {cliente.title}
                      </span>
                    )}
                    <span className="shrink-0 font-mono text-[10px] tracking-wider text-ink-3">
                      {relativeTime(item.updatedAt)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Un número grande con su etiqueta. Sin dato muestra por qué falta. */
function Cifra({
  label,
  valor,
  pie,
  destacada,
  positivo,
  vacio,
}: {
  label: string;
  valor: string | null;
  pie?: string;
  destacada?: boolean;
  positivo?: boolean;
  vacio: string;
}) {
  return (
    <div className="panel rounded-2xl px-3.5 py-3">
      <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
        {label}
      </span>
      <span
        className={cn(
          // El tamaño cede en pantallas chicas: un número de seis cifras a
          // 30px no entra en media tarjeta de teléfono.
          "mt-1 block truncate font-display text-2xl leading-tight font-semibold tracking-tight sm:text-3xl",
          valor === null ? "text-ink-3" : destacada ? "text-accent" : "text-ink"
        )}
      >
        {valor ?? "—"}
      </span>
      {valor === null ? (
        <span className="mt-0.5 block text-[11px] leading-snug text-ink-3">
          {vacio}
        </span>
      ) : (
        pie && (
          <span
            className={cn(
              "mt-0.5 flex items-center gap-1 text-[11px] leading-snug",
              positivo ? "text-emerald-300" : "text-ink-3"
            )}
          >
            {positivo && <TrendingUp size={11} className="shrink-0" />}
            {pie}
          </span>
        )
      )}
    </div>
  );
}

/** La curva de seguidores. Un solo gráfico, y bien simple. */
function Evolucion({
  serie,
}: {
  serie: { date: string; total: number }[];
}) {
  const W = 600;
  const H = 80;
  const linea = sparklinePath(serie, W, H);
  const primero = serie[0];
  const ultimo = serie[serie.length - 1];

  return (
    <section>
      <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
        Evolución de seguidores
      </h2>

      <div className="panel rounded-2xl px-4 py-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-20 w-full"
          preserveAspectRatio="none"
          role="img"
          aria-label={`De ${primero.total} a ${ultimo.total} seguidores`}
        >
          {/* El relleno da la sensación de volumen sin agregar otro gráfico. */}
          <path
            d={`${linea} L${W},${H} L0,${H} Z`}
            fill="var(--color-accent)"
            opacity="0.12"
          />
          <path
            d={linea}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <div className="mt-2 flex items-baseline justify-between font-mono text-[10px] tracking-wider text-ink-3">
          <span>{primero.date}</span>
          <span className="text-ink-2">{formatCount(ultimo.total)}</span>
          <span>{ultimo.date}</span>
        </div>
      </div>
    </section>
  );
}

function Vacio({ children }: { children: React.ReactNode }) {
  return (
    <p className="panel rounded-2xl px-5 py-7 text-center text-sm leading-relaxed text-ink-2">
      {children}
    </p>
  );
}
