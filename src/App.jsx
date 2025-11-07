import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Plus, 
  Play, 
  Square, 
  Settings, 
  Globe, 
  Monitor,
  ExternalLink,
  Trash2,
  Edit3,
  FileText,
  Upload
} from 'lucide-react';

const App = () => {
  const [sites, setSites] = useState([]);
  const [isServerRunning, setIsServerRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('sites');
  const [showAddSite, setShowAddSite] = useState(false);

  // Check if we're running in Electron
  const isElectron = window.electronAPI !== undefined;

  // Load sites from Electron or use sample data
  useEffect(() => {
    console.log('App useEffect - isElectron:', isElectron);
    console.log('window.electronAPI:', window.electronAPI);
    if (isElectron) {
      console.log('Loading sites from Electron...');
      loadSitesFromElectron();
      setupElectronListeners();
    } else {
      console.log('Using sample data for web version');
      // Sample data for web version
      setSites([
        {
          id: 1,
          name: 'Main Site',
          root: 'examples',
          port: 8080,
          https: false,
          proxy_to: 3000,
          status: 'running'
        },
        {
          id: 2,
          name: 'Portfolio',
          root: 'examples/portfolio',
          port: 8081,
          https: false,
          proxy_to: null,
          status: 'stopped'
        },
        {
          id: 3,
          name: 'Blog',
          root: 'examples/blog',
          port: 8082,
          https: false,
          proxy_to: 3000,
          status: 'running'
        }
      ]);
    }
  }, []);

  // Electron-specific functions
  const loadSitesFromElectron = async () => {
    if (isElectron) {
      try {
        console.log('Calling electronAPI.getSites()...');
        const sitesData = await window.electronAPI.getSites();
        console.log('Received sites data:', sitesData);
        
        // Check actual status for each site
        const updatedSites = await Promise.all(sitesData.map(async (site) => {
          try {
            const statusResult = await window.electronAPI.getSiteStatus(site.id);
            return { ...site, status: statusResult.status === 'running' ? 'running' : 'stopped' };
          } catch (error) {
            return { ...site, status: 'stopped' }; // Default to stopped if we can't check
          }
        }));
        
        setSites(updatedSites);
      } catch (error) {
        console.error('Failed to load sites:', error);
      }
    }
  };

  const setupElectronListeners = () => {
    if (isElectron) {
      // Listen for menu actions
      window.electronAPI.onStartMultiSiteServer(() => {
        startServer();
      });

      window.electronAPI.onStopAllSites(() => {
        stopServer();
      });

      window.electronAPI.onConfigImported((event, configData) => {
        try {
          const config = JSON.parse(configData);
          if (config.sites) {
            setSites(config.sites);
          }
        } catch (error) {
          console.error('Failed to import config:', error);
        }
      });

      window.electronAPI.onRequestConfigExport(() => {
        exportConfigToElectron();
      });
    }
  };

  const saveSitesToElectron = async (sitesData) => {
    if (isElectron) {
      try {
        await window.electronAPI.saveSites(sitesData);
      } catch (error) {
        console.error('Failed to save sites:', error);
      }
    }
  };

  const exportConfigToElectron = async () => {
    if (isElectron) {
      const config = {
        sites: sites,
        lastUpdated: new Date().toISOString()
      };
      try {
        const result = await window.electronAPI.exportConfig(JSON.stringify(config, null, 2));
        if (result.success) {
          console.log('Config exported successfully to:', result.filePath);
        } else {
          console.error('Export failed:', result.error);
        }
      } catch (error) {
        console.error('Failed to export config:', error);
      }
    }
  };

  const startServer = async () => {
    try {
      if (isElectron) {
        const result = await window.electronAPI.startMultiSiteServer();
        if (result.success) {
          setIsServerRunning(true);
          console.log(result.message);
          
          // Update all sites to running status
          const updatedSites = sites.map(site => ({ ...site, status: 'running' }));
          setSites(updatedSites);
          await saveSitesToElectron(updatedSites);
        } else {
          console.error('Failed to start multi-site server:', result.error);
          alert(`Failed to start server: ${result.error}`);
        }
      } else {
        setIsServerRunning(true);
      }
    } catch (error) {
      console.error('Failed to start server:', error);
      alert(`Failed to start server: ${error.message}`);
    }
  };

  const stopServer = async () => {
    try {
      if (isElectron) {
        const result = await window.electronAPI.stopMultiSiteServer();
        if (result.success) {
          setIsServerRunning(false);
          console.log(result.message);
          
          // Update all sites to stopped status
          const updatedSites = sites.map(site => ({ ...site, status: 'stopped' }));
          setSites(updatedSites);
          await saveSitesToElectron(updatedSites);
        } else {
          console.error('Failed to stop multi-site server:', result.error);
        }
      } else {
        setIsServerRunning(false);
      }
    } catch (error) {
      console.error('Failed to stop server:', error);
    }
  };

  const addSite = async (siteData) => {
    const newSite = {
      id: Date.now(),
      ...siteData,
      status: 'stopped'
    };
    const updatedSites = [...sites, newSite];
    setSites(updatedSites);
    setShowAddSite(false);
    
    if (isElectron) {
      await saveSitesToElectron(updatedSites);
    }
  };

  const removeSite = async (siteId) => {
    const updatedSites = sites.filter(site => site.id !== siteId);
    setSites(updatedSites);
    if (isElectron) {
      await saveSitesToElectron(updatedSites);
    }
  };

  const toggleSiteStatus = async (siteId) => {
    const site = sites.find(s => s.id === siteId);
    if (!site) return;

    console.log(`Toggling site ${siteId} (${site.name}) from ${site.status}`);

    try {
      if (isElectron) {
        let result;
        if (site.status === 'running') {
          console.log('Stopping site...');
          result = await window.electronAPI.stopSite(siteId);
        } else {
          console.log('Starting site...');
          result = await window.electronAPI.startSite(siteId);
        }

        console.log('Server response:', result);

        if (result.success) {
          const newStatus = site.status === 'running' ? 'stopped' : 'running';
          const updatedSites = sites.map(s => 
            s.id === siteId ? { ...s, status: newStatus } : s
          );
          setSites(updatedSites);
          await saveSitesToElectron(updatedSites);
          console.log(result.message);
        } else {
          console.error('Failed to toggle site:', result.error);
          alert(`Failed to ${site.status === 'running' ? 'stop' : 'start'} site: ${result.error}`);
        }
      } else {
        // Web version simulation
        const newStatus = site.status === 'running' ? 'stopped' : 'running';
        const updatedSites = sites.map(s => 
          s.id === siteId ? { ...s, status: newStatus } : s
        );
        setSites(updatedSites);
      }
    } catch (error) {
      console.error('Error toggling site status:', error);
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Server className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">LocalHostify</h1>
                <p className="text-sm text-gray-500">Multi-site hosting manager</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                isServerRunning 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {isServerRunning ? 'Running' : 'Stopped'}
              </div>
              
              {isServerRunning ? (
                <button
                  onClick={stopServer}
                  className="btn btn-danger btn-sm flex items-center space-x-2"
                >
                  <Square className="w-4 h-4" />
                  <span>Stop All</span>
                </button>
              ) : (
                <button
                  onClick={startServer}
                  className="btn btn-primary btn-sm flex items-center space-x-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Start All</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b">
        <div className="px-6">
          <div className="flex space-x-8">
            {[
              { id: 'sites', label: 'Sites', icon: Globe },
              { id: 'monitoring', label: 'Monitoring', icon: Monitor },
              { id: 'config', label: 'Configuration', icon: Settings }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-1 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="p-6">
        {activeTab === 'sites' && (
          <div>
            {/* Sites Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Managed Sites</h2>
                <p className="text-sm text-gray-600">Configure and manage your hosted websites</p>
              </div>
              <button
                onClick={() => setShowAddSite(true)}
                className="btn btn-primary btn-md flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Site</span>
              </button>
            </div>

            {/* Sites Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {sites.map(site => (
                <SiteCard
                  key={site.id}
                  site={site}
                  onToggleStatus={() => toggleSiteStatus(site.id)}
                  onRemove={() => removeSite(site.id)}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'monitoring' && (
          <MonitoringPanel sites={sites} />
        )}

        {activeTab === 'config' && (
          <ConfigurationPanel sites={sites} setSites={setSites} />
        )}
      </main>

      {/* Add Site Modal */}
      {showAddSite && (
        <AddSiteModal
          onClose={() => setShowAddSite(false)}
          onAdd={addSite}
        />
      )}
    </div>
  );
};

// Site Card Component
const SiteCard = ({ site, onToggleStatus, onRemove, onEdit }) => {
  const isElectron = window.electronAPI !== undefined;
  const [siteUrls, setSiteUrls] = useState({});

  // Fetch URLs when site is running
  useEffect(() => {
    const fetchUrls = async () => {
      if (isElectron && site.status === 'running') {
        try {
          const result = await window.electronAPI.getSiteUrls(site.id);
          if (result.success) {
            setSiteUrls(result.urls);
          }
        } catch (error) {
          console.error('Failed to fetch site URLs:', error);
        }
      } else {
        setSiteUrls({});
      }
    };

    fetchUrls();
  }, [site.status, site.id, isElectron]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'bg-green-100 text-green-800 border-green-200';
      case 'stopped': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const openInBrowser = async (url) => {
    if (isElectron) {
      await window.electronAPI.openUrl(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const openSiteFolder = async () => {
    if (isElectron) {
      const result = await window.electronAPI.openSiteFolder(site.root);
      if (!result.success) {
        alert(`Failed to open folder: ${result.error}`);
      }
    }
  };

  const copyToClipboard = (url) => {
    navigator.clipboard.writeText(url).then(() => {
      // Could add a toast notification here
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    });
  };

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">{site.name}</h3>
          <p className="text-sm text-gray-600">{site.root}</p>
        </div>
        <div className={`px-2 py-1 rounded-md text-xs font-medium border ${getStatusColor(site.status)}`}>
          {site.status}
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {/* Show URLs when running, port when stopped */}
        {site.status === 'running' && Object.keys(siteUrls).length > 0 ? (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700 mb-1">Access URLs:</div>
            {siteUrls.local && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">📱 Local:</span>
                <div className="flex items-center space-x-1">
                  <button 
                    onClick={() => openInBrowser(siteUrls.local)}
                    className="font-mono text-blue-600 hover:text-blue-800 text-xs"
                    title="Click to open"
                  >
                    {siteUrls.local}
                  </button>
                  <button 
                    onClick={() => copyToClipboard(siteUrls.local)}
                    className="text-gray-400 hover:text-gray-600"
                    title="Copy to clipboard"
                  >
                    📋
                  </button>
                </div>
              </div>
            )}
            {siteUrls.network && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">📱 Network:</span>
                <div className="flex items-center space-x-1">
                  <button 
                    onClick={() => openInBrowser(siteUrls.network)}
                    className="font-mono text-blue-600 hover:text-blue-800 text-xs"
                    title="Click to open"
                  >
                    {siteUrls.network}
                  </button>
                  <button 
                    onClick={() => copyToClipboard(siteUrls.network)}
                    className="text-gray-400 hover:text-gray-600"
                    title="Copy to clipboard"
                  >
                    📋
                  </button>
                </div>
              </div>
            )}
            {siteUrls.internet && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">🌍 Internet:</span>
                <div className="flex items-center space-x-1">
                  <button 
                    onClick={() => openInBrowser(siteUrls.internet)}
                    className="font-mono text-blue-600 hover:text-blue-800 text-xs"
                    title="Click to open"
                  >
                    {siteUrls.internet}
                  </button>
                  <button 
                    onClick={() => copyToClipboard(siteUrls.internet)}
                    className="text-gray-400 hover:text-gray-600"
                    title="Copy to clipboard"
                  >
                    📋
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Port:</span>
            <span className="font-mono">{site.port}</span>
          </div>
        )}
        
        {site.proxy_to && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Proxy:</span>
            <span className="font-mono">→ {site.proxy_to}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">HTTPS:</span>
          <span>{site.https ? '✓' : '✗'}</span>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={onToggleStatus}
          className={`btn btn-sm flex-1 ${
            site.status === 'running' ? 'btn-danger' : 'btn-primary'
          }`}
        >
          {site.status === 'running' ? (
            <>
              <Square className="w-3 h-3 mr-1" />
              Stop
            </>
          ) : (
            <>
              <Play className="w-3 h-3 mr-1" />
              Start
            </>
          )}
        </button>
        
        {site.status === 'running' && siteUrls.local && (
          <button 
            onClick={() => openInBrowser(siteUrls.local)}
            className="btn btn-secondary btn-sm"
            title="Open in browser"
          >
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
        
        <button 
          onClick={() => onEdit && onEdit(site)}
          className="btn btn-secondary btn-sm"
          title="Edit site"
        >
          <Edit3 className="w-3 h-3" />
        </button>
        
        {isElectron && (
          <button 
            onClick={openSiteFolder}
            className="btn btn-secondary btn-sm"
            title="Open folder"
          >
            <FileText className="w-3 h-3" />
          </button>
        )}
        
        <button 
          onClick={() => {
            if (confirm(`Are you sure you want to delete the site "${site.name}"?`)) {
              onRemove();
            }
          }}
          className="btn btn-danger btn-sm"
          title="Delete site"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

// Add Site Modal Component
const AddSiteModal = ({ onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    name: '',
    root: '',
    port: '',
    https: false,
    proxy_to: ''
  });
  const [isValidating, setIsValidating] = useState(false);
  const [portError, setPortError] = useState('');
  
  const isElectron = window.electronAPI !== undefined;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (portError) {
      alert('Please fix the port error before submitting.');
      return;
    }

    // Validate port availability
    if (isElectron) {
      setIsValidating(true);
      const portCheck = await window.electronAPI.validatePort(parseInt(formData.port));
      setIsValidating(false);
      
      if (portCheck.success && !portCheck.available) {
        alert(`Port ${formData.port} is already in use. Please choose a different port.`);
        return;
      }
    }

    onAdd({
      ...formData,
      port: parseInt(formData.port),
      proxy_to: formData.proxy_to ? parseInt(formData.proxy_to) : null
    });
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Validate port in real-time
    if (field === 'port' && value) {
      const port = parseInt(value);
      if (port < 1 || port > 65535) {
        setPortError('Port must be between 1 and 65535');
      } else if (port < 1024 && isElectron) {
        setPortError('Ports below 1024 require administrator privileges');
      } else {
        setPortError('');
      }
    }
  };

  const browseForFolder = async () => {
    if (isElectron) {
      const result = await window.electronAPI.browseFolder();
      if (result.success) {
        setFormData(prev => ({ ...prev, root: result.path }));
      }
    }
  };

  const generatePort = () => {
    const randomPort = Math.floor(Math.random() * (9000 - 8000) + 8000);
    handleChange('port', randomPort.toString());
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Site</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Site Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="input"
              placeholder="My Website"
              required
            />
          </div>

          <div>
            <label className="label">Root Directory</label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={formData.root}
                onChange={(e) => handleChange('root', e.target.value)}
                className="input flex-1"
                placeholder="./dist or C:/path/to/site"
                required
              />
              {isElectron && (
                <button
                  type="button"
                  onClick={browseForFolder}
                  className="btn btn-secondary btn-sm"
                  title="Browse for folder"
                >
                  📁
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="label">Port</label>
            <div className="flex space-x-2">
              <input
                type="number"
                value={formData.port}
                onChange={(e) => handleChange('port', e.target.value)}
                className={`input flex-1 ${portError ? 'border-red-500' : ''}`}
                placeholder="8080"
                min="1"
                max="65535"
                required
              />
              <button
                type="button"
                onClick={generatePort}
                className="btn btn-secondary btn-sm"
                title="Generate random port"
              >
                🎲
              </button>
            </div>
            {portError && (
              <p className="text-red-500 text-xs mt-1">{portError}</p>
            )}
          </div>

          <div>
            <label className="label">API Proxy Port (Optional)</label>
            <input
              type="number"
              value={formData.proxy_to}
              onChange={(e) => handleChange('proxy_to', e.target.value)}
              className="input"
              placeholder="3000"
              min="1"
              max="65535"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="https"
              checked={formData.https}
              onChange={(e) => handleChange('https', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="https" className="label">Enable HTTPS</label>
          </div>

          <div className="flex items-center space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary btn-md flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isValidating || !!portError}
              className="btn btn-primary btn-md flex-1 disabled:opacity-50"
            >
              {isValidating ? 'Validating...' : 'Add Site'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Monitoring Panel Component
const MonitoringPanel = ({ sites }) => {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Server Monitoring</h2>
      
      <div className="grid gap-6 md:grid-cols-2">
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Server Status</h3>
          <div className="space-y-3">
            {sites.map(site => (
              <div key={site.id} className="flex items-center justify-between">
                <span className="text-sm font-medium">{site.name}</span>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    site.status === 'running' ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                  <span className="text-sm text-gray-600">:{site.port}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">System Resources</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">CPU Usage</span>
              <span className="text-sm text-gray-600">12%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Memory</span>
              <span className="text-sm text-gray-600">256 MB</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Active Connections</span>
              <span className="text-sm text-gray-600">3</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6 mt-6">
        <h3 className="font-semibold text-gray-900 mb-4">Recent Logs</h3>
        <div className="bg-gray-50 rounded-md p-4 font-mono text-xs space-y-1">
          <div className="text-gray-600">2024-11-07 15:30:21 INFO  Starting site 'main' on port 8080</div>
          <div className="text-gray-600">2024-11-07 15:30:22 INFO  Starting site 'blog' on port 8082</div>
          <div className="text-green-600">2024-11-07 15:30:23 INFO  All servers ready!</div>
          <div className="text-blue-600">2024-11-07 15:30:45 INFO  GET /api/test - 200 OK</div>
          <div className="text-blue-600">2024-11-07 15:31:12 INFO  GET / - 200 OK</div>
        </div>
      </div>
    </div>
  );
};

// Configuration Panel Component
const ConfigurationPanel = ({ sites, setSites }) => {
  const [settings, setSettings] = useState({
    autoStart: false,
    notifications: true,
    minimizeToTray: false,
    defaultHost: '0.0.0.0',
    portRangeStart: 8000,
    portRangeEnd: 9000
  });
  
  const isElectron = window.electronAPI !== undefined;

  const exportConfig = async () => {
    const config = {
      sites: sites.map(({ id, status, ...site }) => site),
      settings,
      lastUpdated: new Date().toISOString()
    };
    
    if (isElectron) {
      // Use Electron's native file dialog
      const result = await window.electronAPI.exportConfig(JSON.stringify(config, null, 2));
      if (result.success) {
        alert(`Configuration exported successfully to ${result.filePath}`);
      } else {
        alert(`Export failed: ${result.error}`);
      }
    } else {
      // Web fallback
      const dataStr = JSON.stringify(config, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = 'localhostify-config.json';
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }
  };

  const importConfig = () => {
    if (isElectron) {
      // This will trigger the menu action which is handled by the main process
      alert('Use File → Import Config from the menu to import a configuration file.');
    } else {
      // Web fallback - create file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,.toml';
      input.onchange = (event) => {
        const file = event.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const config = JSON.parse(e.target.result);
              if (config.sites) {
                const sitesWithIds = config.sites.map((site, index) => ({
                  ...site,
                  id: Date.now() + index,
                  status: 'stopped'
                }));
                setSites(sitesWithIds);
                alert('Configuration imported successfully!');
              }
            } catch (error) {
              alert('Failed to import configuration: Invalid JSON format');
            }
          };
          reader.readAsText(file);
        }
      };
      input.click();
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Configuration</h2>
      
      <div className="space-y-6">
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Import/Export Configuration</h3>
          <div className="flex items-center space-x-4">
            <button
              onClick={exportConfig}
              className="btn btn-primary btn-md flex items-center space-x-2"
            >
              <FileText className="w-4 h-4" />
              <span>Export Config</span>
            </button>
            
            <button 
              onClick={importConfig}
              className="btn btn-secondary btn-md flex items-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>Import Config</span>
            </button>
          </div>
          
          <p className="text-sm text-gray-600 mt-3">
            Export your current site configuration to JSON format for backup or sharing. 
            {!isElectron && ' Import functionality is available through file selection.'}
          </p>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Application Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="label">Auto-start servers on app launch</label>
                <p className="text-xs text-gray-600">Automatically start all configured sites when opening LocalHostify</p>
              </div>
              <input 
                type="checkbox" 
                checked={settings.autoStart}
                onChange={(e) => handleSettingChange('autoStart', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" 
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="label">Enable system notifications</label>
                <p className="text-xs text-gray-600">Show notifications for server status changes</p>
              </div>
              <input 
                type="checkbox" 
                checked={settings.notifications}
                onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" 
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="label">Minimize to system tray</label>
                <p className="text-xs text-gray-600">Keep LocalHostify running in the background</p>
              </div>
              <input 
                type="checkbox" 
                checked={settings.minimizeToTray}
                onChange={(e) => handleSettingChange('minimizeToTray', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" 
              />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Network Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="label">Default Host</label>
              <input
                type="text"
                className="input"
                placeholder="0.0.0.0"
                value={settings.defaultHost}
                onChange={(e) => handleSettingChange('defaultHost', e.target.value)}
              />
              <p className="text-xs text-gray-600 mt-1">Default host binding for new sites</p>
            </div>
            
            <div>
              <label className="label">Port Range</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  className="input flex-1"
                  placeholder="8000"
                  value={settings.portRangeStart}
                  onChange={(e) => handleSettingChange('portRangeStart', parseInt(e.target.value))}
                />
                <span className="text-gray-500">to</span>
                <input
                  type="number"
                  className="input flex-1"
                  placeholder="9000"
                  value={settings.portRangeEnd}
                  onChange={(e) => handleSettingChange('portRangeEnd', parseInt(e.target.value))}
                />
              </div>
              <p className="text-xs text-gray-600 mt-1">Suggested port range for auto-assignment</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Statistics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-bold text-primary-600">{sites.length}</div>
              <div className="text-sm text-gray-600">Total Sites</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {sites.filter(s => s.status === 'running').length}
              </div>
              <div className="text-sm text-gray-600">Running Sites</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;