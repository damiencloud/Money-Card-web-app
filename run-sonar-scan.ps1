# ─── Automated SonarQube Scanner Runner for Money Card Monorepo ───────
param (
    [string]$SonarHostUrl = "http://localhost:9000",
    [string]$SonarToken = ""
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Starting SonarQube Test Coverage & Analysis Runner       " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 0. Set JAVA_HOME if available
if (-not $env:JAVA_HOME) {
    if (Test-Path "C:\Program Files\Android\Android Studio\jbr") {
        $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
        $env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
    }
}

# 1. Flutter Tests & Coverage
Write-Host "`n[1/3] Generating Flutter Test Coverage..." -ForegroundColor Yellow
Push-Location "Flutter Money card"
flutter test --coverage
if (Test-Path "coverage\lcov.info") {
    Write-Host "✓ Flutter coverage report generated at Flutter Money card/coverage/lcov.info" -ForegroundColor Green
} else {
    Write-Host "! Flutter coverage report not generated" -ForegroundColor Yellow
}
Pop-Location

# 2. Check for token
if (-not $SonarToken) {
    if ($env:SONAR_TOKEN) {
        $SonarToken = $env:SONAR_TOKEN
    } else {
        Write-Host "No Sonar token provided via parameter or SONAR_TOKEN env var." -ForegroundColor Yellow
        $SonarToken = Read-Host "Please enter your SonarQube User / Project Token"
    }
}

# 3. Check for scanner (local CLI or npx fallback)
Write-Host "`n[2/3] Resolving Sonar Scanner CLI..." -ForegroundColor Yellow
$scannerCmd = Get-Command sonar-scanner -ErrorAction SilentlyContinue

# 4. Execute Sonar Scanner
Write-Host "`n[3/3] Executing SonarQube analysis across entire repository..." -ForegroundColor Yellow
if ($scannerCmd) {
    $cliArgs = @("-Dsonar.host.url=$SonarHostUrl")
    if ($SonarToken) {
        $cliArgs += "-Dsonar.token=$SonarToken"
    }
    Write-Host "Using system sonar-scanner: $($scannerCmd.Source)" -ForegroundColor Gray
    & sonar-scanner @cliArgs
} else {
    $npxArgs = @("-y", "sonarqube-scanner")
    if ($SonarToken) {
        $npxArgs += "--define"
        $npxArgs += "sonar.token=$SonarToken"
    }
    Write-Host "Using npx sonarqube-scanner..." -ForegroundColor Gray
    & npx @npxArgs
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✓ SonarQube scan completed successfully!" -ForegroundColor Green
    Write-Host "View your project dashboard at: $SonarHostUrl/dashboard?id=money-card-system" -ForegroundColor Cyan
} else {
    Write-Host "`n✗ SonarQube scan exited with code $LASTEXITCODE. Check the logs above." -ForegroundColor Red
}
