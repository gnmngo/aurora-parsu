# ============================================================
# AURORA Storage Buckets Restore Utility
# Partido State University – Goa Campus
# ============================================================

Write-Host "Restoring AURORA Storage Bucket (manuscripts)..." -ForegroundColor Green

if (Get-Command "supabase" -ErrorAction SilentlyContinue) {
    & supabase storage copy ./storage_backup/manuscripts ss:///manuscripts --recursive
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Storage restore completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "Failed to restore storage. Verify Supabase CLI authentication." -ForegroundColor Red
    }
} else {
    Write-Host "Supabase CLI is not installed. Please upload backup files manually to the manuscripts bucket." -ForegroundColor Yellow
}
