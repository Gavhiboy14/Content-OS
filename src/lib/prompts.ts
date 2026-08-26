import { getContentTypeDefinition } from "@/lib/content-types";
import { formatRate, isPublished, readMetrics } from "@/lib/metrics";
import {
  findSelectProperty,
  formatCount,
  getPropertyOption,
  parsePillars,
} from "@/lib/page-types";
import { topContent } from "@/lib/workspace";
import type { ContentItem, Page } from "@/lib/types";

/**
 * ARMADOR DE PROMPTS
 *
 * No hay integración de IA acá: estas funciones arman un texto largo, listo
 * para copiar y pegar donde el cliente use su IA de preferencia. Es la misma
 * idea que traía el prototipo — la diferencia es que ahora el contexto sale
 * de los datos reales (el cliente y su contenido), no de una copia aparte.
 */

/**
 * El bloque de marca que se repite en todos los prompts de este cliente.
 * `extra` suma lo que mejor le funcionó y muestras de su propio banco, para
 * que la IA copie su voz en vez de escribir genérico — es opcional porque
 * el prompt de métricas no lo necesita (ya lista todo lo publicado aparte).
 */
function ctxMarca(
  client: Page,
  extra?: {
    top?: ContentItem[];
    bancoHooks?: string[];
    bancoMuestra?: string[];
  }
): string {
  const p = client.properties;
  const pilares = parsePillars(p.pillars);

  const lineas = [
    "## MI MARCA",
    `- Cuenta / marca: ${client.title}`,
    p.subtitle && `- Rubro: ${p.subtitle}`,
    p.audience && `- A quién le hablo: ${p.audience}`,
    p.tone && `- Tono de voz: ${p.tone}`,
    p.ctaExamples && `- CTAs que uso: ${p.ctaExamples}`,
    pilares.length > 0 && `- Pilares de contenido: ${pilares.join(", ")}`,
    p.offer && `- Qué vendo / a dónde quiero llevar: ${p.offer}`,
    p.avoid && `- Nunca hacer: ${p.avoid}`,
  ].filter((l): l is string => Boolean(l));

  const bloques = [lineas.join("\n")];

  if (extra?.top && extra.top.length > 0) {
    const filas = extra.top.map((it) => {
      const m = readMetrics(it);
      const hook = it.properties.hook ? ` — hook: "${it.properties.hook}"` : "";
      return `- "${it.title || "sin título"}" — ${formatCount(m.views ?? 0)} views, ${formatRate(m.engagementRate) ?? "—"} de engagement${hook}`;
    });
    bloques.push("", "## LO QUE MEJOR ME FUNCIONÓ (datos reales)", filas.join("\n"));
  }

  if (extra?.bancoHooks && extra.bancoHooks.length > 0) {
    bloques.push(
      "",
      "## HOOKS DE MI BANCO (para que copies mi voz)",
      extra.bancoHooks.map((h) => `- ${h}`).join("\n")
    );
  }

  if (extra?.bancoMuestra && extra.bancoMuestra.length > 0) {
    bloques.push(
      "",
      "## MUESTRA DE MI FORMA DE ESCRIBIR",
      extra.bancoMuestra.map((s) => `---\n${s}`).join("\n")
    );
  }

  return bloques.join("\n");
}

/**
 * El prompt para analizar las métricas de un cliente: qué funcionó, por qué,
 * y qué probar. Usa todo lo publicado, ordenado por visualizaciones.
 */
export function buildMetricsPrompt(client: Page, items: ContentItem[]): string {
  const definition = getContentTypeDefinition("contenido");
  const formatoDef = findSelectProperty(definition.properties, "format");

  const publicados = [...items]
    .filter(isPublished)
    .sort((a, b) => (readMetrics(b).views ?? 0) - (readMetrics(a).views ?? 0));

  const filas = publicados.map((it) => {
    const m = readMetrics(it);
    const formato = formatoDef
      ? getPropertyOption(formatoDef, it.properties.format).label
      : it.properties.format;

    const partes = [
      `${it.properties.date ?? "sin fecha"} | "${it.title || "sin título"}"`,
      formato,
      it.properties.pillar && `pilar: ${it.properties.pillar}`,
      `views ${m.views ?? 0}`,
      `likes ${m.likes ?? 0}`,
      `comentarios ${m.comments ?? 0}`,
      `guardados ${m.saves ?? 0}`,
      `compartidos ${m.shares ?? 0}`,
      `seguidores +${m.newFollowers ?? 0}`,
      `engagement ${formatRate(m.engagementRate) ?? "—"}`,
      it.properties.hook && `hook: "${it.properties.hook}"`,
    ].filter((p): p is string => Boolean(p));

    return `- ${partes.join(" | ")}`;
  });

  return [
    "Actuá como analista de contenido para redes sociales. Hablás en español rioplatense, sos concreto y no te vas por las ramas.",
    "",
    ctxMarca(client),
    "",
    "## MIS PUBLICACIONES (datos reales)",
    filas.join("\n"),
    "",
    "## LO QUE NECESITO",
    "1. **Qué está funcionando y por qué.** Buscá el patrón real (formato, pilar, tipo de hook, día). No me digas obviedades: mostrame la correlación con los números.",
    "2. **Qué está tirando el alcance para abajo.** Sé honesto aunque duela.",
    "3. **El ranking de mis 3 mejores hooks** y qué tienen en común a nivel estructura.",
    "4. **5 hipótesis concretas para testear** las próximas 2 semanas, cada una con: qué cambio, en qué contenido lo aplico y qué métrica debería moverse.",
    "5. **Una alerta**: si algún número está inflado o no es señal real de nada (views sin guardados, por ejemplo), decímelo.",
    "",
    "Formato: directo, con bullets. Nada de introducciones ni resúmenes de lo que te pedí.",
  ].join("\n");
}

