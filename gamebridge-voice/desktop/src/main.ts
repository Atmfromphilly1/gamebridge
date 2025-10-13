import { app, BrowserWindow, Menu, Tray, nativeImage, globalShortcut } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const isDev = process.env.NODE_ENV === 'development';

function createWindow(): void {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    titleBarStyle: 'hiddenInset',
    show: false,
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:8080');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle minimize to tray
  mainWindow.on('minimize', (event) => {
    event.preventDefault();
    mainWindow?.hide();
  });

  // Handle close to tray
  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
}

function createTray(): void {
  const iconPath = path.join(__dirname, '../assets/tray-icon.png');
  const trayIcon = nativeImage.createFromPath(iconPath);
  
  tray = new Tray(trayIcon);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show GameBridge Voice',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      }
    },
    {
      label: 'Toggle Mute',
      click: () => {
        // Send toggle mute event to renderer
        mainWindow?.webContents.send('toggle-mute');
      }
    },
    {
      label: 'Toggle Deafen',
      click: () => {
        // Send toggle deafen event to renderer
        mainWindow?.webContents.send('toggle-deafen');
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setContextMenu(contextMenu);
  tray.setToolTip('GameBridge Voice');
  
  tray.on('click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Lobby',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow?.webContents.send('create-lobby');
          }
        },
        {
          label: 'Join Lobby',
          accelerator: 'CmdOrCtrl+J',
          click: () => {
            mainWindow?.webContents.send('join-lobby');
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.isQuiting = true;
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Voice',
      submenu: [
        {
          label: 'Toggle Mute',
          accelerator: 'CmdOrCtrl+M',
          click: () => {
            mainWindow?.webContents.send('toggle-mute');
          }
        },
        {
          label: 'Toggle Deafen',
          accelerator: 'CmdOrCtrl+D',
          click: () => {
            mainWindow?.webContents.send('toggle-deafen');
          }
        },
        {
          label: 'Push to Talk',
          accelerator: 'Space',
          click: () => {
            mainWindow?.webContents.send('push-to-talk');
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function registerGlobalShortcuts(): void {
  // Register global shortcuts for voice controls
  globalShortcut.register('CommandOrControl+Shift+M', () => {
    mainWindow?.webContents.send('toggle-mute');
  });

  globalShortcut.register('CommandOrControl+Shift+D', () => {
    mainWindow?.webContents.send('toggle-deafen');
  });

  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    mainWindow?.webContents.send('push-to-talk');
  });
}

// App event handlers
app.whenReady().then(() => {
  createWindow();
  createTray();
  createMenu();
  registerGlobalShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
  });
});
