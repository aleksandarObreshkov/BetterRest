import { useEffect, useState, useCallback } from 'react';
import RequestView from './components/RequestView';
import Sidebar from './components/Sidebar';
import TabBar from './components/TabBar';
import { SavedRequest, blankRequest } from './models/SavedRequest';
import { authFromJSON } from './models/Authentication';

export default function App() {
  const [requestList, setRequestList] = useState<{ id: string; name: string }[]>([]);
  const [openTabIds, setOpenTabIds] = useState<string[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [tabData, setTabData] = useState<Record<string, SavedRequest>>({});
  const [savedData, setSavedData] = useState<Record<string, SavedRequest>>({});

  const isDirty = (id: string) =>
    JSON.stringify(tabData[id]) !== JSON.stringify(savedData[id]);

  useEffect(() => {
    window.api.listRequests().then(result => {
      if (result.success) setRequestList(result.data);
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
        setRequestList(prev =>
          prev.some(r => r.id === data.id)
            ? prev.map(r => r.id === data.id ? { id: data.id, name: data.name } : r)
            : [...prev, { id: data.id, name: data.name }]
        );
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, tabData]);

  const handleOpenRequest = useCallback(async (id: string) => {
    if (openTabIds.includes(id)) {
      setActiveTabId(id);
      return;
    }
    const result = await window.api.loadRequest(id);
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

  const handleNewRequest = useCallback(() => {
    const id = crypto.randomUUID();
    const req = blankRequest(id);
    setTabData(prev => ({ ...prev, [id]: req }));
    setSavedData(prev => ({ ...prev, [id]: { ...req } }));
    setOpenTabIds(prev => [...prev, id]);
    setActiveTabId(id);
  }, []);

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

  const handleRename = useCallback((id: string, name: string) => {
    setTabData(prev => ({ ...prev, [id]: { ...prev[id], name } }));
    setRequestList(prev => prev.map(r => r.id === id ? { ...r, name } : r));
  }, []);

  const activeRequest = activeTabId ? tabData[activeTabId] : null;

  return (
    <div className="w-full h-full flex overflow-hidden">
      <Sidebar
        requests={requestList}
        activeId={activeTabId}
        openIds={openTabIds}
        onSelect={handleOpenRequest}
        onNewRequest={handleNewRequest}
        onRename={handleRename}
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
          onRename={handleRename}
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
