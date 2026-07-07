# ============================================================
# AURORA Database Backup Utility
# Partido State University – Goa Campus
# ============================================================

# Read .env.local variables
$EnvPath = Join-Path (Get-Location) ".env.local"
if (Test-Path $EnvPath) {
    Get-Content $EnvPath | ForEach-Object {
        $line = $_.Trim()
        if ($line -match '^([^#=]+)=(.*)$') {
            $key = $Matches[1].Trim()
            $value = $Matches[2].Trim()
            # Strip quotes
            if ($value.StartsWith('"') -and $value.EndsWith('"')) { $value = $value.Substring(1, $value.Length - 2) }
            if ($value.StartsWith("'") -and $value.EndsWith("'")) { $value = $value.Substring(1, $value.Length - 2) }
            [System.Environment]::SetEnvironmentVariable($key, $value)
        }
    }
}

# Database configurations
$DB_HOST = "aws-0-ap-southeast-1.pooler.supabase.com" # pooler hostname
$DB_USER = "postgres.faxzubfvjsekizeiiocg"
$DB_NAME = "postgres"
$DB_PORT = "5432"
$BACKUP_FILE = "aurora_db_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"

Write-Host "Starting AURORA PostgreSQL Database Backup..." -ForegroundColor Green
Write-Host "Target Host: $DB_HOST"
Write-Host "Target File: $BACKUP_FILE"

# Execute pg_dump
& pg_dump --host=$DB_HOST --port=$DB_PORT --username=$DB_USER --dbname=$DB_NAME --no-password --file=$BACKUP_FILE

if ($LASTEXITCODE -eq 0) {
    Write-Host "Database backup completed successfully!" -ForegroundColor Green
} else {
    Write-Host "Backup failed. Please check pg_dump path and network connections." -ForegroundColor Red
}
