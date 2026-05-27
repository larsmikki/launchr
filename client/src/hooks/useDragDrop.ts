import React, { useRef, useCallback, Dispatch, SetStateAction } from 'react';
import { Shortcut, Group } from '@/types';
import { useAppData } from '@/hooks/useAppData';

interface UseDragDropOptions {
  shortcuts: Shortcut[];
  groups: Group[];
  setShortcuts: Dispatch<SetStateAction<Shortcut[]>>;
  setGroups: Dispatch<SetStateAction<Group[]>>;
}

export function useDragDrop({ shortcuts, groups, setShortcuts, setGroups }: UseDragDropOptions) {
  const dragItem = useRef<{ type: 'shortcut' | 'group'; id: number } | null>(null);
  const { updateLayout, updateShortcut } = useAppData();

  const clearDragging = useCallback(() => {
    document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
  }, []);

  const handleGroupDragStart = useCallback((groupId: number, e: React.DragEvent) => {
    dragItem.current = { type: 'group', id: groupId };
    e.dataTransfer.effectAllowed = 'move';
    (e.target as HTMLElement).classList.add('dragging');
  }, []);

  const handleGroupDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleGroupDrop = useCallback(async (targetGroupId: number, e: React.DragEvent) => {
    e.preventDefault();
    if (!dragItem.current) return;

    const { type, id } = dragItem.current;

    if (type === 'group' && id !== targetGroupId) {
      const sorted = [...groups].sort((a, b) => a.sort_order - b.sort_order);
      const fromIdx = sorted.findIndex(g => g.id === id);
      const toIdx = sorted.findIndex(g => g.id === targetGroupId);
      if (fromIdx >= 0 && toIdx >= 0) {
        const [moved] = sorted.splice(fromIdx, 1);
        sorted.splice(toIdx, 0, moved);
        const positions = sorted.map((g, i) => ({
          id: g.id, grid_x: g.grid_x, grid_y: g.grid_y, grid_w: g.grid_w, grid_h: g.grid_h, sort_order: i,
        }));
        setGroups(prev => {
          const posMap = new Map(positions.map(p => [p.id, p.sort_order]));
          return prev.map(g => posMap.has(g.id) ? { ...g, sort_order: posMap.get(g.id)! } : g);
        });
        await updateLayout({ groups: positions });
      }
    } else if (type === 'shortcut') {
      await updateShortcut({ id, data: { group_id: targetGroupId } });
    }

    dragItem.current = null;
    clearDragging();
  }, [groups, setGroups, updateLayout, updateShortcut, clearDragging]);

  const handleShortcutDragStart = useCallback((shortcutId: number, e: React.DragEvent) => {
    dragItem.current = { type: 'shortcut', id: shortcutId };
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation();
    (e.target as HTMLElement).classList.add('dragging');
  }, []);

  const handleShortcutDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleShortcutDrop = useCallback(async (targetId: number, e: React.DragEvent) => {
    if (!dragItem.current || dragItem.current.type !== 'shortcut') return;
    const draggedId = dragItem.current.id;
    if (draggedId === targetId) return;

    const dragged = shortcuts.find((s) => s.id === draggedId);
    const target = shortcuts.find((s) => s.id === targetId);
    if (!dragged || !target || dragged.group_id !== target.group_id) return;

    e.preventDefault();
    e.stopPropagation();

    const groupShortcuts = shortcuts
      .filter((s) => s.group_id === dragged.group_id)
      .sort((a, b) => a.sort_order - b.sort_order);

    const fromIdx = groupShortcuts.findIndex((s) => s.id === draggedId);
    const toIdx = groupShortcuts.findIndex((s) => s.id === targetId);
    const [moved] = groupShortcuts.splice(fromIdx, 1);
    groupShortcuts.splice(fromIdx < toIdx ? toIdx - 1 : toIdx, 0, moved);

    const positions = groupShortcuts.map((s, i) => ({
      id: s.id, grid_x: s.grid_x, grid_y: s.grid_y, group_id: s.group_id, sort_order: i,
    }));

    dragItem.current = null;
    clearDragging();
    setShortcuts(prev => {
      const posMap = new Map(positions.map(p => [p.id, p.sort_order]));
      return prev.map(s => posMap.has(s.id) ? { ...s, sort_order: posMap.get(s.id)! } : s);
    });
    await updateLayout({ shortcuts: positions });
  }, [shortcuts, clearDragging, setShortcuts, updateLayout]);

  const handleShortcutDropEnd = useCallback(async (groupId: number, e: React.DragEvent) => {
    if (!dragItem.current || dragItem.current.type !== 'shortcut') return;
    const draggedId = dragItem.current.id;

    const dragged = shortcuts.find((s) => s.id === draggedId);
    if (!dragged || dragged.group_id !== groupId) return;

    e.preventDefault();
    e.stopPropagation();

    const groupShortcuts = shortcuts
      .filter((s) => s.group_id === groupId)
      .sort((a, b) => a.sort_order - b.sort_order);

    const fromIdx = groupShortcuts.findIndex((s) => s.id === draggedId);
    if (fromIdx === groupShortcuts.length - 1) return;

    const [moved] = groupShortcuts.splice(fromIdx, 1);
    groupShortcuts.push(moved);

    const positions = groupShortcuts.map((s, i) => ({
      id: s.id, grid_x: s.grid_x, grid_y: s.grid_y, group_id: s.group_id, sort_order: i,
    }));

    dragItem.current = null;
    clearDragging();
    setShortcuts(prev => {
      const posMap = new Map(positions.map(p => [p.id, p.sort_order]));
      return prev.map(s => posMap.has(s.id) ? { ...s, sort_order: posMap.get(s.id)! } : s);
    });
    await updateLayout({ shortcuts: positions });
  }, [shortcuts, clearDragging, setShortcuts, updateLayout]);

  const handleDragEnd = useCallback(() => {
    clearDragging();
    dragItem.current = null;
  }, [clearDragging]);

  return {
    handleGroupDragStart,
    handleGroupDragOver,
    handleGroupDrop,
    handleShortcutDragStart,
    handleShortcutDragOver,
    handleShortcutDrop,
    handleShortcutDropEnd,
    handleDragEnd,
  };
}
