import React, { useState } from 'react';
import { Shortcut, Group } from '@/types';
import { Button, Input, Modal, Select } from '@/components/ui';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  shortcut?: Shortcut | null;
  groups: Group[];
  defaultGroupId?: number | null;
  onSave: (data: { title: string; url: string; group_id: number | null }) => void;
  onClose: () => void;
}

export default function ShortcutDialog({ shortcut, groups, defaultGroupId, onSave, onClose }: Props) {
  const { theme } = useTheme();
  const [title, setTitle] = useState(shortcut?.title || '');
  const [url, setUrl] = useState(shortcut?.url || '');
  const [groupId, setGroupId] = useState<number | null>(shortcut?.group_id ?? defaultGroupId ?? (groups.length > 0 ? groups[0].id : null));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;
    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) finalUrl = 'https://' + finalUrl;
    onSave({ title: title.trim(), url: finalUrl, group_id: groupId });
  };

  return (
    <Modal open onClose={onClose} title={shortcut ? 'Edit shortcut' : 'Add shortcut'} maxWidth="420px">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider" style={{ color: theme.text2 }}>
            Title
          </label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="GitHub" autoFocus />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider" style={{ color: theme.text2 }}>
            URL
          </label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="github.com" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider" style={{ color: theme.text2 }}>
            Group
          </label>
          <Select value={groupId ?? ''} onChange={(e) => setGroupId(e.target.value ? Number(e.target.value) : null)}>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.title || `Group ${g.id}`}</option>
            ))}
          </Select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">Save</Button>
        </div>
      </form>
    </Modal>
  );
}
