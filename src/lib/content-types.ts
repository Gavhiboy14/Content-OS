import type { BlockType } from "@/lib/types";
import type { PropertyDefinition } from "@/lib/page-types";

/**
 * REGISTRO DE TIPOS DE CONTENIDO
 *
 * Un contenido es algo que Gabriel produce y que vive dentro de una página:
 * un guión, una idea, un hook. No es un lugar al que se navega desde el
 * sidebar — eso son las páginas.
 *
 * Para sumar un tipo nuevo alcanza con agregar una entrada acá: la interfaz
 * lo ofrece al crear, lo agrupa en su sección y le arma su vista. No hace
 * falta tocar la base de datos.
 *
 * `hasBody` distingue dos familias:
 *   - true  → se escribe (guión, idea, publicación): tiene página propia con editor
 *   - false → es una línea (hook, tarea, referencia): se edita en la lista misma
 */
export interface ContentTypeDefinition {
  type: string;
  /** Nombre en singular. */
  label: string;
  /** Nombre en plural, para los títulos de sección: "Guiones". */
  labelPlural: string;
  /** "Nuevo guión" / "Nueva idea" — con el género ya resuelto, no se arma en runtime. */
  newLabel: string;
  icon: string;
  hint: string;
  hasBody: boolean;
  properties: PropertyDefinition[];
  /** Bloques con los que nace el cuerpo, si tiene. */
  template: { type: BlockType; text: string }[];
  /** Texto del estado vacío de su sección. */
  emptyLabel: string;
  /** Placeholder del campo, para los tipos que se editan en línea (hasBody: false). */
  inlinePlaceholder?: string;
  /**
   * Propiedades iniciales que no son chips — por ejemplo el `done` de una
   * tarea, que se maneja con una casilla y no con un menú.
   */
  initialProperties?: Record<string, string>;
  /**
   * Cuándo un contenido de este tipo cuenta como "sin terminar", para el
   * resumen de la página. Se declara acá y no en la página para que sumar un
   * tipo nuevo no obligue a tocar la lógica del contador.
   * Sin esto, el tipo nunca cuenta como pendiente (un hook o una referencia
   * no se "terminan").
   */
  pendingWhen?: { key: string; values: string[] };
  /**
   * Si tiene una vista propia en el grupo GENERAL del sidebar, que cruza
   * todos los clientes. Se declara acá para no tener una lista de tipos
   * escrita a mano dentro del sidebar.
   */
  showInGeneral?: boolean;
}

/**
 * El ciclo de vida de una pieza de contenido: nace como idea, se escribe,
 * se graba y sale. Es una sola ficha que avanza — no cuatro cosas distintas.
 * Las métricas recién tienen sentido en el último paso.
 */
const ESTADO_CONTENIDO: PropertyDefinition = {
  kind: "select",
  key: "status",
  label: "Estado",
  defaultValue: "idea",
  options: [
    { value: "idea", label: "Idea", className: "bg-white/[0.10] text-ink-2" },
    { value: "guion", label: "Guión", className: "bg-sky-400/20 text-sky-200" },
    { value: "grabado", label: "Grabado", className: "bg-violet-400/20 text-violet-200" },
    { value: "publicado", label: "Publicado", className: "bg-emerald-400/20 text-emerald-200" },
  ],
};

/** Qué formato tiene la pieza. Cambia cómo se lee una métrica. */
const FORMATO: PropertyDefinition = {
  kind: "select",
  key: "format",
  label: "Formato",
  defaultValue: "reel",
  options: [
    { value: "reel", label: "Reel", className: "bg-white/[0.10] text-ink-2" },
    { value: "carrusel", label: "Carrusel", className: "bg-white/[0.10] text-ink-2" },
    { value: "historia", label: "Historia", className: "bg-white/[0.10] text-ink-2" },
    { value: "post", label: "Post", className: "bg-white/[0.10] text-ink-2" },
    { value: "video_largo", label: "Video largo", className: "bg-white/[0.10] text-ink-2" },
  ],
};

