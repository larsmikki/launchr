import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  const {
    shortcuts,
    setShortcuts,
    groups,
    setGroups,
    settings,
    fetchShortcuts,
    ensureGroup,
    createGroup,
    updateGroup,
    deleteGroup,
    createShortcut,
    updateShortcut,
    deleteShortcut,
    refreshFavicon,
    uploadIcon,
    removeIcon,
  } = useAppData();

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

  const handleOpenEditGroup = useCallback((group: Group) => {
    setDialog({ type: 'group', group });
  }, []);

  const handleDeleteGroup = useCallback(async (groupId: number) => {
    await deleteGroup(groupId);
  }, [deleteGroup]);

  const handleSaveShortcut = useCallback(async (data: { title: string; url: string; group_id: number | null }) => {
    const groupId = data.group_id ?? await ensureGroup();

    if (dialog?.type === 'shortcut' && dialog.shortcut) {
      await updateShortcut({ id: dialog.shortcut.id, data: { ...data, group_id: groupId } });
    } else {
      const created = await createShortcut({ ...data, group_id: groupId, grid_x: 0, grid_y: 0 });
      if (created?.id) {
        let attempts = 0;
        const poll = setInterval(async () => {
          attempts++;
          const freshShortcuts = await fetchShortcuts();
          const sc = freshShortcuts.find((s) => s.id === created.id);
          if ((sc && sc.favicon_cached) || attempts >= 8) {
            clearInterval(poll);
            activePolls.current = activePolls.current.filter((p) => p !== poll);
          }
        }, 2000);
        activePolls.current.push(poll);
      }
    }
    setDialog(null);
  }, [createShortcut, dialog, ensureGroup, fetchShortcuts, updateShortcut]);

  const handleSaveGroup = useCallback(async (data: { title: string; color: string }) => {
    if (dialog?.type === 'group' && dialog.group) {
      await updateGroup({ id: dialog.group.id, data });
    } else {
      await createGroup(data);
    }
    setDialog(null);
  }, [createGroup, dialog, updateGroup]);

  const handleDeleteShortcut = useCallback(async (id: number) => {
    await deleteShortcut(id);
  }, [deleteShortcut]);

  const handleRefreshFavicon = useCallback(async (id: number) => {
    showToast('Refreshing favicon...');
    await refreshFavicon(id);
    showToast('Icon updated');
  }, [refreshFavicon, showToast]);

  const handleUploadIcon = useCallback(async (id: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        await uploadIcon({ id, file });
      } catch (e) {
        console.error('[icon] Upload failed:', e);
      }
    };
    input.click();
  }, [uploadIcon]);

  const handleRemoveIcon = useCallback(async (id: number) => {
    showToast('Removing icon...');
    await removeIcon(id);
    showToast('Icon removed');
  }, [removeIcon, showToast]);

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
