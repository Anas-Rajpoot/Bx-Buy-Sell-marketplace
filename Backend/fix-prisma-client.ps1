# Script to fix Prisma client sync issue
# Run this after stopping the backend server

Write-Host "🔄 Regenerating Prisma client..." -ForegroundColor Yellow

# Navigate to the backend directory
Set-Location $PSScriptRoot

# Generate Prisma client
npx prisma generate

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Prisma client regenerated successfully!" -ForegroundColor Green
    Write-Host "🚀 You can now restart the backend server" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to regenerate Prisma client" -ForegroundColor Red
    Write-Host "💡 Make sure the backend server is stopped before running this script" -ForegroundColor Yellow
}

