import { useState, useEffect, useCallback } from 'react';
import { Shortcut, Group, Settings } from '@/types';
import { api } from '@/hooks/useApi';

export const DEFAULT_SETTINGS: Settings = {
  layout_mode: 'row',
  column_extra_width: '0',
  link_target: '_blank',
};

export function useAppData() {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  const reload = useCallback(async () => {
    const [s, g, st] = await Promise.all([
      api.getShortcuts(),
      api.getGroups(),
      api.getSettings(),
    ]);
    setShortcuts(s);
    setGroups(g);
    setSettings({ ...DEFAULT_SETTINGS, ...st });
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const ensureGroup = useCallback(async (): Promise<number> => {
    if (groups.length > 0) return groups[0].id;
    const g = await api.createGroup({ title: 'Links', color: '#e0e7ff' });
    setGroups(prev => [...prev, g]);
    return g.id;
  }, [groups, setGroups]);

  return { shortcuts, setShortcuts, groups, setGroups, settings, reload, ensureGroup };
}
