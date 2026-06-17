import { useCallback, useMemo, useRef, type Dispatch, type SetStateAction } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Shortcut, Group, Settings } from '@/types';
import { api } from '@/api';

export const DEFAULT_SETTINGS: Settings = {
  layout_mode: 'row',
  column_extra_width: '0',
  link_target: '_blank',
};

const queryKeys = {
  shortcuts: ['shortcuts'] as const,
  groups: ['groups'] as const,
  settings: ['settings'] as const,
};

// The server fetches favicons in the background after a shortcut is created.
// Poll the shortcuts list until the icon arrives, giving up after the server's
// own fetch timeouts would have expired.
const FAVICON_POLL_INTERVAL_MS = 2000;
const FAVICON_POLL_TIMEOUT_MS = 20000;

function applyStateAction<T>(current: T | undefined, fallback: T, action: SetStateAction<T>) {
  return typeof action === 'function'
    ? (action as (prev: T) => T)(current ?? fallback)
    : action;
}

export function useAppData() {
  const queryClient = useQueryClient();

  // Shortcut ids awaiting a background favicon, mapped to a give-up deadline
  const pendingFavicons = useRef(new Map<number, number>());

  const shortcutsQuery = useQuery({
    queryKey: queryKeys.shortcuts,
    queryFn: api.getShortcuts,
    refetchInterval: (query) => {
      const pending = pendingFavicons.current;
      if (pending.size === 0) return false;
      const now = Date.now();
      const data = query.state.data;
      for (const [id, deadline] of pending) {
        const shortcut = data?.find((s) => s.id === id);
        if (!shortcut || shortcut.favicon_cached || now > deadline) pending.delete(id);
      }
      return pending.size > 0 ? FAVICON_POLL_INTERVAL_MS : false;
    },
  });

  const groupsQuery = useQuery({
    queryKey: queryKeys.groups,
    queryFn: api.getGroups,
  });

  const settingsQuery = useQuery({
    queryKey: queryKeys.settings,
    queryFn: api.getSettings,
  });

  const { data: shortcuts = [] } = shortcutsQuery;
  const { data: groups = [] } = groupsQuery;

  const isLoading = shortcutsQuery.isPending || groupsQuery.isPending || settingsQuery.isPending;

  const settings = useMemo(
    () => ({ ...DEFAULT_SETTINGS, ...settingsQuery.data }),
    [settingsQuery.data],
  );

  const setShortcuts = useCallback<Dispatch<SetStateAction<Shortcut[]>>>((action) => {
    queryClient.setQueryData<Shortcut[]>(queryKeys.shortcuts, (current) =>
      applyStateAction(current, [], action)
    );
  }, [queryClient]);

  const setGroups = useCallback<Dispatch<SetStateAction<Group[]>>>((action) => {
    queryClient.setQueryData<Group[]>(queryKeys.groups, (current) =>
      applyStateAction(current, [], action)
    );
  }, [queryClient]);

  const reload = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.shortcuts }),
      queryClient.invalidateQueries({ queryKey: queryKeys.groups }),
      queryClient.invalidateQueries({ queryKey: queryKeys.settings }),
    ]);
  }, [queryClient]);

  const createGroupMutation = useMutation({
    mutationFn: api.createGroup,
    onSuccess: (group) => {
      setGroups((current) => [...current, group]);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.groups });
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Group> }) => api.updateGroup(id, data),
    onSuccess: (group) => {
      setGroups((current) => current.map((item) => item.id === group.id ? group : item));
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: api.deleteGroup,
    onSuccess: (_, id) => {
      setGroups((current) => current.filter((group) => group.id !== id));
      setShortcuts((current) => current.filter((shortcut) => shortcut.group_id !== id));
    },
  });

  const createShortcutMutation = useMutation({
    mutationFn: api.createShortcut,
    onSuccess: (shortcut) => {
      setShortcuts((current) => [...current, shortcut]);
      if (!shortcut.favicon_cached) {
        pendingFavicons.current.set(shortcut.id, Date.now() + FAVICON_POLL_TIMEOUT_MS);
      }
    },
    onSettled: () => {
      // Kicks off a refetch, which re-evaluates refetchInterval and starts polling
      void queryClient.invalidateQueries({ queryKey: queryKeys.shortcuts });
    },
  });

  const updateShortcutMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Shortcut> }) => api.updateShortcut(id, data),
    onSuccess: (shortcut) => {
      setShortcuts((current) => current.map((item) => item.id === shortcut.id ? shortcut : item));
    },
  });

  const deleteShortcutMutation = useMutation({
    mutationFn: api.deleteShortcut,
    onSuccess: (_, id) => {
      setShortcuts((current) => current.filter((shortcut) => shortcut.id !== id));
    },
  });

  const refreshFaviconMutation = useMutation({
    mutationFn: api.refreshFavicon,
    onSuccess: (shortcut) => {
      setShortcuts((current) => current.map((item) => item.id === shortcut.id ? shortcut : item));
    },
  });

  const uploadIconMutation = useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => api.uploadIcon(id, file),
    onSuccess: (shortcut) => {
      setShortcuts((current) => current.map((item) => item.id === shortcut.id ? shortcut : item));
    },
  });

  const removeIconMutation = useMutation({
    mutationFn: api.removeIcon,
    onSuccess: (shortcut) => {
      setShortcuts((current) => current.map((item) => item.id === shortcut.id ? shortcut : item));
    },
  });

  const updateLayoutMutation = useMutation({
    mutationFn: api.updateLayout,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.shortcuts });
      void queryClient.invalidateQueries({ queryKey: queryKeys.groups });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: api.updateSettings,
    onSuccess: (_, data) => {
      const definedSettings = Object.fromEntries(
        Object.entries(data).filter(([, value]) => value !== undefined)
      ) as Partial<Settings>;
      queryClient.setQueryData<Settings>(queryKeys.settings, (current) => ({
        ...DEFAULT_SETTINGS,
        ...current,
        ...definedSettings,
      } as Settings));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.settings });
    },
  });

  const ensureGroup = useCallback(async (): Promise<number> => {
    if (groups.length > 0) return groups[0].id;
    const group = await createGroupMutation.mutateAsync({ title: 'Links', color: '#e0e7ff' });
    return group.id;
  }, [createGroupMutation, groups]);

  return {
    shortcuts,
    setShortcuts,
    groups,
    setGroups,
    settings,
    isLoading,
    reload,
    ensureGroup,
    createGroup: createGroupMutation.mutateAsync,
    updateGroup: updateGroupMutation.mutateAsync,
    deleteGroup: deleteGroupMutation.mutateAsync,
    createShortcut: createShortcutMutation.mutateAsync,
    updateShortcut: updateShortcutMutation.mutateAsync,
    deleteShortcut: deleteShortcutMutation.mutateAsync,
    refreshFavicon: refreshFaviconMutation.mutateAsync,
    uploadIcon: uploadIconMutation.mutateAsync,
    removeIcon: removeIconMutation.mutateAsync,
    updateLayout: updateLayoutMutation.mutateAsync,
    updateSettings: updateSettingsMutation.mutateAsync,
  };
}
