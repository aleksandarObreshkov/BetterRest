import './index.css';
import App from './App';
import { createRoot } from 'react-dom/client';

export interface IElectronAPI {
  executeRequest: (requestParameters: Map<string, string>, url: string) => any
}

declare global {
  interface Window {
    api: IElectronAPI;
  }
}

// Mount React to the DOM
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);
}
