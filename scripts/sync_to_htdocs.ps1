# Sync Script for Smart Edu Prototype
# This script copies updated files from the working directory to XAMPP htdocs.

$source = "c:\Users\soman\.gemini\antigravity\scratch\smart_edu_prototype"
$destination = "C:\xampp\htdocs\smart_edu_prototype"

Write-Host "Synchronizing changes to XAMPP htdocs..." -ForegroundColor Cyan

if (Test-Path $source) {
    xcopy "$source\*" "$destination\" /S /E /Y /H /R
    Write-Host "Synchronization complete!" -ForegroundColor Green
} else {
    Write-Host "Source path not found: $source" -ForegroundColor Red
}
