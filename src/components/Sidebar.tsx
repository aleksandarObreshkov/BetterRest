import { ChevronRight, ChevronDown, Plus, FolderPlus, Trash2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { CollectionNode } from '../models/Collection';

interface SidebarProps {
  collections: CollectionNode[];
  activeId: string | null;
  openIds: string[];
  onSelectRequest: (id: string, collectionId: string) => void;
  onNewRequest: (collectionId: string) => void;
  onNewCollection: (name: string) => void;
  onRenameRequest: (id: string, name: string) => void;
  onRenameCollection: (oldName: string, newName: string) => void;
  onDeleteCollection: (name: string) => void;
  onDeleteRequest: (id: string, collectionId: string) => void;
  onMoveRequest: (id: string, fromCollectionId: string, toCollectionId: string) => void;
}

export default function Sidebar({
  collections,
  activeId,
  openIds,
  onSelectRequest,
  onNewRequest,
  onNewCollection,
  onRenameRequest,
  onRenameCollection,
  onDeleteCollection,
  onDeleteRequest,
  onMoveRequest,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [dragOverCollectionId, setDragOverCollectionId] = useState<string | null>(null);
  const [newRequestPickerOpen, setNewRequestPickerOpen] = useState(false);
  const [addingCollection, setAddingCollection] = useState(false);
  const [newCollectionDraft, setNewCollectionDraft] = useState('');
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const newCollectionInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (addingCollection) newCollectionInputRef.current?.focus();
  }, [addingCollection]);

  useEffect(() => {
    if (editingRequestId || editingCollectionId) editInputRef.current?.select();
  }, [editingRequestId, editingCollectionId]);

  useEffect(() => {
    if (!newRequestPickerOpen) return;
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setNewRequestPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [newRequestPickerOpen]);

  function toggleCollapse(id: string) {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function commitNewCollection() {
    const name = newCollectionDraft.trim();
    if (name) onNewCollection(name);
    setAddingCollection(false);
    setNewCollectionDraft('');
  }

  function startRenameRequest(id: string, name: string) {
    setEditingRequestId(id);
    setEditingCollectionId(null);
    setDraft(name);
  }

  function commitRenameRequest() {
    if (editingRequestId) {
      const trimmed = draft.trim();
      if (trimmed) onRenameRequest(editingRequestId, trimmed);
    }
    setEditingRequestId(null);
  }

  function startRenameCollection(id: string) {
    setEditingCollectionId(id);
    setEditingRequestId(null);
    setDraft(id);
  }

  function commitRenameCollection() {
    if (editingCollectionId) {
      const trimmed = draft.trim();
      if (trimmed && trimmed !== editingCollectionId) onRenameCollection(editingCollectionId, trimmed);
    }
    setEditingCollectionId(null);
  }

  function handleDeleteCollection(name: string) {
    if (window.confirm(`Delete collection "${name}" and all its requests?`)) {
      onDeleteCollection(name);
    }
  }

  function handleDeleteRequest(id: string, collectionId: string, name: string) {
    if (window.confirm(`Delete request "${name}"? Any unsaved changes will be lost.`)) {
      onDeleteRequest(id, collectionId);
    }
  }

  return (
    <div className="w-56 flex-shrink-0 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      {/* Top actions */}
      <div className="p-2 border-b border-gray-200 flex flex-col gap-1">
        {/* New Request button with collection picker */}
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => {
              if (collections.length === 0) return;
              if (collections.length === 1) {
                onNewRequest(collections[0].id);
              } else {
                setNewRequestPickerOpen(v => !v);
              }
            }}
            disabled={collections.length === 0}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            New Request
            {collections.length > 1 && (
              <ChevronDown className="w-3 h-3 ml-auto" />
            )}
          </button>
          {newRequestPickerOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg z-10">
              {collections.map(c => (
                <button
                  key={c.id}
                  onClick={() => {
                    onNewRequest(c.id);
                    setNewRequestPickerOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 first:rounded-t last:rounded-b"
                >
                  {c.id}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* New Collection */}
        {addingCollection ? (
          <input
            ref={newCollectionInputRef}
            value={newCollectionDraft}
            onChange={e => setNewCollectionDraft(e.target.value)}
            onBlur={commitNewCollection}
            onKeyDown={e => {
              if (e.key === 'Enter') commitNewCollection();
              if (e.key === 'Escape') { setAddingCollection(false); setNewCollectionDraft(''); }
              e.stopPropagation();
            }}
            placeholder="Collection name…"
            className="w-full px-3 py-2 text-sm border border-blue-400 rounded focus:outline-none"
          />
        ) : (
          <button
            onClick={() => setAddingCollection(true)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            New Collection
          </button>
        )}
      </div>

      {/* Collections list */}
      <div className="flex-1 overflow-y-auto">
        {collections.length === 0 ? (
          <p className="px-3 py-4 text-xs text-gray-400 text-center">
            Create a collection to get started
          </p>
        ) : (
          collections.map(collection => {
            const isOpen = !collapsed.has(collection.id);
            return (
              <div
                key={collection.id}
                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverCollectionId(collection.id); }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCollectionId(null); }}
                onDrop={e => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData('requestId');
                  const from = e.dataTransfer.getData('fromCollectionId');
                  if (id && from && from !== collection.id) onMoveRequest(id, from, collection.id);
                  setDragOverCollectionId(null);
                }}
                className={dragOverCollectionId === collection.id ? 'ring-1 ring-inset ring-blue-400 rounded' : ''}
              >
                {/* Collection header */}
                <div className="group flex items-center px-2 py-1.5 bg-blue-100 hover:bg-gray-200 cursor-pointer select-none border-b border-blue-600">
                  <button
                    onClick={() => toggleCollapse(collection.id)}
                    className="flex-shrink-0 p-0.5 text-gray-400 hover:text-gray-600"
                  >
                    {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                  {editingCollectionId === collection.id ? (
                    <input
                      ref={editInputRef}
                      value={draft}
                      onChange={e => setDraft(e.target.value)}
                      onBlur={commitRenameCollection}
                      onKeyDown={e => {
                        if (e.key === 'Enter') commitRenameCollection();
                        if (e.key === 'Escape') setEditingCollectionId(null);
                        e.stopPropagation();
                      }}
                      className="flex-1 text-sm font-medium border-b border-blue-500 bg-transparent focus:outline-none ml-1"
                    />
                  ) : (
                    <span
                      onDoubleClick={() => startRenameCollection(collection.id)}
                      className="flex-1 text-sm font-medium text-gray-700 truncate ml-1"
                      title="Double-click to rename"
                    >
                      {collection.id}
                    </span>
                  )}
                  <button
                    onClick={() => handleDeleteCollection(collection.id)}
                    className="flex-shrink-0 p-0.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete collection"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Requests */}
                {isOpen && collection.requests.map(r => (
                  <div
                    key={r.id}
                    draggable={editingRequestId !== r.id}
                    onDragStart={e => {
                      e.dataTransfer.setData('requestId', r.id);
                      e.dataTransfer.setData('fromCollectionId', r.collectionId);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragEnd={() => setDragOverCollectionId(null)}
                    className={`group flex items-center pl-7 pr-2 py-1.5 text-sm transition-colors cursor-grab active:cursor-grabbing ${
                      r.id === activeId
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {editingRequestId === r.id ? (
                      <input
                        ref={editInputRef}
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        onBlur={commitRenameRequest}
                        onKeyDown={e => {
                          if (e.key === 'Enter') commitRenameRequest();
                          if (e.key === 'Escape') setEditingRequestId(null);
                          e.stopPropagation();
                        }}
                        className="flex-1 min-w-0 text-sm border-b border-blue-500 bg-transparent focus:outline-none"
                      />
                    ) : (
                      <button
                        onClick={() => onSelectRequest(r.id, r.collectionId)}
                        onDoubleClick={() => startRenameRequest(r.id, r.name)}
                        className="flex-1 min-w-0 text-left truncate"
                        title="Double-click to rename"
                      >
                        {r.name}
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteRequest(r.id, r.collectionId, r.name)}
                      className="flex-shrink-0 ml-1 p-0.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                      title="Delete request"
                      aria-label={`Delete request "${r.name}"`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
