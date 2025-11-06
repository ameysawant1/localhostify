# LocalHostify Test Backend

A simple Node.js HTTP server for testing LocalHostify's API proxy functionality.

## Quick Start

```bash
# Install dependencies (none required - uses built-in Node.js modules)
cd test-backend

# Start the server
npm start
# or
node server.js
```

The server will start on `http://0.0.0.0:3000` and be accessible from:
- **Local machine**: `http://127.0.0.1:3000`
- **Network devices**: `http://[YOUR_IP]:3000` (e.g., `http://192.168.0.102:3000`)

## Available Endpoints

| Endpoint | Method | Description |
|----------|---------|-------------|
| `/api/test` | GET | Test endpoint with timestamp |
| `/api/hello` | GET | Simple greeting message |
| `/api/status` | GET | Server health and status |

## Usage with LocalHostify

### Direct Backend Access
The frontend can call the backend directly:
```javascript
fetch('http://192.168.0.102:3000/api/test')
```

### Via LocalHostify Proxy
Start LocalHostify with proxy support:
```bash
cargo run -p server-cli -- --root examples --port 8080 --proxy-to 3000
```

Then use relative URLs in frontend:
```javascript
fetch('/api/test')  // Automatically proxied to backend
```

## Network Access

This server binds to `0.0.0.0:3000` to allow access from other devices on your network. This is useful for:
- Testing mobile apps
- Cross-device development
- Sharing demos with team members

## Environment Variables

- `PORT`: Server port (default: 3000)