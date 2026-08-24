"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

interface ActivePageContextValue {
  contentPageId: string | null;
  setContentPageId: (id: string | null) => void;
}

const ActivePageContext = createContext<ActivePageContextValue | null>(null);

/**
 * Puente entre las vistas de contenido (/c/[id], que no forman parte del
 * árbol del sidebar) y el sidebar mismo. Sin esto, el sidebar no tiene forma
 * de saber a qué página pertenece un guión o una idea que se está mirando,
 * y pierde la marca de "acá estás parado" justo cuando más se usa: mientras
 * se escribe.
 */
export function ActivePageProvider({ children }: { children: React.ReactNode }) {
  const [contentPageId, setContentPageId] = useState<string | null>(null);
  const value = useMemo(
    () => ({ contentPageId, setContentPageId }),
    [contentPageId]
  );

  return (
    <ActivePageContext.Provider value={value}>
      {children}
    </ActivePageContext.Provider>
  );
}

/** Usado por el sidebar para saber qué página resaltar mientras se ve un contenido. */
export function useActiveContentPageId(): string | null {
  return useContext(ActivePageContext)?.contentPageId ?? null;
}

/** Usado por una vista de contenido para marcar su página como activa. */
export function useMarkActivePageFromContent(pageId: string) {
  const setContentPageId = useContext(ActivePageContext)?.setContentPageId;
  useEffect(() => {
    setContentPageId?.(pageId);
  }, [setContentPageId, pageId]);
}
