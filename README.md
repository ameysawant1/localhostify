# LocalHostify Desktop


A modern desktop application for managing multiple local development sites with ease. Built with Electron and React, featuring a Rust-powered server backend.# localhostify



## 🚀 Features> **Multi-site local hosting server in Rust** - Host multiple websites and backends from your PC with zero configuration pain.LocalHostify - Windows-first local hosting app in Rust. Host static sites and backends from your PC with a friendly GUI.



- **Multi-site Management**: Host and manage multiple websites simultaneously=======

- **Desktop App**: Native desktop application with modern UI

- **Real-time Control**: Start, stop, and monitor sites with live status updates[![Build Status](https://github.com/ameysawant1/localhostify/workflows/CI/badge.svg)](https://github.com/ameysawant1/localhostify/actions)# LocalHostify

- **Port Management**: Automatic port assignment and conflict resolution

- **Proxy Support**: Forward requests to backend development servers[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

- **HTTPS Support**: Optional HTTPS with self-signed certificates

- **Cross-platform**: Works on Windows, macOS, and Linux> **Windows-first local hosting app in Rust** - Host static sites and backends from your PC with zero configuration pain.



## 📁 Project Structure## 🌟 What is LocalHostify?



```[![Build Status](https://github.com/ameysawant1/localhostify/workflows/CI/badge.svg)](https://github.com/ameysawant1/localhostify/actions)

LocalHostify/

├── electron/           # Electron main process and preload scriptsLocalHostify is a powerful Rust-based server that lets you host **multiple websites simultaneously** from your personal computer. Perfect for developers, agencies, and anyone managing multiple web projects - no complex configuration required![![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

│   ├── main.cjs       # Electron main process

│   └── preload.cjs    # Security preload script for IPC

├── src/               # React frontend source

│   ├── App.jsx        # Main React application### ✨ Key Features## 🚀 What is LocalHostify?

│   ├── main.jsx       # React entry point

│   └── styles.css     # Application styles

├── server-cli/        # Rust server backend

│   ├── src/           # Rust source code- **🏢 Multi-Site Hosting** - Run multiple websites on different ports concurrentlyLocalHostify is a lightweight Windows desktop application that lets you host static websites or backends from your personal computer with a friendly GUI. No Linux servers, no complex configuration - just select your project folder, click start, and you're live!

│   └── Cargo.toml     # Rust dependencies

├── examples/          # Sample websites for testing- **🖥️ Windows Native** - Built for Windows 10/11, lightweight and fast

├── public/            # Static assets

└── electron build config files- **📁 Flexible Configuration** - CLI arguments or configuration files (TOML/JSON)### ✨ Key Features (MVP)

```

- **🌐 Smart Networking** - Automatic local and public IP detection  

## 🛠️ Development Setup

- **🔌 API Proxy Support** - Individual backend proxy settings per site- **🖥️ Windows Native** - Single installer, works on Windows 10/11

### Prerequisites

- Node.js (v18+)- **🔒 HTTPS Ready** - Optional SSL certificates for each site- **📁 Drag & Drop** - Select any folder and serve it instantly  

- npm or yarn

- Rust (latest stable)- **⚡ Blazing Fast** - Rust + Tokio async performance- **🌐 Smart Networking** - Shows your local URL and public IP automatically



### Installation- **🔄 Hot Configuration** - Easy setup changes without rebuilding- **🔗 DNS Made Simple** - Clear instructions for pointing your domain to your PC



1. **Clone and install dependencies:**- **🔒 HTTPS Ready** - Optional self-signed certificates for secure local development

```bash

git clone <repository-url>## 🎯 Perfect For- **⚡ Fast & Lightweight** - Rust-powered performance, <100MB install size

cd LocalHostify

npm install- **🔄 Auto-Updates** - Seamlessly stay up-to-date via GitHub releases

```

- **Development Teams** - Host multiple app environments simultaneously

2. **Build the Rust server:**

```bash- **Agencies & Freelancers** - Showcase multiple client projects  ## 🎯 Perfect For

cd server-cli

cargo build --release- **Portfolio Sites** - Display different projects on separate ports

cd ..

```- **Microservices** - Frontend for multiple backend services- **Makers & Developers** - Host your portfolio, blog, or app prototypes



3. **Start development:**- **Documentation** - Host docs alongside main applications- **Students & Educators** - Share projects instantly without cloud complexity  

```bash

npm run electron:dev- **Small Businesses** - Simple website hosting from your existing PC

```

## 🛠 Quick Start- **Hobbyists** - Show off your creations to friends and family

## 📦 Available Scripts



- `npm run dev` - Start Vite development server

- `npm run build` - Build for production### Single Site (Original Mode)## � Quick Start

- `npm run electron:dev` - Start Electron in development mode

- `npm run electron:pack` - Package app for current platform```powershell

- `npm run electron:dist` - Build distributable installers

# Basic static hosting### MVP Version (CLI)

## 🏗️ Building for Production

server-cli.exe --port 8080 --root examples

### Build for current platform:

```bashThe desktop GUI is coming soon! For now, you can use the powerful CLI version:

npm run electron:pack

```# With API proxy to backend



### Build distributables:server-cli.exe --port 8080 --root examples --proxy-to 3000#### 1. **Prerequisites**

```bash

npm run electron:dist```powershell

```

# HTTPS enabled# Install Rust (one-time setup)

This will create installers for:

- **Windows**: NSIS installer (.exe)server-cli.exe --port 8443 --root examples --httpswinget install Rustlang.Rust.MSVC

- **macOS**: DMG (.dmg)

- **Linux**: AppImage (.AppImage)```



## 🔧 Configuration# Install Visual Studio Build Tools (for compilation)



The app stores configuration in the user data directory:### Multi-Site CLIwinget install Microsoft.VisualStudio.2022.BuildTools

- **Windows**: `%APPDATA%\localhostify-desktop\`

- **macOS**: `~/Library/Application Support/localhostify-desktop/````powershell```

- **Linux**: `~/.config/localhostify-desktop/`

# Host multiple sites with CLI arguments

## 💡 Usage

server-cli.exe \#### 2. **Clone and Build**

1. **Add a Site**: Click "Add Site" and configure your local website

2. **Start Serving**: Click the start button to begin hosting  --site "main:examples:8080:proxy=3000" \```powershell

3. **Monitor Status**: View real-time status and access URLs

4. **Manage Sites**: Start, stop, edit, or remove sites as needed  --site "portfolio:examples/portfolio:8081" \# Clone the repository



## 🔒 Security  --site "blog:examples/blog:8082:proxy=3000" \git clone https://github.com/ameysawant1/localhostify.git



The app uses Electron's security best practices:  --site "docs:docs:8083"cd localhostify

- Context isolation enabled

- Node integration disabled```

- Secure IPC communication via preload scripts

# Build the CLI server

## 🤝 Contributing

### Multi-Site Configuration Filecargo build --release -p server-cli

1. Fork the repository

2. Create a feature branch```powershell```

3. Make your changes

4. Test thoroughly# Using TOML configuration

5. Submit a pull request

server-cli.exe --config sites.toml#### 3. **Test with Example Site**

## 📄 License

```powershell

MIT License - see LICENSE file for details

# Using JSON configuration  # Run the beautiful example site

## 🔗 Technologies

server-cli.exe --config sites.jsoncargo run -p server-cli -- --root examples --port 8080

- **Frontend**: React, Tailwind CSS, Vite

- **Desktop**: Electron```

- **Backend**: Rust (Axum web framework)

- **Build**: electron-builder# Open in browser

- **Development**: Hot reload, DevTools
## 📋 Installationstart http://localhost:8080

```

### Prerequisites

```powershell#### 4. **Host Your Own Site**

# Install Rust (one-time setup)```powershell

winget install Rustlang.Rust.MSVC# Point to your website folder

cargo run -p server-cli -- --root "C:\MyWebsite" --port 8080

# Install Visual Studio Build Tools (for compilation)

winget install Microsoft.VisualStudio.2022.BuildTools# With HTTPS (self-signed certificate)

```cargo run -p server-cli -- --root "C:\MyWebsite" --port 8443 --https



### Build from Source# With backend proxy (forwards /api/* to port 3000)

```powershellcargo run -p server-cli -- --root "C:\MyWebsite" --port 8080 --proxy-to 3000

# Clone the repository```

git clone https://github.com/ameysawant1/localhostify.git

cd localhostify#### 5. **Test Backend API (Optional)**



# Build the serverLocalHostify includes a test backend for API development:

cargo build --release

```powershell

# The executable will be in ./target/release/server-cli.exe# Start the test backend (serves on port 3000)

```cd test-backend

node server.js

### Test with Examples

```powershell# In another terminal, start LocalHostify with proxy

# Start the test backend (in separate terminal)cargo run -p server-cli -- --root examples --port 8080 --proxy-to 3000

cd examples/test-backend

node server.js# Test the API

# Direct backend: http://localhost:3000/api/test  

# Run multi-site example# Via proxy: http://localhost:8080/api/test

.\target\release\server-cli.exe --config sites.toml```



# Access your sites:**Available API endpoints:**

# Main: http://localhost:9080 (with API proxy)- `GET /api/test` - Test endpoint with timestamp

# Portfolio: http://localhost:9081  - `GET /api/hello` - Simple greeting message  

# Blog: http://localhost:9082 (with API proxy)- `GET /api/status` - Server health and status

# Docs: http://localhost:9083

```The test backend binds to `0.0.0.0:3000` for network access, so other devices on your WiFi can call:

- Frontend: `http://[YOUR_IP]:8080`

## ⚙️ Configuration- Backend: `http://[YOUR_IP]:3000/api/test`



### CLI Site Format### Example DNS Setup

```

--site "name:root_directory:port[:https][:proxy=PORT]"```

```1. Go to your domain registrar (Namecheap, GoDaddy, etc.)

2. Find DNS Management / DNS Zone settings  

**Examples:**3. Create an A record:

- `"main:examples:8080"` - Basic site   • Host: @ (or leave blank)

- `"api:backend:3000:https"` - HTTPS enabled     • Value: [Your Public IP - shown in app]

- `"app:frontend:8080:proxy=3000"` - With API proxy   • TTL: 3600 seconds

- `"secure:private:8443:https:proxy=3001"` - HTTPS + API proxy4. Wait 15-60 minutes for DNS propagation

5. Visit yourdomain.com - it now points to your PC!

### TOML Configuration (`sites.toml`)```

```toml

# Multiple sites configuration## 🛠️ Architecture

[[sites]]

name = "main"LocalHostify is built with modern Rust technologies:

root = "examples"

port = 8080- **GUI**: [Tauri](https://tauri.app/) with React frontend

https = false- **HTTP Server**: [Axum](https://github.com/tokio-rs/axum) with static file serving

proxy_to = 3000- **Networking**: Automatic public IP detection and local IP enumeration

- **Security**: Optional HTTPS with self-signed certificates via `rcgen`

[[sites]]- **Packaging**: Windows installer (.msi) with auto-update support

name = "portfolio"

root = "examples/portfolio"## 🏗️ Development

port = 8081

https = false### Prerequisites



[[sites]]- Rust (latest stable)

name = "blog"- Node.js 18+ (for Tauri frontend)

root = "examples/blog"- Windows 10/11 SDK (for building Windows installer)

port = 8082

https = false### Build from Source

proxy_to = 3000

``````bash

# Clone the repository

### JSON Configuration (`sites.json`)git clone https://github.com/ameysawant1/localhostify.git

```jsoncd localhostify

{

  "sites": [# Install dependencies

    {npm install

      "name": "main",

      "root": "examples", # Run in development mode

      "port": 8080,npm run tauri dev

      "https": false,

      "proxy_to": 3000# Build release

    },npm run tauri build

    {```

      "name": "portfolio",

      "root": "examples/portfolio",### Project Structure

      "port": 8081,

      "https": false```

    }localhostify/

  ]├── src-tauri/           # Rust backend (Tauri)

}│   ├── src/

```│   │   ├── main.rs      # Tauri app entry point

│   │   ├── server/      # HTTP server module

## 🔌 API Proxy│   │   ├── network/     # IP detection & DNS helpers

│   │   └── ssl/         # Certificate management

Each site can independently proxy API calls to different backend servers:├── src/                 # React frontend

├── server-cli/          # Standalone CLI server (for testing)

1. **Frontend** makes requests to `/api/*`├── .github/workflows/   # CI/CD pipelines

2. **LocalHostify** forwards to `localhost:PROXY_PORT/*`└── docs/               # Documentation

3. **Backend** receives and responds```

4. **Response** forwarded back to frontend

### Running Tests

Perfect for development with separate backend servers!

```bash

## 🌐 Network Access# Run all tests

cargo test

All sites automatically get:

# Run server CLI tests specifically  

- **Local**: `http://localhost:PORT`cargo test -p server-cli

- **Network**: `http://YOUR_LOCAL_IP:PORT` (same WiFi)

- **Internet**: `http://YOUR_PUBLIC_IP:PORT` (with port forwarding)# Run integration tests

cargo test --test integration

LocalHostify detects and displays all access URLs when starting.```



## 🏗️ Architecture## 🤝 Contributing



### Core TechnologiesWe welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

- **HTTP Server**: [Axum](https://github.com/tokio-rs/axum) with async Rust performance

- **Concurrency**: [Tokio](https://tokio.rs/) for multi-site async management### Development Workflow

- **Configuration**: [Serde](https://serde.rs/) for TOML/JSON parsing

- **CLI**: [Clap](https://clap.rs/) for command-line interface1. Fork the repository

- **Networking**: Automatic IP detection and network configuration2. Create a feature branch (`git checkout -b feature/amazing-feature`)

3. Make your changes and add tests

### Project Structure4. Ensure all tests pass (`cargo test`)

```5. Commit your changes (`git commit -m 'Add amazing feature'`)

localhostify/6. Push to your branch (`git push origin feature/amazing-feature`)

├── server-cli/          # Main CLI server implementation7. Open a Pull Request

│   ├── src/

│   │   ├── main.rs      # Multi-site server entry point## 📋 Roadmap

│   │   ├── server/      # HTTP server module

│   │   └── network/     # IP detection utilities### Current (MVP - v1.0)

├── examples/            # Example websites and backend- [x] Static file server with GUI

│   ├── test-backend/    # Node.js test backend- [x] Public IP detection and DNS instructions  

│   ├── portfolio/       # Example portfolio site- [x] Self-signed HTTPS support

│   └── blog/           # Example blog site- [x] Windows installer with auto-update

├── docs/               # Documentation site

├── sites.toml          # TOML configuration example### Future Enhancements

└── sites.json          # JSON configuration example- [ ] Let's Encrypt integration for valid HTTPS certificates

```- [ ] Reverse proxy/tunnel support for users behind NAT

- [ ] Registrar API integration for automatic DNS setup

## 📊 Use Cases- [ ] Windows service mode for always-on hosting

- [ ] Analytics and uptime monitoring

### Development Workflow- [ ] Premium relay nodes for enhanced reliability

```powershell

# 1. Multiple projects## ❓ FAQ

server-cli.exe --site "app:./frontend:3000" --site "admin:./admin:3001"

**Q: Do I need a static IP address?**

# 2. Frontend + Backend developmentA: Not required! LocalHostify works with dynamic IPs. You'll need to update your DNS A-record if your IP changes, or consider using a dynamic DNS service.

server-cli.exe --site "web:./dist:8080:proxy=3000"

**Q: Can I host backends/APIs, not just static files?**

# 3. Client demosA: Yes! LocalHostify can proxy requests to your local backend (Node.js, Python, etc.) running on another port.

server-cli.exe --config client-demo.toml  # Multiple client projects

**Q: Is this secure for production use?**  

# 4. Team sharing via network IPsA: The MVP is designed for personal/development use. For production, consider additional security measures like proper SSL certificates, firewalls, and regular updates.

# Teammates access: http://192.168.1.100:8080

```**Q: What about port forwarding?**

A: You'll need to configure your router to forward the chosen port (default 8080) to your PC for external access. LocalHostify shows your public IP but doesn't configure NAT automatically.

### Production-Style Setup

```toml## 📄 License

# production.toml

[[sites]]This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

name = "website"

root = "dist"## 🙏 Acknowledgments

port = 80

https = true- Built with [Tauri](https://tauri.app/) for the cross-platform desktop framework

- Powered by [Axum](https://github.com/tokio-rs/axum) for blazing-fast HTTP serving

[[sites]]  - Inspired by the need for simple, Windows-friendly local hosting solutions

name = "api-docs"

root = "api-docs"---

port = 8080

https = true**Made with ❤️ for the Windows maker community**

```

[🐛 Report Bug](https://github.com/ameysawant1/localhostify/issues) | [💡 Request Feature](https://github.com/ameysawant1/localhostify/issues) | [💬 Discussions](https://github.com/ameysawant1/localhostify/discussions)

## 🔧 Advanced Usage>>>>>>> Stashed changes


### Environment-Specific Configs
```bash
# Development
server-cli.exe --config sites-dev.toml

# Staging  
server-cli.exe --config sites-staging.toml

# Production
server-cli.exe --config sites-prod.toml
```

### HTTPS Configuration
```toml
[[sites]]
name = "secure-app"
root = "secure"
port = 8443
https = true  # Auto-generates self-signed certificate
proxy_to = 3001
```

### Port Forwarding Setup
1. **Router Configuration**: Forward ports 8080, 8081, etc. to your PC's local IP
2. **Windows Firewall**: Run `setup-firewall.ps1` as Administrator  
3. **DNS Setup**: Create A records pointing to your public IP

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md).

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and add tests
4. Ensure all tests pass (`cargo test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Running Tests
```bash
# Run all tests
cargo test

# Run server CLI tests
cargo test -p server-cli

# Check formatting
cargo fmt --check

# Run lints
cargo clippy
```

## 📋 Roadmap

### ✅ Completed (v1.0)
- [x] Multi-site concurrent hosting
- [x] CLI and configuration file support
- [x] Individual API proxy per site
- [x] Network access URL detection
- [x] TOML/JSON configuration formats
- [x] Example sites and documentation

### 🚧 In Progress
- [ ] Desktop GUI application (Tauri-based)
- [ ] Windows service mode for always-on hosting
- [ ] Let's Encrypt integration for valid HTTPS certificates

### 🔮 Future Enhancements  
- [ ] Reverse proxy/tunnel support for NAT traversal
- [ ] Docker container deployment
- [ ] Web-based configuration interface
- [ ] Analytics and uptime monitoring
- [ ] Automatic DNS configuration via registrar APIs

## ❓ FAQ

**Q: How many sites can I host simultaneously?**
A: Limited only by available ports and system resources. Tested with 10+ concurrent sites.

**Q: Do I need different IP addresses for each site?**
A: No! All sites use the same IP but different ports (e.g., :8080, :8081, :8082).

**Q: Can I use real domain names?**
A: Yes! Point your domains to your public IP and use port forwarding, or use subdomains with reverse proxy.

**Q: Is this secure for production use?**
A: LocalHostify is designed for development and personal use. For production, consider proper SSL certificates, firewalls, and security hardening.

**Q: What about backend languages?**
A: Any backend works! LocalHostify proxies to localhost ports where your Node.js, Python, PHP, etc. servers run.

## 🔗 Quick Links

- 📖 [Multi-Site Documentation](MULTI-SITE.md) - Comprehensive usage guide
- 🔧 [Configuration Examples](sites.toml) - TOML configuration reference  
- 📝 [JSON Config Examples](sites.json) - JSON configuration reference
- 🌐 [Live Documentation](http://localhost:9083) - Interactive docs (when running)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Axum](https://github.com/tokio-rs/axum) for blazing-fast HTTP serving
- Powered by [Tokio](https://tokio.rs/) for async concurrency
- Configuration via [Serde](https://serde.rs/) and [TOML](https://toml.io/)
- Inspired by the need for simple, multi-project local hosting

---

**Made with ❤️ for developers who build multiple things**

[🐛 Report Bug](https://github.com/ameysawant1/localhostify/issues) | [💡 Request Feature](https://github.com/ameysawant1/localhostify/issues) | [💬 Discussions](https://github.com/ameysawant1/localhostify/discussions)

**Ready to host multiple sites? Get started with LocalHostify! 🚀**