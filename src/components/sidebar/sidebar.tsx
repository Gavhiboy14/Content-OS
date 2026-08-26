"use client";

import { useMemo, useState, useTransition, Fragment } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Plus, Sparkles } from "lucide-react";
import { GENERAL_VIEW_TYPES } from "@/lib/content-types";
import { useActiveContentPageId } from "@/components/active-page-context";
import { PageTreeItem } from "@/components/sidebar/page-tree-item";
import { PageFormModal, type PageFormValues } from "@/components/sidebar/page-form-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import {
  createPageAction,
  deletePageAction,
  movePageAction,
  updatePageAction,
} from "@/app/actions";
import type { PageNode } from "@/lib/types";

interface SidebarProps {
  tree: PageNode[];
}

type ModalState =
  | { type: "create"; parentId: string | null; section: string | null }
  | { type: "edit"; page: PageNode }
  | { type: "delete"; page: PageNode }
  | null;

interface DropTarget {
  parentId: string | null;
  section: string | null;
  index: number;
}

function findAncestorIds(nodes: PageNode[], targetId: string, trail: string[] = []): string[] | null {
  for (const node of nodes) {
    if (node.id === targetId) return trail;
    const found = findAncestorIds(node.children, targetId, [...trail, node.id]);
    if (found) return found;
  }
  return null;
}

