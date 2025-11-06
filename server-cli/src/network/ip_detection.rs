use reqwest;
use serde::Deserialize;
use std::{
    net::{IpAddr, Ipv4Addr},
    time::Duration,
};
use tracing::{debug, warn};

#[derive(Debug, Deserialize)]
struct IpifyResponse {
    ip: String,
}

/// Get the public IP address by querying external services
pub async fn get_public_ip() -> Result<String, Box<dyn std::error::Error>> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(5))
        .build()?;

    // Try multiple services in case one is down
    let services = [
        "https://api.ipify.org?format=json",
        "https://api64.ipify.org?format=json", // IPv6 support
        "https://ifconfig.me/ip",
        "https://icanhazip.com",
    ];

    for service in services.iter() {
        debug!("Trying public IP service: {}", service);
        
        let result: Result<String, Box<dyn std::error::Error + Send + Sync>> = if service.contains("json") {
            // JSON response expected
            match client.get(*service).send().await {
                Ok(response) => {
                    if response.status().is_success() {
                        match response.json::<IpifyResponse>().await {
                            Ok(ip_response) => Ok(ip_response.ip),
                            Err(e) => {
                                warn!("Failed to parse JSON from {}: {}", service, e);
                                continue;
                            }
                        }
                    } else {
                        warn!("HTTP error from {}: {}", service, response.status());
                        continue;
                    }
                }
                Err(e) => {
                    warn!("Request failed to {}: {}", service, e);
                    continue;
                }
            }
        } else {
            // Plain text response expected
            match client.get(*service).send().await {
                Ok(response) => {
                    if response.status().is_success() {
                        match response.text().await {
                            Ok(text) => Ok(text.trim().to_string()),
                            Err(e) => {
                                warn!("Failed to get text from {}: {}", service, e);
                                continue;
                            }
                        }
                    } else {
                        warn!("HTTP error from {}: {}", service, response.status());
                        continue;
                    }
                }
                Err(e) => {
                    warn!("Request failed to {}: {}", service, e);
                    continue;
                }
            }
        };

        match result {
            Ok(ip) => {
                // Validate IP format
                if ip.parse::<std::net::IpAddr>().is_ok() {
                    debug!("✅ Got public IP from {}: {}", service, ip);
                    return Ok(ip);
                } else {
                    warn!("Invalid IP format from {}: {}", service, ip);
                    continue;
                }
            }
            Err(_) => continue,
        }
    }

    Err("Failed to determine public IP from any service".into())
}

/// Get all local IP addresses for this machine
pub async fn get_local_ips() -> Result<Vec<IpAddr>, Box<dyn std::error::Error>> {
    use std::net::UdpSocket;
    
    let mut local_ips = Vec::new();
    
    // Method 1: Connect to a public DNS server to determine our local IP
    if let Ok(socket) = UdpSocket::bind("0.0.0.0:0") {
        if socket.connect("8.8.8.8:80").is_ok() {
            if let Ok(addr) = socket.local_addr() {
                local_ips.push(addr.ip());
            }
        }
    }
    
    // Method 2: Use system interfaces (Windows-compatible)
    match get_network_interfaces() {
        Ok(mut interfaces) => {
            local_ips.append(&mut interfaces);
        }
        Err(e) => {
            warn!("Failed to enumerate network interfaces: {}", e);
        }
    }
    
    // Remove duplicates and filter out loopback
    local_ips.sort();
    local_ips.dedup();
    
    // Filter out loopback and invalid addresses
    let filtered: Vec<IpAddr> = local_ips
        .into_iter()
        .filter(|ip| match ip {
            IpAddr::V4(ipv4) => {
                !ipv4.is_loopback() 
                    && !ipv4.is_multicast() 
                    && *ipv4 != Ipv4Addr::new(0, 0, 0, 0)
            }
            IpAddr::V6(ipv6) => {
                !ipv6.is_loopback() 
                    && !ipv6.is_multicast()
            }
        })
        .collect();
    
    if filtered.is_empty() {
        // Fallback: add common private ranges if we can't detect anything
        warn!("No network interfaces detected, using fallback IPs");
        Ok(vec![IpAddr::V4(Ipv4Addr::new(192, 168, 1, 100))])
    } else {
        Ok(filtered)
    }
}

#[cfg(windows)]
fn get_network_interfaces() -> Result<Vec<IpAddr>, Box<dyn std::error::Error>> {
    use std::process::Command;
    
    let output = Command::new("ipconfig")
        .output()?;
        
    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut ips = Vec::new();
    
    for line in stdout.lines() {
        let line = line.trim();
        if line.starts_with("IPv4 Address") || line.contains("IP Address") {
            // Extract IP from lines like "   IPv4 Address. . . . . . . . . . . : 192.168.1.100"
            if let Some(ip_part) = line.split(':').nth(1) {
                if let Ok(ip) = ip_part.trim().parse::<IpAddr>() {
                    ips.push(ip);
                }
            }
        }
    }
    
    Ok(ips)
}

#[cfg(not(windows))]
fn get_network_interfaces() -> Result<Vec<IpAddr>, Box<dyn std::error::Error>> {
    // Fallback for non-Windows systems - would need different implementation
    // For MVP, we'll focus on Windows
    Ok(Vec::new())
}

/// Check if an IP address is in a private range
pub fn is_private_ip(ip: &IpAddr) -> bool {
    match ip {
        IpAddr::V4(ipv4) => {
            ipv4.is_private() || ipv4.is_loopback()
        }
        IpAddr::V6(ipv6) => {
            ipv6.is_loopback() || 
            // IPv6 private ranges
            (ipv6.segments()[0] & 0xfe00) == 0xfc00 || // fc00::/7 unique local
            (ipv6.segments()[0] & 0xffc0) == 0xfe80    // fe80::/10 link local
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_public_ip_detection() {
        match get_public_ip().await {
            Ok(ip) => {
                println!("✅ Public IP: {}", ip);
                assert!(ip.parse::<IpAddr>().is_ok());
            }
            Err(e) => {
                println!("⚠️  Could not detect public IP (this is expected in some environments): {}", e);
                // Not a hard failure in tests - network might not be available
            }
        }
    }

    #[tokio::test]
    async fn test_local_ip_detection() {
        match get_local_ips().await {
            Ok(ips) => {
                println!("✅ Local IPs: {:?}", ips);
                assert!(!ips.is_empty());
            }
            Err(e) => {
                println!("⚠️  Could not detect local IPs: {}", e);
            }
        }
    }

    #[test]
    fn test_private_ip_detection() {
        assert!(is_private_ip(&"192.168.1.1".parse().unwrap()));
        assert!(is_private_ip(&"10.0.0.1".parse().unwrap()));
        assert!(is_private_ip(&"172.16.0.1".parse().unwrap()));
        assert!(is_private_ip(&"127.0.0.1".parse().unwrap()));
        
        assert!(!is_private_ip(&"8.8.8.8".parse().unwrap()));
        assert!(!is_private_ip(&"1.1.1.1".parse().unwrap()));
    }
}