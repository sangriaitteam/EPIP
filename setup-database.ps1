param(
  [Parameter(Mandatory=$true)]
  [string]$PgPassword,
  [string]$DbName = "epip_db",
  [string]$DbUser = "postgres",
  [string]$DbHost = "localhost",
  [string]$DbPort = "5432"
)

$psql = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
$env:PGPASSWORD = $PgPassword

Write-Host ""
Write-Host "EPIP Database Setup Starting..."
Write-Host ""

# Step 1: Test connection
Write-Host "Step 1: Testing PostgreSQL connection..."
$test = & $psql -U $DbUser -h $DbHost -p $DbPort -c "SELECT 1 AS ok;" 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "FAILED: Cannot connect to PostgreSQL. Check your password."
  Write-Host $test
  exit 1
}
Write-Host "OK: Connected to PostgreSQL"
Write-Host ""

# Step 2: Create database
Write-Host "Step 2: Creating database $DbName ..."
$createDb = & $psql -U $DbUser -h $DbHost -p $DbPort -c "CREATE DATABASE $DbName;" 2>&1
if ($createDb -like "*already exists*") {
  Write-Host "INFO: Database already exists, skipping"
} else {
  Write-Host "OK: Database $DbName created"
}
Write-Host ""

# Step 3: Update .env
Write-Host "Step 3: Updating backend .env..."
$envPath = "$PSScriptRoot\backend\.env"
$envContent = Get-Content $envPath -Raw
$envContent = $envContent -replace "DB_PASSWORD=.*", "DB_PASSWORD=$PgPassword"
$envContent = $envContent -replace "DB_NAME=.*",     "DB_NAME=$DbName"
$envContent = $envContent -replace "DB_USER=.*",     "DB_USER=$DbUser"
$envContent = $envContent -replace "DB_HOST=.*",     "DB_HOST=$DbHost"
$envContent = $envContent -replace "DB_PORT=.*",     "DB_PORT=$DbPort"
Set-Content $envPath $envContent
Write-Host "OK: .env updated"
Write-Host ""

# Step 4: Run migration
Write-Host "Step 4: Running migration (creating tables)..."
Set-Location "$PSScriptRoot\backend"
node migrations/run.js
if ($LASTEXITCODE -ne 0) {
  Write-Host "FAILED: Migration error"
  exit 1
}
Write-Host "OK: Tables created"
Write-Host ""

# Step 5: Seed data
Write-Host "Step 5: Seeding demo data..."
node seeders/run.js
if ($LASTEXITCODE -ne 0) {
  Write-Host "FAILED: Seeder error"
  exit 1
}
Write-Host ""

# Step 6: Verify
Write-Host "Step 6: Verifying tables..."
& $psql -U $DbUser -h $DbHost -p $DbPort -d $DbName -c "\dt"
Write-Host ""

Write-Host "======================================"
Write-Host "  EPIP Database Setup Complete!"
Write-Host "======================================"
Write-Host ""
Write-Host "Demo accounts:"
Write-Host "  admin@epip.com    / admin123"
Write-Host "  hr@epip.com       / hr123"
Write-Host "  manager@epip.com  / manager123"
Write-Host "  employee@epip.com / employee123"
Write-Host ""
Write-Host "Next:"
Write-Host "  Terminal 1: cd backend  then npm run dev"
Write-Host "  Terminal 2: cd frontend then npm run dev"
Write-Host ""
