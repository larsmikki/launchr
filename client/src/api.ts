// #11: Use proper types instead of any at the API boundary
import type { Shortcut, Group, Settings } from '@/types';

const BASE = '/api';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  getSettings: () => apiFetch<Settings>('/settings'),
  updateSettings: (data: Partial<Settings>) =>
    apiFetch<{ ok: boolean }>('/settings', { method: 'PUT', body: JSON.stringify(data) }),

  getGroups: () => apiFetch<Group[]>('/groups'),
  createGroup: (data: Partial<Group>) =>
    apiFetch<Group>('/groups', { method: 'POST', body: JSON.stringify(data) }),
  updateGroup: (id: number, data: Partial<Group>) =>
    apiFetch<Group>(`/groups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGroup: (id: number) =>
    apiFetch<{ ok: boolean }>(`/groups/${id}`, { method: 'DELETE' }),

  getShortcuts: () => apiFetch<Shortcut[]>('/shortcuts'),
  createShortcut: (data: Partial<Shortcut>) =>
    apiFetch<Shortcut>('/shortcuts', { method: 'POST', body: JSON.stringify(data) }),
  updateShortcut: (id: number, data: Partial<Shortcut>) =>
    apiFetch<Shortcut>(`/shortcuts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteShortcut: (id: number) =>
    apiFetch<{ ok: boolean }>(`/shortcuts/${id}`, { method: 'DELETE' }),
  refreshFavicon: (id: number) =>
    apiFetch<Shortcut>(`/shortcuts/${id}/refresh-favicon`, { method: 'POST' }),
  removeIcon: (id: number) =>
    apiFetch<Shortcut>(`/shortcuts/${id}/icon`, { method: 'DELETE' }),
  uploadIcon: async (id: number, file: File): Promise<Shortcut> => {
    const form = new FormData();
    form.append('icon', file);
    const res = await fetch(`${BASE}/shortcuts/${id}/icon`, { method: 'POST', body: form });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  },

  updateLayout: (data: { shortcuts?: Pick<Shortcut, 'id' | 'grid_x' | 'grid_y' | 'group_id' | 'sort_order'>[]; groups?: Pick<Group, 'id' | 'grid_x' | 'grid_y' | 'grid_w' | 'grid_h' | 'sort_order'>[] }) =>
    apiFetch<{ ok: boolean }>('/layout', { method: 'PUT', body: JSON.stringify(data) }),

  exportData: () => apiFetch<{ settings: unknown; groups: Group[]; shortcuts: Shortcut[]; icons: Record<string, string> }>('/export'),
  importData: (data: unknown) =>
    apiFetch<{ ok: boolean }>('/import', { method: 'POST', body: JSON.stringify(data) }),
};
