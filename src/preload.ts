import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  executeRequest: async (requestParameters: Map<string, string>, url: string, requestHeaders: Map<string, string>) => ipcRenderer.invoke("request", requestParameters, url, requestHeaders)
});
