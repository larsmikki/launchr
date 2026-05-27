import { useCallback, useState, type ReactNode } from 'react';
import { PageActionsContext } from '@/contexts/PageActionsContext';

export function PageActionsProvider({ children }: { children: ReactNode }) {
  const [onNewLink, setOnNewLinkState] = useState<(() => void) | null>(null);
  const setOnNewLink = useCallback((fn: (() => void) | null) => {
    setOnNewLinkState(() => fn);
  }, []);

  const [onEditLayout, setOnEditLayoutState] = useState<(() => void) | null>(null);
  const [editLayoutActive, setEditLayoutActive] = useState(false);
  const setOnEditLayout = useCallback((fn: (() => void) | null, active: boolean) => {
    setOnEditLayoutState(() => fn);
    setEditLayoutActive(active);
  }, []);

  return (
    <PageActionsContext.Provider value={{ onNewLink, setOnNewLink, onEditLayout, editLayoutActive, setOnEditLayout }}>
      {children}
    </PageActionsContext.Provider>
  );
}
