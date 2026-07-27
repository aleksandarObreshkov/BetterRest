import { X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface TabBarProps {
  tabs: { id: string; name: string; isDirty: boolean }[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

export default function TabBar({ tabs, activeId, onSelect, onClose, onRename }: TabBarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId) inputRef.current?.select();
  }, [editingId]);

  function startEdit(id: string, name: string) {
    setEditingId(id);
    setDraft(name);
  }

  function commitEdit() {
    if (editingId) {
      const trimmed = draft.trim();
      if (trimmed) onRename(editingId, trimmed);
    }
    setEditingId(null);
  }

  if (tabs.length === 0) return null;

  return (
    <div className="flex border-b border-gray-200 bg-white overflow-x-auto flex-shrink-0">
      {tabs.map(tab => (
        <div
          key={tab.id}
          onClick={() => { if (editingId !== tab.id) onSelect(tab.id); }}
          className={`flex items-center gap-1 px-3 py-2 text-sm border-r border-gray-200 cursor-pointer whitespace-nowrap select-none ${
            tab.id === activeId
              ? 'bg-white border-b-2 border-b-blue-500 -mb-px'
              : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
          }`}
        >
          {editingId === tab.id ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={e => {
                if (e.key === 'Enter') commitEdit();
                if (e.key === 'Escape') setEditingId(null);
                e.stopPropagation();
              }}
              onClick={e => e.stopPropagation()}
              className="w-28 text-sm border-b border-blue-500 bg-transparent focus:outline-none"
            />
          ) : (
            <span
              className="max-w-32 truncate"
              onDoubleClick={e => { e.stopPropagation(); startEdit(tab.id, tab.name); }}
              title="Double-click to rename"
            >
              {tab.name}
            </span>
          )}
          {tab.isDirty && (
            <span className="text-orange-400 text-xs leading-none">●</span>
          )}
          <button
            onClick={e => { e.stopPropagation(); onClose(tab.id); }}
            className="ml-1 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-200 w-4 h-4 flex items-center justify-center flex-shrink-0"
            title="Close tab"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
