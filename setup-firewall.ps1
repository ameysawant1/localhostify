# LocalHostify Windows Firewall Setup Script
# Run this script as Administrator to configure Windows Firewall for LocalHostify

param(
    [string]$Port = "8189",
    [switch]$RemoveRules = $false
)

Write-Host "🔥 LocalHostify Firewall Setup" -ForegroundColor Yellow
Write-Host "================================" -ForegroundColor Yellow

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "❌ Error: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

$ruleName = "LocalHostify-Port-$Port"

if ($RemoveRules) {
    Write-Host "🗑️  Removing existing LocalHostify firewall rules..." -ForegroundColor Yellow
    
    try {
        Remove-NetFirewallRule -DisplayName "*LocalHostify*" -ErrorAction SilentlyContinue
        Write-Host "✅ Removed existing LocalHostify firewall rules" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  No existing rules found or error removing rules" -ForegroundColor Yellow
    }
    exit 0
}

Write-Host "🔧 Configuring Windows Firewall for port $Port..." -ForegroundColor Cyan

try {
    # Remove any existing rules with the same name
    Remove-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    
    # Create inbound rule for TCP
    New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Any
    Write-Host "✅ Created inbound TCP rule for port $Port" -ForegroundColor Green
    
    # Create outbound rule for TCP (optional, but good practice)
    New-NetFirewallRule -DisplayName "$ruleName-Outbound" -Direction Outbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Any
    Write-Host "✅ Created outbound TCP rule for port $Port" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "🎉 Windows Firewall configured successfully!" -ForegroundColor Green
    Write-Host "📱 Local devices on your network can now access:" -ForegroundColor Cyan
    Write-Host "   http://$(Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.PrefixOrigin -eq 'Dhcp'} | Select-Object -First 1).IPAddress:$Port" -ForegroundColor White
    
} catch {
    Write-Host "❌ Error configuring firewall: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. ✅ Windows Firewall - DONE" -ForegroundColor Green
Write-Host "2. 🌐 Router Port Forwarding - Configure port $Port in your router admin panel" -ForegroundColor Yellow
Write-Host "3. 🔗 DNS Setup (Optional) - Point your domain to your public IP" -ForegroundColor Yellow

Write-Host ""
Write-Host "💡 Tips:" -ForegroundColor Cyan
Write-Host "- To remove these rules later, run: .\setup-firewall.ps1 -RemoveRules" -ForegroundColor Gray
Write-Host "- Test local network access first before configuring router" -ForegroundColor Gray
Write-Host "- Your router admin panel is usually at 192.168.1.1 or 192.168.0.1" -ForegroundColor Gray