import React, { useState } from 'react';
import { Group } from '@/types';
import { Button, Input, Modal } from '@/components/ui';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  group?: Group | null;
  onSave: (data: { title: string; color: string }) => void;
  onClose: () => void;
}

export default function GroupDialog({ group, onSave, onClose }: Props) {
  const { theme } = useTheme();
  const [title, setTitle] = useState(group?.title || '');
  const [color, setColor] = useState(group?.color || '#e0e7ff');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ title: title.trim(), color });
  };

  return (
    <Modal open onClose={onClose} title={group ? 'Edit group' : 'Add group'} maxWidth="420px">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider" style={{ color: theme.text2 }}>
            Title
          </label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Work" autoFocus />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider" style={{ color: theme.text2 }}>
            Color
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-12 rounded-lg p-1"
              style={{ background: theme.surface2, border: `1px solid ${theme.border}` }}
            />
            <Input value={color} onChange={(e) => setColor(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">Save</Button>
        </div>
      </form>
    </Modal>
  );
}
