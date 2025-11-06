<<<<<<< Updated upstream
# localhostify
LocalHostify - Windows-first local hosting app in Rust. Host static sites and backends from your PC with a friendly GUI.
=======
# LocalHostify

> **Windows-first local hosting app in Rust** - Host static sites and backends from your PC with zero configuration pain.

[![Build Status](https://github.com/ameysawant1/localhostify/workflows/CI/badge.svg)](https://github.com/ameysawant1/localhostify/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 What is LocalHostify?

LocalHostify is a lightweight Windows desktop application that lets you host static websites or backends from your personal computer with a friendly GUI. No Linux servers, no complex configuration - just select your project folder, click start, and you're live!

### ✨ Key Features (MVP)

- **🖥️ Windows Native** - Single installer, works on Windows 10/11
- **📁 Drag & Drop** - Select any folder and serve it instantly  
- **🌐 Smart Networking** - Shows your local URL and public IP automatically
- **🔗 DNS Made Simple** - Clear instructions for pointing your domain to your PC
- **🔒 HTTPS Ready** - Optional self-signed certificates for secure local development
- **⚡ Fast & Lightweight** - Rust-powered performance, <100MB install size
- **🔄 Auto-Updates** - Seamlessly stay up-to-date via GitHub releases

## 🎯 Perfect For

- **Makers & Developers** - Host your portfolio, blog, or app prototypes
- **Students & Educators** - Share projects instantly without cloud complexity  
- **Small Businesses** - Simple website hosting from your existing PC
- **Hobbyists** - Show off your creations to friends and family

## � Quick Start

### MVP Version (CLI)

The desktop GUI is coming soon! For now, you can use the powerful CLI version:

#### 1. **Prerequisites**
```powershell
# Install Rust (one-time setup)
winget install Rustlang.Rust.MSVC

# Install Visual Studio Build Tools (for compilation)
winget install Microsoft.VisualStudio.2022.BuildTools
```

#### 2. **Clone and Build**
```powershell
# Clone the repository
git clone https://github.com/ameysawant1/localhostify.git
cd localhostify

# Build the CLI server
cargo build --release -p server-cli
```

#### 3. **Test with Example Site**
```powershell
# Run the beautiful example site
cargo run -p server-cli -- --root examples --port 8080

# Open in browser
start http://localhost:8080
```

#### 4. **Host Your Own Site**
```powershell
# Point to your website folder
cargo run -p server-cli -- --root "C:\MyWebsite" --port 8080

# With HTTPS (self-signed certificate)
cargo run -p server-cli -- --root "C:\MyWebsite" --port 8443 --https

# With backend proxy (forwards /api/* to port 3000)
cargo run -p server-cli -- --root "C:\MyWebsite" --port 8080 --proxy-to 3000
```

#### 5. **Test Backend API (Optional)**

LocalHostify includes a test backend for API development:

```powershell
# Start the test backend (serves on port 3000)
cd test-backend
node server.js

# In another terminal, start LocalHostify with proxy
cargo run -p server-cli -- --root examples --port 8080 --proxy-to 3000

# Test the API
# Direct backend: http://localhost:3000/api/test  
# Via proxy: http://localhost:8080/api/test
```

**Available API endpoints:**
- `GET /api/test` - Test endpoint with timestamp
- `GET /api/hello` - Simple greeting message  
- `GET /api/status` - Server health and status

The test backend binds to `0.0.0.0:3000` for network access, so other devices on your WiFi can call:
- Frontend: `http://[YOUR_IP]:8080`
- Backend: `http://[YOUR_IP]:3000/api/test`

### Example DNS Setup

```
1. Go to your domain registrar (Namecheap, GoDaddy, etc.)
2. Find DNS Management / DNS Zone settings  
3. Create an A record:
   • Host: @ (or leave blank)
   • Value: [Your Public IP - shown in app]
   • TTL: 3600 seconds
4. Wait 15-60 minutes for DNS propagation
5. Visit yourdomain.com - it now points to your PC!
```

## 🛠️ Architecture

LocalHostify is built with modern Rust technologies:

- **GUI**: [Tauri](https://tauri.app/) with React frontend
- **HTTP Server**: [Axum](https://github.com/tokio-rs/axum) with static file serving
- **Networking**: Automatic public IP detection and local IP enumeration
- **Security**: Optional HTTPS with self-signed certificates via `rcgen`
- **Packaging**: Windows installer (.msi) with auto-update support

## 🏗️ Development

### Prerequisites

- Rust (latest stable)
- Node.js 18+ (for Tauri frontend)
- Windows 10/11 SDK (for building Windows installer)

### Build from Source

```bash
# Clone the repository
git clone https://github.com/ameysawant1/localhostify.git
cd localhostify

# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build release
npm run tauri build
```

### Project Structure

```
localhostify/
├── src-tauri/           # Rust backend (Tauri)
│   ├── src/
│   │   ├── main.rs      # Tauri app entry point
│   │   ├── server/      # HTTP server module
│   │   ├── network/     # IP detection & DNS helpers
│   │   └── ssl/         # Certificate management
├── src/                 # React frontend
├── server-cli/          # Standalone CLI server (for testing)
├── .github/workflows/   # CI/CD pipelines
└── docs/               # Documentation
```

### Running Tests

```bash
# Run all tests
cargo test

# Run server CLI tests specifically  
cargo test -p server-cli

# Run integration tests
cargo test --test integration
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and add tests
4. Ensure all tests pass (`cargo test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to your branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📋 Roadmap

### Current (MVP - v1.0)
- [x] Static file server with GUI
- [x] Public IP detection and DNS instructions  
- [x] Self-signed HTTPS support
- [x] Windows installer with auto-update

### Future Enhancements
- [ ] Let's Encrypt integration for valid HTTPS certificates
- [ ] Reverse proxy/tunnel support for users behind NAT
- [ ] Registrar API integration for automatic DNS setup
- [ ] Windows service mode for always-on hosting
- [ ] Analytics and uptime monitoring
- [ ] Premium relay nodes for enhanced reliability

## ❓ FAQ

**Q: Do I need a static IP address?**
A: Not required! LocalHostify works with dynamic IPs. You'll need to update your DNS A-record if your IP changes, or consider using a dynamic DNS service.

**Q: Can I host backends/APIs, not just static files?**
A: Yes! LocalHostify can proxy requests to your local backend (Node.js, Python, etc.) running on another port.

**Q: Is this secure for production use?**  
A: The MVP is designed for personal/development use. For production, consider additional security measures like proper SSL certificates, firewalls, and regular updates.

**Q: What about port forwarding?**
A: You'll need to configure your router to forward the chosen port (default 8080) to your PC for external access. LocalHostify shows your public IP but doesn't configure NAT automatically.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Tauri](https://tauri.app/) for the cross-platform desktop framework
- Powered by [Axum](https://github.com/tokio-rs/axum) for blazing-fast HTTP serving
- Inspired by the need for simple, Windows-friendly local hosting solutions

---

**Made with ❤️ for the Windows maker community**

[🐛 Report Bug](https://github.com/ameysawant1/localhostify/issues) | [💡 Request Feature](https://github.com/ameysawant1/localhostify/issues) | [💬 Discussions](https://github.com/ameysawant1/localhostify/discussions)
>>>>>>> Stashed changes
