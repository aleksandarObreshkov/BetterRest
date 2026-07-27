import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  executeRequest: async (request: any) => ipcRenderer.invoke("request", request),
  fetchToken: async (authRequest: any) => ipcRenderer.invoke("authRequest", authRequest),

  listRequests: () => ipcRenderer.invoke('list-requests'),
  saveRequest: (data: any) => ipcRenderer.invoke('save-request', data),
  loadRequest: (id: string) => ipcRenderer.invoke('load-request', id),
  deleteRequest: (id: string) => ipcRenderer.invoke('delete-request', id),

  introspectGraphQL: (url: string) => ipcRenderer.invoke('graphql-introspect', url),
});