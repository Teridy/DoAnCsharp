# ===========================================
# FoodMap - Stable Deploy Script (Until Sunday)
# ===========================================
# Auto: Backend -> Frontend -> Proxy -> Ngrok -> QR Code
# Static domain: roundup-browse-unequal.ngrok-free.app
# ===========================================

$ErrorActionPreference = "Continue"
$NGROK_DOMAIN = "roundup-browse-unequal.ngrok-free.dev"
$DOWNLOAD_URL = "https://$NGROK_DOMAIN/download/app.html"

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  FoodMap Deploy - Stable Mode (Until Sunday)" -ForegroundColor Cyan
Write-Host "  Domain: $NGROK_DOMAIN" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# -- 1. Check ngrok --
$ngrokPath = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrokPath) {
    Write-Host "[X] Ngrok chua cai! Hay cai ngrok truoc." -ForegroundColor Red
    exit 1
}

# -- 2. Kill old processes --
Write-Host "[CLEANUP] Dang tat cac tien trinh cu..." -ForegroundColor DarkGray
Get-Process -Name "ngrok" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    try { $_.CommandLine -like "*proxy.js*" } catch { $false }
} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# -- 3. Build Frontend -> wwwroot --
Write-Host "`n[1/6] Build React Frontend..." -ForegroundColor Yellow
Push-Location "c:\doan\web\web\frontend"
npm run build 2>$null
if (Test-Path "dist") {
    $wwwroot = "c:\doan\web\web\backend\wwwroot"
    if (-not (Test-Path $wwwroot)) { New-Item -ItemType Directory -Force -Path $wwwroot }
    Get-ChildItem -Path $wwwroot -Exclude "download" | Remove-Item -Recurse -Force
    Copy-Item -Recurse "dist\*" $wwwroot
    Write-Host "[OK] Frontend build -> wwwroot thanh cong!" -ForegroundColor Green
} else {
    Write-Host "[!] Build frontend that bai, dung ban cu" -ForegroundColor Yellow
}
Pop-Location

# -- 4. Start Backend --
Write-Host "`n[2/6] Khoi dong .NET Backend (port 6050)..." -ForegroundColor Yellow
$backendJob = Start-Job -ScriptBlock {
    Set-Location "c:\doan\web\web\backend"
    dotnet run --urls "http://0.0.0.0:6050"
}
Start-Sleep -Seconds 5
Write-Host "[OK] Backend dang chay" -ForegroundColor Green

# -- 5. Start Mobile API --
$mobileApiPath = "c:\doan\app\app\FoodMapAPI"
$mobileJob = $null
if (Test-Path "$mobileApiPath\*.csproj") {
    Write-Host "`n[3/6] Khoi dong Mobile API (port 6111)..." -ForegroundColor Yellow
    $mobileJob = Start-Job -ScriptBlock {
        Set-Location "c:\doan\app\app\FoodMapAPI"
        dotnet run --urls "http://0.0.0.0:6111"
    }
    Start-Sleep -Seconds 3
    Write-Host "[OK] Mobile API dang chay" -ForegroundColor Green
} else {
    Write-Host "`n[!] Mobile API khong tim thay, bo qua" -ForegroundColor DarkGray
}

# -- 6. Start Proxy --
Write-Host "`n[4/6] Khoi dong Node.js Proxy (port 6500)..." -ForegroundColor Yellow
$proxyJob = Start-Job -ScriptBlock {
    node c:\doan\proxy.js
}
Start-Sleep -Seconds 2
Write-Host "[OK] Proxy dang chay" -ForegroundColor Green

# -- 7. Start Ngrok with static domain --
Write-Host "`n[5/6] Khoi dong Ngrok (static domain)..." -ForegroundColor Yellow
Write-Host "   Domain: $NGROK_DOMAIN" -ForegroundColor DarkGray
$ngrokJob = Start-Job -ScriptBlock {
    ngrok start --all --config "c:\doan\ngrok.yml"
}
Start-Sleep -Seconds 5

# -- 8. Verify tunnels and generate QR --
Write-Host "`n[6/6] Tao QR Code de tai app..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
$tunnelOk = $false
try {
    $tunnels = (Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -ErrorAction Stop).tunnels
    if ($tunnels.Count -gt 0) {
        $tunnelOk = $true
        $publicUrl = $tunnels[0].public_url
        Write-Host "[OK] Ngrok tunnel: $publicUrl" -ForegroundColor Green
    }
} catch {
    Write-Host "[!] Chua lay duoc tunnel URL, thu lai..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    try {
        $tunnels = (Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -ErrorAction Stop).tunnels
        if ($tunnels.Count -gt 0) {
            $tunnelOk = $true
            $publicUrl = $tunnels[0].public_url
        }
    } catch {}
}

