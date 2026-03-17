import { app, BrowserWindow, ipcMain } from 'electron';
import { fetchToken, handleHttpRequest } from './requestHandler';
import { Request } from './models/Request';
import { ClientCredentialsAuthentication } from './models/Authentication';
import { promises as fs } from 'fs';
import path from 'path';


declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

if (require('electron-squirrel-startup')) {
  app.quit();
}

// Get the file path for storing data
function getDataFilePath(filename: string) {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, filename);
}

// Save request data
ipcMain.handle('save-request-data', async (event, data) => {
  try {
    const filePath = getDataFilePath('requests.json');
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('Error saving request data:', error);
    return { success: false, error: error.message };
  }
});

// Load request data
ipcMain.handle('load-request-data', async () => {
  try {
    const filePath = getDataFilePath('requests.json');
    const data = await fs.readFile(filePath, 'utf-8');
    return { success: true, data: JSON.parse(data) };
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist yet, return null
      return { success: true, data: null };
    }
    console.error('Error loading request data:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("request", async (_, requestJson: any) => {
  const request = Request.fromJSON(requestJson)
  return await handleHttpRequest(request)
})

ipcMain.handle("authRequest", async (_, requestJson: any) => {
  const authRequest = ClientCredentialsAuthentication.fromJSON(requestJson)
  return await fetchToken(authRequest)
})

// GraphQL introspection — runs in main process to avoid CORS restrictions
ipcMain.handle('graphql-introspect', async (_, url: string) => {
  try {
    const introspectionQuery = `
      query IntrospectionQuery {
        __schema {
          queryType { name }
          mutationType { name }
          subscriptionType { name }
          types {
            ...FullType
          }
          directives {
            name
            description
            locations
            args {
              ...InputValue
            }
          }
        }
      }

      fragment FullType on __Type {
        kind
        name
        description
        fields(includeDeprecated: true) {
          name
          description
          args {
            ...InputValue
          }
          type {
            ...TypeRef
          }
          isDeprecated
          deprecationReason
        }
        inputFields {
          ...InputValue
        }
        interfaces {
          ...TypeRef
        }
        enumValues(includeDeprecated: true) {
          name
          description
          isDeprecated
          deprecationReason
        }
        possibleTypes {
          ...TypeRef
        }
      }

      fragment InputValue on __InputValue {
        name
        description
        type { ...TypeRef }
        defaultValue
      }

      fragment TypeRef on __Type {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                  ofType {
                    kind
                    name
                    ofType {
                      kind
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ query: introspectionQuery }),
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }

    const result = await response.json();

    if (result.errors) {
      return { success: false, error: result.errors[0]?.message ?? 'Introspection failed' };
    }

    return { success: true, data: result.data };
  } catch (error) {
    console.error('GraphQL introspection error:', error);
    return { success: false, error: error.message };
  }
});

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
app.on('ready', createWindow);

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