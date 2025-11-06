use axum::{
    extract::Request,
    http::{StatusCode, Uri},
    routing::get,
    Router,
};
use clap::Parser;
use serde::{Deserialize, Serialize};
use std::{
    net::SocketAddr,
    path::PathBuf,
    sync::Arc,
};
use tokio::{net::TcpListener, task::JoinHandle};
use tower::util::ServiceExt;
use tower_http::{
    cors::CorsLayer,
    services::ServeDir,
    trace::TraceLayer,
};
use tracing::{info, warn, error};

mod server;
mod network;

use server::{AppState, ServerConfig};
use network::{get_public_ip, get_local_ips};

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Cli {
    /// Root directory to serve files from (single site mode)
    #[arg(short, long, value_name = "DIR", conflicts_with = "config")]
    root: Option<PathBuf>,

    /// Port to listen on (single site mode)
    #[arg(short, long, default_value_t = 8080, conflicts_with = "config")]
    port: u16,

    /// Enable HTTPS with self-signed certificate (single site mode)
    #[arg(long, conflicts_with = "config")]
    https: bool,

    /// Backend port to proxy non-file requests to (single site mode)
    #[arg(long, value_name = "PORT", conflicts_with = "config")]
    proxy_to: Option<u16>,

    /// Host to bind to
    #[arg(long, default_value = "0.0.0.0")]
    host: String,

    /// Configuration file for multi-site setup
    #[arg(short, long, value_name = "FILE")]
    config: Option<PathBuf>,

    /// Add a site (can be used multiple times)
    #[arg(long, value_parser = parse_site_config, conflicts_with = "config")]
    site: Vec<SiteConfig>,
}

#[derive(Debug, Clone)]
struct SiteConfig {
    name: String,
    root: PathBuf,
    port: u16,
    https: bool,
    proxy_to: Option<u16>,
}

fn parse_site_config(s: &str) -> Result<SiteConfig, String> {
    // Format: name:root:port[:https][:proxy=PORT]
    let parts: Vec<&str> = s.split(':').collect();
    
    if parts.len() < 3 {
        return Err("Site format should be: name:root:port[:https][:proxy=PORT]".to_string());
    }

    let name = parts[0].to_string();
    let root = PathBuf::from(parts[1]);
    let port: u16 = parts[2].parse().map_err(|_| "Invalid port number".to_string())?;
    
    let mut https = false;
    let mut proxy_to = None;
    
    // Parse optional flags
    for part in &parts[3..] {
        match *part {
            "https" => https = true,
            part if part.starts_with("proxy=") => {
                let proxy_port = part[6..].parse::<u16>()
                    .map_err(|_| "Invalid proxy port number".to_string())?;
                proxy_to = Some(proxy_port);
            }
            _ => return Err(format!("Unknown site option: {}", part)),
        }
    }

    if !root.exists() {
        return Err(format!("Root directory does not exist: {}", root.display()));
    }

    Ok(SiteConfig {
        name,
        root,
        port,
        https,
        proxy_to,
    })
}

#[derive(Debug, Serialize, Deserialize)]
struct MultiSiteConfig {
    sites: Vec<ConfigSite>,
    host: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ConfigSite {
    name: String,
    root: PathBuf,
    port: u16,
    https: Option<bool>,
    proxy_to: Option<u16>,
}

impl From<ConfigSite> for SiteConfig {
    fn from(config_site: ConfigSite) -> Self {
        Self {
            name: config_site.name,
            root: config_site.root,
            port: config_site.port,
            https: config_site.https.unwrap_or(false),
            proxy_to: config_site.proxy_to,
        }
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "server_cli=info,tower_http=debug".into())
        )
        .init();

    let cli = Cli::parse();
    
    // Determine sites to run
    let sites = resolve_sites(&cli).await?;
    
    if sites.is_empty() {
        error!("No sites configured. Use --root for single site or --site for multiple sites or --config for config file");
        std::process::exit(1);
    }
    
    // Display network information
    display_network_info(&sites).await;
    
    // Check for port conflicts
    let mut used_ports = std::collections::HashSet::new();
    for site in &sites {
        if used_ports.contains(&site.port) {
            error!("Port conflict: Multiple sites trying to use port {}", site.port);
            std::process::exit(1);
        }
        used_ports.insert(site.port);
    }
    
