# ============================================================
# AURORA Database Restore Utility
# Partido State University – Goa Campus
# ============================================================

param (
    [Parameter(Mandatory=$true)]
    [string]$BackupFile
)

# Database configurations
$DB_HOST = "aws-0-ap-southeast-1.pooler.supabase.com"
$DB_USER = "postgres.faxzubfvjsekizeiiocg"
$DB_NAME = "postgres"
$DB_PORT = "5432"

if (-not (Test-Path $BackupFile)) {
    Write-Host "Error: Backup file '$BackupFile' does not exist." -ForegroundColor Red
    exit 1
}

Write-Host "Warning: Restoring will overwrite existing tables in $DB_NAME!" -ForegroundColor Yellow
$Confirm = Read-Host "Proceed? (y/n)"
if ($Confirm -ne "y") {
    Write-Host "Restore cancelled."
    exit 0
}

Write-Host "Restoring AURORA PostgreSQL Database..." -ForegroundColor Green
& psql --host=$DB_HOST --port=$DB_PORT --username=$DB_USER --dbname=$DB_NAME --file=$BackupFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "Database restore completed successfully!" -ForegroundColor Green
} else {
    Write-Host "Restore failed. Please check network connections and sql dump file." -ForegroundColor Red
}
