import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  executeRequest: async (requestParameters: Map<string, string>, url: string) => ipcRenderer.invoke("request", requestParameters, url)
});
