const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs').promises;

// Keep a global reference of the window object
let mainWindow;
let serverProcess = null;

// Configuration file path
const configPath = path.join(app.getPath('userData'), 'localhostify-config.json');

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.cjs')
    },
    titleBarStyle: 'default',
    show: false // Don't show until ready
  });

  // Load the app
  const isDevelopment = !app.isPackaged; // Detect if we're in development
  
  if (isDevelopment) {
    mainWindow.loadURL('http://localhost:3000');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  // Create application menu
  createMenu();
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Import Config',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openFile'],
              filters: [
                { name: 'JSON Files', extensions: ['json'] },
                { name: 'TOML Files', extensions: ['toml'] },
                { name: 'All Files', extensions: ['*'] }
              ]
            });

            if (!result.canceled && result.filePaths.length > 0) {
              try {
                const configData = await fs.readFile(result.filePaths[0], 'utf8');
                mainWindow.webContents.send('config-imported', configData);
              } catch (error) {
                dialog.showErrorBox('Import Error', `Failed to import config: ${error.message}`);
              }
            }
          }
        },
        {
          label: 'Export Config',
          accelerator: 'CmdOrCtrl+S',
          click: async () => {
            // Request config data from renderer
            mainWindow.webContents.send('request-config-export');
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Server',
      submenu: [
        {
          label: 'Start Multi-Site Server',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow.webContents.send('start-multi-site-server');
          }
        },
        {
          label: 'Stop All Sites',
          accelerator: 'CmdOrCtrl+T',
          click: () => {
            mainWindow.webContents.send('stop-all-sites');
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
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About LocalHostify',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About LocalHostify',
              message: 'LocalHostify Desktop',
              detail: 'Multi-site hosting manager for developers\nVersion: 1.0.0\n\nBuilt with Electron and React'
            });
          }
        },
        {
          label: 'Learn More',
          click: () => {
            shell.openExternal('https://github.com/ameysawant1/localhostify');
          }
        }
      ]
    }
  ];

  // macOS menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });

    // Window menu
    template[4].submenu = [
      { role: 'close' },
      { role: 'minimize' },
      { role: 'zoom' },
      { type: 'separator' },
      { role: 'front' }
    ];
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handlers
ipcMain.handle('get-sites', async () => {
  try {
    const configData = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configData);
    return config.sites || [];
  } catch (error) {
    return []; // Return empty array if config doesn't exist
  }
});

ipcMain.handle('save-sites', async (event, sites) => {
  try {
    const config = { sites, lastUpdated: new Date().toISOString() };
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Failed to save sites:', error);
    return false;
  }
});

ipcMain.handle('start-site', async (event, siteId) => {
  try {
    // Load sites config to find the specific site
    const configData = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configData);
    const site = config.sites.find(s => s.id === siteId);
    
    if (!site) {
      throw new Error(`Site with ID ${siteId} not found`);
    }

    // Start individual site using server-cli
    const serverCliPath = path.join(__dirname, '../server-cli/target/debug/server-cli.exe');
    const args = [
      '--root', site.root,
      '--port', site.port.toString(),
      '--host', '0.0.0.0'
    ];

    if (site.https) {
      args.push('--https');
    }

    if (site.proxy_to) {
      args.push('--proxy-to', site.proxy_to.toString());
    }

    const siteProcess = spawn(serverCliPath, args, {
      stdio: 'pipe',
      detached: false
    });

    // Store process reference with site ID
    if (!global.siteProcesses) {
      global.siteProcesses = new Map();
    }
    global.siteProcesses.set(siteId, siteProcess);

    // Store site URL information
    if (!global.siteUrls) {
      global.siteUrls = new Map();
    }

    siteProcess.on('error', (error) => {
      console.error(`Site ${siteId} error:`, error);
      global.siteProcesses?.delete(siteId);
      global.siteUrls?.delete(siteId);
    });

    siteProcess.on('close', (code) => {
      console.log(`Site ${siteId} process exited with code ${code}`);
      global.siteProcesses?.delete(siteId);
      global.siteUrls?.delete(siteId);
    });

    siteProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`Site ${siteId} stdout:`, output);
      
      // Parse URLs from server output
      const urls = {};
      
      // Match Local URL
      const localMatch = output.match(/📱 Local: (http:\/\/localhost:\d+)/);
      if (localMatch) {
        urls.local = localMatch[1];
      }
      
      // Match Network URL
      const networkMatch = output.match(/📱 Network: (http:\/\/[\d.]+:\d+)/);
      if (networkMatch) {
        urls.network = networkMatch[1];
      }
      
      // Match Internet URL
      const internetMatch = output.match(/🌍 Internet: (http:\/\/[\d.]+:\d+)/);
      if (internetMatch) {
        urls.internet = internetMatch[1];
      }
      
      // Store URLs if we found any
      if (Object.keys(urls).length > 0) {
        global.siteUrls.set(siteId, urls);
        console.log(`Site ${siteId} URLs:`, urls);
      }
    });

    siteProcess.stderr.on('data', (data) => {
      console.error(`Site ${siteId} stderr:`, data.toString());
    });

    return { success: true, message: `Site ${site.name} started on port ${site.port}` };
  } catch (error) {
    console.error(`Failed to start site ${siteId}:`, error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stop-site', async (event, siteId) => {
  try {
    if (global.siteProcesses?.has(siteId)) {
      const process = global.siteProcesses.get(siteId);
      process.kill('SIGTERM');
      global.siteProcesses.delete(siteId);
      global.siteUrls?.delete(siteId);
      return { success: true, message: `Site stopped` };
    } else {
      return { success: false, error: 'Site process not found' };
    }
  } catch (error) {
    console.error(`Failed to stop site ${siteId}:`, error);
    return { success: false, error: error.message };
  }
});

