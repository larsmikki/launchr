import React, { useCallback } from 'react';
import { Shortcut } from '@/types';

const FALLBACK_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#dc2626', '#14b8a6', '#f97316', '#06b6d4',
];

function getFallbackColor(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = ((hash << 5) - hash + title.charCodeAt(i)) | 0;
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
}

function getFallbackLetter(title: string, url: string): string {
  if (title) return title.charAt(0).toUpperCase();
  try {
    return new URL(url).hostname.charAt(0).toUpperCase();
  } catch {
    return '?';
  }
}

interface Props {
  shortcut: Shortcut;
  arrangeMode: boolean;
  linkTarget: string;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnter?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export default function ShortcutTile({ shortcut, arrangeMode, linkTarget, onDragStart, onDragEnter, onDragOver, onDrop, onContextMenu }: Props) {
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (arrangeMode) e.preventDefault();
  }, [arrangeMode]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (onContextMenu) {
      e.preventDefault();
      onContextMenu(e);
    }
  }, [onContextMenu]);

  const hasIcon = shortcut.icon_path && shortcut.favicon_cached;

  return (
    <a
      className="shortcut-tile"
      href={shortcut.url}
      target={linkTarget}
      rel="noopener noreferrer"
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      draggable={arrangeMode}
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDrop={onDrop}
      data-shortcut-id={shortcut.id}
    >
      {hasIcon ? (
        <div className="shortcut-icon">
          <img
            src={`/api/icons/${shortcut.icon_path}`}
            alt=""
            draggable={false}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      ) : (
        <div
          className="shortcut-fallback"
          style={{ background: getFallbackColor(shortcut.title) }}
        >
          {getFallbackLetter(shortcut.title, shortcut.url)}
        </div>
      )}
      <span className="shortcut-title">{shortcut.title}</span>
    </a>
  );
}