    if sites.len() == 1 {
        // Single site mode - run directly
        run_single_site(&sites[0], &cli.host).await?;
    } else {
        // Multi-site mode - spawn multiple servers
        run_multi_sites(sites, &cli.host).await?;
    }
    
    Ok(())
}

async fn resolve_sites(cli: &Cli) -> Result<Vec<SiteConfig>, Box<dyn std::error::Error>> {
    if let Some(config_path) = &cli.config {
        // Load from config file
        load_sites_from_config(config_path).await
    } else if !cli.site.is_empty() {
        // Use CLI site arguments
        Ok(cli.site.clone())
    } else if let Some(root) = &cli.root {
        // Single site mode
        validate_directory(root)?;
        Ok(vec![SiteConfig {
            name: "main".to_string(),
            root: root.clone(),
            port: cli.port,
            https: cli.https,
            proxy_to: cli.proxy_to,
        }])
    } else {
        Ok(vec![])
    }
}

async fn load_sites_from_config(config_path: &PathBuf) -> Result<Vec<SiteConfig>, Box<dyn std::error::Error>> {
    if !config_path.exists() {
        return Err(format!("Configuration file not found: {}", config_path.display()).into());
    }
    
    let content = tokio::fs::read_to_string(config_path).await?;
    let config: MultiSiteConfig = if config_path.extension().and_then(|s| s.to_str()) == Some("json") {
        serde_json::from_str(&content)?
    } else {
        // Assume TOML
        toml::from_str(&content)?
    };
    
    let mut sites = Vec::new();
    for config_site in config.sites {
        validate_directory(&config_site.root)?;
        sites.push(config_site.into());
    }
    
    Ok(sites)
}

fn validate_directory(root: &PathBuf) -> Result<(), Box<dyn std::error::Error>> {
    if !root.exists() {
        return Err(format!("Root directory does not exist: {}", root.display()).into());
    }
    if !root.is_dir() {
        return Err(format!("Root path is not a directory: {}", root.display()).into());
    }
    Ok(())
}

async fn run_single_site(site: &SiteConfig, host: &str) -> Result<(), Box<dyn std::error::Error>> {
    let config = ServerConfig {
        root_dir: site.root.clone(),
        port: site.port,
        host: host.to_string(),
        https_enabled: site.https,
        proxy_port: site.proxy_to,
    };

    let state = Arc::new(AppState::new(config));
    let app = build_router(state.clone()).await?;
    let addr: SocketAddr = format!("{}:{}", host, site.port).parse()?;
    let listener = TcpListener::bind(addr).await?;

    let protocol = if site.https { "https" } else { "http" };
    info!("🚀 LocalHostify server starting...");
    info!("📁 Serving: {} → {}://{}:{}", site.root.display(), protocol, host, site.port);
    
    if let Some(proxy_port) = site.proxy_to {
        info!("🔄 Proxying API requests to localhost:{}", proxy_port);
    }

    info!("✅ Server ready! Press Ctrl+C to stop");

    if site.https {
        #[cfg(feature = "ssl")]
        {
            run_https_server(listener, app, state).await?;
        }
        #[cfg(not(feature = "ssl"))]
        {
            error!("HTTPS requested but SSL feature not enabled");
            std::process::exit(1);
        }
    } else {
        axum::serve(listener, app).await?;
    }

    Ok(())
}

async fn run_multi_sites(sites: Vec<SiteConfig>, host: &str) -> Result<(), Box<dyn std::error::Error>> {
    info!("🚀 LocalHostify multi-site server starting...");
    info!("📊 Running {} sites:", sites.len());
    
    let mut handles: Vec<JoinHandle<Result<(), Box<dyn std::error::Error + Send + Sync>>>> = Vec::new();
    
    for site in sites {
        let host = host.to_string();
        let handle = tokio::spawn(async move {
            run_site_server(site, &host).await
        });
        handles.push(handle);
    }
    
    info!("✅ All servers ready! Press Ctrl+C to stop");
    
    // Wait for all servers (or until one fails)
    let (result, _index, _remaining) = futures::future::select_all(handles).await;
    
    match result {
        Ok(Ok(())) => {
            info!("Server completed successfully");
            Ok(())
        }
        Ok(Err(e)) => {
            error!("Server error: {}", e);
            Err(e)
        }
        Err(e) => {
            error!("Task join error: {}", e);
            Err(e.into())
        }
    }
}

