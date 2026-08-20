# Start Money Card Local Development Ecosystem
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   🚀 STARTING MONEY CARD FULL ECOSYSTEM...       " -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Start Backend (Port 3000)
Write-Host "📡 Starting Backend API on http://localhost:3000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'D:\Money Card Project\Backend Money Card'; npm run dev"

# 2. Start Prisma Studio (Port 5555)
Write-Host "🗄️ Starting Prisma Studio on http://localhost:5555..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'D:\Money Card Project\Backend Money Card'; npx prisma studio"

# 3. Start Frontend Web Admin (Port 5173)
Write-Host "🌐 Starting Web Admin on http://localhost:5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'D:\Money Card Project\Frontend Money Card'; npm run dev"

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   ✅ ALL SERVERS LAUNCHED IN SEPARATE TERMINALS!"  -ForegroundColor Green
Write-Host "   • Web Admin:     http://localhost:5173" -ForegroundColor White
Write-Host "   • Backend API:   http://localhost:3000/api/v1" -ForegroundColor White
Write-Host "   • Healthcheck:   http://localhost:3000/api/v1/health" -ForegroundColor White
Write-Host "   • Prisma Studio: http://localhost:5555" -ForegroundColor White
Write-Host "==================================================" -ForegroundColor Cyan
