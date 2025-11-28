export interface IElectronAPI {
  test: () => string;
}

declare global {
  interface Window {
    api: IElectronAPI;
  }
}

import './index.css';

window.api.test()

console.log(
  '👋 This message is being logged by "renderer.js", included via webpack',
);
