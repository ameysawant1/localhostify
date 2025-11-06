use std::path::PathBuf;

pub mod ssl;
pub mod proxy;

#[derive(Debug, Clone)]
pub struct ServerConfig {
    pub root_dir: PathBuf,
    pub port: u16,
    pub host: String,
    pub https_enabled: bool,
    pub proxy_port: Option<u16>,
}

pub struct AppState {
    pub config: ServerConfig,
}

impl AppState {
    pub fn new(config: ServerConfig) -> Self {
        Self { config }
    }
}

// Re-export proxy function
pub use proxy::proxy_request;