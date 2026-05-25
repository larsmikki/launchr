import React, { useState, useRef } from 'react';
import { Settings } from '@/types';
import { api } from '@/hooks/useApi';
import { useTheme } from '@/contexts/ThemeContext';
import ThemePicker from '@/components/ThemePicker';
import { Button, Surface, useToast } from '@/components/ui';

interface Props {
  settings: Settings;
  onSave: (data: Partial<Settings>) => void;
}

export default function SettingsPage({ settings, onSave }: Props) {
  const { theme } = useTheme();
  const { addToast } = useToast();
  const [layoutMode, setLayoutMode] = useState<'row' | 'column'>(settings.layout_mode || 'row');
  const [columnExtraWidth, setColumnExtraWidth] = useState(Number(settings.column_extra_width) || 0);
  const [linkTarget, setLinkTarget] = useState(settings.link_target || '_blank');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save a patch merged with current state
  const save = (patch: Partial<Settings>) => {
    onSave({
      layout_mode: layoutMode,
      column_extra_width: String(columnExtraWidth),
      link_target: linkTarget,
      ...patch,
    });
  };

  const handleExport = async () => {
    const data = await api.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `linky-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Backup exported', 'success');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      addToast('Invalid JSON file', 'error');
      return;
    }
    if (
      !data ||
      typeof data !== 'object' ||
      (!('groups' in data) && !('shortcuts' in data) && !('settings' in data))
    ) {
      addToast('Invalid backup file', 'error');
      return;
    }
    try {
      await api.importData(data);
      addToast('Backup imported', 'success');
      window.location.reload();
    } catch (err) {
      addToast(`Import failed. ${err instanceof Error ? err.message : 'Try again.'}`, 'error');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="min-h-full select-auto">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-text">Settings</h1>
          <p className="text-sm mt-0.5 text-text2">Customize your Linky experience.</p>
        </div>

        <Surface className="p-6 mb-5">
          <h2 className="text-base font-bold mb-1 text-text">Themes</h2>
          <p className="text-xs mb-5 text-text2">Choose how Linky looks to you.</p>
          <ThemePicker />
        </Surface>

        <Surface className="p-6 mb-5">
          <h2 className="text-base font-bold mb-1 text-text">Appearance</h2>
          <p className="text-xs mb-5 text-text2">Choose how links open.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              {
                value: '_blank' as const,
                label: 'New tab',
                description: 'Opens links in a new browser tab',
                preview: (
                  <div className="flex items-center justify-center h-full gap-1">
                    <div className="h-8 w-8 rounded border-2" style={{ borderColor: theme.surface2 }} />
                    <div className="h-8 w-8 rounded border-2 ml-2" style={{ borderColor: theme.accent, background: `${theme.accent}15` }} />
                  </div>
                ),
              },
              {
                value: '_self' as const,
                label: 'Same window',
                description: 'Opens links in the current tab',
                preview: (
                  <div className="flex items-center justify-center h-full gap-1">
                    <div className="h-8 w-8 rounded border-2" style={{ borderColor: theme.accent, background: `${theme.accent}15` }} />
                  </div>
                ),
              },
            ] as const).map(({ value, label, description, preview }) => (
              <button
                key={value}
                onClick={() => { setLinkTarget(value); save({ link_target: value }); }}
                className="flex flex-col gap-3 p-4 rounded-xl text-left transition-opacity hover:opacity-90"
                style={{
                  border: `1px solid ${linkTarget === value ? theme.accent : theme.border}`,
                  background: linkTarget === value ? `${theme.accent}08` : theme.surface2,
                  boxShadow: linkTarget === value ? `0 0 0 3px ${theme.accent}15` : 'none',
                }}
              >
                <div className="w-full rounded-lg p-3" style={{ background: theme.surface, border: `1px solid ${theme.border}`, minHeight: '60px' }}>
                  {preview}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: theme.text }}>{label}</p>
                  <p className="text-xs mt-0.5" style={{ color: theme.text2 }}>{description}</p>
                </div>
              </button>
            ))}
          </div>
        </Surface>

        <Surface className="p-6 mb-5">
          <h2 className="text-base font-bold mb-1 text-text">Layout</h2>
          <p className="text-xs mb-5 text-text2">Arrange your groups as rows or columns.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              {
                value: 'row' as const,
                label: 'Rows',
                description: 'Groups stacked vertically',
                preview: (
                  <div className="h-full flex flex-col justify-center space-y-1.5">
                    <div className="h-2 rounded-sm" style={{ background: theme.surface2 }} />
                    <div className="h-2 rounded-sm" style={{ background: theme.surface2, width: '80%' }} />
                    <div className="h-2 rounded-sm" style={{ background: theme.surface2, width: '60%' }} />
                  </div>
                ),
              },
              {
                value: 'column' as const,
                label: 'Columns',
                description: 'Groups arranged side by side',
                preview: (
                  <div className="flex items-center justify-center h-full gap-1">
                    <div className="h-8 w-2.5 rounded-sm" style={{ background: theme.surface2 }} />
                    <div className="h-8 w-2.5 rounded-sm" style={{ background: theme.surface2 }} />
                    <div className="h-8 w-2.5 rounded-sm" style={{ background: theme.surface2 }} />
                    <div className="h-8 w-2.5 rounded-sm" style={{ background: theme.surface2 }} />
                    <div className="h-8 w-2.5 rounded-sm" style={{ background: theme.surface2 }} />
                    <div className="h-8 w-2.5 rounded-sm" style={{ background: theme.surface2 }} />
                  </div>
                ),
              },
            ] as const).map(({ value, label, description, preview }) => (
              <button
                key={value}
                onClick={() => { setLayoutMode(value); save({ layout_mode: value }); }}
                className="flex flex-col gap-3 p-4 rounded-xl text-left transition-opacity hover:opacity-90"
                style={{
                  border: `1px solid ${layoutMode === value ? theme.accent : theme.border}`,
                  background: layoutMode === value ? `${theme.accent}08` : theme.surface2,
                  boxShadow: layoutMode === value ? `0 0 0 3px ${theme.accent}15` : 'none',
                }}
              >
                <div className="w-full rounded-lg p-3" style={{ background: theme.surface, border: `1px solid ${theme.border}`, minHeight: '60px' }}>
                  {preview}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: theme.text }}>{label}</p>
                  <p className="text-xs mt-0.5" style={{ color: theme.text2 }}>{description}</p>
                </div>
              </button>
            ))}
          </div>

          {layoutMode === 'column' && (
            <div className="mt-5">
              <label className="block text-xs uppercase tracking-wider font-semibold mb-2.5" style={{ color: theme.text2 }}>Extra column width: {columnExtraWidth}px</label>
              <input type="range" min="0" max="200" step="10" value={columnExtraWidth}
                onChange={(e) => setColumnExtraWidth(Number(e.target.value))}
                onMouseUp={(e) => save({ column_extra_width: String((e.target as HTMLInputElement).value) })}
                onTouchEnd={(e) => save({ column_extra_width: String((e.target as HTMLInputElement).value) })}
                className="w-full"
                style={{ accentColor: theme.accent }} />
            </div>
          )}
        </Surface>

        <Surface className="p-6">
          <h2 className="text-base font-bold mb-1 text-text">Data</h2>
          <p className="text-xs mb-5 text-text2">Export or import your links and groups as a JSON backup.</p>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={handleExport}
              leadingIcon={(
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
            >
              Export backup
            </Button>
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              leadingIcon={(
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              )}
            >
              Import backup
            </Button>
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          </div>
        </Surface>

      </div>
    </div>
  );
}
