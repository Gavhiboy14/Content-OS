/**
 * PROPIEDADES
 *
 * Un campo con forma conocida que acompaña a un contenido: el estado de un
 * guión, la fecha en que sale, el link de una referencia. Todas se guardan
 * como texto dentro del `properties` (JSON) del contenido, así que sumar una
 * clase nueva de propiedad no necesita tocar la base de datos.
 *
 * Clases:
 *   select → se elige de una lista fija y se muestra como chip de color
 *   date   → una fecha, guardada como "AAAA-MM-DD"
 *   text   → texto libre de varias líneas (notas)
 *   url    → un enlace, con botón para abrirlo
 *
 * La plataforma NO es una propiedad: es la página donde vive el contenido
 * (Federico → TikTok → …). Tenerla en los dos lados permitía que se
 * contradijeran.
 */

export interface PropertyOption {
  value: string;
  label: string;
  /** Clases de color del chip. */
  className: string;
}

export interface SelectPropertyDefinition {
  kind: "select";
  key: string;
  label: string;
  options: PropertyOption[];
  defaultValue: string;
}

export interface DatePropertyDefinition {
  kind: "date";
  key: string;
  label: string;
}

export interface TextPropertyDefinition {
  kind: "text";
  key: string;
  label: string;
  placeholder?: string;
}

export interface UrlPropertyDefinition {
  kind: "url";
  key: string;
  label: string;
  placeholder?: string;
}

/**
 * Un número: visualizaciones, likes, seguidores. Se guarda como texto igual
 * que todo lo demás — `parseNumber` lo interpreta al leerlo.
 *
 * `unit` es lo que se muestra al lado ("%", por ejemplo) y `group` permite
 * juntar varios en una misma sección del formulario, para que las siete
 * métricas de un contenido no se mezclen con el resto de los campos.
 */
export interface NumberPropertyDefinition {
  kind: "number";
  key: string;
  label: string;
  unit?: string;
  group?: string;
  placeholder?: string;
}

export type PropertyDefinition =
  | SelectPropertyDefinition
  | DatePropertyDefinition
  | TextPropertyDefinition
  | UrlPropertyDefinition
  | NumberPropertyDefinition;

/**
 * Lee un número guardado. Devuelve null si está vacío o si quedó algo que no
 * es un número: así quien lo use sabe distinguir "cargué un cero" de "no
 * cargué nada", que para una métrica no es lo mismo.
 */
export function parseNumber(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null;
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Formatea un número grande de forma corta: 12500 → "12,5 mil". */
export function formatCount(n: number): string {
  if (Math.abs(n) >= 1_000_000) {
    return `${(n / 1_000_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })} M`;
  }
  if (Math.abs(n) >= 1_000) {
    return `${(n / 1_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })} mil`;
  }
  return n.toLocaleString("es-AR");
}

export function getPropertyOption(
  definition: SelectPropertyDefinition,
  value: string | undefined
): PropertyOption {
  return (
    definition.options.find((o) => o.value === value) ??
    definition.options.find((o) => o.value === definition.defaultValue) ??
    definition.options[0]
  );
}

/** La propiedad de estado de un tipo, si la tiene. */
export function findSelectProperty(
  properties: PropertyDefinition[],
  key: string
): SelectPropertyDefinition | undefined {
  return properties.find(
    (p): p is SelectPropertyDefinition => p.kind === "select" && p.key === key
  );
}

/* ------------------------------------------------------------------ */
/* Campos de una página de cliente                                     */
/* ------------------------------------------------------------------ */

/**
 * Datos propios de un cliente, guardados en `pages.properties`. Los tres son
 * opcionales: si están vacíos, el encabezado simplemente no los muestra. Así
 * una página que no es un cliente (un recurso, una plataforma) no se ve
 * obligada a llenarlos.
 */
export const CLIENT_SUBTITLE_KEY = "subtitle";
export const CLIENT_GOAL_KEY = "goal";

/**
 * La voz de marca de un cliente: lo que le da contexto a cualquier prompt de
 * IA que se arme sobre su contenido. Va por cliente y no una sola vez para
 * todo el workspace — Federico y Cliente 2 no suenan igual.
 */
export const CLIENT_BRAND_KEYS = {
  audience: "audience",
  tone: "tone",
  ctaExamples: "ctaExamples",
  pillars: "pillars",
  offer: "offer",
  avoid: "avoid",
} as const;

/** Los pilares de contenido, uno por línea en el campo, como lista limpia. */
export function parsePillars(value: string | undefined): string[] {
  return (value ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const CLIENT_STATUS: SelectPropertyDefinition = {
  kind: "select",
  key: "clientStatus",
  label: "Estado",
  defaultValue: "activo",
  options: [
    {
      value: "activo",
      label: "Cliente activo",
      className: "bg-emerald-400/20 text-emerald-200",
    },
    {
      value: "pausado",
      label: "En pausa",
      className: "bg-amber-400/20 text-amber-200",
    },
    {
      value: "archivado",
      label: "Archivado",
      className: "bg-white/[0.06] text-ink-3",
    },
  ],
};

/**
 * La meta mensual de contenido, como número. Devuelve null si no se cargó o
 * si quedó algo que no es un número positivo — así el bloque de plan sabe
 * que no tiene que dibujarse.
 */
export function parseGoal(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value.trim());
  return Number.isInteger(n) && n > 0 ? n : null;
}

/* ------------------------------------------------------------------ */
/* Fechas                                                              */
/* ------------------------------------------------------------------ */

/**
 * Las fechas se guardan como "AAAA-MM-DD" y se tratan siempre como día
 * calendario, sin hora ni zona horaria: si algo sale el 25, sale el 25 sin
 * importar desde dónde se mire. Por eso no se usa `new Date(texto)`, que
 * interpreta ese formato como UTC y puede correr un día.
 */
export function parseDateKey(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Convierte una fecha a la clave "AAAA-MM-DD" que se guarda. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