/** Los objetivos que puede pedir el generador del banco de ideas. */
export const IDEA_OBJECTIVES = [
  { value: "ideas", label: "20 ideas de contenido" },
  { value: "reel", label: "Guion de Reel (30-45 seg)" },
  { value: "carrusel", label: "Carrusel de 8 slides" },
  { value: "caption", label: "Caption + CTA" },
  { value: "hooks", label: "30 hooks nuevos" },
  { value: "serie", label: "Serie de 5 videos encadenados" },
] as const;

export type IdeaObjective = (typeof IDEA_OBJECTIVES)[number]["value"];

const PEDIDOS: Record<IdeaObjective, string[]> = {
  ideas: [
    "Dame **20 ideas de contenido** listas para producir.",
    "Cada una con: (a) el hook textual de los primeros 3 segundos, (b) el ángulo en una línea, (c) el formato que le va mejor (Reel / carrusel / historia) y por qué, (d) el CTA.",
    "Ordenalas de mayor a menor potencial de alcance y decime en una línea qué criterio usaste.",
  ],
  reel: [
    "Escribí **un guion de Reel de 30 a 45 segundos**, listo para grabar.",
    "Estructura: hook (0-3s) → tensión (3-10s) → desarrollo con 2 o 3 puntos concretos → giro o dato que no esperaban → CTA.",
    "Marcá los tiempos. Frases cortas, para decir en voz alta. Indicá aparte: qué se ve en pantalla en cada bloque y qué texto va sobreimpreso.",
    "Al final dame 3 hooks alternativos para testear el mismo guion.",
  ],
  carrusel: [
    "Escribí **un carrusel de 8 slides**.",
    "Slide 1: la portada, con el gancho que frena el scroll (máximo 9 palabras).",
    "Slides 2 a 7: una idea por slide, título corto arriba y 2 o 3 líneas abajo. Nada de párrafos.",
    "Slide 8: cierre + CTA.",
    "Después del carrusel, escribí el caption completo y 5 hashtags que use gente de mi nicho, no genéricos.",
  ],
  caption: [
    "Escribí **3 captions** para el mismo contenido, con enfoques distintos: uno que abre en historia, uno que abre con dato, uno que abre con pregunta incómoda.",
    "Cada uno: primera línea que corte el scroll, cuerpo de 4 a 8 líneas con espacios, y CTA claro.",
    "Decime cuál elegirías y por qué.",
  ],
  hooks: [
    "Dame **30 hooks nuevos**, numerados, sin explicaciones.",
    "Repartilos en 6 estructuras (5 de cada una): la objeción, el error caro, el número raro, la contra-opinión, el «si te pasa X», y la confesión.",
    "Que suenen a mí: mismo largo y mismo ritmo que los hooks míos que te pasé.",
    "Al final marcá los 5 que apostarías y por qué.",
  ],
  serie: [
    "Diseñá **una serie de 5 videos encadenados** sobre el mismo tema, uno por día.",
    "Cada video: hook, promesa, contenido en 3 bullets, y el gancho que lleva al siguiente.",
    "El video 5 tiene que cerrar hacia mi oferta sin sonar a venta desesperada.",
    "Dame también el orden de publicación y qué historia va acompañando cada día.",
  ],
};

/**
 * El prompt del generador de ideas: pide guiones, hooks o carruseles con la
 * voz del cliente adentro — su marca, lo que mejor le funcionó, y muestras
 * de su propio banco.
 */
