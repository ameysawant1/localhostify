const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Site management
  getSites: () => ipcRenderer.invoke('get-sites'),
  saveSites: (sites) => ipcRenderer.invoke('save-sites', sites),
  startSite: (siteId) => ipcRenderer.invoke('start-site', siteId),
  stopSite: (siteId) => ipcRenderer.invoke('stop-site', siteId),
  getSiteStatus: (siteId) => ipcRenderer.invoke('get-site-status', siteId),
  getSiteUrls: (siteId) => ipcRenderer.invoke('get-site-urls', siteId),
  
  // Server management
  startMultiSiteServer: () => ipcRenderer.invoke('start-multi-site-server'),
  stopMultiSiteServer: () => ipcRenderer.invoke('stop-multi-site-server'),
  
  // File operations
  exportConfig: (configData) => ipcRenderer.invoke('export-config', configData),
  openUrl: (url) => ipcRenderer.invoke('open-url', url),
  openSiteFolder: (sitePath) => ipcRenderer.invoke('open-site-folder', sitePath),
  browseFolder: () => ipcRenderer.invoke('browse-folder'),
  
  // Utilities
  validatePort: (port) => ipcRenderer.invoke('validate-port', port),
  
  // Listen for events from main process
  onConfigImported: (callback) => ipcRenderer.on('config-imported', callback),
  onRequestConfigExport: (callback) => ipcRenderer.on('request-config-export', callback),
  onStartMultiSiteServer: (callback) => ipcRenderer.on('start-multi-site-server', callback),
  onStopAllSites: (callback) => ipcRenderer.on('stop-all-sites', callback),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  
  // Platform info
  platform: process.platform
});