# ============================================================
# AURORA Storage Buckets Backup Utility
# Partido State University – Goa Campus
# ============================================================

Write-Host "Starting AURORA Storage Backup (manuscripts bucket)..." -ForegroundColor Green

# Using Supabase CLI to download storage folder locally
if (Get-Command "supabase" -ErrorAction SilentlyContinue) {
    & supabase storage copy ss:///manuscripts ./storage_backup/manuscripts --recursive
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Storage backup completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "Failed to copy storage. Verify Supabase CLI authentication." -ForegroundColor Red
    }
} else {
    Write-Host "Supabase CLI is not installed. Please download storage files from the Supabase admin panel." -ForegroundColor Yellow
}
