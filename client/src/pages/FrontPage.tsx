import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { api } from '@/hooks/useApi';
import { Shortcut, Group } from '@/types';
import { useAppData } from '@/hooks/useAppData';
import { useDragDrop } from '@/hooks/useDragDrop';
import GroupBox from '@/components/GroupBox';
import ShortcutDialog from '@/components/ShortcutDialog';
import GroupDialog from '@/components/GroupDialog';
import ContextMenu from '@/components/ContextMenu';
import { useTheme } from '@/contexts/ThemeContext';
import { usePageActions } from '@/contexts/PageActionsContext';
import { ConfirmDialog, useToast } from '@/components/ui';

const addGroupIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export default function FrontPage() {
  const { theme } = useTheme();
  const { setOnNewLink, setOnEditLayout } = usePageActions();
  const { shortcuts, setShortcuts, groups, setGroups, settings, ensureGroup } = useAppData();

  const [arrangeMode, setArrangeMode] = useState(false);

  const [dialog, setDialog] = useState<
    | { type: 'shortcut'; shortcut?: Shortcut; defaultGroupId?: number }
    | { type: 'group'; group?: Group }
    | null
  >(null);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; shortcutId: number } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<
    | { type: 'shortcut'; id: number; title: string }
    | { type: 'group'; id: number; title: string }
    | null
  >(null);

  const handleShortcutContextMenu = useCallback((shortcutId: number, e: React.MouseEvent) => {
    setContextMenu({ x: e.clientX, y: e.clientY, shortcutId });
  }, []);

  const { addToast } = useToast();
  const showToast = useCallback((msg: string) => addToast(msg), [addToast]);

  const activePolls = useRef<ReturnType<typeof setInterval>[]>([]);
  useEffect(() => {
    return () => { activePolls.current.forEach(clearInterval); };
  }, []);

  const drag = useDragDrop({ shortcuts, groups, setShortcuts, setGroups });

  useEffect(() => {
    setOnNewLink(() => setDialog({ type: 'shortcut' }));
    return () => setOnNewLink(null);
  }, [setOnNewLink]);

  useEffect(() => {
    setOnEditLayout(() => setArrangeMode(v => !v), arrangeMode);
    return () => setOnEditLayout(null, false);
  }, [setOnEditLayout, arrangeMode]);

  const layoutMode = (settings.layout_mode || 'row') as 'row' | 'column';
  const columnExtraWidth = Number(settings.column_extra_width) || 0;

  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => a.sort_order - b.sort_order),
    [groups]
  );

  const shortcutsByGroup = useMemo(() => {
    const map = new Map<number, Shortcut[]>();
    for (const s of shortcuts) {
      if (s.group_id === null) continue;
      const arr = map.get(s.group_id) ?? [];
      arr.push(s);
      map.set(s.group_id, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.sort_order - b.sort_order);
    return map;
  }, [shortcuts]);

  const layoutStyle = useMemo<React.CSSProperties>(() => {
    if (layoutMode === 'column' && columnExtraWidth > 0) {
      return { '--column-extra-width': `${columnExtraWidth}px` } as React.CSSProperties;
    }
    return {};
  }, [layoutMode, columnExtraWidth]);

  const handleToggleCollapse = useCallback((groupId: number, newCollapsed: boolean) => {
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, collapsed: newCollapsed ? 1 : 0 } : g));
    void api.updateGroup(groupId, { collapsed: newCollapsed ? 1 : 0 });
  }, [setGroups]);

  const handleOpenEditGroup = useCallback((group: Group) => {
    setDialog({ type: 'group', group });
  }, []);

  const handleDeleteGroup = useCallback(async (groupId: number) => {
    await api.deleteGroup(groupId);
    setGroups(prev => prev.filter(g => g.id !== groupId));
    setShortcuts(prev => prev.filter(s => s.group_id !== groupId));
  }, [setGroups, setShortcuts]);

  const handleSaveShortcut = useCallback(async (data: { title: string; url: string; group_id: number | null }) => {
    const groupId = data.group_id ?? await ensureGroup();

    if (dialog?.type === 'shortcut' && dialog.shortcut) {
      const updated = await api.updateShortcut(dialog.shortcut.id, { ...data, group_id: groupId });
      setShortcuts(prev => prev.map(s => s.id === dialog.shortcut!.id ? updated : s));
    } else {
      const created = await api.createShortcut({ ...data, group_id: groupId, grid_x: 0, grid_y: 0 });
      if (created?.id) {
        setShortcuts(prev => [...prev, created]);
        let attempts = 0;
        const poll = setInterval(async () => {
          attempts++;
          const freshShortcuts = await api.getShortcuts();
          const sc = freshShortcuts.find((s) => s.id === created.id);
          if ((sc && sc.favicon_cached) || attempts >= 8) {
            clearInterval(poll);
            activePolls.current = activePolls.current.filter((p) => p !== poll);
          }
          setShortcuts(freshShortcuts);
        }, 2000);
        activePolls.current.push(poll);
      }
    }
    setDialog(null);
  }, [dialog, ensureGroup, setShortcuts]);

  const handleSaveGroup = useCallback(async (data: { title: string; color: string }) => {
    if (dialog?.type === 'group' && dialog.group) {
      const updated = await api.updateGroup(dialog.group.id, data);
      setGroups(prev => prev.map(g => g.id === dialog.group!.id ? updated : g));
    } else {
      const created = await api.createGroup(data);
      setGroups(prev => [...prev, created]);
    }
    setDialog(null);
  }, [dialog, setGroups]);

  const handleDeleteShortcut = useCallback(async (id: number) => {
    await api.deleteShortcut(id);
    setShortcuts(prev => prev.filter(s => s.id !== id));
  }, [setShortcuts]);

  const handleRefreshFavicon = useCallback(async (id: number) => {
    showToast('Refreshing favicon...');
    const updated = await api.refreshFavicon(id);
    setShortcuts(prev => prev.map(s => s.id === id ? updated : s));
    showToast('Icon updated');
  }, [showToast, setShortcuts]);

  const handleUploadIcon = useCallback(async (id: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const updated = await api.uploadIcon(id, file);
        setShortcuts(prev => prev.map(s => s.id === id ? updated : s));
      } catch (e) {
        console.error('[icon] Upload failed:', e);
      }
    };
    input.click();
  }, [setShortcuts]);

  const handleRemoveIcon = useCallback(async (id: number) => {
    showToast('Removing icon...');
    const updated = await api.removeIcon(id);
    setShortcuts(prev => prev.map(s => s.id === id ? updated : s));
    showToast('Icon removed');
  }, [showToast, setShortcuts]);

  const handleConfirmDelete = useCallback(() => {
    if (!confirmDelete) return;
    if (confirmDelete.type === 'group') {
      void handleDeleteGroup(confirmDelete.id);
    } else {
      void handleDeleteShortcut(confirmDelete.id);
    }
  }, [confirmDelete, handleDeleteGroup, handleDeleteShortcut]);

  const contextMenuItems = useMemo(() => {
    if (!contextMenu) return null;
    const sc = shortcuts.find((s) => s.id === contextMenu.shortcutId);
    if (!sc) return null;
    return [
      { label: 'Edit', onClick: () => setDialog({ type: 'shortcut', shortcut: sc }) },
      { divider: true, label: '', onClick: () => {} },
      { label: 'Upload Icon', onClick: () => handleUploadIcon(sc.id) },
      { label: 'Refresh Favicon', onClick: () => handleRefreshFavicon(sc.id) },
      ...(sc.icon_path ? [{ label: 'Remove Icon', onClick: () => handleRemoveIcon(sc.id) }] : []),
      { divider: true, label: '', onClick: () => {} },
      { label: 'Delete', danger: true, onClick: () => setConfirmDelete({ type: 'shortcut', id: sc.id, title: sc.title }) },
    ];
  }, [contextMenu, shortcuts, handleUploadIcon, handleRefreshFavicon, handleRemoveIcon]);

  return (
    <>
      <div className={`desktop-layout layout-${layoutMode}`} style={layoutStyle}>
        {sortedGroups.map((g, idx) => (
          <GroupBox
            key={g.id}
            group={g}
            groupIndex={idx}
            shortcuts={shortcutsByGroup.get(g.id) ?? []}
            arrangeMode={arrangeMode}
            layoutMode={layoutMode}
            linkTarget={settings.link_target || '_blank'}
            onToggleCollapse={handleToggleCollapse}
            onEditGroup={handleOpenEditGroup}
            onDeleteGroup={(groupId) => {
              const group = groups.find(g => g.id === groupId);
              setConfirmDelete({ type: 'group', id: groupId, title: group?.title || 'Untitled group' });
            }}
            onGroupDragStart={drag.handleGroupDragStart}
            onGroupDragOver={drag.handleGroupDragOver}
            onGroupDrop={drag.handleGroupDrop}
            onDragEnd={drag.handleDragEnd}
            onShortcutDragStart={drag.handleShortcutDragStart}
            onShortcutDragOver={drag.handleShortcutDragOver}
            onShortcutDrop={drag.handleShortcutDrop}
            onShortcutDropEnd={drag.handleShortcutDropEnd}
            onShortcutContextMenu={handleShortcutContextMenu}
          />
        ))}
        {arrangeMode && (
          <button
            type="button"
            className="group-container"
            onClick={() => setDialog({ type: 'group' })}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '8px', minHeight: '72px', cursor: 'pointer',
              border: `2px dashed ${theme.border}`,
              background: 'transparent', boxShadow: 'none',
              color: theme.text2, fontSize: '14px', fontWeight: 500,
              opacity: 0.7,
            }}
          >
            {addGroupIcon}
            Add group
          </button>
        )}
      </div>

      {dialog?.type === 'shortcut' && (
        <ShortcutDialog
          shortcut={dialog.shortcut}
          groups={groups}
          defaultGroupId={dialog.defaultGroupId}
          onSave={handleSaveShortcut}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'group' && (
        <GroupDialog
          group={dialog.group}
          onSave={handleSaveGroup}
          onClose={() => setDialog(null)}
        />
      )}

      {contextMenu && contextMenuItems && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems as Parameters<typeof ContextMenu>[0]['items']}
          onClose={() => setContextMenu(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title={confirmDelete?.type === 'group' ? 'Delete group' : 'Delete shortcut'}
        message={
          confirmDelete?.type === 'group'
            ? `Delete "${confirmDelete.title || 'Untitled group'}" and its shortcuts.`
            : `Delete "${confirmDelete?.title || 'this shortcut'}".`
        }
        confirmLabel="Delete"
        destructive
        onConfirm={handleConfirmDelete}
        onClose={() => setConfirmDelete(null)}
      />

    </>
  );
}
