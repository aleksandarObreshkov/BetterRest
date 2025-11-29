import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('api', {
  test: () => "I Love my zzzmeow"
});
