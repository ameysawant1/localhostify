#[cfg(feature = "ssl")]
use rcgen::{Certificate, CertificateParams, DistinguishedName, KeyPair};
use std::error::Error;

pub struct CertificatePem {
    pub cert: String,
    pub key: String,
}

#[cfg(feature = "ssl")]
pub fn create_self_signed_cert(hostname: &str) -> Result<CertificatePem, Box<dyn Error>> {
    use rcgen::{date_time_ymd, SanType};

    // Create certificate parameters (rcgen::CertificateParams::new returns the
    // params directly, not a Result)
    let mut params = CertificateParams::new(vec![hostname.to_string()]);
    
    // Set certificate details
    params.distinguished_name = DistinguishedName::new();
    params.distinguished_name.push(rcgen::DnType::CommonName, hostname);
    params.distinguished_name.push(rcgen::DnType::OrganizationName, "LocalHostify");
    params.distinguished_name.push(rcgen::DnType::CountryName, "US");
    
    // Add Subject Alternative Names
    params.subject_alt_names = vec![
        SanType::DnsName(hostname.to_string()),
        SanType::DnsName("localhost".to_string()),
        SanType::IpAddress("127.0.0.1".parse()?),
        SanType::IpAddress("::1".parse()?),
    ];
    
    // Set validity period (1 year)
    params.not_before = date_time_ymd(2024, 1, 1);
    params.not_after = date_time_ymd(2025, 12, 31);
    
    // Generate key pair
    let key_pair = KeyPair::generate(&rcgen::PKCS_ECDSA_P256_SHA256)?;
    params.key_pair = Some(key_pair);
    
    // Generate certificate (from_params returns Result<Certificate, rcgen::Error>)
    let cert = Certificate::from_params(params)?;

    Ok(CertificatePem {
        cert: cert.serialize_pem()?,
        key: cert.serialize_private_key_pem(),
    })
}

#[cfg(not(feature = "ssl"))]
pub fn create_self_signed_cert(_hostname: &str) -> Result<CertificatePem, Box<dyn Error>> {
    Err("SSL feature not enabled".into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[cfg(feature = "ssl")]
    #[test]
    fn test_self_signed_cert_generation() {
        let cert = create_self_signed_cert("localhost").unwrap();
        
        // Basic validation
        assert!(cert.cert.contains("-----BEGIN CERTIFICATE-----"));
        assert!(cert.cert.contains("-----END CERTIFICATE-----"));
        assert!(cert.key.contains("-----BEGIN PRIVATE KEY-----"));
        assert!(cert.key.contains("-----END PRIVATE KEY-----"));
        
        println!("✅ Self-signed certificate generated successfully");
    }
}