/**
 * El gancho que finalmente se usó. El guión completo sigue en el cuerpo,
 * donde podés escribir todos los ganchos y rehooks que quieras probar: este
 * campo marca cuál quedó, para poder compararlo después con los números.
 */
const HOOK: PropertyDefinition = {
  kind: "text",
  key: "hook",
  label: "Hook elegido",
  placeholder: "El gancho que finalmente usaste…",
};

const CTA: PropertyDefinition = {
  kind: "text",
  key: "cta",
  label: "CTA",
  placeholder: "Qué le pedís al que mira…",
};

const TRANSCRIPCION: PropertyDefinition = {
  kind: "text",
  key: "transcript",
  label: "Transcripción",
  placeholder: "Lo que quedó dicho en el video…",
};

/** Las métricas de una pieza ya publicada. Se cargan a mano. */
const METRICAS: PropertyDefinition[] = [
  { kind: "number", key: "views", label: "Visualizaciones", group: "Métricas" },
  { kind: "number", key: "likes", label: "Likes", group: "Métricas" },
  { kind: "number", key: "comments", label: "Comentarios", group: "Métricas" },
  { kind: "number", key: "shares", label: "Compartidos", group: "Métricas" },
  { kind: "number", key: "saves", label: "Guardados", group: "Métricas" },
  {
    kind: "number",
    key: "newFollowers",
    label: "Seguidores generados",
    group: "Métricas",
  },
  {
    kind: "number",
    key: "retention",
    label: "Retención",
    unit: "%",
    group: "Métricas",
  },
];

/** Notas al pie de cualquier contenido: contexto que no va en el cuerpo. */
const NOTAS: PropertyDefinition = {
  kind: "text",
  key: "notes",
  label: "Notas",
  placeholder: "Contexto, recordatorios, lo que sea…",
};

const ESTADO_IDEA: PropertyDefinition = {
  kind: "select",
  key: "status",
  label: "Estado",
  defaultValue: "nueva",
  options: [
    { value: "nueva", label: "Nueva", className: "bg-white/[0.10] text-ink-2" },
    { value: "en_desarrollo", label: "En desarrollo", className: "bg-sky-400/20 text-sky-200" },
    { value: "descartada", label: "Descartada", className: "bg-white/[0.06] text-ink-3" },
  ],
};

const ESTADO_PUBLICACION: PropertyDefinition = {
  kind: "select",
  key: "status",
  label: "Estado",
  defaultValue: "programada",
  options: [
    { value: "programada", label: "Programada", className: "bg-white/[0.10] text-ink-2" },
    { value: "publicada", label: "Publicada", className: "bg-emerald-400/20 text-emerald-200" },
  ],
};

const ESTADO_TAREA: PropertyDefinition = {
  kind: "select",
  key: "status",
  label: "Estado",
  defaultValue: "pendiente",
  options: [
    { value: "pendiente", label: "Pendiente", className: "bg-white/[0.10] text-ink-2" },
    { value: "en_progreso", label: "En progreso", className: "bg-sky-400/20 text-sky-200" },
    { value: "completada", label: "Completada", className: "bg-emerald-400/20 text-emerald-200" },
  ],
};

/**
 * En qué parte del embudo juega un contenido: si va a buscar gente nueva
 * (TOFU), a calentar a quien ya te sigue (MOFU) o a cerrar la venta (BOFU).
 *
 * Nace "sin definir" a propósito: es preferible que un guión no tenga etapa
 * a que arranque con una que quizás no le corresponde. Mientras esté sin
 * definir, la fila no muestra ninguna etiqueta.
 */
