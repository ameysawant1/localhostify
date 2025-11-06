/**
 * LocalHostify Test Backend Server
 * 
 * A simple Node.js HTTP server for testing LocalHostify's API proxy functionality.
 * This server provides sample API endpoints and can be accessed from the network.
 * 
 * Usage:
 *   npm start        - Start the server
 *   node server.js   - Start directly with Node.js
 * 
 * The server binds to 0.0.0.0:3000 to allow network access from other devices.
 */

const http = require('http');
const { URL } = require('url');

// Configuration
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Bind to all network interfaces for cross-device access

// CORS headers for cross-origin requests
const setCorsHeaders = (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

// JSON response helper
const sendJSON = (res, statusCode, data) => {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data, null, 2));
};

const server = http.createServer((req, res) => {
    setCorsHeaders(res);
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
    
    console.log(`📝 ${req.method} ${pathname}`);
    
    // API Routes
    switch (pathname) {
        case '/api/test':
            sendJSON(res, 200, {
                message: "✅ Backend server is working!",
                timestamp: new Date().toISOString(),
                path: pathname,
                method: req.method,
                network: "accessible"
            });
            break;
            
        case '/api/hello':
            sendJSON(res, 200, {
                greeting: "Hello from LocalHostify backend!",
                server: "Node.js test server",
                version: "1.0.0"
            });
            break;
            
        case '/api/status':
            sendJSON(res, 200, {
                status: "healthy",
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                timestamp: new Date().toISOString()
            });
            break;
            
        default:
            sendJSON(res, 404, {
                error: "Not Found",
                message: `Route ${pathname} not found`,
                availableRoutes: ['/api/test', '/api/hello', '/api/status']
            });
    }
});

server.listen(PORT, HOST, () => {
    console.log('🚀 Test backend server running on:');
    console.log(`   • Local: http://127.0.0.1:${PORT}`);
    console.log(`   • Network: http://0.0.0.0:${PORT}`);
    console.log('📡 Ready to receive API calls from LocalHostify proxy and network devices');
    console.log('🔗 Available endpoints:');
    console.log('   • GET /api/test');
    console.log('   • GET /api/hello');  
    console.log('   • GET /api/status');
    console.log('');
    console.log('💡 Test locally: http://localhost:8080/api/test');
    console.log('🌐 Test from network: Replace localhost with your PC\'s IP address');
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log('❌ Port 3000 is already in use. Stop other servers and try again.');
    } else {
        console.log('❌ Server error:', err);
    }
});