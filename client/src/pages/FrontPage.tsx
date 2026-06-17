import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Shortcut, Group } from '@/types';
import { useAppData } from '@/hooks/useAppData';
import { useDragDrop } from '@/hooks/useDragDrop';
import GroupBox from '@/components/GroupBox';
import ShortcutDialog from '@/components/ShortcutDialog';
import GroupDialog from '@/components/GroupDialog';
import ContextMenu from '@/components/ContextMenu';
import { useTheme } from '@/contexts/ThemeContext';
import { usePageActions } from '@/contexts/PageActionsContext';
import { Button, ConfirmDialog, useToast } from '@/components/ui';

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
    isLoading,
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
      // useAppData polls until the background favicon fetch completes
      await createShortcut({ ...data, group_id: groupId, grid_x: 0, grid_y: 0 });
    }
    setDialog(null);
  }, [createShortcut, dialog, ensureGroup, updateShortcut]);

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
    addToast('Refreshing favicon...');
    const previousIconPath = shortcuts.find((s) => s.id === id)?.icon_path ?? null;
    try {
      // The server keeps the old icon when no favicon is found, so a
      // changed icon_path is the only reliable success signal
      const updated = await refreshFavicon(id);
      if (updated.icon_path && updated.icon_path !== previousIconPath) {
        addToast('Icon updated', 'success');
      } else {
        addToast('No favicon found for this site', 'error');
      }
    } catch {
      addToast('Favicon refresh failed', 'error');
    }
  }, [addToast, refreshFavicon, shortcuts]);

  const handleUploadIcon = useCallback(async (id: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        await uploadIcon({ id, file });
        addToast('Icon uploaded', 'success');
      } catch {
        addToast('Icon upload failed', 'error');
      }
    };
    input.click();
  }, [addToast, uploadIcon]);

  const handleRemoveIcon = useCallback(async (id: number) => {
    try {
      await removeIcon(id);
      addToast('Icon removed', 'success');
    } catch {
      addToast('Failed to remove icon', 'error');
    }
  }, [addToast, removeIcon]);

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

  const showEmptyState = !isLoading && sortedGroups.length === 0 && !arrangeMode;

  return (
    <>
      {showEmptyState ? (
      <div className="flex flex-col items-center justify-center text-center px-6" style={{ minHeight: '60vh' }}>
        <div
          className="flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
          style={{ background: `${theme.accent}15`, color: theme.accent }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </div>
        <h2 className="text-xl font-extrabold tracking-tight" style={{ color: theme.text }}>
          Welcome to Launchr
        </h2>
        <p className="text-sm mt-1.5 max-w-sm" style={{ color: theme.text2 }}>
          Your launcher is empty. Add your first link, or create a group to organize them.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          <Button variant="primary" size="lg" onClick={() => setDialog({ type: 'shortcut' })}>
            Add your first link
          </Button>
          <Button size="lg" onClick={() => setDialog({ type: 'group' })}>
            Create a group
          </Button>
        </div>
        <p className="text-xs mt-6" style={{ color: theme.text2, opacity: 0.8 }}>
          Tip: right-click (or long-press on touch devices) anywhere to add links and groups any time.
        </p>
      </div>
      ) : (
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
      )}

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
