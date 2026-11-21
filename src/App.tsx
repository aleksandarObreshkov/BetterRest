import { useEffect, useState, useCallback } from 'react';
import RequestView from './components/RequestView';
import Sidebar from './components/Sidebar';
import TabBar from './components/TabBar';
import ImportModal from './components/ImportModal';
import { SavedRequest, blankRequest } from './models/SavedRequest';
import { CollectionNode } from './models/Collection';
import { MappedRequest } from './utils/bruYamlMapper';
import { authFromJSON } from './models/Authentication';

interface ImportPending {
  collections: { name: string; resolvedName: string; requests: MappedRequest[] }[];
  failed: { file: string; error: string }[];
}

function resolveCollectionName(base: string, existingIds: string[]): string {
  if (!existingIds.includes(base)) return base;
  const withSuffix = `${base}-Bruno`;
  if (!existingIds.includes(withSuffix)) return withSuffix;
  let i = 1;
  while (existingIds.includes(`${withSuffix}-${i}`)) i++;
  return `${withSuffix}-${i}`;
}

export default function App() {
  const [collections, setCollections] = useState<CollectionNode[]>([]);
  const [openTabIds, setOpenTabIds] = useState<string[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [tabData, setTabData] = useState<Record<string, SavedRequest>>({});
  const [savedData, setSavedData] = useState<Record<string, SavedRequest>>({});
  const [importPending, setImportPending] = useState<ImportPending | null>(null);

  const isDirty = (id: string) =>
    JSON.stringify(tabData[id]) !== JSON.stringify(savedData[id]);

  useEffect(() => {
    window.api.listCollections().then(result => {
      if (result.success) setCollections(result.data);
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!activeTabId) return;
        const data = tabData[activeTabId];
        if (!data) return;
        await window.api.saveRequest(data);
        setSavedData(prev => ({ ...prev, [activeTabId]: { ...data } }));
        setCollections(prev => prev.map(c =>
          c.id === data.collectionId
            ? {
                ...c,
                requests: c.requests.some(r => r.id === data.id)
                  ? c.requests.map(r => r.id === data.id ? { id: data.id, name: data.name, collectionId: data.collectionId } : r)
                  : [...c.requests, { id: data.id, name: data.name, collectionId: data.collectionId }],
              }
            : c
        ));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, tabData]);

  const handleOpenRequest = useCallback(async (id: string, collectionId: string) => {
    if (openTabIds.includes(id)) {
      setActiveTabId(id);
      return;
    }
    const result = await window.api.loadRequest(id, collectionId);
    if (!result.success || !result.data) return;
    const data: SavedRequest = {
      ...result.data,
      auth: authFromJSON(result.data.auth),
    };
    setTabData(prev => ({ ...prev, [id]: data }));
    setSavedData(prev => ({ ...prev, [id]: { ...data } }));
    setOpenTabIds(prev => [...prev, id]);
    setActiveTabId(id);
  }, [openTabIds]);

  const handleNewRequest = useCallback((collectionId: string) => {
    const id = crypto.randomUUID();
    const req = blankRequest(id, collectionId);
    setTabData(prev => ({ ...prev, [id]: req }));
    setSavedData(prev => ({ ...prev, [id]: { ...req } }));
    setOpenTabIds(prev => [...prev, id]);
    setActiveTabId(id);
  }, []);

  const handleNewCollection = useCallback(async (name: string) => {
    await window.api.createCollection(name);
    setCollections(prev => [...prev, { id: name, requests: [] }]);
  }, []);

  const handleRenameCollection = useCallback(async (oldName: string, newName: string) => {
    await window.api.renameCollection(oldName, newName);
    setCollections(prev => prev.map(c =>
      c.id === oldName
        ? { ...c, id: newName, requests: c.requests.map(r => ({ ...r, collectionId: newName })) }
        : c
    ));
    setTabData(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(id => {
        if (updated[id].collectionId === oldName) {
          updated[id] = { ...updated[id], collectionId: newName };
        }
      });
      return updated;
    });
  }, []);

  const handleDeleteCollection = useCallback(async (name: string) => {
    await window.api.deleteCollection(name);
    setCollections(prev => prev.filter(c => c.id !== name));
  }, []);

  const handleDeleteRequest = useCallback(async (id: string, collectionId: string) => {
    try {
      const result = await window.api.deleteRequest(id, collectionId);
      if (!result.success) {
        window.alert('Could not delete the request. Please try again.');
        return;
      }
    } catch {
      window.alert('Could not delete the request. Please try again.');
      return;
    }

    setCollections(prev => prev.map(c =>
      c.id === collectionId ? { ...c, requests: c.requests.filter(r => r.id !== id) } : c
    ));
    const remainingTabIds = openTabIds.filter(t => t !== id);
    const index = openTabIds.indexOf(id);
    setActiveTabId(prev => prev === id ? remainingTabIds[Math.max(0, index - 1)] ?? null : prev);
    setOpenTabIds(prev => prev.filter(t => t !== id));
    setTabData(prev => { const next = { ...prev }; delete next[id]; return next; });
    setSavedData(prev => { const next = { ...prev }; delete next[id]; return next; });
  }, [openTabIds]);

  const handleMoveRequest = useCallback(async (id: string, fromCollectionId: string, toCollectionId: string) => {
    await window.api.moveRequest(id, fromCollectionId, toCollectionId);
    setCollections(prev => {
      const request = prev.find(c => c.id === fromCollectionId)?.requests.find(r => r.id === id);
      if (!request) return prev;
      const moved = { ...request, collectionId: toCollectionId };
      return prev.map(c => {
        if (c.id === fromCollectionId) return { ...c, requests: c.requests.filter(r => r.id !== id) };
        if (c.id === toCollectionId) return { ...c, requests: [...c.requests, moved] };
        return c;
      });
    });
    setTabData(prev => prev[id] ? { ...prev, [id]: { ...prev[id], collectionId: toCollectionId } } : prev);
    setSavedData(prev => prev[id] ? { ...prev, [id]: { ...prev[id], collectionId: toCollectionId } } : prev);
  }, []);

  const handleStartImport = useCallback(async () => {
    const result = await window.api.importBruno();
    if (!result) return;
    const existingIds = collections.map(c => c.id);
    const used: string[] = [];
    const resolvedCollections = result.collections.map(c => {
      const resolvedName = resolveCollectionName(c.name, [...existingIds, ...used]);
      used.push(resolvedName);
      return { ...c, resolvedName };
    });
    setImportPending({ collections: resolvedCollections, failed: result.failed });
  }, [collections]);

  const handleConfirmImport = useCallback(async () => {
    if (!importPending) return;
    const newCollectionNodes: CollectionNode[] = [];
    for (const col of importPending.collections) {
      await window.api.createCollection(col.resolvedName);
      const summaries = await Promise.all(
        col.requests.map(async mapped => {
          const id = crypto.randomUUID();
          const headers = mapped.headers.map((h, idx) => ({ ...h, id: idx }));
          const req: SavedRequest = {
            id,
            collectionId: col.resolvedName,
            name: mapped.name,
            url: mapped.url,
            method: mapped.method,
            headers,
            auth: null,
            body: mapped.body,
            bodyType: mapped.bodyType,
            selectedGraphQLOperation: null,
            graphqlVariables: undefined,
          };
          await window.api.saveRequest(req);
          return { id, name: req.name, collectionId: col.resolvedName };
        })
      );
      newCollectionNodes.push({ id: col.resolvedName, requests: summaries });
    }
    setCollections(prev => [...prev, ...newCollectionNodes]);
    setImportPending(null);
  }, [importPending]);

  useEffect(() => {
    return window.api.onMenuImportBruno(handleStartImport);
  }, [handleStartImport]);

  const handleCloseTab = useCallback((id: string) => {
    if (isDirty(id)) {
      const ok = window.confirm('You have unsaved changes. Close anyway?');
      if (!ok) return;
    }
    setOpenTabIds(prev => {
      const idx = prev.indexOf(id);
      const next = prev.filter(t => t !== id);
      if (activeTabId === id) {
        setActiveTabId(next[Math.max(0, idx - 1)] ?? null);
      }
      return next;
    });
    setTabData(prev => { const n = { ...prev }; delete n[id]; return n; });
    setSavedData(prev => { const n = { ...prev }; delete n[id]; return n; });
  }, [activeTabId, tabData, savedData]);

  const handleTabChange = useCallback((id: string, patch: Partial<SavedRequest>) => {
    setTabData(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  const handleRenameRequest = useCallback((id: string, name: string) => {
    setTabData(prev => ({ ...prev, [id]: { ...prev[id], name } }));
    setCollections(prev => prev.map(c => ({
      ...c,
      requests: c.requests.map(r => r.id === id ? { ...r, name } : r),
    })));
  }, []);

  const activeRequest = activeTabId ? tabData[activeTabId] : null;

  return (
    <div className="w-full h-full flex overflow-hidden">
      {importPending && (
        <ImportModal
          collections={importPending.collections}
          failed={importPending.failed}
          onConfirm={handleConfirmImport}
          onCancel={() => setImportPending(null)}
        />
      )}
      <Sidebar
        collections={collections}
        activeId={activeTabId}
        openIds={openTabIds}
        onSelectRequest={handleOpenRequest}
        onNewRequest={handleNewRequest}
        onNewCollection={handleNewCollection}
        onRenameRequest={handleRenameRequest}
        onRenameCollection={handleRenameCollection}
        onDeleteCollection={handleDeleteCollection}
        onDeleteRequest={handleDeleteRequest}
        onMoveRequest={handleMoveRequest}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TabBar
          tabs={openTabIds.map(id => ({
            id,
            name: tabData[id]?.name ?? 'Untitled',
            isDirty: isDirty(id),
          }))}
          activeId={activeTabId}
          onSelect={setActiveTabId}
          onClose={handleCloseTab}
          onRename={handleRenameRequest}
        />
        {activeRequest ? (
          <RequestView
            key={activeTabId}
            requestId={activeTabId}
            name={activeRequest.name}
            url={activeRequest.url}
            method={activeRequest.method}
            headers={activeRequest.headers}
            auth={activeRequest.auth}
            body={activeRequest.body}
            bodyType={activeRequest.bodyType}
            selectedGraphQLOperation={activeRequest.selectedGraphQLOperation}
            graphqlVariables={activeRequest.graphqlVariables}
            onChange={patch => handleTabChange(activeTabId, patch)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Select a request or create a new one
          </div>
        )}
      </div>
    </div>
  );
}
