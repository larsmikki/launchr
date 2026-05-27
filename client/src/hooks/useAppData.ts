import { useCallback, useMemo, type Dispatch, type SetStateAction } from 'react';
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

function applyStateAction<T>(current: T | undefined, fallback: T, action: SetStateAction<T>) {
  return typeof action === 'function'
    ? (action as (prev: T) => T)(current ?? fallback)
    : action;
}

export function useAppData() {
  const queryClient = useQueryClient();

  const { data: shortcuts = [] } = useQuery({
    queryKey: queryKeys.shortcuts,
    queryFn: api.getShortcuts,
  });

  const { data: groups = [] } = useQuery({
    queryKey: queryKeys.groups,
    queryFn: api.getGroups,
  });

  const { data: storedSettings } = useQuery({
    queryKey: queryKeys.settings,
    queryFn: api.getSettings,
  });

  const settings = useMemo(
    () => ({ ...DEFAULT_SETTINGS, ...storedSettings }),
    [storedSettings],
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

  const fetchShortcuts = useCallback(() => queryClient.fetchQuery({
    queryKey: queryKeys.shortcuts,
    queryFn: api.getShortcuts,
    staleTime: 0,
  }), [queryClient]);

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
    reload,
    fetchShortcuts,
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
