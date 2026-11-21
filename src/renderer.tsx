import './index.css';
import App from './App';
import { createRoot } from 'react-dom/client';
import { CollectionNode } from './models/Collection';
import { MappedRequest } from './utils/bruYamlMapper';
import { HttpResponse } from './types/HttpResponse';

export interface BrunoImportResult {
  collections: { name: string; requests: MappedRequest[] }[];
  failed: { file: string; error: string }[];
}

export interface IElectronAPI {
  executeRequest: (request: any, executionId?: string) => Promise<HttpResponse>,
  cancelRequest: (executionId: string) => Promise<void>,
  fetchToken: (authRequest: any) => any,
  listCollections: () => Promise<{ success: boolean; data: CollectionNode[] }>,
  saveRequest: (data: any) => Promise<{ success: boolean }>,
  loadRequest: (id: string, collectionId: string) => Promise<{ success: boolean; data: any }>,
  deleteRequest: (id: string, collectionId: string) => Promise<{ success: boolean }>,
  createCollection: (name: string) => Promise<{ success: boolean }>,
  renameCollection: (oldName: string, newName: string) => Promise<{ success: boolean }>,
  deleteCollection: (name: string) => Promise<{ success: boolean }>,
  moveRequest: (id: string, fromCollectionId: string, toCollectionId: string) => Promise<{ success: boolean }>,
  importBruno: () => Promise<BrunoImportResult | null>,
  onMenuImportBruno: (cb: () => void) => () => void,
  introspectGraphQL: (url: string) => Promise<{ success: boolean; data?: any; error?: string }>,
  pickFile: () => Promise<string | null>,
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
