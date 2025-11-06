use axum::{
    extract::Request,
    http::{StatusCode, Uri},
    routing::get,
    Router,
};
use clap::Parser;
use std::{
    net::SocketAddr,
    path::PathBuf,
    sync::Arc,
};
use tokio::net::TcpListener;
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
    /// Root directory to serve files from
    #[arg(short, long, value_name = "DIR")]
    root: PathBuf,

    /// Port to listen on
    #[arg(short, long, default_value_t = 8080)]
    port: u16,

    /// Enable HTTPS with self-signed certificate
    #[arg(long)]
    https: bool,

    /// Backend port to proxy non-file requests to (optional)
    #[arg(long, value_name = "PORT")]
    proxy_to: Option<u16>,

    /// Host to bind to
    #[arg(long, default_value = "0.0.0.0")]
    host: String,
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

    // Validate root directory exists
    if !cli.root.exists() {
        error!("Root directory does not exist: {}", cli.root.display());
        std::process::exit(1);
    }

    if !cli.root.is_dir() {
        error!("Root path is not a directory: {}", cli.root.display());
        std::process::exit(1);
    }

    let config = ServerConfig {
        root_dir: cli.root.clone(),
        port: cli.port,
        host: cli.host.clone(),
        https_enabled: cli.https,
        proxy_port: cli.proxy_to,
    };

    // Create application state
    let state = Arc::new(AppState::new(config));

    // Display network information
    display_network_info(&cli).await;

    // Build the router
    let app = build_router(state.clone()).await?;

    // Create listener
    let addr: SocketAddr = format!("{}:{}", cli.host, cli.port).parse()?;
    let listener = TcpListener::bind(addr).await?;

    let protocol = if cli.https { "https" } else { "http" };
    info!("LocalHostify server starting...");
    info!("📁 Serving directory: {}", cli.root.display());
    info!("🌐 Local URL: {}://localhost:{}", protocol, cli.port);
    info!("🌍 Network URL: {}://{}:{}", protocol, cli.host, cli.port);
    
    if let Some(proxy_port) = cli.proxy_to {
        info!("🔄 Proxying API requests to localhost:{}", proxy_port);
    }

    info!("🚀 Server ready! Press Ctrl+C to stop");

    // Run the server
    if cli.https {
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
        // Use axum::serve which works with TcpListener directly
        axum::serve(listener, app).await?;
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

async fn display_network_info(cli: &Cli) {
    info!("🔍 Detecting network configuration...");
    
    // Get local IPs
    match get_local_ips().await {
        Ok(local_ips) => {
            if local_ips.is_empty() {
                warn!("No local IP addresses found");
            } else {
                info!("💻 Local IP addresses:");
                for ip in local_ips {
                    info!("   • {}", ip);
                }
            }
        }
        Err(e) => {
            warn!("Failed to detect local IPs: {}", e);
        }
    }

    // Get local IPs for network access instructions
    let local_ip = match get_local_ips().await {
        Ok(ips) if !ips.is_empty() => Some(ips[0].clone()),
        _ => None,
    };

    // Get public IP
    match get_public_ip().await {
        Ok(public_ip) => {
            info!("🌍 Public IP address: {}", public_ip);
            info!("");
            info!("🌐 Network Access Instructions:");
            
            if let Some(local) = &local_ip {
                let protocol = if cli.https { "https" } else { "http" };
                info!("   📱 Local Network (same WiFi): {}://{}:{}", protocol, local, cli.port);
                info!("      → Test this URL on your phone first!");
            }
            
            info!("   🌍 Internet Access (requires router setup):");
            info!("      1. Configure port forwarding on your router:");
            if let Some(local) = &local_ip {
                info!("         • External Port: {} → Internal IP: {} Port: {}", cli.port, local, cli.port);
            } else {
                info!("         • External Port: {} → Internal IP: YOUR_LOCAL_IP Port: {}", cli.port, cli.port);
            }
            info!("      2. Allow port {} through Windows Firewall", cli.port);
            info!("         → Run: .\\setup-firewall.ps1 (as Administrator)");
            
            let protocol = if cli.https { "https" } else { "http" };
            info!("      3. Access via: {}://{}:{}", protocol, public_ip, cli.port);
            
            info!("");
            info!("� Domain Setup (optional):");
            info!("   1. Create A record: @ → {}", public_ip);
            info!("   2. Wait 15-60 minutes for DNS propagation");
        }
        Err(e) => {
            warn!("Failed to detect public IP: {}", e);
            if let Some(local) = &local_ip {
                let protocol = if cli.https { "https" } else { "http" };
                info!("� Local Network Access: {}://{}:{}", protocol, local, cli.port);
            }
            info!("💡 Find your public IP at: https://whatismyipaddress.com");
        }
    }
}