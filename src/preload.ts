import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  executeRequest: async (request: any) => ipcRenderer.invoke("request", request),
  fetchToken: async (authRequest: any) => ipcRenderer.invoke("authRequest", authRequest),

  listCollections: () => ipcRenderer.invoke('list-collections'),
  saveRequest: (data: any) => ipcRenderer.invoke('save-request', data),
  loadRequest: (id: string, collectionId: string) => ipcRenderer.invoke('load-request', id, collectionId),
  deleteRequest: (id: string, collectionId: string) => ipcRenderer.invoke('delete-request', id, collectionId),
  createCollection: (name: string) => ipcRenderer.invoke('create-collection', name),
  renameCollection: (oldName: string, newName: string) => ipcRenderer.invoke('rename-collection', oldName, newName),
  deleteCollection: (name: string) => ipcRenderer.invoke('delete-collection', name),
  moveRequest: (id: string, fromCollectionId: string, toCollectionId: string) => ipcRenderer.invoke('move-request', id, fromCollectionId, toCollectionId),

  introspectGraphQL: (url: string) => ipcRenderer.invoke('graphql-introspect', url),
  pickFile: () => ipcRenderer.invoke('pick-file'),
});