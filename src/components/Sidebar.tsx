import { Plus } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface SidebarProps {
  requests: { id: string; name: string }[];
  activeId: string | null;
  openIds: string[];
  onSelect: (id: string) => void;
  onNewRequest: () => void;
  onRename: (id: string, name: string) => void;
}

export default function Sidebar({ requests, activeId, openIds, onSelect, onNewRequest, onRename }: SidebarProps) {
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

  return (
    <div className="w-56 flex-shrink-0 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      <div className="p-2 border-b border-gray-200">
        <button
          onClick={onNewRequest}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Request
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {requests.length === 0 ? (
          <p className="px-3 py-4 text-xs text-gray-400 text-center">No saved requests</p>
        ) : (
          requests.map(r => (
            <div
              key={r.id}
              className={`w-full flex items-center px-3 py-2 text-sm transition-colors ${
                r.id === activeId
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {editingId === r.id ? (
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
                  className="flex-1 text-sm border-b border-blue-500 bg-transparent focus:outline-none"
                />
              ) : (
                <button
                  onClick={() => onSelect(r.id)}
                  onDoubleClick={() => startEdit(r.id, r.name)}
                  className="flex-1 text-left truncate"
                  title="Double-click to rename"
                >
                  {r.name}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