export function Sidebar({ tree }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [manualExpanded, setManualExpanded] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<ModalState>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  // En /p/[id] la página activa sale de la URL. En /c/[id] (un guión, una
  // idea) la URL no tiene el id de la página — lo avisa el contenido mismo
  // vía contexto, para que el sidebar no pierda la marca de "acá estás".
  const activeContentPageId = useActiveContentPageId();
  const activePageId = pathname?.startsWith("/p/")
    ? pathname.slice(3)
    : pathname?.startsWith("/c/")
      ? activeContentPageId
      : null;
  const isCalendar = pathname === "/calendario";

  // En pantallas chicas el sidebar se desliza sobre el contenido. Se cierra
  // solo al navegar a otra página.
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMobileOpen(false);
  }

  // La rama activa siempre se ve expandida, sin necesidad de guardar ese
  // estado: se recalcula en cada render a partir de la página actual.
  const expanded = useMemo(() => {
    const activeAncestors = activePageId ? findAncestorIds(tree, activePageId) ?? [] : [];
    return new Set([...manualExpanded, ...activeAncestors]);
  }, [manualExpanded, tree, activePageId]);

  const { ungrouped, sections } = useMemo(() => {
    const ungroupedNodes = tree
      .filter((n) => !n.section)
      .sort((a, b) => a.position - b.position);

    const bySection = new Map<string, PageNode[]>();
    tree.forEach((n) => {
      if (!n.section) return;
      if (!bySection.has(n.section)) bySection.set(n.section, []);
      bySection.get(n.section)!.push(n);
    });
    bySection.forEach((nodes) => nodes.sort((a, b) => a.position - b.position));

    const sectionEntries = Array.from(bySection.entries()).sort(([, a], [, b]) => {
      const aMin = Math.min(...a.map((n) => new Date(n.createdAt).getTime()));
      const bMin = Math.min(...b.map((n) => new Date(n.createdAt).getTime()));
      return aMin - bMin;
    });

    return { ungrouped: ungroupedNodes, sections: sectionEntries };
  }, [tree]);

  const sectionSuggestions = useMemo(() => sections.map(([name]) => name), [sections]);

  function toggleExpand(id: string) {
    setManualExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleDrop(nodes: PageNode[], parentId: string | null, section: string | null) {
    if (!dragId || !dropTarget) return;
    const fromIndex = nodes.findIndex((n) => n.id === dragId);
    let targetIndex = dropTarget.index;
    if (fromIndex !== -1 && fromIndex < targetIndex) targetIndex -= 1;
    startTransition(() => {
      movePageAction(dragId, parentId, section, targetIndex);
    });
    setDragId(null);
    setDropTarget(null);
  }

  function renderNodes(nodes: PageNode[], depth: number, parentId: string | null, section: string | null) {
    return (
      <div
        onDragOver={(e) => {
          if (!dragId) return;
          e.preventDefault();
          if (nodes.length === 0) setDropTarget({ parentId, section, index: 0 });
        }}
        onDrop={(e) => {
          e.preventDefault();
          handleDrop(nodes, parentId, section);
        }}
      >
        {nodes.map((node, index) => (
          <Fragment key={node.id}>
            {dropTarget?.parentId === parentId &&
              dropTarget?.section === section &&
              dropTarget?.index === index && <DropLine depth={depth} />}
            <div
              onDragOver={(e) => {
                if (!dragId || dragId === node.id) return;
                e.preventDefault();
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                const before = e.clientY < rect.top + rect.height / 2;
                setDropTarget({ parentId, section, index: before ? index : index + 1 });
              }}
            >
              <PageTreeItem
                node={node}
                depth={depth}
                isActive={node.id === activePageId}
                isExpanded={expanded.has(node.id)}
                hasChildren={node.children.length > 0}
                onToggleExpand={() => toggleExpand(node.id)}
                onAddChild={() => setModal({ type: "create", parentId: node.id, section: null })}
                onEdit={() => setModal({ type: "edit", page: node })}
                onDelete={() => setModal({ type: "delete", page: node })}
                draggable
                onDragStart={(e) => {
                  e.stopPropagation();
                  setDragId(node.id);
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setDropTarget(null);
                }}
              />
            </div>
            {expanded.has(node.id) && node.children.length > 0 &&
              renderNodes(node.children, depth + 1, node.id, null)}
          </Fragment>
        ))}
        {dropTarget?.parentId === parentId &&
          dropTarget?.section === section &&
          dropTarget?.index === nodes.length && <DropLine depth={depth} />}
      </div>
    );
  }

  /**
   * Los datos de cliente se guardan siempre, incluso vacíos: mandar la clave
   * en blanco es lo que permite borrar una bajada que ya no va.
   */
  function clientProperties(values: PageFormValues): Record<string, string> {
    return {
      subtitle: values.subtitle,
      clientStatus: values.clientStatus,
      goal: values.goal,
      audience: values.audience,
      tone: values.tone,
      ctaExamples: values.ctaExamples,
      pillars: values.pillars,
      offer: values.offer,
      avoid: values.avoid,
    };
  }

  /** Igual que arriba, pero para el perfil de un referente de competencia. */
  function competitorProperties(values: PageFormValues): Record<string, string> {
    return {
      refHandle: values.refHandle,
      refNiche: values.refNiche,
      refFollowers: values.refFollowers,
      refUrl: values.refUrl,
      refNotes: values.refNotes,
    };
  }

  async function handleCreateSubmit(values: PageFormValues) {
    if (!modal || modal.type !== "create") return;
    const esRaiz = modal.parentId === null;
    const page = await createPageAction({
      title: values.title,
      icon: values.icon,
      parentId: modal.parentId,
      section: esRaiz ? values.section || null : null,
      type: !esRaiz && values.isCompetitor ? "referente" : undefined,
      properties: esRaiz
        ? clientProperties(values)
        : values.isCompetitor
          ? competitorProperties(values)
          : undefined,
    });
    startTransition(() => router.push(`/p/${page.id}`));
  }

  async function handleEditSubmit(values: PageFormValues) {
    if (!modal || modal.type !== "edit") return;
    const esRaiz = modal.page.parentId === null;
    await updatePageAction(modal.page.id, {
      title: values.title,
      icon: values.icon,
      section: esRaiz ? values.section || null : undefined,
      // En una página hija se fija el tipo siempre, para que destildar el
      // casillero también revierta la página a normal.
      type: !esRaiz ? (values.isCompetitor ? "referente" : "page") : undefined,
      properties: esRaiz
        ? clientProperties(values)
        : values.isCompetitor
          ? competitorProperties(values)
          : undefined,
    });
  }

  async function handleDeleteConfirm() {
    if (!modal || modal.type !== "delete") return;
    const wasActive = modal.page.id === activePageId;
    await deletePageAction(modal.page.id);
    if (wasActive) router.push("/");
  }

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="btn-soft fixed top-3 left-3 z-30 rounded-xl p-2.5 lg:hidden"
        aria-label="Abrir menú"
      >
        <Menu size={16} />
      </button>

      <div
        onClick={() => setMobileOpen(false)}
        className={cn(
          "fixed inset-0 z-30 bg-black/60 backdrop-blur-sm transition-opacity duration-200 lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        aria-hidden="true"
      />

      <aside
        data-open={mobileOpen}
        className={cn(
          "panel sidebar-slide z-40 flex w-64 shrink-0 flex-col overflow-hidden rounded-2xl",
          "max-lg:fixed max-lg:inset-y-3 max-lg:left-3",
          "lg:sticky lg:top-3 lg:my-3 lg:ml-3 lg:h-[calc(100vh-1.5rem)]"
        )}
      >
      <div className="flex items-center gap-2.5 px-4 pt-5 pb-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-accent ring-1 ring-inset ring-accent/25">
          <Sparkles size={13} />
        </div>
        <span className="font-display text-[15px] font-medium tracking-tight text-ink">
          Content OS
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-3">
        {/* Las páginas sueltas, sin grupo propio: el escritorio del workspace. */}
        {ungrouped.length > 0 && (
          <div className="mb-6">
            <TituloDeGrupo>Workspace</TituloDeGrupo>
            {renderNodes(ungrouped, 0, null, null)}
          </div>
        )}

        {/* Los grupos son los que vos creaste: CLIENTES, RECURSOS, los que
            sean. No hay ninguno escrito en el código. */}
        {sections.map(([sectionName, nodes]) => (
          <div key={sectionName} className="mb-6">
            <TituloDeGrupo
              onAdd={() =>
                setModal({ type: "create", parentId: null, section: sectionName })
              }
              addLabel={`Nueva página en ${sectionName}`}
            >
              {sectionName}
            </TituloDeGrupo>
            {renderNodes(nodes, 0, null, sectionName)}
          </div>
        ))}

        {/* Vistas que cruzan todos los clientes. Los tipos salen del registro:
            marcar uno con `showInGeneral` lo hace aparecer acá. */}
        <div>
          <TituloDeGrupo>General</TituloDeGrupo>
          <VistaGlobal href="/calendario" icon="📅" activa={isCalendar}>
            Calendario
          </VistaGlobal>
          {GENERAL_VIEW_TYPES.map((d) => (
            <VistaGlobal
              key={d.type}
              href={`/t/${d.type}`}
              icon={d.icon}
              activa={pathname === `/t/${d.type}`}
            >
              {d.labelPlural}
            </VistaGlobal>
          ))}
        </div>

        {/* Los módulos son una app aparte que vive en /modulos.html: guarda
            en el navegador y no comparte datos con esto. Va en su propio
            grupo para que se note que es otra cosa, y con un <a> normal
            porque no es una ruta de esta aplicación. */}
        <div className="mt-6">
          <TituloDeGrupo>Módulos</TituloDeGrupo>
          <a
            href="/modulos.html"
            className="relative flex items-center gap-2.5 rounded-lg py-1.5 pr-1 pl-[26px] text-[13px] text-ink-2 transition-colors duration-200 hover:bg-white/[0.06] hover:text-ink"
          >
            <span className="shrink-0 text-[13px] leading-none">🧩</span>
            Abrir módulos
          </a>
        </div>
      </nav>

      <div className="border-t border-line p-2">
        <button
          onClick={() => setModal({ type: "create", parentId: null, section: null })}
          className={cn(
            "btn-soft flex w-full items-center justify-center gap-2 rounded-xl px-2.5 py-2 text-[13px]"
          )}
        >
          <Plus size={14} />
          Nueva página
        </button>
      </div>

      <PageFormModal
        open={modal?.type === "create"}
        onClose={() => setModal(null)}
        onSubmit={handleCreateSubmit}
        title={modal?.type === "create" && modal.parentId ? "Nueva subpágina" : "Nueva página"}
        submitLabel="Crear"
        showSection={modal?.type === "create" && modal.parentId === null}
        sectionSuggestions={sectionSuggestions}
        initialValues={
          modal?.type === "create" ? { section: modal.section ?? "" } : undefined
        }
      />

      <PageFormModal
        open={modal?.type === "edit"}
        onClose={() => setModal(null)}
        onSubmit={handleEditSubmit}
        title="Editar página"
        submitLabel="Guardar"
        showSection={modal?.type === "edit" && modal.page.parentId === null}
        sectionSuggestions={sectionSuggestions}
        initialValues={
          modal?.type === "edit"
            ? {
                title: modal.page.title,
                icon: modal.page.icon ?? "📄",
                section: modal.page.section ?? "",
                subtitle: modal.page.properties.subtitle ?? "",
                clientStatus: modal.page.properties.clientStatus ?? "",
                goal: modal.page.properties.goal ?? "",
                audience: modal.page.properties.audience ?? "",
                tone: modal.page.properties.tone ?? "",
                ctaExamples: modal.page.properties.ctaExamples ?? "",
                pillars: modal.page.properties.pillars ?? "",
                offer: modal.page.properties.offer ?? "",
                avoid: modal.page.properties.avoid ?? "",
                isCompetitor: modal.page.type === "referente",
                refHandle: modal.page.properties.refHandle ?? "",
                refNiche: modal.page.properties.refNiche ?? "",
                refFollowers: modal.page.properties.refFollowers ?? "",
                refUrl: modal.page.properties.refUrl ?? "",
                refNotes: modal.page.properties.refNotes ?? "",
              }
            : undefined
        }
      />

      <ConfirmDialog
        open={modal?.type === "delete"}
        onClose={() => setModal(null)}
        onConfirm={handleDeleteConfirm}
        title="Eliminar página"
        description={
          modal?.type === "delete"
            ? `¿Eliminar "${modal.page.title}"${modal.page.children.length > 0 ? " y todas sus subpáginas" : ""}? Esta acción no se puede deshacer.`
            : ""
        }
      />
      </aside>
    </>
  );
}

/** Encabezado de un grupo del sidebar, con su "+" opcional. */
function TituloDeGrupo({
  children,
  onAdd,
  addLabel,
}: {
  children: React.ReactNode;
  onAdd?: () => void;
  addLabel?: string;
}) {
  return (
    <div className="group/section mb-1.5 flex items-center justify-between px-2.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
        {children}
      </span>
      {onAdd && (
        <button
          onClick={onAdd}
          className="tap-target rounded text-ink-3 transition hover:text-ink pointer-fine:opacity-0 pointer-fine:focus-visible:opacity-100 pointer-fine:group-hover/section:opacity-100"
          aria-label={addLabel}
        >
          <Plus size={12} />
        </button>
      )}
    </div>
  );
}

/** Un acceso del grupo General: no es una página del árbol, es una vista. */
function VistaGlobal({
  href,
  icon,
  activa,
  children,
}: {
  href: string;
  icon: string;
  activa: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-2.5 rounded-lg py-1.5 pr-1 pl-[26px] text-[13px] transition-colors duration-200",
        activa
          ? "nav-active font-medium text-ink"
          : "text-ink-2 hover:bg-white/[0.06] hover:text-ink"
      )}
    >
      {activa && (
        <span
          aria-hidden="true"
          className="nav-marker absolute top-1/2 left-0 h-4 w-[2px] -translate-y-1/2 rounded-r-full"
        />
      )}
      <span className="shrink-0 text-[13px] leading-none">{icon}</span>
      {children}
    </Link>
  );
}

function DropLine({ depth }: { depth: number }) {
  return (
    <div
      className="my-px h-[2px] rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)]"
      style={{ marginLeft: 6 + depth * 13 }}
    />
  );
}