export function buildIdeasPrompt(
  client: Page,
  objetivo: IdeaObjective,
  pilar: string,
  tema: string,
  contenidos: ContentItem[],
  bancoHooks: string[],
  bancoMuestra: string[]
): string {
  const top = topContent(contenidos, 4);

  // Se arma como una lista de secciones ya completas, no de líneas sueltas
  // con "" de separador: mezclar las dos cosas y después hacer
  // `.filter(Boolean)` para sacar el pilar o el tema vacíos también se
  // comía los separadores (una cadena vacía es falsy igual que ellos), y el
  // prompt salía con los títulos pegados al texto de arriba.
  const contexto = [
    pilar && `## PILAR A TRABAJAR\n${pilar}`,
    tema && `## TEMA / DISPARADOR\n${tema}`,
  ].filter((s): s is string => Boolean(s));

  const reglas = [
    "## REGLAS",
    "- Español rioplatense. Voseo. Nada de \"tú\" ni de neutro.",
    "- Frases cortas. Si una frase no se puede decir de una respiración, cortala.",
    '- Prohibido: "en este video te voy a contar", "sin más preámbulos", "la clave está en", emojis decorativos.',
    "- Cada pieza tiene que poder existir sola: nada de \"como te dije en el post anterior\".",
    client.properties.avoid && `- ${client.properties.avoid}`,
    "- No me expliques lo que vas a hacer. Hacelo.",
  ]
    .filter((s): s is string => Boolean(s))
    .join("\n");

  const secciones = [
    "Actuá como el guionista de mi cuenta. Ya conocés mi voz: escribí como escribo yo, no como escribe una IA.",
    ctxMarca(client, { top, bancoHooks, bancoMuestra }),
    ...contexto,
    "## LO QUE NECESITO\n" + (PEDIDOS[objetivo] ?? PEDIDOS.ideas).join("\n"),
    reglas,
  ];

  return secciones.join("\n\n");
}

/**
 * El prompt del espía de competencia: le pasa a la IA los videos cargados de
 * un referente, ordenados por vistas, para que saque el patrón y lo traduzca
 * a mi marca. Mismo patrón de "secciones ya completas" que arriba, para no
 * repetir el bug de los separadores pegados.
 */
export function buildPatternPrompt(
  client: Page,
  referente: Page,
  videos: ContentItem[]
): string {
  const definition = getContentTypeDefinition("video_referente");
  const formatoDef = findSelectProperty(definition.properties, "format");
  const anguloDef = findSelectProperty(definition.properties, "angle");

  const ordenados = [...videos].sort(
    (a, b) => (Number(b.properties.views) || 0) - (Number(a.properties.views) || 0)
  );

  const filas = ordenados.map((v) => {
    const formato = formatoDef
      ? getPropertyOption(formatoDef, v.properties.format).label
      : v.properties.format;
    const angulo = anguloDef
      ? getPropertyOption(anguloDef, v.properties.angle).label
      : v.properties.angle;

    const partes = [
      `"${v.title || "sin hook"}"`,
      formato,
      angulo,
      v.properties.duration && v.properties.duration,
      `views ${formatCount(Number(v.properties.views) || 0)}`,
      `likes ${formatCount(Number(v.properties.likes) || 0)}`,
      `comentarios ${formatCount(Number(v.properties.comments) || 0)}`,
      v.properties.notes && `nota: ${v.properties.notes}`,
    ].filter((p): p is string => Boolean(p));

    return `- ${partes.join(" | ")}`;
  });

  const p = referente.properties;
  const perfilReferente = [
    "## EL REFERENTE",
    `- Cuenta: ${p.refHandle || referente.title}`,
    p.refNiche && `- Nicho / ángulo: ${p.refNiche}`,
    p.refFollowers && `- Seguidores: ${p.refFollowers}`,
    p.refNotes && `- Por qué lo sigo: ${p.refNotes}`,
  ]
    .filter((l): l is string => Boolean(l))
    .join("\n");

  const secciones = [
    "Actuá como estratega de contenido. Analizás la cuenta de un referente de mi nicho para sacar el patrón que le funciona, no para copiarlo — para traducirlo a mi marca.",
    ctxMarca(client),
    perfilReferente,
    "## SUS VIDEOS (ordenados por vistas)\n" + filas.join("\n"),
    [
      "## LO QUE NECESITO",
      "1. **El patrón o la fórmula** que se repite en sus videos que mejor funcionan: estructura, ritmo, tipo de hook.",
      "2. **Los 3 ángulos que más le rinden** y por qué creés que conectan con su audiencia.",
      "3. **Qué de todo esto se traduce a mi marca** — con mi voz, mi tono y mis pilares, no copiado.",
      "4. **10 hooks nuevos** para mí, inspirados en su patrón pero en mi voz.",
      "5. **El hueco que él no ocupa**: un ángulo o formato que le funcionaría a su audiencia y que él no está tocando, que yo sí podría ocupar.",
    ].join("\n"),
  ];

  return secciones.join("\n\n");
}
