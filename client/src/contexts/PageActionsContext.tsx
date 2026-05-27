import { createContext, useContext } from 'react';

export type PageActionsValue = {
  onNewLink: (() => void) | null;
  setOnNewLink: (fn: (() => void) | null) => void;
  onEditLayout: (() => void) | null;
  editLayoutActive: boolean;
  setOnEditLayout: (fn: (() => void) | null, active: boolean) => void;
};

export const PageActionsContext = createContext<PageActionsValue>({
  onNewLink: null,
  setOnNewLink: () => {},
  onEditLayout: null,
  editLayoutActive: false,
  setOnEditLayout: () => {},
});

export function usePageActions() {
  return useContext(PageActionsContext);
}
