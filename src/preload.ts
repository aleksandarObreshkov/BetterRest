import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('api', {
  test: () => console.log("I Love my zzzmeow")
});
