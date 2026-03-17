import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  executeRequest: async (request: any) => ipcRenderer.invoke("request", request),
  fetchToken: async (authRequest: any) => ipcRenderer.invoke("authRequest", authRequest),

  saveRequestData: (data: any) => ipcRenderer.invoke('save-request-data', data),
  loadRequestData: () => ipcRenderer.invoke('load-request-data'),

  introspectGraphQL: (url: string) => ipcRenderer.invoke('graphql-introspect', url),
});