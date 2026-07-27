import './index.css';
import App from './App';
import { createRoot } from 'react-dom/client';

export interface IElectronAPI {
  executeRequest: (request: any) => any,
  fetchToken: (authRequest: any) => any,
  listRequests: () => Promise<{ success: boolean; data: { id: string; name: string }[] }>,
  saveRequest: (data: any) => Promise<{ success: boolean }>,
  loadRequest: (id: string) => Promise<{ success: boolean; data: any }>,
  deleteRequest: (id: string) => Promise<{ success: boolean }>,
  introspectGraphQL: (url: string) => Promise<{ success: boolean; data?: any; error?: string }>,
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