const EMBUDO: PropertyDefinition = {
  kind: "select",
  key: "funnel",
  label: "Embudo",
  defaultValue: "sin_definir",
  options: [
    {
      value: "sin_definir",
      label: "Sin definir",
      className: "bg-white/[0.06] text-ink-3",
    },
    {
      value: "tofu",
      label: "TOFU",
      className: "bg-cyan-400/20 text-cyan-200",
    },
    {
      value: "mofu",
      label: "MOFU",
      className: "bg-amber-400/20 text-amber-200",
    },
    {
      value: "bofu",
      label: "BOFU",
      className: "bg-emerald-400/20 text-emerald-200",
    },
  ],
};

/**
 * Qué tan urgente es algo. Se usa para ordenar las listas de gestión: lo alto
 * primero. Nace en "media" para que nada quede sin prioridad por olvido.
 */
const PRIORIDAD: PropertyDefinition = {
  kind: "select",
  key: "priority",
  label: "Prioridad",
  defaultValue: "media",
  options: [
    { value: "alta", label: "Alta", className: "bg-rose-400/20 text-rose-200" },
    { value: "media", label: "Media", className: "bg-white/[0.10] text-ink-2" },
    { value: "baja", label: "Baja", className: "bg-white/[0.06] text-ink-3" },
  ],
};

/** El link de una referencia o de una publicación que ya salió. */
const ENLACE: PropertyDefinition = {
  kind: "url",
  key: "url",
  label: "Enlace",
  placeholder: "https://…",
};

/**
 * La fecha en que algo sale o vence. Es la que alimenta el calendario:
 * cualquier tipo que la lleve aparece ahí, sin tocar la vista.
 */
const FECHA: PropertyDefinition = {
  kind: "date",
  key: "date",
  label: "Fecha",
};

export const CONTENT_TYPE_DEFINITIONS: ContentTypeDefinition[] = [
  {
    type: "contenido",
    label: "Contenido",
    labelPlural: "Contenidos",
    newLabel: "Nuevo contenido",
    icon: "🎬",
    hint: "Una pieza, de la idea a los números",
    hasBody: true,
    properties: [
      ESTADO_CONTENIDO,
      FORMATO,
      EMBUDO,
      FECHA,
      HOOK,
      CTA,
      ENLACE,
      TRANSCRIPCION,
      NOTAS,
      ...METRICAS,
    ],
    template: [
      { type: "heading", text: "Gancho" },
      { type: "text", text: "" },
      { type: "heading", text: "Desarrollo" },
      { type: "text", text: "" },
      { type: "heading", text: "CTA" },
      { type: "text", text: "" },
    ],
    emptyLabel: "Todavía no hay contenido acá",
    // Sigue en juego hasta que sale publicado.
    pendingWhen: { key: "status", values: ["idea", "guion", "grabado"] },
  },
  {
    type: "idea",
    label: "Idea",
    labelPlural: "Ideas",
    newLabel: "Nueva idea",
    icon: "💡",
    hint: "Algo para desarrollar después",
    hasBody: true,
    properties: [ESTADO_IDEA, PRIORIDAD, NOTAS],
    template: [],
    emptyLabel: "Ninguna idea anotada todavía",
    // Una idea descartada ya no está pendiente: se decidió.
    pendingWhen: { key: "status", values: ["nueva", "en_desarrollo"] },
    showInGeneral: true,
  },
  {
    type: "hook",
    label: "Hook",
    labelPlural: "Hooks",
    newLabel: "Nuevo hook",
    icon: "🪝",
    hint: "Un gancho para reutilizar",
    hasBody: false,
    properties: [],
    template: [],
    emptyLabel: "Sin hooks guardados",
    inlinePlaceholder: "Escribí el gancho…",
  },
  {
    type: "referencia",
    label: "Referencia",
    labelPlural: "Referencias",
    newLabel: "Nueva referencia",
    icon: "📚",
    hint: "Un link que querés tener a mano",
    hasBody: false,
    // El título es el nombre que le ponés; el enlace va aparte, así podés
    // llamarla "Reel de Fulano" en vez de mostrar una URL larga.
    properties: [ENLACE, NOTAS],
    template: [],
    emptyLabel: "Sin referencias guardadas",
    inlinePlaceholder: "Nombre de la referencia…",
    showInGeneral: true,
  },
  {
    type: "publicacion",
    label: "Publicación",
    labelPlural: "Publicaciones",
    newLabel: "Nueva publicación",
    icon: "📸",
    hint: "Algo que ya salió o está programado",
    hasBody: true,
    properties: [ESTADO_PUBLICACION, FECHA, ENLACE, NOTAS],
    template: [],
    emptyLabel: "Nada publicado ni programado",
    pendingWhen: { key: "status", values: ["programada"] },
  },
  {
    type: "tarea",
    label: "Tarea",
    labelPlural: "Tareas",
    newLabel: "Nueva tarea",
    icon: "✅",
    hint: "Algo pendiente de hacer",
    hasBody: false,
    properties: [ESTADO_TAREA, PRIORIDAD, FECHA, NOTAS],
    template: [],
    emptyLabel: "Sin tareas pendientes",
    inlinePlaceholder: "¿Qué hay que hacer?",
    pendingWhen: { key: "status", values: ["pendiente", "en_progreso"] },
    showInGeneral: true,
  },
  {
    type: "medicion",
    label: "Medición",
    labelPlural: "Mediciones",
    newLabel: "Anotar seguidores",
    icon: "📈",
    hint: "Cuántos seguidores tenés hoy",
    hasBody: false,
    // Vive dentro de la plataforma que mide: los seguidores de Instagram son
    // los de Instagram. La plataforma es la página, como en todo lo demás.
    properties: [
      FECHA,
      { kind: "number", key: "followers", label: "Seguidores" },
      NOTAS,
    ],
    template: [],
    emptyLabel: "Todavía no anotaste seguidores acá",
    inlinePlaceholder: "Ej: seguidores del 1 de septiembre…",
  },
  {
    type: "nota",
    label: "Nota",
    labelPlural: "Notas",
    newLabel: "Nueva nota",
    icon: "📝",
    hint: "Algo que querés dejar escrito",
    hasBody: true,
    // Una nota no tiene estado ni vence: es texto y ya. Su valor está en el
    // cuerpo, no en sus campos.
    properties: [],
    template: [],
    emptyLabel: "Sin notas todavía",
  },
];

