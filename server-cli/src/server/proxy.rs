use axum::{
    body::Body,
    extract::Request,
    http::StatusCode,
    response::Response,
};
use std::sync::Arc;
use tracing::{error, info, warn};

use super::AppState;

/// Proxy an incoming axum Request to a local backend (reqwest) and convert the
/// response back into an axum Response. We convert header and method types
/// between hyper/axum and reqwest using string conversions to avoid http-type
/// mismatches.
pub async fn proxy_request(
    req: Request,
    state: Arc<AppState>,
) -> Result<Response, StatusCode> {
    let proxy_port = match state.config.proxy_port {
        Some(port) => port,
        None => {
            error!("Proxy request received but no proxy port configured");
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    let uri = req.uri().clone();
    let path_and_query = uri.path_and_query().map(|pq| pq.as_str()).unwrap_or(uri.path());
    let method_str = req.method().as_str().to_string();

    // Build the proxy URL
    let proxy_url = format!("http://127.0.0.1:{}{}", proxy_port, path_and_query);
    info!("🔄 Proxying {} {} to {}", method_str, uri.path(), proxy_url);

    // Create a reqwest client
    let client = reqwest::Client::new();

    // Convert incoming headers (hyper) into a reqwest HeaderMap by stringifying
    // names and values. Skip hop-by-hop headers.
    let mut reqwest_headers = reqwest::header::HeaderMap::new();
    for (name, value) in req.headers().iter() {
        let name_str = name.as_str().to_lowercase();
        if is_hop_by_hop_header(&name_str) {
            continue;
        }
        if let Ok(val_str) = value.to_str() {
            if let Ok(hname) = reqwest::header::HeaderName::from_bytes(name.as_str().as_bytes()) {
                if let Ok(hval) = reqwest::header::HeaderValue::from_str(val_str) {
                    let _ = reqwest_headers.insert(hname, hval);
                }
            }
        }
    }

    // Read request body
    let body_bytes = match axum::body::to_bytes(req.into_body(), usize::MAX).await {
        Ok(b) => b,
        Err(e) => {
            error!("Failed to read request body: {}", e);
            return Err(StatusCode::BAD_REQUEST);
        }
    };

    // Build reqwest method from hyper method string
    let reqwest_method = match reqwest::Method::from_bytes(method_str.as_bytes()) {
        Ok(m) => m,
        Err(_) => reqwest::Method::GET,
    };

    let proxy_req = client
        .request(reqwest_method, &proxy_url)
        .headers(reqwest_headers)
        .body(body_bytes.to_vec());

    match proxy_req.send().await {
        Ok(resp) => {
            let status_code = resp.status().as_u16();
            let headers = resp.headers().clone();
            
            info!("✅ Proxy response: {}", resp.status());

            // Convert response headers back into hyper header types for axum
            let hyper_status = hyper::StatusCode::from_u16(status_code)
                .unwrap_or(hyper::StatusCode::INTERNAL_SERVER_ERROR);
            let mut response_builder = Response::builder().status(hyper_status);
            
            let final_body = match resp.bytes().await {
                Ok(b) => b.to_vec(),
                Err(e) => {
                    error!("Failed to read proxy response body: {}", e);
                    return Err(StatusCode::INTERNAL_SERVER_ERROR);
                }
            };

            if let Some(headers_map) = response_builder.headers_mut() {
                for (name, value) in headers.iter() {
                    // Skip hop-by-hop headers
                    if is_hop_by_hop_header(&name.as_str().to_lowercase()) {
                        continue;
                    }
                    if let Ok(hname) = hyper::header::HeaderName::from_bytes(name.as_str().as_bytes()) {
                        if let Ok(hval) = hyper::header::HeaderValue::from_bytes(value.as_bytes()) {
                            headers_map.insert(hname, hval);
                        }
                    }
                }

                // Add permissive CORS headers for browser compatibility
                let _ = headers_map.insert(hyper::header::HeaderName::from_static("access-control-allow-origin"), hyper::header::HeaderValue::from_static("*"));
                let _ = headers_map.insert(hyper::header::HeaderName::from_static("access-control-allow-methods"), hyper::header::HeaderValue::from_static("GET, POST, PUT, DELETE, OPTIONS"));
                let _ = headers_map.insert(hyper::header::HeaderName::from_static("access-control-allow-headers"), hyper::header::HeaderValue::from_static("content-type, authorization"));
            }

            let response = response_builder.body(Body::from(final_body)).unwrap();
            Ok(response)
        }
        Err(e) => {
            warn!("❌ Proxy request failed: {}", e);
            if e.is_connect() {
                error!("Backend server not reachable at localhost:{}", proxy_port);
                let error_body = format!(
                    r##"{{
    "error": "Backend server not available",
    "message": "No server found at localhost:{}.",
    "suggestion": "Start your backend on port {}"
}}"##,
                    proxy_port, proxy_port
                );

                let response = Response::builder()
                    .status(StatusCode::BAD_GATEWAY)
                    .header(hyper::header::CONTENT_TYPE, "application/json")
                    .header("access-control-allow-origin", "*")
                    .body(Body::from(error_body))
                    .unwrap();

                return Ok(response);
            }

            Err(StatusCode::BAD_GATEWAY)
        }
    }
}

fn is_hop_by_hop_header(name: &str) -> bool {
    match name {
        "connection" | "keep-alive" | "proxy-authenticate" | "proxy-authorization" | "te" | "trailers" | "transfer-encoding" | "upgrade" | "host" => true,
        _ => false,
    }
}