async fn run_site_server(site: SiteConfig, host: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let config = ServerConfig {
        root_dir: site.root.clone(),
        port: site.port,
        host: host.to_string(),
        https_enabled: site.https,
        proxy_port: site.proxy_to,
    };

    let state = Arc::new(AppState::new(config));
    let app = build_router(state.clone()).await.map_err(|e| -> Box<dyn std::error::Error + Send + Sync> { 
        Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))
    })?;
    
    let addr: SocketAddr = format!("{}:{}", host, site.port).parse()
        .map_err(|e| -> Box<dyn std::error::Error + Send + Sync> { Box::new(e) })?;
    let listener = TcpListener::bind(addr).await
        .map_err(|e| -> Box<dyn std::error::Error + Send + Sync> { Box::new(e) })?;

    let protocol = if site.https { "https" } else { "http" };
    info!("   📁 {} → {}://{}:{}", site.name, protocol, host, site.port);
    
    if let Some(proxy_port) = site.proxy_to {
        info!("   🔄 {} proxying API → localhost:{}", site.name, proxy_port);
    }

    if site.https {
        #[cfg(feature = "ssl")]
        {
            run_https_server(listener, app, state).await
                .map_err(|e| -> Box<dyn std::error::Error + Send + Sync> { Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())) })?;
        }
        #[cfg(not(feature = "ssl"))]
        {
            return Err("HTTPS requested but SSL feature not enabled".into());
        }
    } else {
        axum::serve(listener, app).await
            .map_err(|e| -> Box<dyn std::error::Error + Send + Sync> { Box::new(e) })?;
    }

    Ok(())
}

async fn build_router(state: Arc<AppState>) -> Result<Router, Box<dyn std::error::Error>> {
    let mut router = Router::new()
        .route("/health", get(health_check))
        .route("/healthz", get(health_check))
        .with_state(state.clone())
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http());

    // Add static file serving
    let serve_dir = ServeDir::new(&state.config.root_dir)
        .append_index_html_on_directories(true);

    // If proxy is configured, use fallback handler instead of service
    if state.config.proxy_port.is_some() {
        router = router.fallback(|req: Request| async move {
            let uri = req.uri().clone();
            
            // Check if this looks like an API request (starts with /api or common paths)
            if should_proxy(&uri) {
                server::proxy_request(req, state).await
            } else {
                // For non-API requests, return a 404 and let the ServeDir handle it
                // We'll add ServeDir as a separate fallback layer
                Err(StatusCode::NOT_FOUND)
            }
        }).fallback_service(serve_dir);
    } else {
        router = router.fallback_service(serve_dir);
    }

    Ok(router)
}

fn should_proxy(uri: &Uri) -> bool {
    let path = uri.path();
    // Proxy requests that look like API calls
    path.starts_with("/api") 
        || path.starts_with("/v1") 
        || path.starts_with("/graphql")
        || path.contains("/api/")
        // But don't proxy requests for static assets
        && !path.ends_with(".html")
        && !path.ends_with(".css") 
        && !path.ends_with(".js")
        && !path.ends_with(".png")
        && !path.ends_with(".jpg")
        && !path.ends_with(".jpeg")
        && !path.ends_with(".gif")
        && !path.ends_with(".svg")
        && !path.ends_with(".ico")
        && !path.ends_with(".woff")
        && !path.ends_with(".woff2")
        && !path.ends_with(".ttf")
        && !path.ends_with(".eot")
}