// Get site URLs
ipcMain.handle('get-site-urls', async (event, siteId) => {
  try {
    const urls = global.siteUrls?.get(siteId) || {};
    return { success: true, urls };
  } catch (error) {
    console.error(`Failed to get site URLs ${siteId}:`, error);
    return { success: false, error: error.message, urls: {} };
  }
});

ipcMain.handle('start-multi-site-server', async () => {
  try {
    // Create temporary config file for multi-site mode
    const configData = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configData);
    
    if (!config.sites || config.sites.length === 0) {
      return { success: false, error: 'No sites configured' };
    }

    // Create multi-site config
    const multiSiteConfig = {
      sites: config.sites.map(site => ({
        name: site.name,
        root: site.root,
        port: site.port,
        https: site.https || false,
        proxy_to: site.proxy_to || null
      }))
    };

    const tempConfigPath = path.join(app.getPath('temp'), 'localhostify-multi-config.json');
    await fs.writeFile(tempConfigPath, JSON.stringify(multiSiteConfig, null, 2));

    // Start multi-site server
    if (!serverProcess) {
      const serverCliPath = path.join(__dirname, '../server-cli/target/debug/server-cli.exe');
      serverProcess = spawn(serverCliPath, ['--config', tempConfigPath], {
        stdio: 'pipe'
      });

      serverProcess.on('error', (error) => {
        console.error('Multi-site server process error:', error);
        serverProcess = null;
      });

      serverProcess.on('close', (code) => {
        console.log(`Multi-site server process exited with code ${code}`);
        serverProcess = null;
      });

      serverProcess.stdout.on('data', (data) => {
        console.log('Multi-site server stdout:', data.toString());
      });

      serverProcess.stderr.on('data', (data) => {
        console.error('Multi-site server stderr:', data.toString());
      });
    }
    
    return { success: true, message: 'Multi-site server started' };
  } catch (error) {
    console.error('Failed to start multi-site server:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stop-multi-site-server', async () => {
  try {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      serverProcess = null;
      return { success: true, message: 'Multi-site server stopped' };
    }
    return { success: false, error: 'Server not running' };
  } catch (error) {
    console.error('Failed to stop multi-site server:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-site-status', async (event, siteId) => {
  try {
    // Check if site process is running
    const isRunning = global.siteProcesses?.has(siteId) || false;
    return { success: true, status: isRunning ? 'running' : 'stopped' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-site-folder', async (event, sitePath) => {
  try {
    shell.showItemInFolder(path.resolve(sitePath));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('validate-port', async (event, port) => {
  try {
    const net = require('net');
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.listen(port, () => {
        server.once('close', () => {
          resolve({ success: true, available: true });
        });
        server.close();
      });
      
      server.on('error', () => {
        resolve({ success: true, available: false });
      });
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('browse-folder', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Site Root Directory'
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      return { success: true, path: result.filePaths[0] };
    }
    
    return { success: false, error: 'No folder selected' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('export-config', async (event, configData) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: 'localhostify-config.json',
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!result.canceled) {
    try {
      await fs.writeFile(result.filePath, configData);
      return { success: true, filePath: result.filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: 'Save cancelled' };
});

ipcMain.handle('open-url', async (event, url) => {
  shell.openExternal(url);
});

// App event handlers
app.whenReady().then(() => {
  createWindow();

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

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});