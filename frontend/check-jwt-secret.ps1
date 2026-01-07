# Check and Fix JWT_SECRET in Backend
Write-Host "🔍 Checking Backend JWT_SECRET Configuration..." -ForegroundColor Cyan
Write-Host ""

$backendPath = "ex-buy-sell-apis\.env"

if (Test-Path $backendPath) {
    Write-Host "✅ .env file found" -ForegroundColor Green
    $envContent = Get-Content $backendPath -Raw
    
    if ($envContent -match "JWT_SECRET=(.+)") {
        $currentSecret = $matches[1].Trim()
        Write-Host "📝 Current JWT_SECRET: $currentSecret" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Expected JWT_SECRET: ThisIsTheSecretThatisUseForJWT" -ForegroundColor Cyan
        Write-Host ""
        
        if ($currentSecret -eq "ThisIsTheSecretThatisUseForJWT") {
            Write-Host "✅ JWT_SECRET matches expected value!" -ForegroundColor Green
        } else {
            Write-Host "⚠️  JWT_SECRET does NOT match expected value!" -ForegroundColor Red
            Write-Host ""
            $update = Read-Host "Do you want to update it to 'ThisIsTheSecretThatisUseForJWT'? (y/n)"
            if ($update -eq "y" -or $update -eq "Y") {
                $newContent = $envContent -replace "JWT_SECRET=.*", "JWT_SECRET=ThisIsTheSecretThatisUseForJWT"
                Set-Content -Path $backendPath -Value $newContent
                Write-Host "✅ Updated JWT_SECRET!" -ForegroundColor Green
                Write-Host "🔄 Please restart the backend server" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "❌ JWT_SECRET not found in .env file" -ForegroundColor Red
        Write-Host "Adding JWT_SECRET to .env..." -ForegroundColor Yellow
        Add-Content -Path $backendPath -Value "`nJWT_SECRET=ThisIsTheSecretThatisUseForJWT"
        Write-Host "✅ Added JWT_SECRET!" -ForegroundColor Green
    }
} else {
    Write-Host "❌ .env file not found at: $backendPath" -ForegroundColor Red
    Write-Host "Creating .env file with default JWT_SECRET..." -ForegroundColor Yellow
    
    $envContent = @"
DATABASE_URL=mongodb://localhost:27017/ex-buy-sell-db
PORT=1230
JWT_SECRET=ThisIsTheSecretThatisUseForJWT
JWT_REFRESH_SECRET=ThisIsTheSecretThatisUseForJWTRefresh
REDIS_HOST=localhost:6379
RABBIT_MQ=localhost:5672
"@
    
    Set-Content -Path $backendPath -Value $envContent
    Write-Host "✅ Created .env file with JWT_SECRET!" -ForegroundColor Green
}

Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Restart backend server (if you updated JWT_SECRET)" -ForegroundColor White
Write-Host "2. Log out and log in again to get a fresh token" -ForegroundColor White
Write-Host "3. The new token will be signed with the correct JWT_SECRET" -ForegroundColor White
Write-Host ""
























