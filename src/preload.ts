import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  executeRequest: async (request: any) => ipcRenderer.invoke("request", request),
  fetchToken: async (authRequest: any) => ipcRenderer.invoke("authRequest", authRequest)
});