# Generate QR Code
$qrFile = "c:\doan\qr_download.png"
if ($tunnelOk) {
    $dlPage = "$publicUrl/download/app.html"
    Write-Host "`n   Trang tai app: $dlPage" -ForegroundColor Cyan
    
    try {
        $qrApiUrl = "https://api.qrserver.com/v1/create-qr-code/?size=400x400&format=png&data=$([uri]::EscapeDataString($dlPage))"
        Invoke-WebRequest -Uri $qrApiUrl -OutFile $qrFile -ErrorAction Stop
        Write-Host "[OK] QR Code da luu tai: $qrFile" -ForegroundColor Green
    } catch {
        Write-Host "[!] Khong tao duoc QR tu API, dung QR cu" -ForegroundColor Yellow
    }
} else {
    # Fallback: use static domain URL
    $dlPage = $DOWNLOAD_URL
    Write-Host "`n   Dung static domain: $dlPage" -ForegroundColor Cyan
    try {
        $qrApiUrl = "https://api.qrserver.com/v1/create-qr-code/?size=400x400&format=png&data=$([uri]::EscapeDataString($dlPage))"
        Invoke-WebRequest -Uri $qrApiUrl -OutFile $qrFile -ErrorAction Stop
        Write-Host "[OK] QR Code da luu tai: $qrFile" -ForegroundColor Green
    } catch {
        Write-Host "[!] Khong tao duoc QR Code" -ForegroundColor Yellow
    }
}

# -- DISPLAY SUMMARY --
Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host "  FOODMAP DANG CHAY ON DINH!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Web Admin:   https://$NGROK_DOMAIN" -ForegroundColor Cyan
Write-Host "  Tai App:     https://$NGROK_DOMAIN/download/app.html" -ForegroundColor Cyan
Write-Host "  APK Direct:  https://$NGROK_DOMAIN/download/FoodMapApp.apk" -ForegroundColor Cyan
Write-Host "  QR Code:     $qrFile" -ForegroundColor Cyan
Write-Host "  Dashboard:   http://127.0.0.1:4040" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  >> Gui file qr_download.png qua Zalo de nguoi khac quet!" -ForegroundColor Yellow
Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host "  Nhan Ctrl+C de dung tat ca" -ForegroundColor DarkGray
Write-Host "  Script tu dong restart neu bi ngat" -ForegroundColor DarkGray
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""

# -- KEEP ALIVE LOOP with auto-restart --
$restartCount = 0
try {
    while ($true) {
        Start-Sleep -Seconds 20

        # -- Health check Backend --
        $backendState = Get-Job -Id $backendJob.Id -ErrorAction SilentlyContinue
        if ($backendState -and $backendState.State -ne "Running") {
            $restartCount++
            Write-Host "[$(Get-Date -Format 'HH:mm')] Backend dung, restart lan $restartCount..." -ForegroundColor Yellow
            $backendJob = Start-Job -ScriptBlock {
                Set-Location "c:\doan\web\web\backend"
                dotnet run --urls "http://0.0.0.0:6050"
            }
        }

        # -- Health check Mobile API --
        if ($mobileJob) {
            $mobileState = Get-Job -Id $mobileJob.Id -ErrorAction SilentlyContinue
            if ($mobileState -and $mobileState.State -ne "Running") {
                Write-Host "[$(Get-Date -Format 'HH:mm')] Mobile API dung, restart..." -ForegroundColor Yellow
                $mobileJob = Start-Job -ScriptBlock {
                    Set-Location "c:\doan\app\app\FoodMapAPI"
                    dotnet run --urls "http://0.0.0.0:6111"
                }
            }
        }

        # -- Health check Proxy --
        $proxyState = Get-Job -Id $proxyJob.Id -ErrorAction SilentlyContinue
        if ($proxyState -and $proxyState.State -ne "Running") {
            Write-Host "[$(Get-Date -Format 'HH:mm')] Proxy dung, restart..." -ForegroundColor Yellow
            $proxyJob = Start-Job -ScriptBlock {
                node c:\doan\proxy.js
            }
        }

        # -- Health check Ngrok --
        try {
            $null = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 5 -ErrorAction Stop
        } catch {
            Write-Host "[$(Get-Date -Format 'HH:mm')] Ngrok mat ket noi, restart..." -ForegroundColor Yellow
            Get-Process -Name "ngrok" -ErrorAction SilentlyContinue | Stop-Process -Force
            Start-Sleep -Seconds 2
            $ngrokJob = Start-Job -ScriptBlock {
                ngrok start --all --config "c:\doan\ngrok.yml"
            }
            Start-Sleep -Seconds 5
            Write-Host "[OK] Ngrok da restart" -ForegroundColor Green
        }

        # -- Status ping every 5 minutes --
        if ((Get-Date).Second -lt 25 -and (Get-Date).Minute % 5 -eq 0) {
            Write-Host "[$(Get-Date -Format 'HH:mm')] Heartbeat OK - Restarts: $restartCount" -ForegroundColor DarkGray
        }
    }
} finally {
    Write-Host "`n[STOP] Dang dung tat ca..." -ForegroundColor Red
    Get-Job | Stop-Job -ErrorAction SilentlyContinue
    Get-Job | Remove-Job -ErrorAction SilentlyContinue
    Get-Process -Name "ngrok" -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "[OK] Da dung sach." -ForegroundColor Green
}
