import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { fetchToken, handleHttpRequest } from './requestHandler';
import { Request } from './models/Request';
import { ClientCredentialsAuthentication } from './models/Authentication';
import { CollectionNode } from './models/Collection';
import { promises as fs } from 'fs';
import path from 'path';


declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

if (require('electron-squirrel-startup')) {
  app.quit();
}

function getCollectionsDir() {
  return path.join(app.getPath('userData'), 'collections');
}

async function migrateIfNeeded() {
  const oldDir = path.join(app.getPath('userData'), 'requests');
  try {
    await fs.access(oldDir);
  } catch {
    return; // old dir doesn't exist, nothing to migrate
  }
  const collectionsDir = getCollectionsDir();
  const defaultDir = path.join(collectionsDir, 'Default');
  await fs.mkdir(defaultDir, { recursive: true });
  const files = await fs.readdir(oldDir);
  await Promise.all(
    files.filter(f => f.endsWith('.json')).map(async f => {
      const raw = await fs.readFile(path.join(oldDir, f), 'utf-8');
      const data = JSON.parse(raw);
      data.collectionId = 'Default';
      await fs.writeFile(path.join(defaultDir, f), JSON.stringify(data, null, 2), 'utf-8');
    })
  );
  await fs.rename(oldDir, path.join(app.getPath('userData'), 'requests.migrated'));
}

ipcMain.handle('list-collections', async () => {
  await migrateIfNeeded();
  const dir = getCollectionsDir();
  await fs.mkdir(dir, { recursive: true });
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const collections: CollectionNode[] = await Promise.all(
    entries
      .filter(e => e.isDirectory())
      .map(async e => {
        const collectionDir = path.join(dir, e.name);
        const files = await fs.readdir(collectionDir);
        const requests = await Promise.all(
          files.filter(f => f.endsWith('.json')).map(async f => {
            const raw = await fs.readFile(path.join(collectionDir, f), 'utf-8');
            const parsed = JSON.parse(raw);
            return { id: parsed.id, name: parsed.name, collectionId: e.name };
          })
        );
        return { id: e.name, requests };
      })
  );
  return { success: true, data: collections };
});

ipcMain.handle('save-request', async (_, requestData: any) => {
  const collectionDir = path.join(getCollectionsDir(), requestData.collectionId);
  await fs.mkdir(collectionDir, { recursive: true });
  const filePath = path.join(collectionDir, `${requestData.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(requestData, null, 2), 'utf-8');
  return { success: true };
});

ipcMain.handle('load-request', async (_, id: string, collectionId: string) => {
  const filePath = path.join(getCollectionsDir(), collectionId, `${id}.json`);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return { success: true, data: JSON.parse(raw) };
  } catch (error) {
    if (error.code === 'ENOENT') return { success: true, data: null };
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-request', async (_, id: string, collectionId: string) => {
  const filePath = path.join(getCollectionsDir(), collectionId, `${id}.json`);
  await fs.unlink(filePath);
  return { success: true };
});

ipcMain.handle('create-collection', async (_, name: string) => {
  await fs.mkdir(path.join(getCollectionsDir(), name), { recursive: true });
  return { success: true };
});

ipcMain.handle('rename-collection', async (_, oldName: string, newName: string) => {
  const collectionsDir = getCollectionsDir();
  const oldDir = path.join(collectionsDir, oldName);
  const newDir = path.join(collectionsDir, newName);
  await fs.rename(oldDir, newDir);
  const files = await fs.readdir(newDir);
  await Promise.all(
    files.filter(f => f.endsWith('.json')).map(async f => {
      const filePath = path.join(newDir, f);
      const raw = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(raw);
      data.collectionId = newName;
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    })
  );
  return { success: true };
});

ipcMain.handle('delete-collection', async (_, name: string) => {
  await fs.rm(path.join(getCollectionsDir(), name), { recursive: true, force: true });
  return { success: true };
});

ipcMain.handle('move-request', async (_, id: string, fromCollectionId: string, toCollectionId: string) => {
  const collectionsDir = getCollectionsDir();
  const fromPath = path.join(collectionsDir, fromCollectionId, `${id}.json`);
  const toDir = path.join(collectionsDir, toCollectionId);
  const toPath = path.join(toDir, `${id}.json`);
  const raw = await fs.readFile(fromPath, 'utf-8');
  const data = JSON.parse(raw);
  data.collectionId = toCollectionId;
  await fs.mkdir(toDir, { recursive: true });
  await fs.writeFile(toPath, JSON.stringify(data, null, 2), 'utf-8');
  await fs.unlink(fromPath);
  return { success: true };
});

ipcMain.handle("request", async (_, requestJson: any) => {
  const request = Request.fromJSON(requestJson)
  return await handleHttpRequest(request)
})

ipcMain.handle("authRequest", async (_, requestJson: any) => {
  const authRequest = ClientCredentialsAuthentication.fromJSON(requestJson)
  return await fetchToken(authRequest)
})

ipcMain.handle('pick-file', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openFile'] })
  return result.canceled ? null : result.filePaths[0]
})

const createWindow = (): void => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  //mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.