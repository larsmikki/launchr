import React, { useCallback, useState } from 'react'
import { Group, Shortcut } from '@/types'
import ShortcutTile from '@/components/ShortcutTile'
import { useTheme } from '@/contexts/ThemeContext'

const editPencilIcon = (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="13" height="13" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, flexShrink: 0 }}>
    <path d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828 8 17l1.172-3.828z" />
  </svg>
)

interface Props {
  group: Group
  groupIndex: number
  shortcuts: Shortcut[]
  arrangeMode: boolean
  layoutMode: 'row' | 'column'
  linkTarget: string
  onToggleCollapse: (groupId: number, newCollapsed: boolean) => void
  onEditGroup?: (group: Group) => void
  onDeleteGroup?: (groupId: number) => void
  onGroupDragStart?: (groupId: number, e: React.DragEvent) => void
  onGroupDragOver?: (e: React.DragEvent) => void
  onGroupDrop?: (groupId: number, e: React.DragEvent) => void
  onDragEnd?: () => void
  onShortcutDragStart?: (id: number, e: React.DragEvent) => void
  onShortcutDragOver?: (e: React.DragEvent) => void
  onShortcutDrop?: (id: number, e: React.DragEvent) => void
  onShortcutDropEnd?: (groupId: number, e: React.DragEvent) => void
  onShortcutContextMenu?: (id: number, e: React.MouseEvent) => void
}

export default React.memo(function GroupBox({
  group,
  groupIndex,
  shortcuts,
  arrangeMode,
  layoutMode,
  linkTarget,
  onToggleCollapse,
  onEditGroup,
  onDeleteGroup,
  onGroupDragStart,
  onGroupDragOver,
  onGroupDrop,
  onDragEnd,
  onShortcutDragStart,
  onShortcutDragOver,
  onShortcutDrop,
  onShortcutDropEnd,
  onShortcutContextMenu,
}: Props) {
  const { theme } = useTheme()
  const [hovered, setHovered] = useState(false)
  const [dropEndActive, setDropEndActive] = useState(false)
  const [dragOverId, setDragOverId] = useState<number | 'end' | null>(null)
  const isCollapsed = group.collapsed === 1
  const groupBg = theme.groupColors[groupIndex % theme.groupColors.length]

  const handleMouseEnter = useCallback(() => setHovered(true), [])
  const handleMouseLeave = useCallback(() => setHovered(false), [])

  return (
    <div
      className={`group-container ${arrangeMode ? 'group-arrangeable' : ''}`}
      style={{
        background: groupBg,
        border: `1px solid ${hovered ? `${theme.accent}50` : theme.border}`,
        boxShadow: hovered
          ? `var(--shadow-card-hover), 0 0 0 1px ${theme.accent}20`
          : 'var(--shadow-card-soft)',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      draggable={arrangeMode}
      onDragStart={onGroupDragStart ? (e) => onGroupDragStart(group.id, e) : undefined}
      onDragOver={arrangeMode ? onGroupDragOver : undefined}
      onDrop={arrangeMode && onGroupDrop ? (e) => onGroupDrop(group.id, e) : undefined}
      onDragEnd={onDragEnd}
      data-group-id={group.id}
    >
      <div className="group-header">
        <button
          type="button"
          className="group-collapse-btn"
          onClick={() => onToggleCollapse(group.id, !isCollapsed)}
          aria-label={isCollapsed ? 'Expand group' : 'Collapse group'}
        >
          {isCollapsed ? '>' : 'v'}
        </button>
        <span
          style={{ flex: 1, cursor: arrangeMode && onEditGroup ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: '5px' }}
          onClick={arrangeMode && onEditGroup ? (e) => { e.stopPropagation(); onEditGroup(group) } : undefined}
        >
          {group.title || 'Untitled group'}
          {arrangeMode && onEditGroup && editPencilIcon}
        </span>
        {arrangeMode && onDeleteGroup && (
          <button
            type="button"
            className="group-header-btn group-header-btn--danger"
            onClick={(e) => { e.stopPropagation(); onDeleteGroup(group.id) }}
            title="Delete group"
          >
            x
          </button>
        )}
      </div>
      {!isCollapsed && (
        <div
          className={`group-body group-body-${layoutMode}`}
          onDragEnd={() => setDragOverId(null)}
        >
          {shortcuts.map((s) => (
            <React.Fragment key={s.id}>
              {dragOverId === s.id && (
                <div style={{
                  width: '3px', alignSelf: 'stretch', flexShrink: 0,
                  background: theme.accent, borderRadius: '2px', margin: '6px 2px',
                }} />
              )}
              <ShortcutTile
                shortcut={s}
                arrangeMode={arrangeMode}
                linkTarget={linkTarget}
                onDragStart={onShortcutDragStart ? (e) => onShortcutDragStart(s.id, e) : undefined}
                onDragEnter={arrangeMode ? (e) => { e.preventDefault(); setDragOverId(s.id) } : undefined}
                onDragOver={arrangeMode ? onShortcutDragOver : undefined}
                onDrop={arrangeMode && onShortcutDrop ? (e) => { setDragOverId(null); onShortcutDrop(s.id, e) } : undefined}
                onContextMenu={onShortcutContextMenu ? (e) => onShortcutContextMenu(s.id, e) : undefined}
              />
            </React.Fragment>
          ))}
          {arrangeMode && onShortcutDropEnd && (
            <>
              {dragOverId === 'end' && (
                <div style={{
                  width: '3px', alignSelf: 'stretch', flexShrink: 0,
                  background: theme.accent, borderRadius: '2px', margin: '6px 2px',
                }} />
              )}
              <div
                className={`shortcut-drop-end${dropEndActive ? ' shortcut-drop-end--active' : ''}`}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
                onDragEnter={() => { setDropEndActive(true); setDragOverId('end') }}
                onDragLeave={() => setDropEndActive(false)}
                onDrop={(e) => { setDropEndActive(false); setDragOverId(null); onShortcutDropEnd(group.id, e) }}
              />
            </>
          )}
        </div>
      )}
    </div>
  )
})
