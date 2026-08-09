Set-Location -LiteralPath 'C:\Users\Admin\OneDrive\Documents\LimestoneStudio\source-repo'
git -c http.sslBackend=openssl push origin main
Write-Host ''
Write-Host 'If the push succeeded, you can close this window.'
Read-Host 'Press Enter to close'
