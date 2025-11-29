export interface IElectronAPI {
  test: () => string;
}

declare global {
  interface Window {
    api: IElectronAPI;
  }
}

import './index.css';
import App from './App';
import { createRoot } from 'react-dom/client';


// Mount React to the DOM
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);
}