#[cfg(feature = "ssl")]
async fn run_https_server(
    listener: TcpListener,
    app: Router,
    _state: Arc<AppState>,
) -> Result<(), Box<dyn std::error::Error>> {
    use server::ssl::create_self_signed_cert;
    use std::io::Cursor;
    use tokio_rustls::{rustls, TlsAcceptor};

    // Generate self-signed certificate
    let cert_pem = create_self_signed_cert("localhost")?;
    
    // Parse certificate and key from PEM into the types rustls expects.
    let mut cert_reader = Cursor::new(cert_pem.cert.as_bytes());
    let cert_iter = rustls_pemfile::certs(&mut cert_reader);
    let cert_chain: Vec<rustls::pki_types::CertificateDer> = 
        cert_iter.collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("failed reading cert pem: {}", e))?;

    let mut key_reader = Cursor::new(cert_pem.key.as_bytes());
    // Try private_key (generic) function first
    let private_key = rustls_pemfile::private_key(&mut key_reader)
        .map_err(|e| format!("failed reading private key: {}", e))?
        .ok_or("No private key found in PEM")?;

    let server_config = rustls::ServerConfig::builder()
        .with_no_client_auth()
        .with_single_cert(cert_chain, private_key)
        .map_err(|e| format!("failed to build rustls server config: {}", e))?;

    let tls_acceptor = TlsAcceptor::from(Arc::new(server_config));
    
    info!("🔒 HTTPS enabled with self-signed certificate");
    warn!("⚠️  Browsers will show a security warning for self-signed certificates");
    
    loop {
        let (stream, _addr) = listener.accept().await?;
        let tls_acceptor = tls_acceptor.clone();
        let app = app.clone();

        tokio::spawn(async move {
            let tls_stream = match tls_acceptor.accept(stream).await {
                Ok(tls_stream) => tls_stream,
                Err(err) => {
                    error!("Failed to establish TLS connection: {}", err);
                    return;
                }
            };

            let service = hyper::service::service_fn(move |req| {
                app.clone().oneshot(req)
            });

            if let Err(err) = hyper::server::conn::http1::Builder::new()
                .serve_connection(hyper_util::rt::TokioIo::new(tls_stream), service)
                .await
            {
                error!("Failed to serve HTTPS connection: {}", err);
            }
        });
    }
}

async fn health_check() -> &'static str {
    "LocalHostify server is healthy"
}

async fn display_network_info(sites: &[SiteConfig]) {
    info!("🔍 Detecting network configuration...");
    
    // Get local IPs
    let local_ip = match get_local_ips().await {
        Ok(local_ips) => {
            if local_ips.is_empty() {
                warn!("No local IP addresses found");
                None
            } else {
                info!("💻 Local IP addresses:");
                for ip in &local_ips {
                    info!("   • {}", ip);
                }
                Some(local_ips[0])
            }
        }
        Err(e) => {
            warn!("Failed to detect local IPs: {}", e);
            None
        }
    };

    // Get public IP
    match get_public_ip().await {
        Ok(public_ip) => {
            info!("🌍 Public IP address: {}", public_ip);
            info!("");
            
            if sites.len() == 1 {
                let site = &sites[0];
                info!("🌐 Access URLs:");
                let protocol = if site.https { "https" } else { "http" };
                
                info!("   📱 Local: {}://localhost:{}", protocol, site.port);
                if let Some(local) = &local_ip {
                    info!("   📱 Network: {}://{}:{}", protocol, local, site.port);
                }
                info!("   🌍 Internet: {}://{}:{}", protocol, public_ip, site.port);
                
                if let Some(proxy_port) = site.proxy_to {
                    info!("   🔄 API Proxy: Forwarding /api/* to localhost:{}", proxy_port);
                }
            } else {
                info!("� Multi-Site Access URLs:");
                for site in sites {
                    let protocol = if site.https { "https" } else { "http" };
                    info!("   📁 {} (port {}):", site.name, site.port);
                    info!("      📱 Local: {}://localhost:{}", protocol, site.port);
                    if let Some(local) = &local_ip {
                        info!("      📱 Network: {}://{}:{}", protocol, local, site.port);
                    }
                    info!("      🌍 Internet: {}://{}:{}", protocol, public_ip, site.port);
                    
                    if let Some(proxy_port) = site.proxy_to {
                        info!("      🔄 API Proxy → localhost:{}", proxy_port);
                    }
                }
            }
            
            info!("");
            info!("🛠️  Network Setup:");
            info!("   1. Port forwarding: Configure router for ports: {}", 
                sites.iter().map(|s| s.port.to_string()).collect::<Vec<_>>().join(", "));
            info!("   2. Windows Firewall: Run setup-firewall.ps1 as Administrator");
            info!("   3. DNS Setup: Create A record → {}", public_ip);
            
        }
        Err(e) => {
            warn!("Failed to detect public IP: {}", e);
            
            if sites.len() == 1 {
                let site = &sites[0];
                let protocol = if site.https { "https" } else { "http" };
                info!("📱 Local Access: {}://localhost:{}", protocol, site.port);
                if let Some(local) = &local_ip {
                    info!("📱 Network Access: {}://{}:{}", protocol, local, site.port);
                }
            } else {
                info!("📱 Multi-Site Local Access:");
                for site in sites {
                    let protocol = if site.https { "https" } else { "http" };
                    info!("   {} → {}://localhost:{}", site.name, protocol, site.port);
                }
            }
            
            info!("💡 Find your public IP at: https://whatismyipaddress.com");
        }
    }
}