const BY_TYPE = new Map(CONTENT_TYPE_DEFINITIONS.map((d) => [d.type, d]));

export function getContentTypeDefinition(type: string): ContentTypeDefinition {
  return BY_TYPE.get(type) ?? CONTENT_TYPE_DEFINITIONS[0];
}

export function isKnownContentType(type: string): boolean {
  return BY_TYPE.has(type);
}

/** Propiedades iniciales de un contenido según su tipo. */
export function defaultContentProperties(type: string): Record<string, string> {
  const definition = getContentTypeDefinition(type);
  const props: Record<string, string> = { ...definition.initialProperties };
  definition.properties.forEach((p) => {
    // Las fechas nacen vacías: no hay una por defecto sensata.
    if (p.kind === "select") props[p.key] = p.defaultValue;
  });
  return props;
}

/** Los tipos de contenido que llevan fecha, y por lo tanto entran al calendario. */
export const DATED_CONTENT_TYPES = CONTENT_TYPE_DEFINITIONS.filter((d) =>
  d.properties.some((p) => p.kind === "date")
).map((d) => d.type);

/** ¿Este contenido todavía está sin terminar? */
export function isPendingContent(
  type: string,
  properties: Record<string, string>
): boolean {
  const rule = getContentTypeDefinition(type).pendingWhen;
  if (!rule) return false;
  return rule.values.includes(properties[rule.key]);
}

/** El orden en que se muestran las secciones dentro de una página. */
export const CONTENT_TYPE_ORDER = CONTENT_TYPE_DEFINITIONS.map((d) => d.type);

/** Los tipos con vista global propia, para el grupo GENERAL del sidebar. */
export const GENERAL_VIEW_TYPES = CONTENT_TYPE_DEFINITIONS.filter(
  (d) => d.showInGeneral
);
